# Django Channels + Celery + Redis Integration Guide

## Frontend Configuration ✅ DONE

The React frontend is now configured with:
- **NotificationContext** - Centralized notification state management
- **NotificationSocketContext** - WebSocket connection for real-time notifications
- **NotificationCenter** - UI component displaying all notifications
- **WebRTCContext** - Existing WebSocket for calls (unchanged)

---

## Backend Setup Required

### 1. Django Settings Configuration

Add to your `settings.py`:

```python
# ── CHANNELS CONFIGURATION ──
ASGI_APPLICATION = 'your_project.asgi.application'

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

# ── CELERY CONFIGURATION ──
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# ── CORS FOR WEBSOCKETS ──
SECURE_WEBSOCKET_ORIGIN = ['http://127.0.0.1:5173', 'http://localhost:5173']
```

---

### 2. Channels Consumer for Notifications

Create `your_app/consumers.py`:

```python
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for sending real-time notifications to users.
    Connects to: ws://127.0.0.1:8000/ws/notifications/{user_id}/?token={token}
    """

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.user = self.scope['user']
        self.room_group_name = f'notifications_{self.user_id}'

        # Only allow authenticated users
        if isinstance(self.user, AnonymousUser):
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f'[Notification] User {self.user_id} connected')

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f'[Notification] User {self.user_id} disconnected')

    async def receive(self, text_data):
        """Receive messages from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            # Handle incoming messages if needed
            print(f'[Notification] Received from {self.user_id}: {message_type}')
        except json.JSONDecodeError:
            pass

    # ─── NOTIFICATION HANDLERS ───
    # These are called from tasks or signals

    async def incoming_call(self, event):
        """Send incoming call notification"""
        await self.send(text_data=json.dumps({
            'type': 'incoming_call',
            'caller_name': event['caller_name'],
            'caller_id': event['caller_id'],
            'session_id': event['session_id'],
        }))

    async def incoming_message(self, event):
        """Send incoming message notification"""
        await self.send(text_data=json.dumps({
            'type': 'incoming_message',
            'sender_name': event['sender_name'],
            'sender_id': event['sender_id'],
            'message': event['message'],
        }))

    async def appointment_scheduled(self, event):
        """Send appointment scheduled notification"""
        await self.send(text_data=json.dumps({
            'type': 'appointment_scheduled',
            'appointment_title': event['appointment_title'],
            'appointment_id': event['appointment_id'],
            'message': event.get('message', 'New appointment scheduled'),
        }))

    async def appointment_reminder(self, event):
        """Send appointment reminder notification"""
        await self.send(text_data=json.dumps({
            'type': 'appointment_reminder',
            'appointment_title': event['appointment_title'],
            'appointment_id': event['appointment_id'],
            'message': event.get('message', 'Appointment reminder'),
        }))

    async def celery_task_update(self, event):
        """Send Celery task status update"""
        await self.send(text_data=json.dumps({
            'type': 'celery_task_update',
            'task_name': event['task_name'],
            'task_status': event['task_status'],
            'progress': event.get('progress', 0),
        }))

    async def celery_task_complete(self, event):
        """Send Celery task completion notification"""
        await self.send(text_data=json.dumps({
            'type': 'celery_task_complete',
            'task_name': event['task_name'],
            'message': event.get('message', 'Task completed'),
        }))

    async def celery_task_error(self, event):
        """Send Celery task error notification"""
        await self.send(text_data=json.dumps({
            'type': 'celery_task_error',
            'task_name': event['task_name'],
            'message': event.get('message', 'Task failed'),
        }))

    async def notification(self, event):
        """Generic notification handler"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'title': event['title'],
            'message': event['message'],
        }))


class CallConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for handling call signaling.
    Connects to: ws://127.0.0.1:8000/ws/consultations/{user_id}/?token={token}
    """

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.user = self.scope['user']
        self.room_group_name = f'consultations_{self.user_id}'

        if isinstance(self.user, AnonymousUser):
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f'[Call] User {self.user_id} connected')

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'join_call_room':
            # Handle call room join
            pass

    async def incoming_call(self, event):
        await self.send(text_data=json.dumps(event))
```

---

### 3. Update URLs

Update `your_app/urls.py` for HTTP routes (Channels will handle WebSocket):

```python
from django.urls import path
from . import views

urlpatterns = [
    # Your existing URLs
]
```

