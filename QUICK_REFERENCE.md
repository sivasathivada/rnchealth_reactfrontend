# Frontend Redis - Quick Reference

## 🎯 Most Common Patterns

### Pattern 1: Display Cached Data

```javascript
import { useCache } from '../hooks/useRedis';

// Simple display
const [data] = useCache('key', defaultValue);

// Example: Show consultant availability
const [availability] = useCache('consultant:123:availability', []);

return <div>{availability.length} slots</div>;
```

### Pattern 2: Update with Optimistic UI

```javascript
import { useOptimisticUpdate } from '../hooks/useRedis';

const { execute } = useOptimisticUpdate();

const handleUpdate = async () => {
  await execute(
    'key',
    (oldValue) => newValue,        // What to show immediately
    () => api.call(),              // Backend call
    (rollback) => cleanup()         // Optional rollback handler
  );
};
```

### Pattern 3: Manage Call State

```javascript
import { useCallSession } from '../hooks/useRedis';

const { callSession, recordMetric, updateQuality } = useCallSession(callId);

// Record metrics
recordMetric('ice');
recordMetric('connection');
recordMetric('quality', 'excellent');

// Use in UI
<p>Duration: {callSession?.duration}s</p>
<p>Status: {callSession?.status}</p>
```

### Pattern 4: List Management

```javascript
import { useAppointments } from '../hooks/useRedis';

const { appointments, addAppointment, removeAppointment } = 
  useAppointments(userId);

// Add
addAppointment({ id: 1, title: '...' }, () => api.create(...));

// Remove
removeAppointment(id, () => api.delete(id));

// List
appointments.forEach(apt => <div>{apt.title}</div>);
```

### Pattern 5: User Session & Presence

```javascript
import { useSession } from '../hooks/useRedis';

const { userSession, setPresence } = useSession();

// Change presence
setPresence('online');    // or 'offline', 'busy', 'away'

// Check session
if (userSession?.role === 'consultant') {
  // Show consultant UI
}
```

---

## 🔧 Service Methods (Quick Access)

### CacheService

```javascript
import { cacheService } from '../services/cache';

// GET/SET
cacheService.set(key, value, ttl);        // ttl in seconds
cacheService.get(key);
cacheService.delete(key);

// LIST
cacheService.lpush(key, value);
cacheService.rpop(key);
cacheService.lrange(key, 0, -1);

// HASH
cacheService.hset(key, field, value);
cacheService.hget(key, field);

// UTIL
cacheService.subscribe(key, callback);
cacheService.keys(pattern);
```

### SessionManager

```javascript
import { sessionManager } from '../services/session';

// User
sessionManager.setUserSession(user);
sessionManager.getUserSession(userId);

// Call
sessionManager.createCallSession(callData);
sessionManager.getCallSession(callId);
sessionManager.updateCallStatus(callId, status);
sessionManager.clearCallSession(callId);

// Appointments
sessionManager.getAppointments(userId);
sessionManager.addAppointment(userId, apt);

// History
sessionManager.getCallHistory(userId, limit);
```

### OptimisticService

```javascript
import { optimisticUpdateService } from '../services/optimistic';

const result = await optimisticUpdateService.execute(
  key,
  updateFn,
  apiCall,
  rollbackFn
);
```

### ConsultationCall

```javascript
import { consultationCallService } from '../services/consultationCall';

// Lifecycle
await consultationCallService.initiateCall(patientId, consultantId);
await consultationCallService.acceptCall(callId, userId);
await consultationCallService.declineCall(callId, reason);
await consultationCallService.endCall(callId);

// Metrics
await consultationCallService.recordWebRTCMetric(callId, 'ice', {...});

// History
const history = consultationCallService.getCallHistory(userId, 10);

// Analytics
const analytics = consultationCallService.getCallAnalytics(callId);
```

---

## 📝 Component Code Templates

### Template 1: Simple Display Component

```javascript
import { useCache } from '../hooks/useRedis';

export default function DisplayComponent({ id }) {
  const [data] = useCache(`key:${id}`, null);
  
  return <div>{data?.name}</div>;
}
```

### Template 2: Update Component with Button

```javascript
import { useCache } from '../hooks/useRedis';
import { consultationCallService } from '../services/consultationCall';

export default function UpdateComponent({ id }) {
  const [data, updateData] = useCache(`key:${id}`, null);
  
  const handleUpdate = async () => {
    updateData({ ...data, status: 'updated' });
    try {
      await api.update(id, data);
    } catch (error) {
      // Auto-rollback happens
    }
  };
  
  return <button onClick={handleUpdate}>Update</button>;
}
```

### Template 3: List Component with Optimistic Updates

```javascript
import { useAppointments } from '../hooks/useRedis';

export default function ListComponent({ userId }) {
  const { appointments, removeAppointment } = useAppointments(userId);
  
  const handleDelete = async (id) => {
    await removeAppointment(id, () => api.delete(id));
  };
  
  return (
    <div>
      {appointments.map(item => (
        <div key={item.id}>
          <p>{item.title}</p>
          <button onClick={() => handleDelete(item.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Template 4: Active Call Component

```javascript
import { useCallSession } from '../hooks/useRedis';
import { consultationCallService } from '../services/consultationCall';

