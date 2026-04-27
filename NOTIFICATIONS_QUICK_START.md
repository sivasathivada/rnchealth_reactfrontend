# Notifications Quick Start - Frontend Usage

## 🚀 5-Minute Integration

### Step 1: Import Hook

```javascript
import { useNotifications } from '../hooks/useRedis';
```

### Step 2: Use in Component

```javascript
const { notifications, unreadCount, markAsRead } = useNotifications(userId);
```

### Step 3: Display Notifications

```javascript
{notifications.map(n => (
  <div key={n.id}>
    <h3>{n.title}</h3>
    <p>{n.message}</p>
    <button onClick={() => markAsRead(n.id)}>Mark Read</button>
  </div>
))}
```

---

## 📋 Real-World Examples

### Example 1: Payment Status Bell

```javascript
import { useNotifications } from '../hooks/useRedis';

export default function PaymentBell({ userId }) {
  const { unreadCount, refresh } = useNotifications(userId);

  return (
    <button 
      className="notification-bell"
      onClick={() => refresh()}
    >
      💳 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
    </button>
  );
}
```

### Example 2: Show Incoming Call Alert

```javascript
import { useNotifications } from '../hooks/useRedis';

export default function IncomingCallAlert({ userId }) {
  const { subscribe } = useNotifications(userId);
  const [showCall, setShowCall] = useState(false);
  const [callData, setCallData] = useState(null);

  useEffect(() => {
    // Listen for incoming calls
    const unsubscribe = subscribe('call_initiated', (notification) => {
      setCallData(notification.data);
      setShowCall(true);
    });

    return unsubscribe;
  }, [subscribe]);

  if (!showCall) return null;

  return (
    <div className="modal">
      <h2>{callData.initiator_name} is calling...</h2>
      <button onClick={() => acceptCall(callData)}>Accept</button>
      <button onClick={() => setShowCall(false)}>Decline</button>
    </div>
  );
}
```

### Example 3: Appointment Confirmation Wait

```javascript
import { useNotifications } from '../hooks/useRedis';
import { useEffect, useState } from 'react';

export default function WaitingForConfirmation({ appointmentId, userId }) {
  const { subscribe } = useNotifications(userId);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe('appointment_confirmed', (notification) => {
      if (notification.data.appointment_id === appointmentId) {
        setConfirmed(true);
        // Show success and enable call button
      }
    });

    return unsubscribe;
  }, [appointmentId, userId, subscribe]);

  if (confirmed) {
    return <div>✅ Appointment confirmed! Ready to join call.</div>;
  }

  return <div>⏳ Waiting for doctor to confirm...</div>;
}
```

### Example 4: Payment Flow with Notifications

```javascript
import { useNotifications } from '../hooks/useRedis';
import { paymentsAPI } from '../services/api';

export default function PaymentFlow({ consultantId, userId }) {
  const { subscribe, notifications } = useNotifications(userId);
  const [step, setStep] = useState('idle'); // idle | initiating | confirming | confirmed | error

  useEffect(() => {
    // Listen for payment updates
    const unsubPaymentInitiated = subscribe('payment_initiated', (notif) => {
      setStep('confirming');
    });

    const unsubPaymentConfirmed = subscribe('payment_confirmed', (notif) => {
      setStep('confirmed');
      // Redirect to appointment
      navigate('/appointments');
    });

    const unsubPaymentFailed = subscribe('payment_failed', (notif) => {
      setStep('error');
    });

    return () => {
      unsubPaymentInitiated();
      unsubPaymentConfirmed();
      unsubPaymentFailed();
    };
  }, [subscribe]);

  const handlePay = async () => {
    setStep('initiating');
    try {
      const response = await paymentsAPI.initiate({
        consultant_id: consultantId,
        amount: 500,
      });
      // Backend will trigger payment_initiated notification
    } catch (error) {
      setStep('error');
    }
  };

  return (
    <div>
      {step === 'idle' && (
        <button onClick={handlePay}>Pay ₹500</button>
      )}
      {step === 'initiating' && <p>Starting payment...</p>}
      {step === 'confirming' && <p>Confirm your payment...</p>}
      {step === 'confirmed' && <p>✅ Payment successful!</p>}
      {step === 'error' && <p>❌ Payment failed</p>}
    </div>
  );
}
```

### Example 5: Notification Center Dashboard

```javascript
import { useNotifications } from '../hooks/useRedis';

export default function NotificationCenter({ userId }) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    isLoading 
  } = useNotifications(userId);

  const paymentNotifications = notifications.filter(n => 
    n.type.startsWith('payment_')
  );
  const appointmentNotifications = notifications.filter(n => 
    n.type.startsWith('appointment_')
  );
  const callNotifications = notifications.filter(n => 
    n.type.startsWith('call_')
  );

  return (
    <div className="notification-center">
      <div className="header">
        <h2>Notifications</h2>
        <span className="badge">{unreadCount} unread</span>
        <button onClick={markAllAsRead}>Mark all as read</button>
      </div>

      {isLoading && <p>Loading...</p>}

      <div className="section">
        <h3>💳 Payments ({paymentNotifications.length})</h3>
        {paymentNotifications.map(n => (
          <NotificationItem 
            key={n.id} 
            notification={n}
            onRead={() => markAsRead(n.id)}
            onDelete={() => deleteNotification(n.id)}
          />
        ))}
      </div>

      <div className="section">
        <h3>📅 Appointments ({appointmentNotifications.length})</h3>
        {appointmentNotifications.map(n => (
          <NotificationItem 
            key={n.id} 
            notification={n}
            onRead={() => markAsRead(n.id)}
            onDelete={() => deleteNotification(n.id)}
          />
        ))}
      </div>

      <div className="section">
        <h3>📞 Calls ({callNotifications.length})</h3>
        {callNotifications.map(n => (
          <NotificationItem 
            key={n.id} 
            notification={n}
            onRead={() => markAsRead(n.id)}
            onDelete={() => deleteNotification(n.id)}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationItem({ notification, onRead, onDelete }) {
  return (
    <div className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
      <div className="content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <small>{new Date(notification.timestamp).toLocaleString()}</small>
      </div>
      <div className="actions">
        {!notification.read && (
          <button onClick={onRead}>Mark Read</button>
        )}
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
```

