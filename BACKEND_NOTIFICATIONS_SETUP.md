# Backend Integration Guide - Notifications & Redis

## 🎯 Overview

Your Django backend needs to integrate with this frontend notifications system. This guide shows the exact API endpoints and Celery tasks needed.

---

## 📋 Backend Requirements Checklist

### Database Models ✅
- [ ] `Notification` model to store notifications
- [ ] `NotificationPreference` model for user notification settings
- [ ] Fields: id, user, type, title, message, data (JSONField), read, created_at, updated_at

### REST API Endpoints
- [ ] `GET /notifications/` - Fetch notifications for current user
- [ ] `PATCH /notifications/{id}/read/` - Mark as read
- [ ] `POST /notifications/mark-all-read/` - Mark all as read
- [ ] `DELETE /notifications/{id}/` - Delete notification

### WebSocket Events (via Django Channels)
- [ ] `ws://127.0.0.1:8000/ws/notifications/{user_id}/` - WebSocket connection

### Celery Tasks
- [ ] `send_payment_initiated_email` - Send payment start notification
- [ ] `create_appointment_task` - Create appointment & send notification
- [ ] `send_confirmation_to_patient` - Send appointment confirmation
- [ ] `notify_patient_incoming_call` - Send incoming call notification
- [ ] `process_call_completion` - Send call end notification
- [ ] `appointment_reminder_task` - Send reminder 15 min before (Celery Beat)

---

## 🛠️ Django Models (Add to your app)

```python
# models.py
from django.db import models
from django.contrib.auth.models import User

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('payment_initiated', 'Payment Initiated'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('payment_failed', 'Payment Failed'),
        ('appointment_booked', 'Appointment Booked'),
        ('appointment_confirmed', 'Appointment Confirmed'),
        ('appointment_rejected', 'Appointment Rejected'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('appointment_reminder', 'Appointment Reminder'),
        ('call_initiated', 'Call Initiated'),
        ('call_connected', 'Call Connected'),
        ('call_ended', 'Call Ended'),
        ('prescription_created', 'Prescription Created'),
        ('system_alert', 'System Alert'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Extra data like IDs
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'read']),
        ]

    def __str__(self):
        return f"{self.type} - {self.user.email}"

    def to_dict(self):
        return {
            'id': str(self.id),
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'data': self.data,
            'read': self.read,
            'created_at': int(self.created_at.timestamp() * 1000),
            'timestamp': self.created_at.isoformat(),
        }
```

---

## 🔌 REST API Endpoints

```python
# serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'data', 'read', 'created_at', 'timestamp']
        read_only_fields = ['created_at', 'timestamp']

# views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')[:100]

    def list(self, request, *args, **kwargs):
        """Get notifications for current user"""
        limit = request.query_params.get('limit', 50)
        queryset = self.get_queryset()[:int(limit)]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(
            user=request.user,
            read=False
        ).update(read=True)
        
        return Response({'status': 'all notifications marked as read'})

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        """Mark single notification as read"""
        notification = self.get_object()
        notification.read = True
        notification.save()
        
        return Response({'status': 'notification marked as read'})

    def destroy(self, request, *args, **kwargs):
        """Delete notification"""
        return super().destroy(request, *args, **kwargs)

# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
router.register('notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
```

---

## 📨 Celery Tasks (Add to tasks.py)

