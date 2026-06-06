
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationSocket } from './NotificationSocketContext';

const WebRTCContext = createContext(null);

export const WebRTCProvider = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallSessionId, setActiveCallSessionId] = useState(null);
  const [pendingCallSessionId, setPendingCallSessionId] = useState(null);
  const pendingCallSessionIdRef = useRef(null);

  // WebRTC signaling state (forwarded from the server via WebSocket)
  const [pendingOffer, setPendingOffer]       = useState(null);
  const [pendingAnswer, setPendingAnswer]     = useState(null);
  const [pendingCandidates, setPendingCandidates] = useState([]);

  const { isConnected, sendCommand, registerHandler } = useNotificationSocket();
  const navigate = useNavigate();

  // Keep ref in sync
  useEffect(() => {
    pendingCallSessionIdRef.current = pendingCallSessionId;
  }, [pendingCallSessionId]);

  // ── Register all call-related event handlers ──────────────────────────────
  useEffect(() => {
    const unsubs = [];

    // CORRECT: these are the types the consumer sends to the CLIENT (not channel-layer routing types)
    // channel-layer "incoming_call_notification" → consumer.incoming_call_notification() → sends "incoming_call" to client
    unsubs.push(registerHandler('incoming_call', (data) => {
      console.log('[WebRTC] Incoming call:', data);
      setIncomingCall(data);
    }));
    // Also handle the HTTP-API path: notification_service._send_to_user → type="send_notification", notification_type="incoming_call"
    unsubs.push(registerHandler('send_notification', (data) => {
      if (data.notification_type === 'incoming_call') {
        console.log('[WebRTC] Incoming call (via send_notification):', data);
        setIncomingCall(data.data || data);
      }
    }));

    // Call status events — consumer sends these types directly to client
    unsubs.push(registerHandler('call_accepted', (data) => {
      console.log('[WebRTC] Call accepted:', data);
      const sessionId = data.session_id || pendingCallSessionIdRef.current;
      if (sessionId) {
        navigate(`/call/${sessionId}`);
      }
    }));
    unsubs.push(registerHandler('call_declined', () => {
      console.log('[WebRTC] Call declined');
      setIncomingCall(null);
      setActiveCallSessionId(null);
      setPendingCallSessionId(null);
    }));
    unsubs.push(registerHandler('call_ended', () => {
      console.log('[WebRTC] Call ended');
      setIncomingCall(null);
      setActiveCallSessionId(null);
      setPendingCallSessionId(null);
      setPendingOffer(null);
      setPendingAnswer(null);
      setPendingCandidates([]);
    }));

    // WebRTC signaling — consumer sends these WITHOUT _notification suffix to client
    // channel-layer "webrtc_offer_notification" → consumer method → sends "webrtc_offer" to client
    unsubs.push(registerHandler('webrtc_offer', (data) => {
      console.log('[WebRTC] Got offer');
      setPendingOffer({ offer: data.offer || data.signal, fromUserId: data.from_user_id });
    }));
    unsubs.push(registerHandler('webrtc_answer', (data) => {
      console.log('[WebRTC] Got answer');
      setPendingAnswer({ answer: data.answer, fromUserId: data.from_user_id });
    }));
    unsubs.push(registerHandler('ice_candidate', (data) => {
      console.log('[WebRTC] Got ICE candidate');
      setPendingCandidates(prev => [...prev, data.candidate]);
    }));

    // Participant events — consumer sends without _notification suffix
    unsubs.push(registerHandler('participant_joined', (data) => {
      console.log('[WebRTC] Participant joined:', data.participant_name);
    }));
    unsubs.push(registerHandler('participant_left', (data) => {
      console.log('[WebRTC] Participant left:', data.participant_id);
    }));

    return () => unsubs.forEach(u => u());
  }, [registerHandler, navigate]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const joinCallRoom = useCallback((sessionId) => {
    setActiveCallSessionId(sessionId);
    sendCommand('join_call_room', { session_id: sessionId });
  }, [sendCommand]);

  const leaveCallRoom = useCallback((sessionId) => {
    sendCommand('leave_call_room', { session_id: sessionId });
    setActiveCallSessionId(null);
  }, [sendCommand]);

  const initiateCall = useCallback((sessionId, recipientId, callType = 'video') => {
    setPendingCallSessionId(sessionId);
    sendCommand('initiate_call', {
      session_id: sessionId,
      recipient_id: recipientId,
      call_type: callType,
    });
  }, [sendCommand]);

  const acceptCall = useCallback((sessionId) => {
    sendCommand('accept_call', { session_id: sessionId });
    setIncomingCall(null);
  }, [sendCommand]);

  const declineCall = useCallback((sessionId, reason = 'user_declined') => {
    sendCommand('decline_call', { session_id: sessionId, reason });
    setIncomingCall(null);
  }, [sendCommand]);

  const endCall = useCallback((sessionId) => {
    sendCommand('end_call', { session_id: sessionId });
    setActiveCallSessionId(null);
    setPendingCallSessionId(null);
    setPendingOffer(null);
    setPendingAnswer(null);
    setPendingCandidates([]);
  }, [sendCommand]);

  const sendOffer = useCallback((sessionId, offer) => {
    sendCommand('webrtc_offer', { session_id: sessionId, offer });
  }, [sendCommand]);

  const sendAnswer = useCallback((sessionId, answer) => {
    sendCommand('webrtc_answer', { session_id: sessionId, answer });
  }, [sendCommand]);

  const sendIceCandidate = useCallback((sessionId, candidate) => {
    sendCommand('ice_candidate', { session_id: sessionId, candidate });
  }, [sendCommand]);

  const clearPendingCandidates = useCallback(() => setPendingCandidates([]), []);

  const value = {
    isConnected,
    incomingCall,
    activeCallSessionId,
    pendingCallSessionId,
    setPendingCallSessionId,
    pendingOffer,
    pendingAnswer,
    pendingCandidates,
    sendCommand,
    registerHandler,
    setIncomingCall,
    setActiveCallSessionId,
    joinCallRoom,
    leaveCallRoom,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    clearPendingCandidates,
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTCSocket = () => {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error('useWebRTCSocket must be used within a WebRTCProvider');
  return context;
};