### Example 6: Call Duration Tracker

```javascript
import { useNotifications } from '../hooks/useRedis';
import { useCallSession } from '../hooks/useRedis';
import { useState, useEffect } from 'react';

export default function CallTracker({ callId, userId }) {
  const { callSession } = useCallSession(callId);
  const { subscribe } = useNotifications(userId);
  const [callEnded, setCallEnded] = useState(false);
  const [endData, setEndData] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribe('call_ended', (notification) => {
      if (notification.data.call_id === callId) {
        setEndData(notification.data);
        setCallEnded(true);
      }
    });

    return unsubscribe;
  }, [callId, subscribe]);

  if (callEnded) {
    return (
      <div className="call-summary">
        <h2>Call Ended</h2>
        <p>Duration: {endData.duration}</p>
        <p>Quality: {endData.call_quality}</p>
      </div>
    );
  }

  return (
    <div>
      <p>Call Status: {callSession?.status}</p>
      <p>Duration: {callSession?.duration}s</p>
    </div>
  );
}
```

---

## 🎨 Styling Examples

### CSS for notification badge

```css
.notification-bell {
  position: relative;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.notification-bell .badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: red;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.notification-item {
  padding: 12px;
  border-left: 4px solid #4CAF50;
  background: #f9f9f9;
  margin-bottom: 10px;
  border-radius: 4px;
}

.notification-item.unread {
  background: #f0f0f0;
  border-left-color: #2196F3;
}

.notification-item.read {
  opacity: 0.7;
}
```

---

## 🔌 Hook Reference

```javascript
const {
  notifications,      // Array of all notifications
  unreadCount,       // Number of unread notifications
  isLoading,         // Loading state
  markAsRead,        // (id) => Promise
  markAllAsRead,     // () => Promise
  deleteNotification, // (id) => Promise
  refresh,           // () => Promise
  subscribe,         // (type, callback) => unsubscribe
} = useNotifications(userId);
```

---

## 📝 Notification Type Reference

| Type | When | Data | Action |
|------|------|------|--------|
| `payment_initiated` | User pays | amount, consultant_name | Show loading |
| `payment_confirmed` | Payment succeeds | amount, appointment_id | Navigate to appointment |
| `payment_failed` | Payment fails | reason | Show error + retry button |
| `appointment_booked` | Appointment created | date, time, consultant | Show confirmation |
| `appointment_confirmed` | Doctor confirms | consultant_name, date | Enable call button |
| `appointment_rejected` | Doctor rejects | reason | Show reason |
| `appointment_reminder` | 15 min before | time_until | Show banner |
| `call_initiated` | Doctor calls | initiator_name | Show call modal |
| `call_connected` | Call starts | caller_name | Update UI |
| `call_ended` | Call ends | duration, quality | Show summary |
| `prescription_created` | After call | consultant_name | Navigate to prescription |

---

## ⚡ Common Patterns

### Pattern 1: Auto-dismiss after reading

```javascript
useEffect(() => {
  const unread = notifications.filter(n => !n.read);
  if (unread.length > 0) {
    setTimeout(() => {
      markAsRead(unread[0].id);
    }, 5000);
  }
}, [notifications, markAsRead]);
```

### Pattern 2: Group by type

```javascript
const grouped = notifications.reduce((acc, n) => {
  if (!acc[n.type]) acc[n.type] = [];
  acc[n.type].push(n);
  return acc;
}, {});
```

### Pattern 3: Filter by date

```javascript
const today = notifications.filter(n => {
  const date = new Date(n.timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
});
```

### Pattern 4: Pause on window blur

```javascript
const [paused, setPaused] = useState(false);

useEffect(() => {
  const handleBlur = () => setPaused(true);
  const handleFocus = () => setPaused(false);

  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);

  return () => {
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
  };
}, []);

if (paused) return null;
```

---

## 🐛 Debugging

```javascript
// Check notifications in console
window.cacheService.get('notifications:user_123')

// Check unread count
window.cacheService.get('notifications:unread:user_123')

// Manually add notification for testing
window.cacheService.set('notifications:user_123', [{
  id: 'test_1',
  type: 'payment_confirmed',
  title: 'Test Notification',
  message: 'This is a test',
  read: false,
}])
```

---

## ✅ Checklist for Integration

- [ ] Import `useNotifications` hook
- [ ] Call with `userId` from user context
- [ ] Display notifications list or badge
- [ ] Subscribe to specific notification types
- [ ] Handle mark as read
- [ ] Handle deletion
- [ ] Style notification UI
- [ ] Test with backend WebSocket
- [ ] Verify Redis caching
- [ ] Check console for errors

---

## 🎉 You're Done!

Notifications are now integrated and ready to use with your backend Celery tasks!

