/**
 * WebSocket Service — Django Channels / Redis Real-Time Layer
 *
 * Connects to: ws://localhost:8000/ws/notifications/<user_id>/?token=<jwt>
 *
 * Handles:
 *  - notification_message     → general notifications (appointments, prescriptions)
 *  - incoming_call_notification → consultant receives incoming call from patient
 *  - call_ringing             → patient hears ringing confirmation
 *  - call_accepted_notification → both parties notified of acceptance
 *  - webrtc_offer_notification  → SDP offer forwarded
 *  - webrtc_answer_notification → SDP answer forwarded
 *  - ice_candidate_notification → ICE candidates forwarded
 *  - participant_joined_notification / participant_left_notification
 *  - connection_quality_alert   → poor connection warning
 *  - reconnection_alert
 *  - connection_established
 *  - call_ended / call_declined
 *  - pong                     → keep-alive response
 */

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY_MS  = 3000;   // 3 s base back-off
const MAX_RECONNECT_TRIES = 10;
const PING_INTERVAL_MS    = 25000;  // 25 s keep-alive

class WebSocketService {
  constructor() {
    /** @type {WebSocket|null} */
    this.ws            = null;
    this.userId        = null;
    this.token         = null;
    this.reconnectCount = 0;
    this.reconnectTimer = null;
    this.pingTimer      = null;
    this.isIntentionalClose = false;

    /** Map<eventType, Set<callback>> */
    this.listeners = new Map();
  }

  // ─── Connection ──────────────────────────────────────────────────────────────

  /**
   * Connect to the Django Channels WebSocket.
   * Call this once after the user logs in.
   *
   * @param {string|number} userId
   * @param {string}         token   - JWT access token
   */
  connect(userId, token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    this.userId = userId;
    this.token  = token;
    this.isIntentionalClose = false;
    this._createSocket();
  }

  _createSocket() {
    const url = `${WS_BASE_URL}/ws/notifications/${this.userId}/?token=${this.token}`;
    console.log('[WS] Connecting →', url);

    this.ws = new WebSocket(url);

    this.ws.onopen    = this._onOpen.bind(this);
    this.ws.onmessage = this._onMessage.bind(this);
    this.ws.onerror   = this._onError.bind(this);
    this.ws.onclose   = this._onClose.bind(this);
  }

  _onOpen() {
    console.log('[WS] Connected ✓');
    this.reconnectCount = 0;

    // Start keep-alive pings
    this._startPing();

    this._emit('ws_connected', { userId: this.userId });
  }

  _onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const msgType = data.type;

      console.log('[WS] ←', msgType, data);

      // Route to listeners
      this._emit(msgType, data);

      // Also emit a universal 'message' event so components can listen broadly
      this._emit('message', data);

    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  }

  _onError(err) {
    console.error('[WS] Error:', err);
    this._emit('ws_error', { error: err });
  }

  _onClose(event) {
    console.warn('[WS] Closed', event.code, event.reason);
    this._stopPing();
    this._emit('ws_disconnected', { code: event.code, reason: event.reason });

    if (!this.isIntentionalClose && this.reconnectCount < MAX_RECONNECT_TRIES) {
      const delay = RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectCount);
      console.log(`[WS] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectCount + 1})`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectCount++;
        this._createSocket();
      }, delay);
    } else if (this.reconnectCount >= MAX_RECONNECT_TRIES) {
      console.error('[WS] Max reconnection attempts reached. Giving up.');
      this._emit('ws_failed', {});
    }
  }

  disconnect() {
    this.isIntentionalClose = true;
    this._stopPing();
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'User logout');
      this.ws = null;
    }
    console.log('[WS] Disconnected intentionally');
  }

  // ─── Keep-alive ──────────────────────────────────────────────────────────────

  _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, PING_INTERVAL_MS);
  }

  _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ─── Send helpers ─────────────────────────────────────────────────────────────

  /**
   * Send a message to the server.
   * @param {object} payload
   */
  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn('[WS] Cannot send — socket not open:', payload);
    }
  }

  /** Patient calls consultant */
  initiateCall(sessionId, recipientId, callType = 'video') {
    this.send({
      type: 'initiate_call',
      session_id: sessionId,
      recipient_id: recipientId,
      call_type: callType,
    });
  }

  /** Consultant accepts the call */
  acceptCall(sessionId) {
    this.send({ type: 'accept_call', session_id: sessionId });
  }

  /** Either party declines */
  declineCall(sessionId, reason = 'user_declined') {
    this.send({ type: 'decline_call', session_id: sessionId, reason });
  }

  /** Either party hangs up */
  endCall(sessionId, notes = '') {
    this.send({ type: 'end_call', session_id: sessionId, notes });
  }

  /** Join the WebRTC room */
  joinCallRoom(sessionId) {
    this.send({ type: 'join_call_room', session_id: sessionId });
  }

  /** Leave the WebRTC room */
  leaveCallRoom(sessionId) {
    this.send({ type: 'leave_call_room', session_id: sessionId });
  }

  /** Send WebRTC SDP offer */
  sendOffer(sessionId, offer) {
    this.send({ type: 'webrtc_offer', session_id: sessionId, offer });
  }

  /** Send WebRTC SDP answer */
  sendAnswer(sessionId, answer) {
    this.send({ type: 'webrtc_answer', session_id: sessionId, answer });
  }

  /** Send ICE candidate */
  sendIceCandidate(sessionId, candidate) {
    this.send({ type: 'ice_candidate', session_id: sessionId, candidate });
  }

  /** Report connection quality */
  reportConnectionQuality(sessionId, quality, stats = {}) {
    this.send({ type: 'connection_quality', session_id: sessionId, quality, stats });
  }

  /** Notify that WebRTC peer connection was established */
  notifyConnectionEstablished(sessionId, connectionType = 'p2p') {
    this.send({ type: 'connection_established', session_id: sessionId, connection_type: connectionType });
  }

  /** Report a reconnection attempt */
  reportReconnectionAttempt(sessionId) {
    this.send({ type: 'reconnection_attempt', session_id: sessionId });
  }

  // ─── Event bus ───────────────────────────────────────────────────────────────

  /**
   * Subscribe to a WebSocket event type.
   * Returns an unsubscribe function.
   *
   * Supported types (from Django backend):
   *   ws_connected, ws_disconnected, ws_error, ws_failed
   *   connection_established, pong
   *   notification_message
   *   incoming_call_notification
   *   call_ringing
   *   call_accepted_notification, call_accepted
   *   call_declined
   *   call_ended
   *   webrtc_offer_notification, webrtc_answer_notification, ice_candidate_notification
   *   participant_joined_notification, participant_left_notification
   *   connection_quality_alert, reconnection_alert
   *   send_notification   (general fallback)
   *   message             (every message)
   *
   * @param {string}   eventType
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) set.delete(callback);
    };
  }

  /** Remove a specific listener */
  off(eventType, callback) {
    const set = this.listeners.get(eventType);
    if (set) set.delete(callback);
  }

  /** Emit internally to all subscribers */
  _emit(eventType, data) {
    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach(cb => {
        try { cb(data); }
        catch (err) { console.error(`[WS] Listener error for "${eventType}":`, err); }
      });
    }
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get state() {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN:       return 'connected';
      case WebSocket.CLOSING:    return 'closing';
      case WebSocket.CLOSED:     return 'disconnected';
      default:                   return 'unknown';
    }
  }
}

// Singleton — one connection per tab
export const wsService = new WebSocketService();
export default wsService;