```python
# tasks.py
from celery import shared_task
from django.core.mail import send_mail
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from .models import Notification

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# PAYMENT NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=3)
def send_payment_initiated_email(self, payment_id, patient_id, amount, consultant_name, patient_email):
    """
    Triggered when patient initiates payment
    Backend API: POST /v1/payments/initiate/
    """
    try:
        # Send email
        send_mail(
            subject='Payment Initiated - Health App',
            message=f'Your payment of ₹{amount} to consult {consultant_name} has been initiated.',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        # Create notification in DB
        notification = Notification.objects.create(
            user_id=patient_id,
            type='payment_initiated',
            title='Payment Started',
            message=f'Payment of ₹{amount} initiated for appointment with {consultant_name}',
            data={
                'payment_id': str(payment_id),
                'amount': amount,
                'consultant_name': consultant_name,
            }
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'payment_initiated',
                'payment_id': str(payment_id),
                'amount': amount,
                'consultant_name': consultant_name,
            }
        )

        logger.info(f'[Notification] Payment initiated: {payment_id}')
        return {'status': 'success', 'notification_id': notification.id}

    except Exception as exc:
        logger.error(f'[Notification] Error sending payment email: {exc}')
        raise self.retry(exc=exc, countdown=60)

@shared_task(bind=True, max_retries=3)
def send_payment_confirmed_email(self, payment_id, patient_id, amount, appointment_id, consultant_name, patient_email):
    """
    Triggered after payment confirmation
    Backend API: POST /v1/payments/confirm/
    This should also trigger create_appointment_task
    """
    try:
        # Send email
        send_mail(
            subject='Payment Confirmed - Health App',
            message=f'Your payment of ₹{amount} has been confirmed. Your appointment is booked!',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        # Create notification
        notification = Notification.objects.create(
            user_id=patient_id,
            type='payment_confirmed',
            title='Payment Confirmed',
            message=f'Payment of ₹{amount} confirmed! Appointment booked with {consultant_name}',
            data={
                'payment_id': str(payment_id),
                'amount': amount,
                'appointment_id': str(appointment_id),
                'consultant_name': consultant_name,
            }
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'payment_confirmed',
                'payment_id': str(payment_id),
                'amount': amount,
                'appointment_id': str(appointment_id),
                'consultant_name': consultant_name,
            }
        )

        logger.info(f'[Notification] Payment confirmed: {payment_id}')
        return {'status': 'success', 'notification_id': notification.id}

    except Exception as exc:
        logger.error(f'[Notification] Error sending confirmation email: {exc}')
        raise self.retry(exc=exc, countdown=60)

@shared_task(bind=True)
def send_payment_failed_email(self, payment_id, patient_id, reason, patient_email):
    """Triggered when payment fails"""
    try:
        # Send email
        send_mail(
            subject='Payment Failed - Health App',
            message=f'Your payment could not be processed. Reason: {reason}. Please try again.',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        # Create notification
        Notification.objects.create(
            user_id=patient_id,
            type='payment_failed',
            title='Payment Failed',
            message=f'Payment failed. Reason: {reason}',
            data={'payment_id': str(payment_id), 'reason': reason}
        )

        # Send WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'payment_failed',
                'payment_id': str(payment_id),
                'reason': reason,
            }
        )

        logger.info(f'[Notification] Payment failed: {payment_id}')

    except Exception as exc:
        logger.error(f'[Notification] Error sending payment failed email: {exc}')

# ═══════════════════════════════════════════════════════════════════
# APPOINTMENT NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=3)
def send_appointment_confirmation_email(self, appointment_id, patient_id, consultant_id, appointment_date, patient_email, consultant_email, consultant_name):
    """
    Triggered when appointment is confirmed by consultant
    Backend API: POST /v1/book-appointment/appointments/{id}/confirm/
    """
    try:
        # Send to patient
        send_mail(
            subject='Appointment Confirmed - Health App',
            message=f'{consultant_name} has confirmed your appointment for {appointment_date}',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        # Create notification for patient
        notification = Notification.objects.create(
            user_id=patient_id,
            type='appointment_confirmed',
            title='Appointment Confirmed',
            message=f'{consultant_name} confirmed your appointment for {appointment_date}',
            data={
                'appointment_id': str(appointment_id),
                'consultant_id': str(consultant_id),
                'consultant_name': consultant_name,
                'appointment_date': appointment_date,
            }
        )

        # Send WebSocket to patient
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'appointment_confirmed',
                'appointment_id': str(appointment_id),
                'consultant_name': consultant_name,
                'appointment_date': appointment_date,
            }
        )

        logger.info(f'[Notification] Appointment confirmed: {appointment_id}')
        return {'status': 'success', 'notification_id': notification.id}

    except Exception as exc:
        logger.error(f'[Notification] Error sending confirmation: {exc}')
        raise self.retry(exc=exc, countdown=60)

@shared_task(bind=True)
def send_appointment_reminder(self, appointment_id, patient_id, consultant_name, appointment_time, patient_email):
    """
    Triggered 15 minutes before appointment (Celery Beat scheduled task)
    """
    try:
        # Send email
        send_mail(
            subject='Appointment Reminder - Health App',
            message=f'Reminder: Your appointment with {consultant_name} is in 15 minutes at {appointment_time}',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        # Create notification
        Notification.objects.create(
            user_id=patient_id,
            type='appointment_reminder',
            title='Appointment Reminder',
            message=f'Appointment with {consultant_name} in 15 minutes',
            data={
                'appointment_id': str(appointment_id),
                'time_until': '15 minutes',
                'consultant_name': consultant_name,
            }
        )

        # Send WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'appointment_reminder',
                'appointment_id': str(appointment_id),
                'time_until': '15 minutes',
                'consultant_name': consultant_name,
            }
        )

        logger.info(f'[Notification] Reminder sent: {appointment_id}')

    except Exception as exc:
        logger.error(f'[Notification] Error sending reminder: {exc}')

# ═══════════════════════════════════════════════════════════════════
# CALL NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

@shared_task(bind=True, max_retries=2)
def notify_patient_incoming_call(self, call_id, patient_id, initiator_id, initiator_name, patient_email):
    """
    Triggered when consultant initiates call
    Backend API: POST /v1/book-appointment/initiate/
    """
    try:
        # Send email (optional for incoming call)
        send_mail(
            subject='Incoming Call - Health App',
            message=f'{initiator_name} is calling you!',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        # Create notification
        Notification.objects.create(
            user_id=patient_id,
            type='call_initiated',
            title='Incoming Call',
            message=f'{initiator_name} is calling...',
            data={
                'call_id': str(call_id),
                'initiator_id': str(initiator_id),
                'initiator_name': initiator_name,
            }
        )

        # Send WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'call_initiated',
                'call_id': str(call_id),
                'initiator_id': str(initiator_id),
                'initiator_name': initiator_name,
            }
        )

        logger.info(f'[Notification] Incoming call: {call_id}')

    except Exception as exc:
        logger.error(f'[Notification] Error notifying incoming call: {exc}')
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=10)

@shared_task(bind=True)
def notify_call_connected(self, call_id, user_id, other_user_name):
    """Triggered when call connection is established"""
    try:
        Notification.objects.create(
            user_id=user_id,
            type='call_connected',
            title='Call Connected',
            message=f'Connected with {other_user_name}',
            data={'call_id': str(call_id), 'caller_name': other_user_name}
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'call_connected',
                'call_id': str(call_id),
                'caller_name': other_user_name,
            }
        )

        logger.info(f'[Notification] Call connected: {call_id}')

    except Exception as exc:
        logger.error(f'[Notification] Error notifying call connected: {exc}')

@shared_task(bind=True)
def notify_call_ended(self, call_id, user_id, other_user_name, duration_seconds):
    """Triggered when call ends"""
    try:
        duration_minutes = duration_seconds // 60
        
        Notification.objects.create(
            user_id=user_id,
            type='call_ended',
            title='Call Ended',
            message=f'Call with {other_user_name} ended. Duration: {duration_minutes} min',
            data={
                'call_id': str(call_id),
                'duration': f'{duration_minutes} min',
                'other_user_name': other_user_name,
            }
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'call_ended',
                'call_id': str(call_id),
                'duration': f'{duration_minutes} min',
                'other_user_name': other_user_name,
            }
        )

        logger.info(f'[Notification] Call ended: {call_id}')

    except Exception as exc:
        logger.error(f'[Notification] Error notifying call ended: {exc}')

# ═══════════════════════════════════════════════════════════════════
# PRESCRIPTION NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

@shared_task(bind=True)
def notify_prescription_issued(self, prescription_id, patient_id, consultant_name, patient_email):
    """Triggered when consultant issues prescription after call"""
    try:
        send_mail(
            subject='Prescription Issued - Health App',
            message=f'{consultant_name} has issued a prescription for you.',
            from_email='noreply@healthapp.com',
            recipient_list=[patient_email],
            fail_silently=False,
        )

        Notification.objects.create(
            user_id=patient_id,
            type='prescription_created',
            title='Prescription Issued',
            message=f'{consultant_name} issued a prescription for you',
            data={
                'prescription_id': str(prescription_id),
                'consultant_name': consultant_name,
            }
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{patient_id}',
            {
                'type': 'prescription_created',
                'prescription_id': str(prescription_id),
                'consultant_name': consultant_name,
            }
        )

        logger.info(f'[Notification] Prescription issued: {prescription_id}')

    except Exception as exc:
        logger.error(f'[Notification] Error notifying prescription: {exc}')
```

