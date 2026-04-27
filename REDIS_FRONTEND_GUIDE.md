# Frontend Redis Integration Guide

## Overview

Your React frontend now has enterprise-grade Redis-like caching and session management that mirrors your Django backend. This guide shows how to use these services in your consultations app.

---

## 📦 Services Created

### 1. **`src/services/cache.js`** - CacheService
Redis-compatible cache with TTL, subscriptions, and persistence

### 2. **`src/services/session.js`** - SessionManager  
User sessions, call state, appointments, and presence tracking

### 3. **`src/services/optimistic.js`** - OptimisticUpdateService
Optimistic updates with automatic rollback on failures

### 4. **`src/hooks/useRedis.js`** - React Hooks
Easy integration with React components

---

## 🚀 Quick Start Examples

### Example 1: Basic Cache Usage

```javascript
import { useCache } from '../hooks/useRedis';

export default function ConsultantAvailability() {
  // Cache with 10 minute TTL
  const [availability, updateAvailability, deleteAvailability] = 
    useCache('consultant:availability', []);

  return (
    <div>
      <h2>Availability: {availability.length} slots</h2>
    </div>
  );
}
```

### Example 2: Call Session Management

```javascript
import { useCallSession } from '../hooks/useRedis';

export default function CallRoom({ callId }) {
  const { callSession, updateStatus, recordMetric, updateQuality } = 
    useCallSession(callId);

  const handleWebRTCConnection = () => {
    recordMetric('connection'); // Record connection established
    updateQuality('excellent');
  };

  const handleEndCall = () => {
    updateStatus('completed');
  };

  return (
    <div>
      <h3>Call Status: {callSession?.status}</h3>
      <p>Quality: {callSession?.connection_quality}</p>
      <button onClick={handleEndCall}>End Call</button>
    </div>
  );
}
```

### Example 3: Optimistic Updates

```javascript
import { useOptimisticUpdate } from '../hooks/useRedis';
import { appointmentsAPI } from '../services/api';
import { sessionManager } from '../services/session';

export default function ScheduleAppointment() {
  const { execute, isLoading, error } = useOptimisticUpdate();

  const handleSchedule = async (appointmentData) => {
    const result = await execute(
      `appointments:${userId}`,
      (appointments) => [
        { ...appointmentData, id: Date.now() },
        ...(appointments || [])
      ],
      () => appointmentsAPI.book(appointmentData)
    );

    if (result.success) {
      console.log('Appointment scheduled!');
    }
  };

  return <button onClick={() => handleSchedule({...})}>Schedule</button>;
}
```

### Example 4: Appointments Management

```javascript
import { useAppointments } from '../hooks/useRedis';

export default function AppointmentsList({ userId }) {
  const { appointments, addAppointment, removeAppointment, refresh } = 
    useAppointments(userId);

  const handleRefresh = async () => {
    await refresh(() => appointmentsAPI.list());
  };

  return (
    <div>
      {appointments.map(apt => (
        <div key={apt.id}>
          <h4>{apt.title}</h4>
          <p>{apt.time}</p>
          <button onClick={() => removeAppointment(apt.id)}>Cancel</button>
        </div>
      ))}
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
}
```

### Example 5: Presence Tracking

```javascript
import { useSession } from '../hooks/useRedis';

export default function UserStatus() {
  const { userSession, setPresence } = useSession();

  const handleStatusChange = (status) => {
    setPresence(status); // 'online', 'offline', 'busy', 'away'
  };

  return (
    <div>
      <p>Status: {userSession?.role}</p>
      <button onClick={() => handleStatusChange('busy')}>Mark as Busy</button>
      <button onClick={() => handleStatusChange('online')}>Go Online</button>
    </div>
  );
}
```

---

## 📋 API Reference

### CacheService

```javascript
import { cacheService } from '../services/cache';

// SET operations
cacheService.set(key, value, ttl = null);
cacheService.get(key);
cacheService.delete(key);

// LIST operations
cacheService.lpush(key, value);    // Add to front
cacheService.rpush(key, value);    // Add to end
cacheService.lpop(key);            // Remove from front
cacheService.rpop(key);            // Remove from end
cacheService.lrange(key, start, stop);
cacheService.llen(key);

// HASH operations
cacheService.hset(key, field, value);
cacheService.hmset(key, fields);
cacheService.hget(key, field);
cacheService.hmget(key, fields);
cacheService.hgetall(key);
cacheService.hdel(key, field);
cacheService.hexists(key, field);

// Subscriptions
const unsubscribe = cacheService.subscribe(key, (event) => {
  console.log('Cache changed:', event.operation, event.value);
});
unsubscribe(); // Stop listening

// Utilities
cacheService.keys(pattern);        // Find keys by pattern
cacheService.clear();              // Clear all cache
cacheService.getMetrics();         // Get cache stats
```

