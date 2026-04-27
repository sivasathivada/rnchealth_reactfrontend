/**
 * Notifications Service with Redis Caching & Celery Integration
 *
 * Handles all notifications with Redis caching layer:
 * - Payment notifications (payment_initiated, payment_confirmed, payment_failed)
 * - Appointment notifications (appointment_booked, appointment_confirmed, appointment_rejected)
 * - Call notifications (call_initiated, call_connected, call_ended)
 * - System notifications (system_alert, system_info)
 *
 * Integrates with Django Celery background tasks for async notifications
 * Pattern: Celery task → Backend Redis → WebSocket → Frontend cache → UI
 */

import { cacheService } from './cache';
import api from './api';

class NotificationsService {
  constructor() {
    this.notificationSubscribers = new Map(); // Store callbacks for each notification type
    this.unreadCount = 0;
    this.init();
  }

  init() {
    this.loadNotificationsFromCache();
  }

  /**
   * Get notifications for current user from cache/backend
   */
  loadNotificationsFromCache() {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?.id;
      if (!userId) return [];

      const cached = cacheService.get(`notifications:${userId}`);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.error('[Notifications] Error loading from cache:', error);
    }
    return [];
  }

  /**
   * Fetch notifications from backend
   */
  async fetchNotifications(userId, limit = 50) {
    try {
      const response = await api.get(`/notifications/`, {
        params: { limit, user_id: userId }
      });

      const notifications = response.data;
      
      // Cache in Redis
      cacheService.set(
        `notifications:${userId}`,
        notifications,
        3600 // 1 hour TTL
      );

      // Update unread count
      this.unreadCount = notifications.filter(n => !n.read).length;
      cacheService.set(`notifications:unread:${userId}`, this.unreadCount, 3600);

      return notifications;
    } catch (error) {
      console.error('[Notifications] Error fetching notifications:', error);
      // Fallback to cache
      return this.loadNotificationsFromCache();
    }
  }

  /**
   * Add notification to cache (called from WebSocket)
   */
  addNotificationToCache(userId, notification) {
    const cacheKey = `notifications:${userId}`;
    let notifications = cacheService.get(cacheKey) || [];

    // Add to front
    notifications = [notification, ...notifications];

    // Keep only last 100
    notifications = notifications.slice(0, 100);

    // Update cache
    cacheService.set(cacheKey, notifications, 3600);

    // Update unread count
    if (!notification.read) {
      this.unreadCount += 1;
      cacheService.set(`notifications:unread:${userId}`, this.unreadCount, 3600);
    }

    // Notify subscribers
    this.notifySubscribers(notification.type, notification);

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId, notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read/`, {});

      const cacheKey = `notifications:${userId}`;
      let notifications = cacheService.get(cacheKey) || [];

      // Update in cache
      notifications = notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );

      cacheService.set(cacheKey, notifications, 3600);

      // Update unread count
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      cacheService.set(`notifications:unread:${userId}`, this.unreadCount, 3600);

      return true;
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      await api.post(`/notifications/mark-all-read/`, {});

      const cacheKey = `notifications:${userId}`;
      let notifications = cacheService.get(cacheKey) || [];

      // Mark all as read
      notifications = notifications.map(n => ({ ...n, read: true }));

      cacheService.set(cacheKey, notifications, 3600);

      // Reset unread count
      this.unreadCount = 0;
      cacheService.set(`notifications:unread:${userId}`, 0, 3600);

      return true;
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId, notificationId) {
    try {
      await api.delete(`/notifications/${notificationId}/`);

      const cacheKey = `notifications:${userId}`;
      let notifications = cacheService.get(cacheKey) || [];

      // Remove from cache
      notifications = notifications.filter(n => n.id !== notificationId);

      cacheService.set(cacheKey, notifications, 3600);

      return true;
    } catch (error) {
      console.error('[Notifications] Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId) {
    const cached = cacheService.get(`notifications:unread:${userId}`);
    return cached !== null ? cached : this.unreadCount;
  }

  /**
   * Subscribe to notification type
   * Returns unsubscribe function
   */
  subscribe(notificationType, callback) {
    if (!this.notificationSubscribers.has(notificationType)) {
      this.notificationSubscribers.set(notificationType, []);
    }

    this.notificationSubscribers.get(notificationType).push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.notificationSubscribers.get(notificationType);
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of a notification type
   */
  notifySubscribers(notificationType, notification) {
    const subscribers = this.notificationSubscribers.get(notificationType) || [];
    subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('[Notifications] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * NOTIFICATION TYPE HANDLERS (Called from WebSocket)
   * ═══════════════════════════════════════════════════════════
   */

  /**
   * PAYMENT NOTIFICATIONS
   * Triggered by Celery tasks: payment_initiated_task, payment_confirmed_task, etc.
   */
  handlePaymentInitiated(userId, data) {
    const notification = {
      id: data.payment_id || `payment_${Date.now()}`,
      type: 'payment_initiated',
      title: 'Payment Started',
      message: `Payment of ₹${data.amount} initiated for appointment with ${data.consultant_name}`,
      data: {
        payment_id: data.payment_id,
        amount: data.amount,
        appointment_id: data.appointment_id,
        consultant_name: data.consultant_name,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Payment initiated:', notification);
    return notification;
  }

  handlePaymentConfirmed(userId, data) {
    const notification = {
      id: data.payment_id || `payment_${Date.now()}`,
      type: 'payment_confirmed',
      title: 'Payment Confirmed',
      message: `Payment of ₹${data.amount} confirmed! Appointment booked with ${data.consultant_name}`,
      data: {
        payment_id: data.payment_id,
        amount: data.amount,
        appointment_id: data.appointment_id,
        consultant_name: data.consultant_name,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Payment confirmed:', notification);
    return notification;
  }

  handlePaymentFailed(userId, data) {
    const notification = {
      id: data.payment_id || `payment_${Date.now()}`,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Payment of ₹${data.amount} failed. Reason: ${data.reason || 'Unknown'}. Please try again.`,
      data: {
        payment_id: data.payment_id,
        amount: data.amount,
        reason: data.reason,
        appointment_id: data.appointment_id,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Payment failed:', notification);
    return notification;
  }

  /**
   * APPOINTMENT NOTIFICATIONS
   * Triggered by Celery tasks: appointment_booked_task, appointment_confirmed_task, etc.
   */
  handleAppointmentBooked(userId, data) {
    const notification = {
      id: data.appointment_id || `apt_${Date.now()}`,
      type: 'appointment_booked',
      title: 'Appointment Booked',
      message: `Your appointment with ${data.consultant_name} is confirmed for ${data.appointment_date} at ${data.appointment_time}`,
      data: {
        appointment_id: data.appointment_id,
        consultant_id: data.consultant_id,
        consultant_name: data.consultant_name,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Appointment booked:', notification);
    return notification;
  }

  handleAppointmentConfirmed(userId, data) {
    const notification = {
      id: data.appointment_id || `apt_${Date.now()}`,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: `${data.consultant_name} confirmed your appointment for ${data.appointment_date}`,
      data: {
        appointment_id: data.appointment_id,
        consultant_id: data.consultant_id,
        consultant_name: data.consultant_name,
        appointment_date: data.appointment_date,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Appointment confirmed:', notification);
    return notification;
  }

  handleAppointmentRejected(userId, data) {
    const notification = {
      id: data.appointment_id || `apt_${Date.now()}`,
      type: 'appointment_rejected',
      title: 'Appointment Rejected',
      message: `${data.consultant_name} rejected your appointment. Reason: ${data.reason || 'Not specified'}`,
      data: {
        appointment_id: data.appointment_id,
        consultant_name: data.consultant_name,
        reason: data.reason,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Appointment rejected:', notification);
    return notification;
  }

  handleAppointmentCancelled(userId, data) {
    const notification = {
      id: data.appointment_id || `apt_${Date.now()}`,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      message: `Appointment with ${data.consultant_name} has been cancelled.`,
      data: {
        appointment_id: data.appointment_id,
        consultant_name: data.consultant_name,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Appointment cancelled:', notification);
    return notification;
  }

  handleAppointmentReminder(userId, data) {
    const notification = {
      id: data.appointment_id || `apt_${Date.now()}`,
      type: 'appointment_reminder',
      title: 'Appointment Reminder',
      message: `Reminder: Your appointment with ${data.consultant_name} is in ${data.time_until}`,
      data: {
        appointment_id: data.appointment_id,
        consultant_name: data.consultant_name,
        time_until: data.time_until,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Appointment reminder:', notification);
    return notification;
  }

  /**
   * CALL NOTIFICATIONS
   * Triggered by Celery tasks: call_initiated_task, call_connected_task, etc.
   */
  handleCallInitiated(userId, data) {
    const notification = {
      id: data.call_id || `call_${Date.now()}`,
      type: 'call_initiated',
      title: 'Call Initiated',
      message: `${data.initiator_name} is calling...`,
      data: {
        call_id: data.call_id,
        initiator_id: data.initiator_id,
        initiator_name: data.initiator_name,
        appointment_id: data.appointment_id,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Call initiated:', notification);
    return notification;
  }

  handleCallConnected(userId, data) {
    const notification = {
      id: data.call_id || `call_${Date.now()}`,
      type: 'call_connected',
      title: 'Call Connected',
      message: `Connected with ${data.caller_name}. Call started.`,
      data: {
        call_id: data.call_id,
        caller_name: data.caller_name,
        call_start_time: data.call_start_time,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Call connected:', notification);
    return notification;
  }

  handleCallEnded(userId, data) {
    const notification = {
      id: data.call_id || `call_${Date.now()}`,
      type: 'call_ended',
      title: 'Call Ended',
      message: `Call with ${data.other_user_name} ended. Duration: ${data.duration}`,
      data: {
        call_id: data.call_id,
        other_user_name: data.other_user_name,
        duration: data.duration,
        call_quality: data.call_quality,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Call ended:', notification);
    return notification;
  }

  /**
   * PRESCRIPTION NOTIFICATIONS
   */
  handlePrescriptionCreated(userId, data) {
    const notification = {
      id: data.prescription_id || `rx_${Date.now()}`,
      type: 'prescription_created',
      title: 'Prescription Issued',
      message: `${data.consultant_name} issued a prescription for you`,
      data: {
        prescription_id: data.prescription_id,
        consultant_name: data.consultant_name,
        appointment_id: data.appointment_id,
      },
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] Prescription created:', notification);
    return notification;
  }

  /**
   * SYSTEM NOTIFICATIONS
   */
  handleSystemAlert(userId, data) {
    const notification = {
      id: data.alert_id || `alert_${Date.now()}`,
      type: 'system_alert',
      title: data.title || 'System Alert',
      message: data.message,
      data: data.data || {},
      read: false,
      created_at: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.addNotificationToCache(userId, notification);
    console.log('[Notifications] System alert:', notification);
    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId, type = null) {
    const cacheKey = `notifications:${userId}`;
    let notifications = cacheService.get(cacheKey) || [];

    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    return notifications;
  }

  /**
   * Get notification stats
   */
  async getNotificationStats(userId) {
    const notifications = await this.getNotifications(userId);

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      by_type: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Clear all notifications (optional)
   */
  clearAllNotifications(userId) {
    cacheService.delete(`notifications:${userId}`);
    cacheService.delete(`notifications:unread:${userId}`);
    this.unreadCount = 0;
    console.log('[Notifications] All notifications cleared');
  }

  /**
   * Export for debugging
   */
  getMetrics() {
    return {
      subscribers: Array.from(this.notificationSubscribers.keys()),
      unreadCount: this.unreadCount,
      totalSubscribers: Array.from(this.notificationSubscribers.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
    };
  }
}

// Singleton instance
export const notificationsService = new NotificationsService();

export default NotificationsService;