export default function ActiveCall({ callId }) {
  const { callSession, recordMetric, updateQuality } = useCallSession(callId);
  
  const handleEndCall = async () => {
    await consultationCallService.endCall(callId);
  };
  
  return (
    <div>
      <h2>Call Status: {callSession?.status}</h2>
      <p>Quality: {callSession?.connection_quality}</p>
      <button onClick={handleEndCall}>End</button>
    </div>
  );
}
```

---

## ⚡ Common Tasks

### Task: Show user's data with auto-sync

```javascript
const [user] = useCache(`user:${userId}`, null);
// Automatically updates from localStorage and WebSocket
```

### Task: Create appointment optimistically

```javascript
const { execute } = useOptimisticUpdate();

await execute(
  `appointments:${userId}`,
  (apts) => [newApt, ...apts],
  () => api.book(newApt)
);
```

### Task: Track active call

```javascript
const { callSession } = useCallSession(callId);

return <p>Duration: {callSession?.duration}s</p>;
```

### Task: Monitor cache health

```javascript
const metrics = useCacheMetrics(5000);
return <p>Hit Rate: {metrics.hitRate}%</p>;
```

### Task: Set user presence

```javascript
const { setPresence } = useSession();
setPresence('online');
```

### Task: Get call history

```javascript
const history = sessionManager.getCallHistory(userId, 10);
```

### Task: Record WebRTC metric

```javascript
await consultationCallService.recordWebRTCMetric(
  callId, 
  'connection_established',
  { stats: {...} }
);
```

---

## 🔌 Data Keys Reference

```
user:{userId}                          User session
call:{callId}                          Call state
appointments:{userId}                  Appointments list
call_history:{userId}                  Recent calls
consultant:{consultantId}:availability Consultant slots
incoming_calls:{userId}                Pending calls
presence                               All user presence
notifications:{userId}                 Recent notifications
```

---

## ✅ Checklist for Integration

### Before Integration
- [x] Copy service files (cache.js, session.js, optimistic.js, consultationCall.js)
- [x] Copy hooks file (useRedis.js)
- [x] Import hooks in your component

### During Integration
- [ ] Replace useState with useCache / useAppointments / useCallSession
- [ ] Replace API calls with optimistic updates
- [ ] Remove manual loading state (use isLoading from hook)
- [ ] Remove manual error handling (use rollback)

### After Integration
- [ ] Test with real backend
- [ ] Verify optimistic updates work
- [ ] Check localStorage persistence
- [ ] Monitor metrics in dev tools

---

## 🐛 Debugging Tips

### Check cache contents
```javascript
console.log(cacheService.keys('*'));
console.log(cacheService.get('call:123'));
```

### Monitor subscriptions
```javascript
cacheService.subscribe('call:123', (event) => {
  console.log('Cache changed:', event);
});
```

### Check session state
```javascript
console.log(sessionManager.getSessionMetrics());
```

### Monitor optimistic updates
```javascript
const result = await optimisticUpdateService.execute(...);
console.log('Success:', result.success);
console.log('Data:', result.data);
console.log('Error:', result.error);
```

---

## 🚀 Performance Tips

1. **Use TTL for temporary data**
   ```javascript
   cacheService.set(key, value, 300); // 5 min
   ```

2. **Batch updates when possible**
   ```javascript
   await optimisticUpdateService.executeBatch([...]);
   ```

3. **Monitor cache metrics**
   ```javascript
   const metrics = cacheService.getMetrics();
   ```

4. **Clear old data manually if needed**
   ```javascript
   cacheService.clearExpired();
   ```

---

## 📚 File Locations

```
src/
├── services/
│   ├── cache.js
│   ├── session.js
│   ├── optimistic.js
│   └── consultationCall.js
├── hooks/
│   └── useRedis.js
└── components/
    └── [your components here]
```

---

## 🎓 Learning Path

1. **Start here**: Read REDIS_FRONTEND_GUIDE.md
2. **Copy patterns**: Look at COMPONENT_INTEGRATION_EXAMPLES.md
3. **Reference**: Use COMPONENT_INTEGRATION_EXAMPLES.md templates
4. **Deep dive**: Read service file comments
5. **Monitor**: Use dev console and metrics

---

## 💡 Pro Tips

### Tip 1: Combine multiple hooks

```javascript
const { userSession } = useSession();
const { appointments } = useAppointments(userSession?.id);
const metrics = useCacheMetrics(5000);
```

### Tip 2: Use with React Query integration

```javascript
// Can be combined with react-query for server state
const cacheData = useCache(key);
// Both work together!
```

### Tip 3: Batch related updates

```javascript
const appointments = useAppointments(userId);
const presence = useSession();
// Both react to cache changes
```

### Tip 4: Debug in DevTools

```javascript
// In browser console
window.cacheService.getMetrics()
window.sessionManager.getSessionMetrics()
```

---

## 🎉 You're Ready!

Now you have:
- ✅ Redis-like caching
- ✅ Session management
- ✅ Optimistic updates
- ✅ Call orchestration
- ✅ React integration

**Start using these patterns in your components!**

---

## 📞 Quick Help

| Need | File | Hook/Service |
|------|------|---------|
| Cache data | cache.js | useCache |
| Call state | consultationCall.js | useCallSession |
| Appointments | session.js | useAppointments |
| User session | session.js | useSession |
| Optimistic update | optimistic.js | useOptimisticUpdate |
| Metrics | useRedis.js | useCacheMetrics |

---

**Happy coding!** 🚀
