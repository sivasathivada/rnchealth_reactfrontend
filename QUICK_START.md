# React Health App - Notification System Configuration Summary

## ✅ Frontend Setup Complete

All necessary files have been created and configured:

```
src/
├── context/
│   ├── NotificationContext.jsx      ✅ New
│   ├── NotificationSocketContext.jsx ✅ New
│   └── WebRTCContext.jsx            ✅ (existing, unchanged)
├── components/
│   ├── NotificationCenter.jsx        ✅ New
│   └── NotificationCenter.css        ✅ New
└── App.jsx                           ✅ Updated with providers
```

### How to Use in Components

```javascript
// 1. Simple notification
import { useNotification } from '../context/NotificationContext';
const { notify } = useNotification();
notify.success('Title', 'Message');

// 2. Listen to WebSocket events
import { useNotificationSocket } from '../context/NotificationSocketContext';
const { registerHandler } = useNotificationSocket();
registerHandler('incoming_call', (data) => {
  console.log('Call from:', data.caller_name);
});
```

---

## 🔧 Backend Configuration Required

### Quick Setup Steps:

1. **Install packages:**
   ```bash
   pip install channels channels-redis celery redis
   ```

2. **Copy `BACKEND_SETUP.md` to your backend project** and follow the steps:
   - Add Django settings configuration
   - Create consumers (NotificationConsumer, CallConsumer)
   - Update routing.py
   - Update asgi.py

3. **Run services:**
   ```bash
   # Terminal 1
   redis-server

   # Terminal 2
   daphne -b 127.0.0.1 -p 8000 your_project.asgi:application

   # Terminal 3
   celery -A your_project worker -l info

   # Terminal 4
   celery -A your_project beat -l info

   # Terminal 5
   npm run dev  # React frontend
   ```

---

## 📋 Notification Types Supported

| Type | Auto-Dismiss | Use Case |
|------|-------------|----------|
| `success` | Yes (4s) | Operation completed |
| `error` | Yes (6s) | Operation failed |
| `warning` | Yes (5s) | Caution needed |
| `info` | Yes (4s) | Information only |
| `call` | No | Incoming call (persistent) |
| `message` | No | New message (persistent) |
| `appointment` | Yes (5s) | Appointment updates |
| `task` | Yes (4s) | Celery task status |

---

## 🚀 Testing Real-Time Notifications

### From Django Shell:

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# Send test to specific user
async_to_sync(channel_layer.group_send)(
    'notifications_{user_id}',
    {
        'type': 'notification',
        'title': 'Test Alert',
        'message': 'This notification came from Django!',
    }
)
```

### From Browser Console:

Open DevTools → Console and you should see:
```
[NotificationSocket] WebSocket connection established
[NotificationSocket] Message received: notification
```

---

## 📚 Documentation Files

- **BACKEND_SETUP.md** - Complete backend configuration guide
- **NOTIFICATION_USAGE.md** - Frontend usage examples with code samples
- This file - Quick reference

---

## ⚠️ Important Notes

1. **Ensure Redis is running** on `127.0.0.1:6379` before starting Django
2. **Use Daphne** instead of `runserver` to support WebSockets
3. **Update `SECURE_WEBSOCKET_ORIGIN`** in settings if using different host/port
4. **Check browser console** for WebSocket connection logs when debugging

---

## 🔍 Troubleshooting Checklist

- [ ] Redis running? `redis-cli ping` should return `PONG`
- [ ] Django using Daphne? Check for `Daphne` in terminal output
- [ ] Consumers.py created? Should be in your app directory
- [ ] Routing.py updated? WebSocket URL patterns configured
- [ ] ASGI application set? Check `settings.py`
- [ ] Frontend NotificationCenter imported? Check App.jsx
- [ ] Providers wrapped correctly? AuthProvider → NotificationProvider → WebRTCProvider

---

## 📞 Quick API Reference

### useNotification Hook
```javascript
const { notify, notifications, addNotification, removeNotification } = useNotification();

notify.success(title, message, duration?)
notify.error(title, message, duration?)
notify.warning(title, message, duration?)
notify.info(title, message, duration?)
notify.call(callerData)
notify.message(messageData)
notify.appointment(appointmentData)
notify.task(taskData)
```

### useNotificationSocket Hook
```javascript
const { ws, isConnected, sendCommand, registerHandler } = useNotificationSocket();

const unsubscribe = registerHandler('event_type', (data) => {
  // Handle event
});

// Clean up
unsubscribe();
```

---

## 🎯 Next Steps

1. ✅ Copy `BACKEND_SETUP.md` to your Django project
2. ✅ Implement Django Channels consumers
3. ✅ Update Django routing and ASGI
4. ✅ Start Redis and required services
5. ✅ Test WebSocket connection from browser
6. ✅ Start sending notifications from backend tasks

---

## 📖 Example: Send Appointment Notification

**Backend (tasks.py):**
```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

async_to_sync(channel_layer.group_send)(
    f'notifications_{consultant_id}',
    {
        'type': 'appointment_scheduled',
        'appointment_title': 'Patient Consultation',
        'appointment_id': '123',
        'message': 'New appointment with John Doe',
    }
)
```

**Frontend (Component):**
```javascript
import { useNotificationSocket } from '../context/NotificationSocketContext';
import { useEffect } from 'react';

export default function AppointmentBoard() {
  const { registerHandler } = useNotificationSocket();

  useEffect(() => {
    return registerHandler('appointment_scheduled', (data) => {
      console.log('New appointment:', data.appointment_title);
    });
  }, [registerHandler]);

  return <div>Appointments...</div>;
}
```

**Result:** Green notification appears in top-right with appointment info!

