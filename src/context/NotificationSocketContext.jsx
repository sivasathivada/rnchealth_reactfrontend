import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const NotificationSocketContext = createContext(null);

export const NotificationSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [isConnected, setIsConnected] = useState(false);

  const socketRef       = useRef(null);
  const reconnectTimer  = useRef(null);
  const reconnectCount  = useRef(0);
  const pingTimer       = useRef(null);
  const messageHandlers = useRef({});
  
  // Keep notify in a ref to avoid processNotification changing on every render
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const registerHandler = useCallback((type, handler) => {
    if (!messageHandlers.current[type]) messageHandlers.current[type] = [];
    messageHandlers.current[type].push(handler);
    return () => {
      messageHandlers.current[type] = (messageHandlers.current[type] || []).filter(h => h !== handler);
    };
  }, []);

  const processNotification = useCallback((eventData) => {
    const type = eventData.type;
    const handlers = messageHandlers.current[type] || [];
    
    handlers.forEach(handler => {
      try { handler(eventData); }
      catch (err) { console.error(`[Socket] Handler error for "${type}":`, err); }
    });

    const payload = eventData.data || eventData;
    const toast = notifyRef.current;

    switch (type) {
      case 'incoming_call':
        toast.info(`📞 Incoming ${payload.call_type || 'video'} call from ${payload.patient_name || 'Patient'}`);
        break;
      case 'call_ringing':
        toast.info('📳 Calling consultant...');
        break;
      case 'call_accepted':
        toast.success('✅ Call accepted! Connecting...');
        break;
      case 'call_declined':
        toast.error('❌ Call declined.');
        break;
      case 'call_ended':
        toast.info('📵 Call ended.');
        break;
      case 'connection_quality_alert':
        toast.warning(`⚠️ Poor connection: ${payload.quality}`);
        break;
      case 'notification_message': {
        // The backend wraps events as { type: 'notification_message', notification_type: '...', data: {...} }
        // Re-dispatch as the inner type so WebRTCContext handlers fire correctly
        const notifType = eventData.notification_type;
        if (notifType) {
          const reshapedEvent = { ...eventData, ...((eventData.data) || {}), type: notifType };
          // Call handlers registered for this specific notification_type
          const typeHandlers = messageHandlers.current[notifType] || [];
          typeHandlers.forEach(handler => {
            try { handler(reshapedEvent); }
            catch (err) { console.error(`[Socket] Handler error for "${notifType}":`, err); }
          });

          // Show toasts for call events
          const payload = { ...eventData, ...((eventData.data) || {}) };
          switch (notifType) {
            case 'incoming_call':
              toast.info(`📞 Incoming ${payload.call_type || 'video'} call from ${payload.caller_name || payload.patient_name || 'Consultant'}`);
              break;
            case 'call_ringing':
              toast.info('📳 Calling consultant...');
              break;
            case 'call_accepted':
              toast.success('✅ Call accepted! Connecting...');
              break;
            case 'call_declined':
              toast.error('❌ Call declined.');
              break;
            case 'call_ended':
              toast.info('📵 Call ended.');
              break;
            case 'appointment_update': {
              const action = payload.action || 'updated';
              toast.info(`📅 Appointment ${action}.`);
              break;
            }
            case 'appointment_reminder': {
              toast.warning(payload.message || `📅 Reminder: You have an upcoming video call in 10 minutes!`);
              break;
            }
            default:
              console.log('[Socket] notification_message sub-type:', notifType, payload);
          }
        }
        break;
      }
      default:
        console.log('[Socket] Event:', type);
    }
  }, []); // Stable: no dependencies

  const startPing = useCallback(() => {
    if (pingTimer.current) clearInterval(pingTimer.current);
    pingTimer.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }, []);

  const stopPing = useCallback(() => {
    if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
  }, []);

  const doConnect = useCallback(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('access_token');
    if (!token || socketRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `ws://127.0.0.1:8000/ws/notifications/${user.id}/?token=${token}`;
    console.log('[Socket] Connecting →', wsUrl);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[Socket] ✓ Connected');
      setIsConnected(true);
      reconnectCount.current = 0;
      startPing();
    };

    socket.onmessage = (event) => {
      try { processNotification(JSON.parse(event.data)); }
      catch (err) { console.error('[Socket] Parse error:', err); }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      stopPing();
      socketRef.current = null;
      
      // Auto-reconnect logic if not closed cleanly
      if (event.code !== 1000 && reconnectCount.current < 10) {
        const delay = Math.min(3000 * Math.pow(1.5, reconnectCount.current), 30000);
        reconnectCount.current += 1;
        reconnectTimer.current = setTimeout(doConnect, delay);
      }
    };
  }, [user?.id, startPing, stopPing, processNotification]);

  useEffect(() => {
    doConnect();
    return () => {
      clearTimeout(reconnectTimer.current);
      stopPing();
      if (socketRef.current) {
        socketRef.current.onclose = null; // Important: prevent reconnect on unmount
        socketRef.current.close(1000);
        socketRef.current = null;
      }
    };
  }, [user?.id, doConnect]); 

  const sendCommand = useCallback((type, payload = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  return (
    <NotificationSocketContext.Provider value={{ isConnected, registerHandler, sendCommand }}>
      {children}
    </NotificationSocketContext.Provider>
  );
};

export const useNotificationSocket = () => {
  const context = useContext(NotificationSocketContext);
  if (!context) throw new Error('useNotificationSocket must be used within NotificationSocketProvider');
  return context;
}; 