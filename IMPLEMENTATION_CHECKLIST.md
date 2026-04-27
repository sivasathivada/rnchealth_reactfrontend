# Implementation Checklist - Redis Notifications

## ✅ Frontend (Ready to Use)

### Services
- [x] `src/services/cache.js` - Redis cache service
- [x] `src/services/session.js` - Session management
- [x] `src/services/optimistic.js` - Optimistic updates
- [x] `src/services/notifications.js` - **NEW** Notifications service
- [x] `src/services/consultationCall.js` - Call orchestration

### React Hooks
- [x] `useCache()` - Basic caching
- [x] `useSession()` - User session
- [x] `useCallSession()` - Call state
- [x] `useAppointments()` - Appointments
- [x] `useOptimisticUpdate()` - Optimistic updates
- [x] `useCacheMetrics()` - Cache monitoring
- [x] `useNotifications()` - **NEW** Notifications hook

### Context & Socket
- [x] `NotificationContext` - Notification display
- [x] `NotificationSocketContext` - **UPDATED** WebSocket with routing
- [x] `AuthContext` - User authentication
- [x] `WebRTCContext` - Call management

### Documentation (Ready to Read)
- [x] `REDIS_FRONTEND_GUIDE.md` - API reference
- [x] `QUICK_REFERENCE.md` - Cheat sheet
- [x] `COMPONENT_INTEGRATION_EXAMPLES.md` - Code patterns
- [x] `NOTIFICATIONS_REDIS_CELERY.md` - Complete overview
- [x] `NOTIFICATIONS_QUICK_START.md` - 5-minute guide
- [x] `COMPLETE_FLOW_GUIDE.md` - End-to-end flow
- [x] `NO_BREAKING_CHANGES_GUARANTEE.md` - Safety guarantee
- [x] `REDIS_NOTIFICATIONS_SUMMARY.md` - Implementation summary

---

## ⏳ Backend (You Need to Implement)

### Step 1: Database Model
- [ ] Create `Notification` Django model
  - [ ] user (ForeignKey to User)
  - [ ] type (CharField with choices)
  - [ ] title (CharField)
  - [ ] message (TextField)
  - [ ] data (JSONField)
  - [ ] read (BooleanField)
  - [ ] created_at (DateTimeField)
  - [ ] updated_at (DateTimeField)
- [ ] Add proper indexes
- [ ] Create and run migration

### Step 2: REST API Endpoints
- [ ] `GET /notifications/` - List notifications
  - [ ] Add limit parameter
  - [ ] Filter by user
  - [ ] Order by -created_at
- [ ] `PATCH /notifications/{id}/read/` - Mark as read
- [ ] `POST /notifications/mark-all-read/` - Mark all read
- [ ] `DELETE /notifications/{id}/` - Delete notification

### Step 3: Django Channels Consumer
- [ ] Update `NotificationConsumer` class
- [ ] Add `payment_initiated` handler
- [ ] Add `payment_confirmed` handler
- [ ] Add `payment_failed` handler
- [ ] Add `appointment_booked` handler
- [ ] Add `appointment_confirmed` handler
- [ ] Add `appointment_rejected` handler
- [ ] Add `appointment_cancelled` handler
- [ ] Add `appointment_reminder` handler
- [ ] Add `call_initiated` handler
- [ ] Add `call_connected` handler
- [ ] Add `call_ended` handler
- [ ] Add `prescription_created` handler
- [ ] Test WebSocket connection

### Step 4: Celery Tasks (Async Notifications)
- [ ] `send_payment_initiated_email` task
  - [ ] Send email
  - [ ] Create notification in DB
  - [ ] Emit WebSocket event
- [ ] `send_payment_confirmed_email` task
- [ ] `send_payment_failed_email` task
- [ ] `send_appointment_confirmation_email` task
- [ ] `send_appointment_reminder` task
- [ ] `notify_patient_incoming_call` task
- [ ] `notify_call_connected` task
- [ ] `notify_call_ended` task
- [ ] `notify_prescription_issued` task
- [ ] Add retry logic to tasks
- [ ] Add error handling

### Step 5: Celery Beat Scheduler
- [ ] Configure `CELERY_BEAT_SCHEDULE` in settings
- [ ] Add `check_and_send_appointment_reminders` task
  - [ ] Run every 15 minutes
  - [ ] Find appointments in next 15 min
  - [ ] Send reminder notifications

