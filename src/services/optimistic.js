/**
 * Optimistic Updates Service
 * 
 * Manages optimistic updates with automatic rollback on failure
 * Integrates with Redis cache and backend API
 * 
 * Pattern:
 * 1. Update local state immediately
 * 2. Send to backend
 * 3. If success: update cache with server data
 * 4. If failure: rollback to previous state
 */

import { sessionManager } from './session';
import { cacheService } from './cache';

class OptimisticUpdateService {
  constructor() {
    this.operations = new Map(); // Track ongoing operations
    this.rollbackStack = []; // Stack for rollback operations
  }

  /**
   * Execute operation with optimistic update
   * 
   * @param {string} key - Cache key to update
   * @param {Function} updateFn - Function that updates the value
   * @param {Function} apiCall - API call to make
   * @param {Function} rollbackFn - Optional custom rollback
   */
  async execute(key, updateFn, apiCall, rollbackFn = null) {
    const operationId = Date.now().toString();
    
    // Step 1: Get current state
    const previousState = cacheService.get(key);
    
    // Step 2: Apply optimistic update
    const optimisticValue = updateFn(previousState);
    cacheService.set(key, optimisticValue);
    
    // Store operation info
    this.operations.set(operationId, {
      key,
      previousState,
      optimisticValue,
      rollbackFn,
      startTime: Date.now(),
    });

    try {
      // Step 3: Make API call
      const result = await apiCall();
      
      // Step 4: Update cache with server response
      if (result && result.data) {
        cacheService.set(key, result.data);
      }
      
      // Clean up
      this.operations.delete(operationId);
      return { success: true, data: result.data };
    } catch (error) {
      // Step 5: Rollback on error
      if (rollbackFn) {
        rollbackFn(previousState);
      } else {
        cacheService.set(key, previousState);
      }
      
      // Clean up
      this.operations.delete(operationId);
      
      return { success: false, error, previousState };
    }
  }

  /**
   * Batch operations with single rollback point
   */
  async executeBatch(operations) {
    const batchId = Date.now().toString();
    const checkpoints = [];
    const results = [];

    for (const op of operations) {
      // Create checkpoint
      const checkpoint = {
        key: op.key,
        previousState: cacheService.get(op.key),
      };
      checkpoints.push(checkpoint);

      try {
        // Execute operation
        const result = await this.execute(
          op.key,
          op.updateFn,
          op.apiCall,
          op.rollbackFn
        );
        results.push(result);

        if (!result.success) {
          // On first error, rollback all previous operations in this batch
          for (let i = checkpoints.length - 2; i >= 0; i--) {
            const cp = checkpoints[i];
            cacheService.set(cp.key, cp.previousState);
          }
          return {
            success: false,
            failedAt: operations.indexOf(op),
            results,
          };
        }
      } catch (error) {
        // Rollback all
        for (const cp of checkpoints) {
          cacheService.set(cp.key, cp.previousState);
        }
        return {
          success: false,
          failedAt: operations.indexOf(op),
          error,
          results,
        };
      }
    }

    return { success: true, results };
  }

  /**
   * Call-specific optimistic updates
   */
  async initiateCallOptimistic(callData, apiCall) {
    const callId = callData.id;
    
    return this.execute(
      `call:${callId}`,
      (previous) => ({
        ...callData,
        status: 'initiated',
        is_active: true,
        start_time: Date.now(),
        optimistic: true,
      }),
      apiCall,
      () => {
        // Custom rollback
        sessionManager.clearCallSession(callId);
      }
    );
  }

  async updateCallStatusOptimistic(callId, newStatus, apiCall) {
    return this.execute(
      `call:${callId}`,
      (call) => ({
        ...call,
        status: newStatus,
        optimistic: true,
      }),
      apiCall
    );
  }

  async updateConsultantAvailabilityOptimistic(consultantId, availability, apiCall) {
    return this.execute(
      `consultant:${consultantId}:availability`,
      () => availability,
      apiCall
    );
  }

  /**
   * Appointment updates
   */
  async scheduleAppointmentOptimistic(userId, appointment, apiCall) {
    return this.execute(
      `appointments:${userId}`,
      (appointments) => {
        const updated = [...(appointments || [])];
        updated.unshift({
          ...appointment,
          optimistic: true,
          createdAt: Date.now(),
        });
        return updated;
      },
      apiCall
    );
  }

  async cancelAppointmentOptimistic(userId, appointmentId, apiCall) {
    return this.execute(
      `appointments:${userId}`,
      (appointments) => {
        const updated = [...(appointments || [])];
        const index = updated.findIndex(a => a.id === appointmentId);
        if (index > -1) {
          updated[index] = {
            ...updated[index],
            status: 'cancelled',
            optimistic: true,
          };
        }
        return updated;
      },
      apiCall
    );
  }

  /**
   * Get operation status
   */
  getOperationStatus(operationId) {
    const op = this.operations.get(operationId);
    if (!op) return null;
    
    return {
      id: operationId,
      key: op.key,
      duration: Date.now() - op.startTime,
      isOptimistic: true,
    };
  }

  /**
   * Get all active operations
   */
  getActiveOperations() {
    const ops = [];
    for (const [id, op] of this.operations.entries()) {
      ops.push({
        id,
        key: op.key,
        duration: Date.now() - op.startTime,
      });
    }
    return ops;
  }

  /**
   * Rollback all operations
   */
  rollbackAll() {
    for (const [operationId, op] of this.operations.entries()) {
      cacheService.set(op.key, op.previousState);
      this.operations.delete(operationId);
    }
    console.log('[Optimistic] All operations rolled back');
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const operations = Array.from(this.operations.values());
    const avgDuration = operations.length > 0
      ? operations.reduce((sum, op) => sum + (Date.now() - op.startTime), 0) / operations.length
      : 0;

    return {
      activeOperations: operations.length,
      avgDurationMs: avgDuration.toFixed(2),
      operations: this.getActiveOperations(),
    };
  }
}

// Singleton instance
export const optimisticUpdateService = new OptimisticUpdateService();

export default OptimisticUpdateService;
