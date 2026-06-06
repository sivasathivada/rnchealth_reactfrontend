import { useState, useEffect, useRef } from 'react';
import { useNotificationSocket } from '../context/NotificationSocketContext';
import { Bell, X, Calendar, FileText, Phone, Info, Trash2, CheckCircle2 } from 'lucide-react';
import './MessageNotificationBar.css';

export default function MessageNotificationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('rnc_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const { registerHandler } = useNotificationSocket();
  const panelRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('rnc_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Listen to click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle incoming notification message
  const addNotification = (type, title, message, rawData = {}) => {
    const newNotif = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      data: rawData
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Limit to latest 50 notifications
  };

  useEffect(() => {
    const unsubs = [];

    // Subscribe to appointment updates
    unsubs.push(registerHandler('appointment_update', (data) => {
      console.log('[MsgBar] Appointment Update:', data);
      const action = data.action || 'updated';
      addNotification(
        'appointment',
        `Appointment ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        data.message || `Your appointment has been ${action}.`,
        data
      );
    }));

    // Subscribe to prescription creations
    unsubs.push(registerHandler('prescription_created', (data) => {
      console.log('[MsgBar] Prescription Created:', data);
      addNotification(
        'prescription',
        'New Prescription Issued',
        data.message || 'A new prescription has been added to your record.',
        data
      );
    }));

    // Subscribe to call end
    unsubs.push(registerHandler('call_ended', (data) => {
      console.log('[MsgBar] Call Ended:', data);
      const duration = data.duration_minutes ? `Duration: ${data.duration_minutes} min.` : '';
      addNotification(
        'call',
        'Call Session Ended',
        `Your consultation call has concluded. ${duration}`,
        data
      );
    }));

    // Subscribe to system messages
    unsubs.push(registerHandler('system_message', (data) => {
      console.log('[MsgBar] System Message:', data);
      addNotification(
        'system',
        data.title || 'System Alert',
        data.message || 'Important update from system.',
        data
      );
    }));

    return () => unsubs.forEach(u => u());
  }, [registerHandler]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="notif-icon-inner text-blue" />;
      case 'prescription':
        return <FileText className="notif-icon-inner text-purple" />;
      case 'call':
        return <Phone className="notif-icon-inner text-green" />;
      default:
        return <Info className="notif-icon-inner text-amber" />;
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="message-notification-container" ref={panelRef}>
      {/* Floating Bell Trigger */}
      <button 
        className={`message-bell-trigger ${unreadCount > 0 ? 'pulse-bell' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="bell-badge-count">{unreadCount}</span>
        )}
      </button>

      {/* Glassmorphism Notification Panel */}
      {isOpen && (
        <div className="notification-panel-overlay animate-fadeIn">
          <div className="notification-panel-glass">
            <div className="panel-header">
              <div className="panel-header-title">
                <h3>Notifications</h3>
                {unreadCount > 0 && <span className="unread-tag">{unreadCount} new</span>}
              </div>
              <div className="panel-header-actions">
                {notifications.length > 0 && (
                  <button className="text-btn" onClick={markAllAsRead} title="Mark all as read">
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="text-btn danger" onClick={clearAll} title="Clear all">
                    <Trash2 size={16} />
                  </button>
                )}
                <button className="close-panel-btn" onClick={() => setIsOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="panel-body">
              {notifications.length === 0 ? (
                <div className="empty-notifications">
                  <Bell size={40} className="empty-bell-icon" />
                  <p>You're all caught up!</p>
                  <span>No new updates at the moment.</span>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className={`notification-icon-wrapper type-${notif.type}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="notification-content-detail">
                        <div className="notif-title-row">
                          <h4>{notif.title}</h4>
                          <span className="notif-time">{formatTime(notif.timestamp)}</span>
                        </div>
                        <p>{notif.message}</p>
                      </div>
                      <button 
                        className="delete-notif-btn" 
                        onClick={(e) => deleteNotification(notif.id, e)}
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
