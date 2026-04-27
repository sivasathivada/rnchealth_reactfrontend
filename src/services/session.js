/**
 * Enterprise Session Manager
 * 
 * Manages user sessions, call state, and WebRTC connection data
 * Uses Redis-like patterns via CacheService + localStorage
 * 
 * Session Structure:
 * - user:{userId}: Current user data
 * - call:{callId}: Active call session
 * - webrtc:{callId}: WebRTC connection state
 * - appointments: User appointments list
 * - call_history: Recent call history
 */

import { cacheService } from './cache';

class SessionManager {
  constructor() {
    this.sessionTimeout = 3600; // 1 hour TTL
    this.callStateTimeout = 600; // 10 minutes for call state
  }

  /**
   * USER SESSION MANAGEMENT
   */

  setUserSession(user) {
    const sessionKey = `user:${user.id}`;
    cacheService.set(sessionKey, {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_verified: user.is_verified,
      avatar: user.avatar,
      lastActivity: Date.now(),
    }, this.sessionTimeout);

    console.log(`[Session] User session created: ${user.id}`);
  }

  getUserSession(userId) {
    return cacheService.get(`user:${userId}`);
  }

  updateUserActivity(userId) {
    const session = this.getUserSession(userId);
    if (session) {
      session.lastActivity = Date.now();
      cacheService.set(`user:${userId}`, session, this.sessionTimeout);
    }
  }

  clearUserSession(userId) {
    cacheService.delete(`user:${userId}`);
    console.log(`[Session] User session cleared: ${userId}`);
  }

  /**
   * ACTIVE CALL STATE
   */

  createCallSession(callData) {
    const callKey = `call:${callData.id}`;
    const callState = {
      id: callData.id,
      session_id: callData.session_id,
      patient_id: callData.patient_id,
      consultant_id: callData.consultant_id,
      status: 'initiated', // initiated, ongoing, completed, cancelled
      initiator: callData.initiator,
      start_time: callData.start_time || Date.now(),
      end_time: null,
      duration: 0,
      is_active: true,
      connection_quality: 'unknown',
      reconnection_attempts: 0,
      metrics: {
        ice_candidates_exchanged: 0,
        offer_exchanged: false,
        answer_exchanged: false,
        connection_established: false,
      },
    };

    cacheService.set(callKey, callState, this.callStateTimeout);
    console.log(`[Session] Call session created: ${callData.id}`);
    
    return callState;
  }

  getCallSession(callId) {
    return cacheService.get(`call:${callId}`);
  }