---

## ⏰ Celery Beat Scheduled Tasks (settings.py)

```python
# settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'send-appointment-reminders': {
        'task': 'your_app.tasks.check_and_send_appointment_reminders',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
}

# Create this task to check for appointments 15 minutes from now
# tasks.py
@shared_task
def check_and_send_appointment_reminders():
    """Check for appointments in 15 minutes and send reminders"""
    from datetime import datetime, timedelta
    from .models import Appointment
    
    now = datetime.now()
    fifteen_min_later = now + timedelta(minutes=15)
    
    # Get appointments in next 15 minutes
    upcoming = Appointment.objects.filter(
        appointment_date__gte=now,
        appointment_date__lte=fifteen_min_later,
        status='confirmed'
    )
    
    for appointment in upcoming:
        send_appointment_reminder.delay(
            appointment_id=appointment.id,
            patient_id=appointment.patient_id,
            consultant_name=appointment.consultant.first_name,
            appointment_time=appointment.appointment_date.strftime('%H:%M'),
            patient_email=appointment.patient.email
        )
```

---

## 📡 WebSocket Consumer (Update your consumers.py)

```python
# consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import logging

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        self.user_id = str(self.user.id)
        self.group_name = f'notifications_{self.user_id}'

        # Join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f'[WebSocket] User {self.user_id} connected to notifications')

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f'[WebSocket] User {self.user_id} disconnected')

    # Handle different notification types
    async def payment_initiated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'payment_initiated',
            'payment_id': event['payment_id'],
            'amount': event['amount'],
            'consultant_name': event['consultant_name'],
        }))

    async def payment_confirmed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'payment_confirmed',
            'payment_id': event['payment_id'],
            'amount': event['amount'],
            'appointment_id': event['appointment_id'],
        }))

    async def appointment_confirmed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'appointment_confirmed',
            'appointment_id': event['appointment_id'],
            'consultant_name': event['consultant_name'],
            'appointment_date': event['appointment_date'],
        }))

    async def call_initiated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_initiated',
            'call_id': event['call_id'],
            'initiator_name': event['initiator_name'],
        }))

    async def call_connected(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_connected',
            'call_id': event['call_id'],
            'caller_name': event['caller_name'],
        }))

    async def call_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_ended',
            'call_id': event['call_id'],
            'duration': event['duration'],
        }))

    # ... Add more handler methods for other notification types
```