### Step 6: Integration Points
- [ ] Hook payments view to trigger Celery tasks
- [ ] Hook appointments view to trigger Celery tasks
- [ ] Hook call view to trigger Celery tasks
- [ ] Hook prescription view to trigger Celery tasks
- [ ] Verify WebSocket groups working

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test Notification model
- [ ] Test NotificationSerializer
- [ ] Test NotificationViewSet
- [ ] Test Celery tasks (with mocking)
- [ ] Test WebSocket consumer

### Integration Tests
- [ ] Test payment → notification flow
- [ ] Test appointment → notification flow
- [ ] Test call → notification flow
- [ ] Test prescription → notification flow

### Manual Testing
- [ ] Start Redis: `redis-server`
- [ ] Start Celery: `celery -A project worker -l info`
- [ ] Start Celery Beat: `celery -A project beat`
- [ ] Navigate to Django admin
  - [ ] Check Notification model visible
  - [ ] Create test notification
- [ ] In browser DevTools:
  - [ ] Check WebSocket connected: `ws://localhost:8000/ws/notifications/...`
  - [ ] Check network tab for WebSocket messages
- [ ] Test payment flow:
  - [ ] Make payment
  - [ ] Check notification created
  - [ ] Check WebSocket event received
  - [ ] Check frontend notification displayed
- [ ] Test appointment flow:
  - [ ] Confirm appointment
  - [ ] Check notification created
  - [ ] Check frontend updated
- [ ] Test call flow:
  - [ ] Initiate call
  - [ ] Check notification sent
  - [ ] Check received on other user
- [ ] Test reminder (Celery Beat):
  - [ ] Create appointment 20 min from now
  - [ ] Wait 5 min, then trigger Celery Beat manually
  - [ ] Check reminder notification sent

### Frontend Testing
- [ ] `useNotifications()` hook works
- [ ] Notifications display correctly
- [ ] Mark as read works
- [ ] Delete notification works
- [ ] Subscribe to type works
- [ ] Unsubscribe works
- [ ] Cache persists in localStorage
- [ ] Badge shows unread count

### Browser Console Testing
```javascript
// Check cache
window.cacheService.get('notifications:user_123')

// Check unread count
window.cacheService.get('notifications:unread:user_123')

// Check metrics
window.cacheService.getMetrics()

// Manually trigger notification for testing
window.cacheService.set('notifications:user_123', [{
  id: 'test_1',
  type: 'payment_confirmed',
  title: 'Test',
  message: 'This is a test notification',
  read: false,
}])
```

---

## 📚 Documentation Review

- [ ] Read `NO_BREAKING_CHANGES_GUARANTEE.md`
  - [ ] Understand no changes to existing flow
  - [ ] Verify backend remains safe
- [ ] Read `NOTIFICATIONS_QUICK_START.md`
  - [ ] Understand basic usage
  - [ ] See 5 code examples
- [ ] Read `BACKEND_NOTIFICATIONS_SETUP.md`
  - [ ] Implement Django model
  - [ ] Implement REST endpoints
  - [ ] Implement Celery tasks
  - [ ] Implement WebSocket consumer
- [ ] Read `COMPLETE_FLOW_GUIDE.md`
  - [ ] Understand complete flow
  - [ ] Verify all integration points
- [ ] Refer to `NOTIFICATIONS_REDIS_CELERY.md` as needed

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] No TypeErrors or SyntaxErrors
- [ ] Redis configured
- [ ] Celery configured
- [ ] Django Channels configured

### Production Deployment
- [ ] Scale Redis if needed
- [ ] Scale Celery workers if needed
- [ ] Configure Celery Beat (one instance)
- [ ] Monitor Celery task queue
- [ ] Monitor WebSocket connections
- [ ] Set up logging for Celery

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check Celery task execution
- [ ] Test full payment → call flow
- [ ] Monitor Redis memory usage
- [ ] Verify notifications working

---

## 📊 Component Integration

### Components to Update (Optional)

#### Payment Components
- [ ] `components/PaymentModal.jsx`
  - [ ] Import `useNotifications()`
  - [ ] Subscribe to 'payment_initiated'
  - [ ] Subscribe to 'payment_confirmed'
  - [ ] Subscribe to 'payment_failed'
  - [ ] Show notifications

