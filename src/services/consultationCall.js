/**
 * Consultation Call Orchestrator
 * 
 * High-level service orchestrating call lifecycle with Redis caching,
 * optimistic updates, and WebSocket integration
 * 
 * Mirrors backend call_session_service.py + tasks.py patterns
 */

import { consultantsAPI, appointmentsAPI } from './api';
import { sessionManager } from './session';
import { optimisticUpdateService } from './optimistic';
import { cacheService } from './cache';

class ConsultationCallService {
  constructor() {
    this.callTimeouts = new Map(); // Track call timeouts
    this.connectionTimeouts = new Map(); // Track connection timeouts
  }

  /**
   * Initiate Call (Immediate Consultation)
   * 
   * Pattern:
   * 1. Create call session optimistically
   * 2. Send initiation to backend
   * 3. Wait for consultant acceptance
   */
  async initiateCall(patientId, consultantId, reason = '') {
    const callId = `call_${Date.now()}`;
    const callData = {
      id: callId,
      session_id: callId,
      patient_id: patientId,
      consultant_id: consultantId,
      initiator: patientId,
      reason,
      start_time: Date.now(),
    };

    // Optimistic update
    const result = await optimisticUpdateService.execute(
      `call:${callId}`,
      () => ({
        ...callData,
        status: 'initiated',
        is_active: true,
        connection_quality: 'unknown',
        metrics: {
          ice_candidates_exchanged: 0,
          offer_exchanged: false,
          answer_exchanged: false,
          connection_established: false,
        },
      }),
      () => consultantsAPI.initiateCall({
        consultant_id: consultantId,
        reason,
      }),
      () => {
        // Cleanup on failure
        sessionManager.clearCallSession(callId);
      }
    );

    if (result.success) {
      // Set timeout for unanswered call (45 seconds)
      this.setCallTimeout(callId, 45);
      
      console.log('[Call] Initiated:', callId);
      return { success: true, callId, data: result.data };
    }

    return { success: false, error: result.error };
  }

  /**
   * Accept Call (Consultant or Patient)
   */
  async acceptCall(callId, userId) {
    const result = await optimisticUpdateService.execute(
      `call:${callId}`,
      (call) => ({
        ...call,
        status: 'ongoing',
        is_active: true,
        accepted_by: userId,
        accepted_at: Date.now(),
      }),
      () => consultantsAPI.acceptCall({ call_id: callId }),
      (previousState) => {
        sessionManager.updateCallStatus(callId, previousState.status);
      }
    );

    if (result.success) {
      // Clear any pending timeouts
      this.clearCallTimeout(callId);
      
      // Set connection timeout (60 seconds to establish)
      this.setConnectionTimeout(callId, 60);
      
      console.log('[Call] Accepted:', callId);
    }

    return result;
  }

  /**
   * Decline Call
   */
  async declineCall(callId, reason = '') {
    const result = await optimisticUpdateService.execute(
      `call:${callId}`,
      (call) => ({
        ...call,
        status: 'cancelled',
        is_active: false,
        decline_reason: reason,
      }),
      () => consultantsAPI.declineCall({ call_id: callId, reason }),
      (previousState) => {
        sessionManager.updateCallStatus(callId, previousState.status);
      }
    );

    if (result.success) {
      this.clearCallTimeout(callId);
      this.clearConnectionTimeout(callId);
      sessionManager.clearCallSession(callId);
    }

    return result;
  }

  /**
   * End Call
   */
  async endCall(callId) {
    const call = sessionManager.getCallSession(callId);
    if (!call) return { success: false, error: 'Call not found' };

    const result = await optimisticUpdateService.execute(
      `call:${callId}`,
      (c) => ({
        ...c,
        status: 'completed',
        is_active: false,
        end_time: Date.now(),
        duration: (Date.now() - c.start_time) / 1000,
      }),
      () => consultantsAPI.endCall({ call_id: callId }),
      (previousState) => {
        sessionManager.updateCallStatus(callId, previousState.status);
      }
    );

    if (result.success) {
      // Save to history
      this.saveToCallHistory(call.patient_id, call);
      this.saveToCallHistory(call.consultant_id, call);
      
      // Cleanup
      this.clearCallTimeout(callId);
      this.clearConnectionTimeout(callId);
      
      console.log('[Call] Ended:', callId);
    }

    return result;
  }

  /**
   * Record WebRTC Metrics
   */
  async recordWebRTCMetric(callId, metricType, data = {}) {
    const call = sessionManager.getCallSession(callId);
    if (!call) return;

    switch (metricType) {
      case 'ice_candidate':
        sessionManager.recordICECandidate(callId);
        break;
      
      case 'offer_exchanged':
        sessionManager.recordOfferExchanged(callId);
        // Send offer to backend
        await consultantsAPI.recordOfferExchanged({
          call_id: callId,
          offer: data.offer,
        });
        break;
      
      case 'answer_exchanged':
        sessionManager.recordAnswerExchanged(callId);
        // Send answer to backend
        await consultantsAPI.recordAnswerExchanged({
          call_id: callId,
          answer: data.answer,
        });
        break;
      
      case 'connection_established':
        sessionManager.recordConnectionEstablished(callId);
        this.clearConnectionTimeout(callId);
        await consultantsAPI.recordConnectionEstablished({
          call_id: callId,
        });
        break;
      
      case 'reconnection_attempt':
        sessionManager.recordReconnectionAttempt(callId);
        await consultantsAPI.recordReconnectionAttempt({
          call_id: callId,
        });
        
        // If too many reconnection attempts, end call
        if (call.reconnection_attempts > 5) {
          await this.endCall(callId);
        }
        break;
      
      case 'quality_update':
        sessionManager.updateConnectionQuality(callId, data.quality);
        await consultantsAPI.recordConnectionQuality({
          call_id: callId,
          quality: data.quality,
          stats: data.stats || {},
        });
        break;

      default:
        console.warn('[Call] Unknown metric type:', metricType);
    }
  }

