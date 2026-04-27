import { useEffect, useState, useCallback, useRef } from 'react';
import { cacheService } from '../services/cache';
import { sessionManager } from '../services/session';
import { optimisticUpdateService } from '../services/optimistic';

/**
 * useCache Hook
 * 
 * Access Redis-like cache from React components
 * Automatically subscribes to cache changes
 */
export const useCache = (key, defaultValue = null) => {
  const [value, setValue] = useState(() => cacheService.get(key) ?? defaultValue);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Subscribe to changes
    unsubscribeRef.current = cacheService.subscribe(key, (event) => {
      if (event.operation === 'set') {
        setValue(event.value);
      } else if (event.operation === 'delete') {
        setValue(defaultValue);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [key, defaultValue]);

  const updateCache = useCallback((newValue, ttl = null) => {
    cacheService.set(key, newValue, ttl);
    setValue(newValue);
  }, [key]);

  const deleteCache = useCallback(() => {
    cacheService.delete(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, updateCache, deleteCache];
};

/**
 * useSession Hook
 * 
 * Manage user session and activity
 */
export const useSession = () => {
  const [userSession, setUserSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get current session (would be set by AuthProvider)
    const token = localStorage.getItem('access_token');
    const userId = localStorage.getItem('user_id');
    
    if (token && userId) {
      const session = sessionManager.getUserSession(userId);
      setUserSession(session);
    }
    
    setIsLoading(false);
  }, []);

  // Update activity on any user interaction
  useEffect(() => {
    const handleActivity = () => {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        sessionManager.updateUserActivity(userId);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, []);

  const setPresence = useCallback((status) => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      sessionManager.setUserPresence(userId, status);
    }
  }, []);

  return {
    userSession,
    isLoading,
    setPresence,
  };
};

/**
 * useCallSession Hook
 * 
 * Manage active call state
 */
export const useCallSession = (callId) => {
  const [callSession, setCallSession] = useState(() =>
    callId ? sessionManager.getCallSession(callId) : null
  );
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!callId) return;

    // Get initial state
    const session = sessionManager.getCallSession(callId);
    setCallSession(session);

    // Subscribe to changes
    unsubscribeRef.current = cacheService.subscribe(`call:${callId}`, (event) => {
      if (event.operation === 'set') {
        setCallSession(event.value);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [callId]);

  const updateStatus = useCallback((status) => {
    sessionManager.updateCallStatus(callId, status);
  }, [callId]);

  const recordMetric = useCallback((metricType) => {
    switch (metricType) {
      case 'ice':
        sessionManager.recordICECandidate(callId);
        break;
      case 'offer':
        sessionManager.recordOfferExchanged(callId);
        break;
      case 'answer':
        sessionManager.recordAnswerExchanged(callId);
        break;
      case 'connection':
        sessionManager.recordConnectionEstablished(callId);
        break;
      case 'reconnection':
        sessionManager.recordReconnectionAttempt(callId);
        break;
      default:
        break;
    }
  }, [callId]);

  const updateQuality = useCallback((quality) => {
    sessionManager.updateConnectionQuality(callId, quality);
  }, [callId]);

  const clearSession = useCallback(() => {
    sessionManager.clearCallSession(callId);
  }, [callId]);

  return {
    callSession,
    updateStatus,
    recordMetric,
    updateQuality,
    clearSession,
  };
};

/**
 * useAppointments Hook
 * 
 * Manage user appointments with caching
 */
export const useAppointments = (userId) => {
  const [appointments, setAppointments] = useState(() =>
    userId ? sessionManager.getAppointments(userId) : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to changes
    unsubscribeRef.current = cacheService.subscribe(`appointments:${userId}`, (event) => {
      if (event.operation === 'set') {
        setAppointments(event.value || []);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  const addAppointment = useCallback((appointment) => {
    if (userId) {
      sessionManager.addAppointment(userId, appointment);
    }
  }, [userId]);

  const updateAppointment = useCallback((appointmentId, updates) => {
    if (userId) {
      sessionManager.updateAppointment(userId, appointmentId, updates);
    }
  }, [userId]);

  const removeAppointment = useCallback((appointmentId) => {
    if (userId) {
      sessionManager.removeAppointment(userId, appointmentId);
    }
  }, [userId]);

  const refresh = useCallback(async (apiCall) => {
    setIsLoading(true);
    try {
      const result = await apiCall();
      if (userId) {
        sessionManager.setAppointments(userId, result.data);
      }
      return result.data;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    appointments,
    isLoading,
    addAppointment,
    updateAppointment,
    removeAppointment,
    refresh,
  };
};

/**
 * useOptimisticUpdate Hook
 * 
 * Perform optimistic updates with automatic rollback
 */
export const useOptimisticUpdate = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (key, updateFn, apiCall, rollbackFn) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await optimisticUpdateService.execute(
        key,
        updateFn,
        apiCall,
        rollbackFn
      );

      if (!result.success) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeInitiateCall = useCallback(async (callData, apiCall) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await optimisticUpdateService.initiateCallOptimistic(
        callData,
        apiCall
      );

      if (!result.success) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    execute,
    executeInitiateCall,
    isLoading,
    error,
  };
};

/**
 * useCacheMetrics Hook
 * 
 * Monitor cache performance
 */
export const useCacheMetrics = (refreshInterval = 5000) => {
  const [metrics, setMetrics] = useState(() => cacheService.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(cacheService.getMetrics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return metrics;
};

/**
 * useSessionMetrics Hook
 * 
 * Monitor session and cache performance
 */
export const useSessionMetrics = (refreshInterval = 5000) => {
  const [metrics, setMetrics] = useState(() => sessionManager.getSessionMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(sessionManager.getSessionMetrics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return metrics;
};

/**
 * useNotifications Hook
 * 
 * Manage user notifications with caching
 * Integrates with Django Celery background tasks via WebSocket
 */
export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef(null);
  
  // Import here to avoid circular dependency
  const { notificationsService } = require('../services/notifications');

  // Load notifications on mount
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    notificationsService
      .fetchNotifications(userId)
      .then((data) => {
        setNotifications(data);
        setUnreadCount(notificationsService.getUnreadCount(userId));
      })
      .finally(() => setIsLoading(false));

    // Subscribe to cache changes
    unsubscribeRef.current = cacheService.subscribe(
      `notifications:${userId}`,
      (event) => {
        if (event.operation === 'set') {
          setNotifications(event.value || []);
          setUnreadCount(notificationsService.getUnreadCount(userId));
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (userId) {
        await notificationsService.markAsRead(userId, notificationId);
        setUnreadCount(notificationsService.getUnreadCount(userId));
      }
    },
    [userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (userId) {
      await notificationsService.markAllAsRead(userId);
      setUnreadCount(0);
    }
  }, [userId]);

  const deleteNotification = useCallback(
    async (notificationId) => {
      if (userId) {
        await notificationsService.deleteNotification(userId, notificationId);
      }
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    if (userId) {
      setIsLoading(true);
      try {
        const data = await notificationsService.fetchNotifications(userId);
        setNotifications(data);
        setUnreadCount(notificationsService.getUnreadCount(userId));
      } finally {
        setIsLoading(false);
      }
    }
  }, [userId]);

  const subscribe = useCallback((notificationType, callback) => {
    return notificationsService.subscribe(notificationType, callback);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    subscribe,
  };
};
