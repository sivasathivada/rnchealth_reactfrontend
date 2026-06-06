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

  const peerConnection     = useRef(null);
  const localVideoRef      = useRef(null);
  const remoteVideoRef     = useRef(null);
  const localStreamRef     = useRef(null);

  // ── Race-condition guards ─────────────────────────────────────────────────
  // Offer/candidates that arrived before PeerConnection or remote-desc was ready
  const queuedOffer          = useRef(null);
  const queuedCandidates     = useRef([]);
  // True once setRemoteDescription has been called — needed before addIceCandidate
  const remoteDescriptionSet = useRef(false);
  // True if participant_joined arrived before startLocalStream finished
  const isRemoteUserJoined   = useRef(false);
  // Prevents sending two offers simultaneously (e.g. if participant_joined fires twice)
  const isOfferInProgress    = useRef(false);
  // Track whether the P2P connection is fully established
  const isConnectedRef       = useRef(false);
  // Guard: prevent startLocalStream from running more than once
  const isStreamStarted      = useRef(false);

  // Stable ref for sessionId so async callbacks never see a stale closure value
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── Flush queued ICE candidates (call after setRemoteDescription) ─────────
  const flushQueuedCandidates = useCallback(async () => {
    if (!peerConnection.current || queuedCandidates.current.length === 0) return;
    console.log(`[WebRTC] Flushing ${queuedCandidates.current.length} queued ICE candidates`);
    const batch = queuedCandidates.current.splice(0);          // drain atomically
    for (const candidate of batch) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] Queued ICE candidate error:', e.message);
      }
    }
  }, []);

  // ── Create PeerConnection ─────────────────────────────────────────────────
  const initPeerConnection = useCallback(() => {
    if (peerConnection.current) return;

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

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
  }, [sendCommand]);

  // ── Start local camera/mic, then process any queued signaling ─────────────
  const startLocalStream = useCallback(async (isVideo = true) => {
    // Guard: never start the stream more than once per session
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
          stream = new MediaStream(); // empty stream
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

      // ── Process offer that arrived before getUserMedia finished ────────────
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
        return; // don't fall through to the offer-creation branch
      }

      // ── Create offer if the other participant already joined ───────────────
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
      isStreamStarted.current = false; // allow retry on error
    }
  }, [initPeerConnection, sendCommand, flushQueuedCandidates]);

  const toggleMedia = useCallback((type) => {
    if (!localStream) return;
    localStream.getTracks().forEach(track => {
      if (track.kind === type) track.enabled = !track.enabled;
    });
  }, [localStream]);

  // ── Register WebSocket signaling handlers ─────────────────────────────────
  useEffect(() => {

    // Called when the OTHER peer joins the call room.
    // The non-polite peer (consultant) creates the offer here.
    // The polite peer (patient) receives an offer and answers it.
    const handleParticipantJoined = async (data) => {
      if (data.session_id !== sessionId) return;
      console.log('[WebRTC] participant_joined received, isPolite:', isPolite);

      // If connection is already established, ignore duplicate events
      if (isConnectedRef.current) {
        console.log('[WebRTC] Already connected — ignoring duplicate participant_joined');
        return;
      }

      // Only the non-polite peer (consultant) creates the offer
      if (isPolite) return;

      if (!peerConnection.current) {
        // startLocalStream hasn't finished yet — defer offer creation
        console.log('[WebRTC] PC not ready yet, deferring offer creation');
        isRemoteUserJoined.current = true;
        return;
      }

      // Guard: one offer at a time
      if (isOfferInProgress.current) {
        console.warn('[WebRTC] Offer already in progress — ignoring duplicate participant_joined');
        return;
      }

      // Only create offer when signaling is stable
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

    // Incoming offer from the other peer
    const handleOffer = async (data) => {
      if (data.session_id !== sessionId) return;
      console.log('[WebRTC] Received webrtc_offer');

      if (!peerConnection.current) {
        console.log('[WebRTC] PC not ready — queuing offer');
        queuedOffer.current = data;
        return;
      }

      try {
        // Offer-glare: resolve using polite/impolite peer role pattern
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

    // Incoming answer from the other peer
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

    // Incoming ICE candidate
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
  };
};