---

## 🚀 Triggering Notifications from Your Views

When processing payments and appointments, trigger Celery tasks:

```python
# In your payment view
def confirm_payment(request):
    # Process payment...
    payment_confirmed = True  # After Razorpay/Stripe confirms
    
    if payment_confirmed:
        # Trigger Celery task
        send_payment_confirmed_email.delay(
            payment_id=payment.id,
            patient_id=request.user.id,
            amount=payment.amount,
            appointment_id=appointment.id,
            consultant_name=appointment.consultant.first_name,
            patient_email=request.user.email,
            consultant_email=appointment.consultant.email,
        )

# In your appointment confirmation view
def confirm_appointment(request, appointment_id):
    appointment = Appointment.objects.get(id=appointment_id)
    appointment.status = 'confirmed'
    appointment.save()
    
    # Trigger Celery task
    send_appointment_confirmation_email.delay(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        consultant_id=appointment.consultant_id,
        appointment_date=str(appointment.appointment_date),
        patient_email=appointment.patient.email,
        consultant_email=appointment.consultant.email,
        consultant_name=appointment.consultant.first_name,
    )
```

---

## ✅ Testing

```bash
# Test Celery task
celery -A your_project worker -l info

# Test with shell
python manage.py shell
>>> from your_app.tasks import send_payment_initiated_email
>>> send_payment_initiated_email.delay(
...     payment_id='pay_123',
...     patient_id=1,
...     amount=5000,
...     consultant_name='Dr. Smith',
...     patient_email='patient@example.com'
... )
```

---

## 📊 Summary

Backend Integration Needed:
- ✅ Notification model + REST endpoints
- ✅ Celery tasks for each notification type
- ✅ WebSocket consumer to send notifications
- ✅ Celery Beat for scheduled reminders
- ✅ Redis configured as Celery broker

Frontend will automatically:
- Cache all notifications in Redis
- Show unread count badge
- Subscribe to specific notification types
- Update UI in real-time

