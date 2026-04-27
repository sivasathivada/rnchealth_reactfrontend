import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      type: 'info', // 'info', 'success', 'warning', 'error'
      title: '',
      message: '',
      duration: 4000,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration) {
      setTimeout(() => removeNotification(id), newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = {
    info: (title, message, duration = 4000) =>
      addNotification({ type: 'info', title, message, duration }),
    
    success: (title, message, duration = 4000) =>
      addNotification({ type: 'success', title, message, duration }),
    
    warning: (title, message, duration = 5000) =>
      addNotification({ type: 'warning', title, message, duration }),
    
    error: (title, message, duration = 6000) =>
      addNotification({ type: 'error', title, message, duration }),
    
    // Persistent notifications (require manual dismissal)
    call: (data) =>
      addNotification({
        type: 'call',
        title: 'Incoming Call',
        message: `${data.caller_name} is calling...`,
        duration: null,
        data,
      }),
    
    message: (data) =>
      addNotification({
        type: 'message',
        title: 'New Message',
        message: data.message || 'You have a new message',
        duration: null,
        data,
      }),

    appointment: (data) =>
      addNotification({
        type: 'appointment',
        title: 'Appointment Notification',
        message: data.message || 'Appointment update',
        duration: 5000,
        data,
      }),

    task: (data) =>
      addNotification({
        type: 'task',
        title: data.title || 'Background Task',
        message: data.message || 'Processing...',
        duration: data.duration || 4000,
        data,
      }),
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    notify,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used inside NotificationProvider');
  }
  return ctx;
};
