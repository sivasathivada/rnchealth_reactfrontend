# Django Backend Implementation Checklist

## Phase 1: Prerequisites ✓ Check Off

- [ ] Redis installed and running: `redis-server`
- [ ] Test Redis connection: `redis-cli ping` (should return `PONG`)
- [ ] Install packages:
  ```bash
  pip install channels channels-redis celery redis
  ```
- [ ] Verify installations:
  ```bash
  python -c "import channels; import celery; import redis; print('All installed!')"
  ```

---

## Phase 2: Django Settings Configuration

Update `your_project/settings.py`:

- [ ] Add `'daphne'` to `INSTALLED_APPS`:
  ```python
  INSTALLED_APPS = [
      'daphne',  # Add this first
      'django.contrib.admin',
      # ... rest of apps
  ]
  ```

- [ ] Set ASGI application:
  ```python
  ASGI_APPLICATION = 'your_project.asgi.application'
  ```

- [ ] Add Channels configuration:
  ```python
  CHANNEL_LAYERS = {
      'default': {
          'BACKEND': 'channels_redis.core.RedisChannelLayer',
          'CONFIG': {
              'hosts': [('127.0.0.1', 6379)],
              'capacity': 1500,
              'expiry': 10,
          },
      },
  }
  ```

- [ ] Add Celery configuration:
  ```python
  CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
  CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
  CELERY_ACCEPT_CONTENT = ['application/json']
  CELERY_TASK_SERIALIZER = 'json'
  CELERY_RESULT_SERIALIZER = 'json'
  CELERY_TIMEZONE = 'UTC'
  ```

- [ ] Add CORS/WebSocket origin settings:
  ```python
  SECURE_WEBSOCKET_ORIGIN = [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
  ]
  ```

---

## Phase 3: Create Consumers

- [ ] Create `your_app/consumers.py` with:
  - [ ] `NotificationConsumer` class
  - [ ] `CallConsumer` class
  - [ ] `incoming_call()` method
  - [ ] `incoming_message()` method
  - [ ] `appointment_scheduled()` method
  - [ ] `celery_task_update()` method
  - [ ] `celery_task_complete()` method
  - [ ] `celery_task_error()` method

- [ ] Test consumer imports:
  ```bash
  python -c "from your_app.consumers import NotificationConsumer; print('OK')"
  ```

---

## Phase 4: Create Routing

- [ ] Create `your_app/routing.py` with:
  - [ ] WebSocket URL pattern for `/ws/notifications/`
  - [ ] WebSocket URL pattern for `/ws/consultations/`

- [ ] Verify routing syntax:
  ```bash
  python manage.py shell
  from your_app import routing
  print(routing.websocket_urlpatterns)
  ```

---

## Phase 5: Update ASGI

- [ ] Update `your_project/asgi.py` with:
  - [ ] Import necessary modules
  - [ ] Create `ProtocolTypeRouter`
  - [ ] Add `http` protocol handler
  - [ ] Add `websocket` protocol handler with auth
  - [ ] Include URL routing

- [ ] Test ASGI configuration:
  ```bash
  python -c "from your_project.asgi import application; print('ASGI OK')"
  ```

---

## Phase 6: Create Celery Tasks

- [ ] Create `your_app/tasks.py` with:
  - [ ] `send_appointment_notification()` task
  - [ ] `send_call_notification()` task
  - [ ] `send_message_notification()` task
  - [ ] Example long-running task with progress

- [ ] Test task imports:
  ```bash
  python -c "from your_app.tasks import send_appointment_notification; print('Tasks OK')"
  ```

---

## Phase 7: Celery Configuration

- [ ] Create `your_project/celery.py`:
  ```python
  import os
  from celery import Celery
  
  os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')
  
  app = Celery('your_project')
  app.config_from_object('django.conf:settings', namespace='CELERY')
  app.autodiscover_tasks()
  ```

- [ ] Update `your_project/__init__.py`:
  ```python
  from .celery import app as celery_app
  __all__ = ('celery_app',)
  ```

- [ ] Test Celery setup:
  ```bash
  celery -A your_project inspect active
  ```

---

## Phase 8: Use in Views/Models

- [ ] Import channel layer in views:
  ```python
  from channels.layers import get_channel_layer
  from asgiref.sync import async_to_sync
  ```