  /**
   * Call History Management
   */
  saveToCallHistory(userId, callData) {
    const historyRecord = {
      id: callData.id,
      with_user: callData.patient_id === userId ? callData.consultant_id : callData.patient_id,
      status: callData.status,
      duration: callData.duration || 0,
      started_at: callData.start_time,
      ended_at: callData.end_time,
      quality: callData.connection_quality,
    };

    sessionManager.addToCallHistory(userId, historyRecord);
    
    // Also send to backend for persistence
    this.syncCallHistory(userId, historyRecord);
  }

  async syncCallHistory(userId, callRecord) {
    try {
      await consultantsAPI.recordCallHistory(callRecord);
    } catch (error) {
      console.error('[Call] Error syncing history:', error);
    }
  }

  getCallHistory(userId, limit = 10) {
    return sessionManager.getCallHistory(userId, limit);
  }

  /**
   * Call Timeout Management
   */
  setCallTimeout(callId, seconds) {
    if (this.callTimeouts.has(callId)) {
      clearTimeout(this.callTimeouts.get(callId));
    }

    const timeout = setTimeout(() => {
      console.log(`[Call] Timeout: No answer after ${seconds}s - ${callId}`);
      this.handleCallTimeout(callId);
      this.callTimeouts.delete(callId);
    }, seconds * 1000);

    this.callTimeouts.set(callId, timeout);
  }

  clearCallTimeout(callId) {
    if (this.callTimeouts.has(callId)) {
      clearTimeout(this.callTimeouts.get(callId));
      this.callTimeouts.delete(callId);
    }
  }

  async handleCallTimeout(callId) {
    const call = sessionManager.getCallSession(callId);
    if (call && call.status === 'initiated') {
      await this.endCall(callId);
    }
  }

  /**
   * Connection Timeout Management
   */
  setConnectionTimeout(callId, seconds) {
    if (this.connectionTimeouts.has(callId)) {
      clearTimeout(this.connectionTimeouts.get(callId));
    }

    const timeout = setTimeout(() => {
      console.log(`[Call] Connection timeout: Failed to establish - ${callId}`);
      this.handleConnectionTimeout(callId);
      this.connectionTimeouts.delete(callId);
    }, seconds * 1000);

    this.connectionTimeouts.set(callId, timeout);
  }

  clearConnectionTimeout(callId) {
    if (this.connectionTimeouts.has(callId)) {
      clearTimeout(this.connectionTimeouts.get(callId));
      this.connectionTimeouts.delete(callId);
    }
  }

  async handleConnectionTimeout(callId) {
    const call = sessionManager.getCallSession(callId);
    if (call && call.status === 'ongoing' && !call.metrics.connection_established) {
      await this.endCall(callId);
    }
  }

  /**
   * Get Call Analytics
   */
  getCallAnalytics(callId) {
    const call = sessionManager.getCallSession(callId);
    if (!call) return null;

    return {
      id: callId,
      status: call.status,
      duration: call.duration || 0,
      quality: call.connection_quality,
      reconnections: call.reconnection_attempts,
      metrics: call.metrics,
      started_at: call.start_time,
      ended_at: call.end_time,
    };
  }

  /**
   * Consultant Availability
   */
  async getConsultantAvailability(consultantId) {
    const cacheKey = `consultant:${consultantId}:availability`;
    let availability = cacheService.get(cacheKey);

    if (!availability) {
      // Fetch from backend
      try {
        const response = await consultantsAPI.getAvailability(consultantId);
        availability = response.data;
        cacheService.set(cacheKey, availability, 300); // 5 min cache
      } catch (error) {
        console.error('[Availability] Error fetching:', error);
        return null;
      }
    }

    return availability;
  }

  /**
   * Scheduled Call (Appointment)
   */
  async scheduleCall(patientId, consultantId, scheduledTime, reason = '') {
    const appointmentData = {
      patient_id: patientId,
      consultant_id: consultantId,
      scheduled_time: scheduledTime,
      reason,
    };

    const result = await optimisticUpdateService.execute(
      `appointments:${patientId}`,
      (appointments) => [
        {
          id: `apt_${Date.now()}`,
          ...appointmentData,
          status: 'scheduled',
          created_at: Date.now(),
        },
        ...(appointments || []),
      ],
      () => appointmentsAPI.book(appointmentData),
      (previousState) => {
        sessionManager.setAppointments(patientId, previousState);
      }
    );

    if (result.success) {
      // Also update consultant's perspective
      sessionManager.addAppointment(
        consultantId,
        result.data[0] // First item is the new appointment
      );
    }

    return result;
  }

  /**
   * Get All Metrics for Dashboard
   */
  getMetrics() {
    const sessions = sessionManager.getSessionMetrics();
    const cache = cacheService.getMetrics();

    return {
      cache: {
        hitRate: cache.hitRate,
        size: cache.memorySize,
        operations: cache.total,
      },
      sessions: {
        activeCalls: sessions.activeCalls,
        userSessions: sessions.userSessions,
        onlineUsers: sessions.onlineUsers,
      },
      timeouts: {
        activeCallTimeouts: this.callTimeouts.size,
        activeConnectionTimeouts: this.connectionTimeouts.size,
      },
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    // Clear all timeouts
    this.callTimeouts.forEach(timeout => clearTimeout(timeout));
    this.connectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.callTimeouts.clear();
    this.connectionTimeouts.clear();
    
    console.log('[Call] Service destroyed');
  }
}

// Singleton instance
export const consultationCallService = new ConsultationCallService();

export default ConsultationCallService;