### SessionManager

```javascript
import { sessionManager } from '../services/session';

// User sessions
sessionManager.setUserSession(user);
sessionManager.getUserSession(userId);
sessionManager.updateUserActivity(userId);

// Call sessions
sessionManager.createCallSession(callData);
sessionManager.getCallSession(callId);
sessionManager.updateCallStatus(callId, status);
sessionManager.recordICECandidate(callId);
sessionManager.recordOfferExchanged(callId);
sessionManager.recordAnswerExchanged(callId);
sessionManager.recordConnectionEstablished(callId);
sessionManager.recordReconnectionAttempt(callId);
sessionManager.updateConnectionQuality(callId, quality);

// Appointments
sessionManager.setAppointments(userId, appointments);
sessionManager.getAppointments(userId);
sessionManager.addAppointment(userId, appointment);
sessionManager.updateAppointment(userId, appointmentId, updates);
sessionManager.removeAppointment(userId, appointmentId);

// Call history
sessionManager.addToCallHistory(userId, callRecord);
sessionManager.getCallHistory(userId, limit = 10);

// Presence
sessionManager.setUserPresence(userId, status);
sessionManager.getUserPresence(userId);
sessionManager.getAllPresence();

// Metrics
sessionManager.getSessionMetrics();
```

### OptimisticUpdateService

```javascript
import { optimisticUpdateService } from '../services/optimistic';

// Single operation
const result = await optimisticUpdateService.execute(
  key,
  updateFn,      // Function to update value
  apiCall,       // Async function making API call
  rollbackFn     // Optional custom rollback
);

// Batch operations
const result = await optimisticUpdateService.executeBatch([
  { key, updateFn, apiCall },
  { key, updateFn, apiCall },
]);

// Call operations
await optimisticUpdateService.initiateCallOptimistic(callData, apiCall);
await optimisticUpdateService.updateCallStatusOptimistic(callId, status, apiCall);
```

---

## 🔄 Data Flow Example: Schedule Appointment

```
User clicks "Schedule Appointment"
           ↓
1. Optimistic update to cache
   - Add to appointments list
   - Show loading state
           ↓
2. Call backend API
   - POST /api/appointments/book/
           ↓
3. Backend responds
           ↓
   ├─ Success → Update cache with server data
   │            Show success notification
   │            
   └─ Failure → Rollback to previous state
                Show error notification
```

---

## 📊 Cache Key Naming Convention

Following your backend structure:

```
user:{userId}                              - User session data
call:{callId}                              - Call session state
webrtc:{callId}                            - WebRTC connection state
appointments:{userId}                      - User's appointments
call_history:{userId}                      - Recent calls
consultant:{consultantId}:availability     - Consultant slots
incoming_calls:{userId}                    - Pending calls queue
notifications:{userId}                     - Recent notifications
presence                                   - All user presence (hash)
```

---

## ⚡ Performance Tips

### 1. Set Appropriate TTLs

```javascript
// Short TTL for data that changes frequently
cacheService.set('consultant:availability', data, 300); // 5 min

// Longer TTL for stable data
cacheService.set('user:profile', data, 3600); // 1 hour

// No TTL for session state (manual cleanup)
sessionManager.setUserSession(user);
```

### 2. Use Subscriptions for Real-Time Updates

```javascript
// Instead of polling
const unsubscribe = cacheService.subscribe('call:123', (event) => {
  if (event.operation === 'set') {
    // Update UI with new call state
    updateUI(event.value);
  }
});
```

### 3. Batch Optimistic Updates

```javascript
await optimisticUpdateService.executeBatch([
  {
    key: 'appointments:user1',
    updateFn: (apts) => [...apts, newApt],
    apiCall: () => appointmentsAPI.create(newApt),
  },
  {
    key: 'user:1:stats',
    updateFn: (stats) => ({ ...stats, appointments: stats.appointments + 1 }),
    apiCall: () => userAPI.updateStats(),
  },
]);
```

