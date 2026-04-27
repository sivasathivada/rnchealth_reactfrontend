import { useNotification } from '../context/NotificationContext';
import {
  AlertCircle, CheckCircle, AlertTriangle, Info,
  Phone, MessageSquare, Calendar, Zap, X
} from 'lucide-react';
import './NotificationCenter.css';

export default function NotificationCenter() {
  const { notifications, removeNotification } = useNotification();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'call':
        return <Phone size={20} />;
      case 'message':
        return <MessageSquare size={20} />;
      case 'appointment':
        return <Calendar size={20} />;
      case 'task':
        return <Zap size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className="notification-container">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`notification notification-${notif.type}`}
        >
          <div className="notification-icon">
            {getIcon(notif.type)}
          </div>
          
          <div className="notification-content">
            <h4 className="notification-title">{notif.title}</h4>
            <p className="notification-message">{notif.message}</p>
          </div>

          {notif.duration === null && (
            <button
              className="notification-close"
              onClick={() => removeNotification(notif.id)}
              title="Dismiss"
            >
              <X size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
