# Frontend Notification System - Usage Guide

## Overview

The notification system consists of:
- **NotificationContext** - State management for notifications
- **NotificationSocketContext** - WebSocket connection handler
- **NotificationCenter** - UI component displaying notifications
- **useNotification** - Hook to trigger notifications
- **useNotificationSocket** - Hook to handle WebSocket events

---

## Using Notifications in Components

### 1. Simple Notification (Toast)

```javascript
import { useNotification } from '../context/NotificationContext';

export default function MyComponent() {
  const { notify } = useNotification();

  const handleClick = () => {
    // Success notification (auto-dismisses in 4 seconds)
    notify.success('Success', 'Operation completed successfully');

    // Error notification (auto-dismisses in 6 seconds)
    notify.error('Error', 'Something went wrong');

    // Warning notification (auto-dismisses in 5 seconds)
    notify.warning('Warning', 'Are you sure?');

    // Info notification (auto-dismisses in 4 seconds)
    notify.info('Info', 'This is informational');
  };

  return <button onClick={handleClick}>Show Notifications</button>;
}
```

---

### 2. Incoming Call Notification (Persistent)

The incoming call notification requires manual dismissal:

```javascript
import { useNotification } from '../context/NotificationContext';

export default function CallHandler() {
  const { notify, removeNotification } = useNotification();

  const handleIncomingCall = (callData) => {
    // Create persistent notification
    const notifId = notify.call({
      caller_name: callData.caller_name,
      session_id: callData.session_id,
    });

    // User can dismiss manually or accept call
  };

  return <div>{/* Component JSX */}</div>;
}
```

---

### 3. Listening to WebSocket Events

```javascript
import { useNotificationSocket } from '../context/NotificationSocketContext';
import { useEffect } from 'react';

export default function AppointmentListener() {
  const { registerHandler } = useNotificationSocket();

  useEffect(() => {
    // Listen for appointment notifications
    const unsubscribe = registerHandler('appointment_scheduled', (data) => {
      console.log('New appointment:', data);
      // Do something with the data
    });

    return unsubscribe;
  }, [registerHandler]);

  return <div>{/* Component JSX */}</div>;
}
```

---

### 4. Handling Multiple Events

```javascript
import { useNotificationSocket } from '../context/NotificationSocketContext';
import { useEffect } from 'react';

export default function CallRoom() {
  const { registerHandler } = useNotificationSocket();

  useEffect(() => {
    // Listen for incoming calls
    const unsubCall = registerHandler('incoming_call', (data) => {
      console.log('Incoming call from:', data.caller_name);
    });

    // Listen for incoming messages
    const unsubMsg = registerHandler('incoming_message', (data) => {
      console.log('Message from:', data.sender_name);
    });

    // Listen for task updates
    const unsubTask = registerHandler('celery_task_update', (data) => {
      console.log('Task progress:', data.progress);
    });

    // Cleanup
    return () => {
      unsubCall();
      unsubMsg();
      unsubTask();
    };
  }, [registerHandler]);

  return <div>{/* Component JSX */}</div>;
}
```

---

### 5. Integration with API Calls

```javascript
import { useNotification } from '../context/NotificationContext';
import { consultantsAPI } from '../services/api';

export default function ProfileUpdate() {
  const { notify } = useNotification();

  const handleSaveProfile = async (formData) => {
    try {
      await consultantsAPI.updateProfile(formData);
      notify.success('Profile Updated', 'Your profile has been saved successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      notify.error('Update Failed', message);
    }
  };

  return (
    <form onSubmit={handleSaveProfile}>
      {/* Form fields */}
    </form>
  );
}
```

---

### 6. Long-Running Task Notifications