  updateCallStatus(callId, status) {
    const call = this.getCallSession(callId);
    if (call) {
      call.status = status;
      if (status === 'completed' || status === 'cancelled') {
        call.is_active = false;
        call.end_time = Date.now();
        call.duration = (call.end_time - call.start_time) / 1000; // seconds
      }
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  recordICECandidate(callId) {
    const call = this.getCallSession(callId);
    if (call) {
      call.metrics.ice_candidates_exchanged++;
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  recordOfferExchanged(callId) {
    const call = this.getCallSession(callId);
    if (call) {
      call.metrics.offer_exchanged = true;
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  recordAnswerExchanged(callId) {
    const call = this.getCallSession(callId);
    if (call) {
      call.metrics.answer_exchanged = true;
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  recordConnectionEstablished(callId) {
    const call = this.getCallSession(callId);
    if (call) {
      call.metrics.connection_established = true;
      call.connection_quality = 'excellent';
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  recordReconnectionAttempt(callId) {
    const call = this.getCallSession(callId);
    if (call) {
      call.reconnection_attempts++;
      if (call.reconnection_attempts > 5) {
        call.connection_quality = 'critical';
      } else if (call.reconnection_attempts > 2) {
        call.connection_quality = 'warning';
      }
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  updateConnectionQuality(callId, quality) {
    const call = this.getCallSession(callId);
    if (call) {
      call.connection_quality = quality;
      cacheService.set(`call:${callId}`, call, this.callStateTimeout);
    }
  }

  clearCallSession(callId) {
    cacheService.delete(`call:${callId}`);
    cacheService.delete(`webrtc:${callId}`);
    console.log(`[Session] Call session cleared: ${callId}`);
  }

  /**
   * WEBRTC CONNECTION STATE
   */

  setWebRTCState(callId, state) {
    const rtcKey = `webrtc:${callId}`;
    cacheService.set(rtcKey, {
      callId,
      localDescription: state.localDescription || null,
      remoteDescription: state.remoteDescription || null,
      connectionState: state.connectionState || 'connecting',
      iceConnectionState: state.iceConnectionState || 'checking',
      signalingState: state.signalingState || 'stable',
      candidates: state.candidates || [],
      createdAt: Date.now(),
    }, this.callStateTimeout);
  }

  getWebRTCState(callId) {
    return cacheService.get(`webrtc:${callId}`);
  }

  addICECandidate(callId, candidate) {
    const state = this.getWebRTCState(callId);
    if (state) {
      state.candidates.push({
        candidate,
        timestamp: Date.now(),
      });
      cacheService.set(`webrtc:${callId}`, state, this.callStateTimeout);
    }
  }

  /**
   * APPOINTMENTS MANAGEMENT
   */

  setAppointments(userId, appointments) {
    const key = `appointments:${userId}`;
    cacheService.set(key, appointments, 600); // 10 minutes TTL
    console.log(`[Session] Appointments cached for ${userId}: ${appointments.length} items`);
  }

  getAppointments(userId) {
    return cacheService.get(`appointments:${userId}`) || [];
  }

  addAppointment(userId, appointment) {
    const key = `appointments:${userId}`;
    let appointments = this.getAppointments(userId);
    appointments.unshift(appointment);
    cacheService.set(key, appointments, 600);
  }

  updateAppointment(userId, appointmentId, updates) {
    const key = `appointments:${userId}`;
    let appointments = this.getAppointments(userId);
    const index = appointments.findIndex(a => a.id === appointmentId);
    if (index > -1) {
      appointments[index] = { ...appointments[index], ...updates };
      cacheService.set(key, appointments, 600);
    }
  }

  removeAppointment(userId, appointmentId) {
    const key = `appointments:${userId}`;
    let appointments = this.getAppointments(userId);
    appointments = appointments.filter(a => a.id !== appointmentId);
    cacheService.set(key, appointments, 600);
  }

  /**
   * CALL HISTORY
   */

  addToCallHistory(userId, callRecord) {
    const key = `call_history:${userId}`;
    let history = cacheService.get(key) || [];
    
    // Keep only last 50 calls
    history.unshift(callRecord);
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    cacheService.set(key, history, 3600); // 1 hour TTL
  }

  getCallHistory(userId, limit = 10) {
    const key = `call_history:${userId}`;
    const history = cacheService.get(key) || [];
    return history.slice(0, limit);
  }

  clearCallHistory(userId) {
    cacheService.delete(`call_history:${userId}`);
  }

  /**
   * CONSULTANT AVAILABILITY
   */

  setConsultantAvailability(consultantId, availability) {
    const key = `consultant:${consultantId}:availability`;
    cacheService.set(key, availability, 600); // 10 minutes TTL
  }

  getConsultantAvailability(consultantId) {
    const key = `consultant:${consultantId}:availability`;
    return cacheService.get(key);
  }

  /**
   * INCOMING CALLS QUEUE
   */

  addIncomingCall(callData) {
    const userId = callData.recipient_id;
    const key = `incoming_calls:${userId}`;
    cacheService.rpush(key, {
      id: callData.id,
      caller_id: callData.caller_id,
      caller_name: callData.caller_name,
      session_id: callData.session_id,
      timestamp: Date.now(),
      status: 'pending',
    });
  }

  getIncomingCalls(userId) {
    const key = `incoming_calls:${userId}`;
    return cacheService.get(key) || [];
  }

  removeIncomingCall(userId, callId) {
    const key = `incoming_calls:${userId}`;
    let calls = cacheService.get(key) || [];
    calls = calls.filter(c => c.id !== callId);
    if (calls.length > 0) {
      cacheService.set(key, calls);
    } else {
      cacheService.delete(key);
    }
  }

  /**
   * NOTIFICATION QUEUE
   */

  addNotification(userId, notification) {
    const key = `notifications:${userId}`;
    const id = Date.now().toString();
    const notifData = { id, ...notification, timestamp: Date.now() };
    cacheService.rpush(key, notifData);
    
    // Keep only last 100 notifications
    const notifs = cacheService.get(key) || [];
    if (notifs.length > 100) {
      cacheService.set(key, notifs.slice(-100));
    }
  }

  getNotifications(userId, limit = 20) {
    const key = `notifications:${userId}`;
    const notifs = cacheService.lrange(key, -limit, -1);
    return notifs ? notifs.reverse() : [];
  }

  clearNotifications(userId) {
    cacheService.delete(`notifications:${userId}`);
  }

  /**
   * PRESENCE TRACKING
   */

  setUserPresence(userId, status = 'online') {
    cacheService.hset('presence', userId, {
      status, // online, offline, busy, away
      lastSeen: Date.now(),
    });
  }

  getUserPresence(userId) {
    return cacheService.hget('presence', userId) || { status: 'offline' };
  }

  getAllPresence() {
    return cacheService.hgetall('presence');
  }

  /**
   * GENERAL UTILITIES
   */

  getSessionMetrics() {
    const metrics = cacheService.getMetrics();
    return {
      cache: metrics,
      activeCalls: cacheService.keys('call:*').length,
      userSessions: cacheService.keys('user:*').length,
      onlineUsers: Object.values(this.getAllPresence()).filter(p => p.status === 'online').length,
    };
  }

  clearAllSessions() {
    cacheService.clear();
    console.log('[Session] All sessions cleared');
  }

  subscribeToCallChanges(callId, callback) {
    return cacheService.subscribe(`call:${callId}`, callback);
  }

  subscribeToUserSession(userId, callback) {
    return cacheService.subscribe(`user:${userId}`, callback);
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

export default SessionManager;