#### Appointment Components
- [ ] `pages/patient/PatientAppointments.jsx`
  - [ ] Import `useNotifications()`
  - [ ] Subscribe to 'appointment_booked'
  - [ ] Subscribe to 'appointment_confirmed'
  - [ ] Subscribe to 'appointment_reminder'
  - [ ] Display notifications
- [ ] `pages/consultant/ConsultantAppointments.jsx`
  - [ ] Similar updates

#### Call Components
- [ ] `pages/CallRoom.jsx`
  - [ ] Import `useNotifications()`
  - [ ] Subscribe to 'call_initiated'
  - [ ] Subscribe to 'call_connected'
  - [ ] Subscribe to 'call_ended'

#### Admin/Dashboard
- [ ] Create `NotificationCenter.jsx`
  - [ ] Show all notifications
  - [ ] Filter by type
  - [ ] Mark as read
  - [ ] Delete notifications
  - [ ] Show unread badge

---

## ⚙️ Configuration Checklist

### Django Settings
- [ ] `CELERY_BROKER_URL = 'redis://localhost:6379/0'`
- [ ] `CELERY_RESULT_BACKEND = 'redis://localhost:6379/1'`
- [ ] `CACHES['default']['LOCATION'] = 'redis://127.0.0.1:6379/2'`
- [ ] `CHANNEL_LAYERS` configured
- [ ] `INSTALLED_APPS` includes `channels`
- [ ] `ASGI_APPLICATION` configured

### Environment Variables
- [ ] `REDIS_URL` set
- [ ] `CELERY_BROKER_URL` set
- [ ] `CELERY_RESULT_BACKEND` set
- [ ] `WEBSOCKET_ALLOWED_ORIGINS` set

### Docker Compose (if using)
- [ ] Redis service
- [ ] Celery worker service
- [ ] Celery Beat service
- [ ] Django service
- [ ] All services networked

---

## 📈 Performance Monitoring

- [ ] Monitor Redis memory usage
- [ ] Monitor Celery task queue length
- [ ] Monitor task execution time
- [ ] Monitor WebSocket connections
- [ ] Monitor frontend cache hit rate
- [ ] Monitor frontend performance

---

## 🐛 Troubleshooting

### If Notifications Not Appearing
- [ ] Check Redis running: `redis-cli ping`
- [ ] Check Celery running: `celery -A project worker`
- [ ] Check WebSocket connected (browser DevTools)
- [ ] Check browser console for errors
- [ ] Check backend logs for errors
- [ ] Check Celery logs for task errors

### If WebSocket Not Connected
- [ ] Check WebSocket URL correct
- [ ] Check token valid
- [ ] Check Django Channels running
- [ ] Check ASGI configured
- [ ] Check ALLOWED_HOSTS includes domain

### If Celery Tasks Not Running
- [ ] Check Redis broker URL correct
- [ ] Check Celery worker running
- [ ] Check task queue not stuck
- [ ] Check task for exceptions
- [ ] Check database connection

---

## ✅ Final Verification

- [ ] All services running
- [ ] No error messages in logs
- [ ] WebSocket connected
- [ ] Celery tasks executing
- [ ] Notifications appearing in frontend
- [ ] Redis cache working
- [ ] localStorage persisting
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified

---

## 🎉 Done!

When all checkboxes are complete, your Redis + Notifications system is fully operational!

### Verification Script (Run in Django Shell)

```python
from django.contrib.auth.models import User
from your_app.models import Notification
from your_app.tasks import send_payment_initiated_email

# Test 1: Create test notification
user = User.objects.first()
notif = Notification.objects.create(
    user=user,
    type='payment_initiated',
    title='Test',
    message='Test notification'
)
print(f"✅ Notification created: {notif.id}")

# Test 2: Queue Celery task
send_payment_initiated_email.delay(
    payment_id='test_123',
    patient_id=user.id,
    amount=500,
    consultant_name='Dr. Test',
    patient_email=user.email
)
print("✅ Celery task queued")

# Test 3: Check cache
from django.core.cache import cache
cache.set('test_key', 'test_value', 60)
print(f"✅ Cache set: {cache.get('test_key')}")
```

---

**Start from top and work through each section.** You got this! 🚀