- [ ] Send notification on appointment creation:
  ```python
  from .tasks import send_appointment_notification
  
  send_appointment_notification.delay(
      patient_id=str(patient.id),
      consultant_id=str(consultant.id),
      appointment_data={...}
  )
  ```

- [ ] Test from Django shell:
  ```bash
  python manage.py shell
  from your_app.tasks import send_appointment_notification
  send_appointment_notification.delay('user_id', 'consultant_id', {'title': 'Test'})
  ```

---

## Phase 9: Start Services

- [ ] Terminal 1 - Start Redis:
  ```bash
  redis-server
  ```
  ✓ Should show: `Ready to accept connections`

- [ ] Terminal 2 - Start Daphne:
  ```bash
  daphne -b 127.0.0.1 -p 8000 your_project.asgi:application
  ```
  ✓ Should show: `Listening on TCP address 127.0.0.1:8000`

- [ ] Terminal 3 - Start Celery Worker:
  ```bash
  celery -A your_project worker -l info
  ```
  ✓ Should show: `celery@... ready`

- [ ] Terminal 4 - Start Celery Beat (optional):
  ```bash
  celery -A your_project beat -l info
  ```
  ✓ Should show: `beat: Scheduler started`

- [ ] Terminal 5 - Start React Frontend:
  ```bash
  npm run dev
  ```
  ✓ Should show: `VITE` dev server running

---

## Phase 10: Testing

- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Filter by WebSocket (WS)
- [ ] Open your app and navigate to dashboard
- [ ] Should see WebSocket connections:
  - [ ] `ws://127.0.0.1:8000/ws/notifications/[user_id]/`
  - [ ] `ws://127.0.0.1:8000/ws/consultations/[user_id]/`

- [ ] Check Console tab for logs:
  ```
  [NotificationSocket] WebSocket connection established
  [NotificationSocket] Handler registered for: notification
  ```

---

## Phase 11: Manual Testing

- [ ] Test from Django Shell:
  ```bash
  python manage.py shell
  
  from channels.layers import get_channel_layer
  from asgiref.sync import async_to_sync
  
  channel_layer = get_channel_layer()
  async_to_sync(channel_layer.group_send)(
      'notifications_{user_id}',
      {
          'type': 'notification',
          'title': 'Test',
          'message': 'Hello from Django!',
      }
  )
  ```

- [ ] Check React app - notification should appear!

- [ ] Test appointment notification:
  ```bash
  send_appointment_notification.delay(
      'patient_uuid',
      'consultant_uuid',
      {'id': '123', 'title': 'Checkup', 'patient_name': 'John', 'consultant_name': 'Dr. Smith'}
  )
  ```

---

## Phase 12: Troubleshooting

If WebSocket doesn't connect:

- [ ] Check Redis is running: `redis-cli ping`
- [ ] Check Django is using Daphne, not `runserver`
- [ ] Check WebSocket URL in browser DevTools Network tab
- [ ] Check browser Console for CORS errors
- [ ] Verify `SECURE_WEBSOCKET_ORIGIN` includes your frontend URL

If Celery tasks don't execute:

- [ ] Check Celery worker is running and says `ready`
- [ ] Check Django logs for task submission
- [ ] Run `celery -A your_project inspect active`
- [ ] Verify Redis connection: `redis-cli PING`

If notifications don't appear:

- [ ] Check browser Console for WebSocket errors
- [ ] Check Django Daphne terminal for consumer logs
- [ ] Verify event type matches in consumer
- [ ] Check Channels configuration in settings

---

## ✅ Final Verification

Run this checklist:

```bash
# 1. Redis
redis-cli ping
# Expected: PONG

# 2. Channels
python -c "import channels; print('✓ Channels')"

# 3. Celery
celery -A your_project inspect active
# Expected: List of workers

# 4. Consumer imports
python -c "from your_app.consumers import NotificationConsumer; print('✓ Consumers')"

# 5. ASGI
python -c "from your_project.asgi import application; print('✓ ASGI')"
```

All should pass! ✅

---

## 📞 Need Help?

Check these files in `healthappfrontend/`:
- `BACKEND_SETUP.md` - Detailed implementation guide
- `NOTIFICATION_USAGE.md` - Frontend usage examples
- `QUICK_START.md` - Quick reference

