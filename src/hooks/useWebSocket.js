/**
 * useWebSocket Hook
 *
 * Connects to Django Channels on mount, disconnects on unmount.
 * Exposes the ws service, connection state, and an easy .on() interface.
 *
 * Usage:
 *   const { isConnected, wsService, on } = useWebSocket();
 *
 *   useEffect(() => {
 *     const unsub = on('incoming_call_notification', (data) => {
 *       console.log('Incoming call!', data);
 *     });
 *     return unsub;
 *   }, [on]);
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import wsService from '../services/websocket';

/**
 * Primary hook — manages the singleton WS connection lifecycle.
 * Mount this ONCE at the top of your app (e.g., inside AuthProvider or App.jsx).
 */
export const useWebSocketConnection = () => {
  const [connectionState, setConnectionState] = useState(wsService.state);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const updateState = () => {
      if (mountedRef.current) setConnectionState(wsService.state);
    };

    const unsubConnected    = wsService.on('ws_connected',    updateState);
    const unsubDisconnected = wsService.on('ws_disconnected', updateState);
    const unsubFailed       = wsService.on('ws_failed',       updateState);

    // Connect using stored credentials
    const token  = localStorage.getItem('access_token');
    const userId = localStorage.getItem('user_id');

    if (token && userId && !wsService.isConnected) {
      wsService.connect(userId, token);
    }

    return () => {
      mountedRef.current = false;
      unsubConnected();
      unsubDisconnected();
      unsubFailed();
    };
  }, []);

  const connect = useCallback((userId, token) => {
    wsService.connect(userId, token);
  }, []);

  const disconnect = useCallback(() => {
    wsService.disconnect();
  }, []);

  return {
    connectionState,
    isConnected: wsService.isConnected,
    connect,
    disconnect,
    wsService,
  };
};

/**
 * Lightweight hook — subscribe to one or more WS event types.
 * Can be used in any component without re-connecting.
 *
 * @param {string|string[]} eventTypes
 * @param {Function}        handler
 * @param {any[]}           deps    - Extra deps for useEffect
 */
export const useWebSocketEvent = (eventTypes, handler, deps = []) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const types  = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const unsubs = types.map(type =>
      wsService.on(type, (...args) => handlerRef.current(...args))
    );
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Array.isArray(eventTypes) ? eventTypes : [eventTypes]), ...deps]);
};

/**
 * Convenience hook — all call-related events in one place.
 *
 * @param {object} handlers
 * @param {Function} [handlers.onIncomingCall]
 * @param {Function} [handlers.onCallRinging]
 * @param {Function} [handlers.onCallAccepted]
 * @param {Function} [handlers.onCallDeclined]
 * @param {Function} [handlers.onCallEnded]
 * @param {Function} [handlers.onOffer]
 * @param {Function} [handlers.onAnswer]
 * @param {Function} [handlers.onIceCandidate]
 * @param {Function} [handlers.onParticipantJoined]
 * @param {Function} [handlers.onParticipantLeft]
 * @param {Function} [handlers.onQualityAlert]
 */
export const useCallEvents = (handlers = {}) => {
  useEffect(() => {
    const unsubs = [];

    if (handlers.onIncomingCall)
      unsubs.push(wsService.on('incoming_call_notification', handlers.onIncomingCall));

    if (handlers.onCallRinging)
      unsubs.push(wsService.on('call_ringing', handlers.onCallRinging));

    if (handlers.onCallAccepted)
      unsubs.push(wsService.on('call_accepted_notification', handlers.onCallAccepted),
                  wsService.on('call_accepted',              handlers.onCallAccepted));

    if (handlers.onCallDeclined)
      unsubs.push(wsService.on('call_declined', handlers.onCallDeclined));

    if (handlers.onCallEnded)
      unsubs.push(wsService.on('call_ended', handlers.onCallEnded));

    if (handlers.onOffer)
      unsubs.push(wsService.on('webrtc_offer_notification', handlers.onOffer));

    if (handlers.onAnswer)
      unsubs.push(wsService.on('webrtc_answer_notification', handlers.onAnswer));

    if (handlers.onIceCandidate)
      unsubs.push(wsService.on('ice_candidate_notification', handlers.onIceCandidate));

    if (handlers.onParticipantJoined)
      unsubs.push(wsService.on('participant_joined_notification', handlers.onParticipantJoined));

    if (handlers.onParticipantLeft)
      unsubs.push(wsService.on('participant_left_notification', handlers.onParticipantLeft));

    if (handlers.onQualityAlert)
      unsubs.push(wsService.on('connection_quality_alert', handlers.onQualityAlert));

    return () => unsubs.forEach(u => u());
    // run once; handlers should be stable (wrapped in useCallback by caller)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

/**
 * Convenience hook — subscribe to general notifications.
 *
 * @param {Function} onNotification  Receives the full WS message object.
 */
export const useNotificationEvents = (onNotification) => {
  useEffect(() => {
    // 'notification_message' is sent by the backend for appointments, prescriptions, etc.
    const unsub1 = wsService.on('notification_message', onNotification);
    // 'send_notification' is the type used by _send_to_user in notification_service.py
    const unsub2 = wsService.on('send_notification',    onNotification);
    return () => { unsub1(); unsub2(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useWebSocketConnection;
