import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotificationSocket } from '../context/NotificationSocketContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (sessionId) => {
  const { sendCommand, registerHandler } = useNotificationSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, disconnected
  
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  // Queues for WebRTC race conditions (if messages arrive before getUserMedia finishes)
  const queuedOffer = useRef(null);
  const queuedCandidates = useRef([]);

  const initPeerConnection = useCallback(() => {
    if (peerConnection.current) return;
    
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendCommand('ice_candidate', {
          session_id: sessionId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current.connectionState);
      if (peerConnection.current.connectionState === 'connected') {
        sendCommand('connection_established', { session_id: sessionId, connection_type: 'p2p' });
      }
    };
  }, [sessionId, sendCommand]);

  const startLocalStream = useCallback(async (isVideo = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      initPeerConnection();
      
      stream.getTracks().forEach((track) => {
        if (peerConnection.current.signalingState !== 'closed') {
          peerConnection.current.addTrack(track, stream);
        }
      });
      
      // Process any queued signaling messages that arrived while we were getting media
      if (queuedOffer.current) {
        console.log('[WebRTC] Processing queued offer...');
        const offerData = queuedOffer.current;
        queuedOffer.current = null;
        
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offerData.offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        sendCommand('webrtc_answer', { session_id: sessionId, answer });
      }

      if (queuedCandidates.current.length > 0) {
        console.log(`[WebRTC] Processing ${queuedCandidates.current.length} queued ICE candidates...`);
        for (const candidate of queuedCandidates.current) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('[WebRTC] Queued ICE error:', e);
          }
        }
        queuedCandidates.current = [];
      }
      
    } catch (err) {
      console.error('Error accessing media devices.', err);
      // fallback for no devices or permissions denied
    }
  }, [initPeerConnection]);

  const toggleMedia = useCallback((type) => {
    if (!localStream) return;
    localStream.getTracks().forEach(track => {
      if (track.kind === type) {
        track.enabled = !track.enabled;
      }
    });
  }, [localStream]);

  // Handlers for WS messages
  useEffect(() => {
    const handleParticipantJoined = async (data) => {
      if (data.session_id !== sessionId) return;
      console.log('[WebRTC] Participant joined — creating offer');
      
      try {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        // FIX: field is 'offer', not 'signal'
        sendCommand('webrtc_offer', {
          session_id: sessionId,
          offer,
        });
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      }
    };
    
    // FIX: handleOffer and handleAnswer had broken indentation — restored correct scoping
    const handleOffer = async (data) => {
      if (data.session_id !== sessionId) return;
      if (!peerConnection.current) {
        console.log('[WebRTC] PeerConnection not ready, queuing offer');
        queuedOffer.current = data;
        return;
      }
      
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        sendCommand('webrtc_answer', { session_id: sessionId, answer });
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
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    };

      

    const handleIceCandidate = async (data) => {
      if (data.session_id !== sessionId) return;
      if (!peerConnection.current) {
        console.log('[WebRTC] PeerConnection not ready, queuing ICE candidate');
        queuedCandidates.current.push(data.candidate);
        return;
      }
      try {
        if (data.candidate && peerConnection.current) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };
    
    const handleCallStatus = (data) => {
       // 'call_ended' is sent by backend when a call is terminated
       if (data.session_id === sessionId) {
           setCallStatus('disconnected');
       }
    };

    // Correct client-received types (consumer transforms channel-layer types before sending to client)
    const unregJoined = registerHandler('participant_joined', handleParticipantJoined);
    const unregOffer  = registerHandler('webrtc_offer',       handleOffer);
    const unregAnswer = registerHandler('webrtc_answer',      handleAnswer);
    const unregIce    = registerHandler('ice_candidate',      handleIceCandidate);
    const unregStatus = registerHandler('call_ended',         handleCallStatus);

    return () => {
      unregJoined();
      unregOffer();
      unregAnswer();
      unregIce();
      unregStatus();
    };
  }, [sessionId, sendCommand, registerHandler]);

  const endCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('disconnected');
    sendCommand('end_call', {session_id: sessionId});
    
  }, [localStream, sendCommand, sessionId]);

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    startLocalStream,
    toggleMedia,
    endCall,
    callStatus
  };
};