Update `your_project/asgi.py`:

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
import your_app.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                your_app.routing.websocket_urlpatterns
            )
        )
    ),
})
```

Create `your_app/routing.py`:

```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/notifications/(?P<user_id>[^/]+)/$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'ws/consultations/(?P<user_id>[^/]+)/$', consumers.CallConsumer.as_asgi()),
]
```

---

### 4. Celery Tasks Examples

Create `your_app/tasks.py`:

```python
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json


@shared_task(bind=True)
def send_appointment_notification(self, patient_id, consultant_id, appointment_data):
    """Send appointment notification to both patient and consultant"""
    channel_layer = get_channel_layer()

    # Notify consultant
    async_to_sync(channel_layer.group_send)(
        f'notifications_{consultant_id}',
        {
            'type': 'appointment_scheduled',
            'appointment_title': appointment_data['title'],
            'appointment_id': appointment_data['id'],
            'message': f"New appointment with {appointment_data['patient_name']}",
        }
    )

    # Notify patient
    async_to_sync(channel_layer.group_send)(
        f'notifications_{patient_id}',
        {
            'type': 'appointment_scheduled',
            'appointment_title': appointment_data['title'],
            'appointment_id': appointment_data['id'],
            'message': f"Appointment confirmed with Dr. {appointment_data['consultant_name']}",
        }
    )


@shared_task(bind=True)
def send_call_notification(self, caller_id, receiver_id, session_data):
    """Send incoming call notification"""
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f'consultations_{receiver_id}',
        {
            'type': 'incoming_call',
            'caller_name': session_data['caller_name'],
            'caller_id': caller_id,
            'session_id': session_data['session_id'],
        }
    )


@shared_task(bind=True)
def send_message_notification(self, sender_id, receiver_id, message_data):
    """Send incoming message notification"""
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f'notifications_{receiver_id}',
        {
            'type': 'incoming_message',
            'sender_name': message_data['sender_name'],
            'sender_id': sender_id,
            'message': message_data['message'],
        }
    )


@shared_task(bind=True)
def long_running_task(self, task_data):
    """Example long-running task with progress updates"""
    channel_layer = get_channel_layer()
    user_id = task_data['user_id']

    try:
        # Update task progress
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'celery_task_update',
                'task_name': 'Data Processing',
                'task_status': 'Processing...',
                'progress': 50,
            }
        )

        # Do some work...

        # Task complete
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'celery_task_complete',
                'task_name': 'Data Processing',
                'message': 'Your data has been processed successfully',
            }
        )
    except Exception as e:
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'celery_task_error',
                'task_name': 'Data Processing',
                'message': str(e),
            }
        )
```

---

### 5. Using in Views/Signals

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .tasks import send_appointment_notification

# Example: Trigger notification on appointment creation
def create_appointment(request):
    # Create appointment...
    
    # Queue task for notification
    send_appointment_notification.delay(
        patient_id=str(patient.id),
        consultant_id=str(consultant.id),
        appointment_data={
            'id': str(appointment.id),
            'title': appointment.title,
            'patient_name': patient.user.first_name,
            'consultant_name': consultant.user.first_name,
        }
    )
    
    return Response({'message': 'Appointment created'})
```

---

## Running the Services

```bash
# Terminal 1: Run Redis
redis-server

# Terminal 2: Run Django development server with Channels
daphne -b 127.0.0.1 -p 8000 your_project.asgi:application

# Terminal 3: Run Celery Worker
celery -A your_project worker -l info

# Terminal 4: Run Celery Beat (for scheduled tasks)
celery -A your_project beat -l info

# Terminal 5: Run React dev server
npm run dev
```

---

## Testing Notifications

Open browser DevTools and check Console. You should see:
```
[NotificationSocket] WebSocket connection established
[NotificationSocket] Message received: incoming_call
```

Test from Django shell:
```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# Send test notification
async_to_sync(channel_layer.group_send)(
    'notifications_{user_id}',
    {
        'type': 'notification',
        'title': 'Test',
        'message': 'This is a test notification',
    }
)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| WebSocket 404 | Check `routing.py` URLs and `ASGI_APPLICATION` setting |
| Can't connect to Redis | Ensure `redis-server` is running on port 6379 |
| Tasks not executing | Check Celery worker terminal for errors |
| Notifications not appearing | Check browser DevTools Console for WebSocket errors |