```javascript
import { useNotification } from '../context/NotificationContext';
import { useEffect, useState } from 'react';
import { useNotificationSocket } from '../context/NotificationSocketContext';

export default function ReportGenerator() {
  const { notify } = useNotification();
  const { registerHandler } = useNotificationSocket();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerateReport = async () => {
    setIsProcessing(true);
    notify.info('Processing', 'Generating your report...');

    try {
      const response = await fetch('/api/reports/generate/', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to start report generation');

      // Listen for task completion
      registerHandler('celery_task_complete', (data) => {
        if (data.task_name === 'generate_report') {
          notify.success('Report Ready', data.message);
          setIsProcessing(false);
        }
      });

      // Listen for task errors
      registerHandler('celery_task_error', (data) => {
        if (data.task_name === 'generate_report') {
          notify.error('Report Failed', data.message);
          setIsProcessing(false);
        }
      });

      // Listen for progress updates
      registerHandler('celery_task_update', (data) => {
        if (data.task_name === 'generate_report') {
          console.log(`Progress: ${data.progress}%`);
        }
      });
    } catch (error) {
      notify.error('Error', error.message);
      setIsProcessing(false);
    }
  };

  return (
    <button onClick={handleGenerateReport} disabled={isProcessing}>
      {isProcessing ? 'Generating...' : 'Generate Report'}
    </button>
  );
}
```

---

## Notification Types

### Auto-Dismissing Notifications
```javascript
notify.success(title, message, duration)  // Default: 4000ms
notify.error(title, message, duration)    // Default: 6000ms
notify.warning(title, message, duration)  // Default: 5000ms
notify.info(title, message, duration)     // Default: 4000ms
```

### Persistent Notifications (Manual Dismissal)
```javascript
notify.call(data)        // Incoming call with sound/animation
notify.message(data)     // New message
notify.appointment(data) // Appointment update
notify.task(data)        // Background task status
```

---

## Available WebSocket Events

| Event Type | When Triggered | Data Fields |
|------------|----------------|-------------|
| `incoming_call` | User receives a call | `caller_name`, `caller_id`, `session_id` |
| `incoming_message` | User receives a message | `sender_name`, `sender_id`, `message` |
| `appointment_scheduled` | New appointment created | `appointment_title`, `appointment_id`, `message` |
| `appointment_reminder` | Appointment reminder time | `appointment_title`, `appointment_id`, `message` |
| `appointment_cancelled` | Appointment cancelled | `message` |
| `celery_task_update` | Task progress update | `task_name`, `task_status`, `progress` |
| `celery_task_complete` | Task completed | `task_name`, `message` |
| `celery_task_error` | Task failed | `task_name`, `message` |

---

## Error Handling

```javascript
import { useNotification } from '../context/NotificationContext';

export default function SafeComponent() {
  const { notify } = useNotification();

  const handleRiskyOperation = async () => {
    try {
      // Attempt operation
      const result = await someRiskyAPI();
      notify.success('Success', 'Operation completed');
    } catch (error) {
      // Extract error message safely
      const errorMsg = error?.response?.data?.message || 
                       error?.message || 
                       'An unexpected error occurred';
      
      notify.error('Operation Failed', errorMsg);
    }
  };

  return <button onClick={handleRiskyOperation}>Do Something</button>;
}
```

---

## Best Practices

1. **Use Appropriate Types** - Choose the right notification type for the context
2. **Keep Messages Short** - Notifications should be concise
3. **Unsubscribe Event Listeners** - Always clean up with the returned unsubscribe function
4. **Handle WebSocket Errors** - Gracefully handle disconnections
5. **Test with DevTools** - Monitor WebSocket traffic in browser DevTools

---

## Debugging

Check browser Console for logs:
```
[NotificationSocket] WebSocket connection established
[NotificationSocket] Message received: incoming_call
[NotificationSocket] Handler registered for: appointment_scheduled
```

Check Network tab for WebSocket connections:
- Look for `ws://127.0.0.1:8000/ws/notifications/{user_id}/`
- Status should be `101 Web Socket Protocol Handshake`

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Notifications not appearing | Check NotificationProvider is in App.jsx wrapper |
| WebSocket 404 | Verify backend has `routing.py` configured |
| Events not triggering | Verify backend is sending events to correct group |
| Notifications stuck on screen | Check event handlers don't prevent auto-dismiss |

