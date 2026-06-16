import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotificationSocket } from '../context/NotificationSocketContext';
import { useAuth } from '../context/AuthContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const useWebRTC = (sessionId) => {
  const { sendCommand, registerHandler } = useNotificationSocket();
  const { user } = useAuth();
  const isPolite = user?.role === 'patient';
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting | connected | disconnected
  
  // Remote peer's track status synced via Data Channel
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteMicEnabled, setRemoteMicEnabled] = useState(true);
  
  const peerConnection     = useRef(null);
  const localVideoRef      = useRef(null);
  const remoteVideoRef     = useRef(null);
  const localStreamRef     = useRef(null);
  const dataChannelRef     = useRef(null);

  // ── Race-condition guards ─────────────────────────────────────────────────
  const queuedOffer          = useRef(null);
  const queuedCandidates     = useRef([]);
  const remoteDescriptionSet = useRef(false);
  const isRemoteUserJoined   = useRef(false);
  const isOfferInProgress    = useRef(false);
  const isConnectedRef       = useRef(false);
  const isStreamStarted      = useRef(false);

  // Stable ref for sessionId
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── Flush queued ICE candidates ───────────────────────────────────────────
  const flushQueuedCandidates = useCallback(async () => {
    if (!peerConnection.current || queuedCandidates.current.length === 0) return;
    console.log(`[WebRTC] Flushing ${queuedCandidates.current.length} queued ICE candidates`);
    const batch = queuedCandidates.current.splice(0);
    for (const candidate of batch) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] Queued ICE candidate error:', e.message);
      }
    }
  }, []);

  // ── Setup Data Channel Handlers ───────────────────────────────────────────
  const setupDataChannel = useCallback((channel) => {
    dataChannelRef.current = channel;
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebRTC] Received control message:', data);
        if (data.type === 'video_toggle') {
          setRemoteVideoEnabled(data.enabled);
        } else if (data.type === 'audio_toggle') {
          setRemoteMicEnabled(data.enabled);
        }
      } catch (err) {
        console.error('[WebRTC] Error parsing control message:', err);
      }
    };

    channel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
      // Sync local stream track states to remote peer on open
      if (localStreamRef.current && dataChannelRef.current?.readyState === 'open') {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        try {
          dataChannelRef.current.send(JSON.stringify({
            type: 'video_toggle',
            enabled: videoTrack ? videoTrack.enabled : false
          }));
          dataChannelRef.current.send(JSON.stringify({
            type: 'audio_toggle',
            enabled: audioTrack ? audioTrack.enabled : true
          }));
        } catch (err) {
          console.warn('[WebRTC] Error sending initial stream state:', err);
        }
      }
    };

    channel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
    };
  }, []);

  // ── Create PeerConnection ─────────────────────────────────────────────────
  const initPeerConnection = useCallback(() => {
    if (peerConnection.current) return;

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    // Offerer creates the Data Channel (consultant is non-polite)
    if (!isPolite) {
      console.log('[WebRTC] Creating data channel...');
      const dc = peerConnection.current.createDataChannel('control-channel');
      setupDataChannel(dc);
    }

    peerConnection.current.ondatachannel = (event) => {
      console.log('[WebRTC] Received remote data channel');
      setupDataChannel(event.channel);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendCommand('ice_candidate', {
          session_id: sessionIdRef.current,
          candidate:  event.candidate,
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setCallStatus('connected');
      console.log('[WebRTC] Remote stream received — call live');
    };

    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('[WebRTC] Connection state:', state);
      if (state === 'connected') {
        isConnectedRef.current = true;
        setCallStatus('connected');
        sendCommand('connection_established', {
          session_id: sessionIdRef.current,
          connection_type: 'p2p',
        });
      } else if (state === 'failed' || state === 'closed') {
        isConnectedRef.current = false;
      }
    };

    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', peerConnection.current?.iceConnectionState);
    };
  }, [sendCommand, isPolite, setupDataChannel]);

  // ── Start local camera/mic ────────────────────────────────────────────────
  const startLocalStream = useCallback(async (isVideo = true) => {
    if (isStreamStarted.current) {
      console.log('[WebRTC] startLocalStream already called — skipping');
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      } catch (mediaErr) {
        console.warn('[WebRTC] Failed to get video/audio, trying audio only', mediaErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } catch (audioErr) {
          console.error('[WebRTC] Failed to get any media, proceeding with receive-only', audioErr);
          stream = new MediaStream();
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current && stream.getTracks().length > 0) {
        localVideoRef.current.srcObject = stream;
      }

      isStreamStarted.current = true;
      initPeerConnection();

      stream.getTracks().forEach((track) => {
        if (peerConnection.current?.signalingState !== 'closed') {
          peerConnection.current.addTrack(track, stream);
        }
      });

      if (queuedOffer.current) {
        console.log('[WebRTC] Processing queued offer after stream ready...');
        const offerData = queuedOffer.current;
        queuedOffer.current = null;

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offerData.offer)
        );
        remoteDescriptionSet.current = true;

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        sendCommand('webrtc_answer', { session_id: sessionIdRef.current, answer });
        console.log('[WebRTC] Answer sent (queued offer path)');

        await flushQueuedCandidates();
        return;
      }

      if (isRemoteUserJoined.current && !isOfferInProgress.current) {
        console.log('[WebRTC] Remote user joined before stream was ready — creating offer now');
        isRemoteUserJoined.current = false;
        isOfferInProgress.current  = true;
        try {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          sendCommand('webrtc_offer', { session_id: sessionIdRef.current, offer });
          console.log('[WebRTC] Offer sent (deferred path)');
        } finally {
          isOfferInProgress.current = false;
        }
      }

    } catch (err) {
      console.error('[WebRTC] Unexpected error in startLocalStream:', err);
      isStreamStarted.current = false;
    }
  }, [initPeerConnection, sendCommand, flushQueuedCandidates]);

  // ── Toggle camera or mic ──────────────────────────────────────────────────
  const toggleMedia = useCallback((type) => {
    if (!localStream) return;
    let newEnabled = true;
    localStream.getTracks().forEach(track => {
      if (track.kind === type) {
        track.enabled = !track.enabled;
        newEnabled = track.enabled;
      }
    });

    // Notify remote peer via Data Channel
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({
          type: type === 'video' ? 'video_toggle' : 'audio_toggle',
          enabled: newEnabled
        }));
      } catch (err) {
        console.warn('[WebRTC] Failed to send toggle state via data channel:', err);
      }
    }
  }, [localStream]);

  // ── Register WebSocket signaling handlers ─────────────────────────────────
  useEffect(() => {
    const handleParticipantJoined = async (data) => {
      if (data.session_id !== sessionId) return;
      console.log('[WebRTC] participant_joined received, isPolite:', isPolite);

      if (isConnectedRef.current) {
        console.log('[WebRTC] Already connected — ignoring duplicate participant_joined');
        return;
      }

      if (isPolite) return;

      if (!peerConnection.current) {
        console.log('[WebRTC] PC not ready yet, deferring offer creation');
        isRemoteUserJoined.current = true;
        return;
      }

      if (isOfferInProgress.current) {
        console.warn('[WebRTC] Offer already in progress — ignoring duplicate participant_joined');
        return;
      }

      if (peerConnection.current.signalingState !== 'stable') {
        console.warn('[WebRTC] Signaling not stable (%s) — skipping offer', peerConnection.current.signalingState);
        return;
      }

      isOfferInProgress.current = true;
      try {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        sendCommand('webrtc_offer', { session_id: sessionId, offer });
        console.log('[WebRTC] Offer sent after participant_joined');
      } catch (err) {
        console.error('[WebRTC] Error creating offer on participant_joined:', err);
      } finally {
        isOfferInProgress.current = false;
      }
    };

    const handleOffer = async (data) => {
      if (data.session_id !== sessionId) return;
      console.log('[WebRTC] Received webrtc_offer');

      if (!peerConnection.current) {
        console.log('[WebRTC] PC not ready — queuing offer');
        queuedOffer.current = data;
        return;
      }

      try {
        const glare = peerConnection.current.signalingState !== 'stable';
        if (glare) {
          if (!isPolite) {
            console.log('[WebRTC] Glare — impolite peer ignoring incoming offer');
            return;
          }
          console.log('[WebRTC] Glare — polite peer rolling back and accepting incoming offer');
          await peerConnection.current.setLocalDescription({ type: 'rollback' });
        }

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        remoteDescriptionSet.current = true;

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        sendCommand('webrtc_answer', { session_id: sessionId, answer });
        console.log('[WebRTC] Answer sent');

        await flushQueuedCandidates();
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    const handleAnswer = async (data) => {
      if (data.session_id !== sessionId || !peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        remoteDescriptionSet.current = true;
        await flushQueuedCandidates();
        console.log('[WebRTC] Answer applied');
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.session_id !== sessionId) return;
      if (!data.candidate) return;

      if (!peerConnection.current || !remoteDescriptionSet.current) {
        console.log('[WebRTC] Queuing ICE candidate');
        queuedCandidates.current.push(data.candidate);
        return;
      }

      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate error:', err.message);
      }
    };

    const handleCallEnded = (data) => {
      if (data.session_id === sessionId) setCallStatus('disconnected');
    };

    const unregJoined = registerHandler('participant_joined', handleParticipantJoined);
    const unregOffer  = registerHandler('webrtc_offer',       handleOffer);
    const unregAnswer = registerHandler('webrtc_answer',      handleAnswer);
    const unregIce    = registerHandler('ice_candidate',      handleIceCandidate);
    const unregEnded  = registerHandler('call_ended',         handleCallEnded);

    return () => {
      unregJoined();
      unregOffer();
      unregAnswer();
      unregIce();
      unregEnded();
    };
  }, [sessionId, isPolite, sendCommand, registerHandler, flushQueuedCandidates]);

  // ── End call ─────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    dataChannelRef.current       = null;
    setRemoteVideoEnabled(true);
    setRemoteMicEnabled(true);
    remoteDescriptionSet.current = false;
    queuedOffer.current          = null;
    queuedCandidates.current     = [];
    isRemoteUserJoined.current   = false;
    isOfferInProgress.current    = false;
    isConnectedRef.current       = false;
    isStreamStarted.current      = false;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('disconnected');
    sendCommand('end_call', { session_id: sessionIdRef.current });
  }, [localStream, sendCommand]);

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    startLocalStream,
    toggleMedia,
    endCall,
    callStatus,
    isPatient: user?.role === 'patient',
    remoteVideoEnabled,
    remoteMicEnabled
  };
};