### 4. Monitor Cache Health

```javascript
import { useCacheMetrics } from '../hooks/useRedis';

export default function CacheMonitor() {
  const metrics = useCacheMetrics(5000); // Update every 5 seconds

  return (
    <div>
      <p>Hit Rate: {metrics.hitRate}</p>
      <p>Cache Size: {metrics.memorySize}</p>
      <p>Total Hits: {metrics.hits}</p>
    </div>
  );
}
```

---

## 🔌 Integration with WebSocket

When WebSocket sends updates:

```javascript
// In NotificationSocketContext.jsx
const handleIncomingCall = (callData) => {
  // Create session in Redis
  sessionManager.createCallSession(callData);
  
  // Subscribers automatically notified
  // Components re-render with new data
};

const handleAppointmentScheduled = (appointmentData) => {
  // Add to appointments cache
  sessionManager.addAppointment(userId, appointmentData);
  
  // UI automatically updates
};
```

---

## 🚨 Error Handling

```javascript
const handleOperationWithErrorHandling = async () => {
  try {
    const result = await optimisticUpdateService.execute(
      key,
      updateFn,
      apiCall
    );

    if (!result.success) {
      // Automatic rollback happened
      console.log('Rolled back to:', result.previousState);
      showErrorNotification(result.error.message);
    }
  } catch (error) {
    console.error('Operation failed:', error);
    // Manual recovery if needed
    sessionManager.clearCallSession(callId);
  }
};
```

---

## 📈 Scalability

### Memory Management
- Auto-cleanup of expired items
- localStorage as secondary storage
- Configurable cache limits

### Performance
- In-memory cache for O(1) lookups
- TTL-based automatic cleanup
- Batch operations for efficiency

### Monitoring
```javascript
// Get comprehensive metrics
const metrics = sessionManager.getSessionMetrics();
console.table({
  'Active Calls': metrics.activeCalls,
  'User Sessions': metrics.userSessions,
  'Online Users': metrics.onlineUsers,
  'Cache Hit Rate': metrics.cache.hitRate,
});
```

---

## 🔐 Data Persistence

Data persists across page refreshes via localStorage:

```javascript
// On page reload
const cache = new CacheService();
// Automatically loads from localStorage
// Restores in-memory cache
```

---

## 🧪 Testing Cache

```javascript
import { cacheService, sessionManager } from '../services/';

test('Cache operations', () => {
  cacheService.set('test', { value: 1 }, 300);
  expect(cacheService.get('test')).toEqual({ value: 1 });
  
  cacheService.delete('test');
  expect(cacheService.get('test')).toBeNull();
});

test('Session management', () => {
  const call = sessionManager.createCallSession({
    id: '123',
    patient_id: 'p1',
    consultant_id: 'c1',
  });
  
  expect(call.status).toBe('initiated');
  sessionManager.updateCallStatus('123', 'ongoing');
  expect(sessionManager.getCallSession('123').status).toBe('ongoing');
});
```

---

## 🎯 Next Steps

1. ✅ Import hooks in your components
2. ✅ Replace HTTP calls with optimistic updates
3. ✅ Monitor cache metrics
4. ✅ Integrate with WebSocket notifications
5. ✅ Test with real backend calls

---

## 📞 Integration with Backend

These services seamlessly work with your backend:

```
Frontend (Redis Cache)  ←→  Backend API  ←→  Backend Redis (DB 0-2)
├─ Call state           ├─ REST endpoints    ├─ Celery broker
├─ Sessions             ├─ WebSocket         ├─ Result backend
├─ Appointments         └─ Channels          └─ Django cache
└─ Presence                                       

Sync happens via:
1. WebSocket (real-time)
2. Optimistic updates + API
3. Periodic refresh
```

---

## ✨ Features Summary

✅ Redis-like API (SET, GET, LPUSH, HSET, etc.)
✅ TTL-based expiration
✅ localStorage persistence
✅ Subscription system for reactivity
✅ Optimistic updates with rollback
✅ Call session state management
✅ Appointment caching
✅ Presence tracking
✅ Performance monitoring
✅ Zero configuration needed

Ready to use! 🚀
