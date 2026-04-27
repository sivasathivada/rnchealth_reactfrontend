import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { callsAPI } from '../../services/api';
import './PatientCalls.css';
import { Video, Calendar, Clock, Volume2, CreditCard, Stethoscope, Play, CheckCircle, PhoneOff } from 'lucide-react';

const STATUS_META = {
  scheduled:  { label: 'Scheduled',  color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)', border: 'rgba(79,142,247,0.3)' },
  initiated:  { label: 'Initiated',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  ongoing:    { label: 'Ongoing',    color: '#06d6a0', bg: 'rgba(6,214,160,0.15)',  border: 'rgba(6,214,160,0.3)' },
  completed:  { label: 'Completed',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.3)' },
  cancelled:  { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  missed:     { label: 'Missed',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
};

const PatientCalls = () => {
  const navigate = useNavigate();
  const [calls, setCalls]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => { fetchCalls(); }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await callsAPI.list();
      setCalls(data.results || data);
    } catch (err) {
      console.error('Failed to load call sessions:', err);
      setError('Could not load call sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCall = async (session_id) => {
    try {
      // Patient simply starts/joins the session
      await callsAPI.start(session_id);
      navigate(`/call/${session_id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Unknown error';
      alert(`Failed to join call: ${msg}`);
    }
  };

  const handleEndCall = async (session_id) => {
    try {
      await callsAPI.end(session_id, '');
      alert('You have left the session.');
      fetchCalls();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Unknown error';
      alert(`Failed to end call: ${msg}`);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const getConsultantName = (call) => {
    if (call.consultant_name) return call.consultant_name;
    if (call.consultant?.full_name) return call.consultant.full_name;
    if (call.consultant?.user?.full_name) return call.consultant.user.full_name;
    return 'Consultant';
  };

  const getStatusMeta = (status) =>
    STATUS_META[(status || '').toLowerCase()] ||
    { label: status || 'Unknown', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' };

  const getDerivedPaymentStatus = (call) => {
    const status = (call.status || '').toLowerCase();
    if (call.payment_status === 'paid') return 'paid';
    if (['ongoing', 'completed'].includes(status)) return 'paid';
    return call.payment_status || 'pending';
  };

  if (loading) {
    return (
      <div className="premium-calls-container">
        <div className="premium-loader">
          <div className="spinner-ring"></div>
          <p>Syncing Secure Sessions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-calls-container animate-fadeIn">
      <div className="premium-header">
        <div className="header-content">
          <h2>My Call Sessions</h2>
          <p>Join active consultations and review your past audio/video calls.</p>
        </div>
        <div className="header-stats">
          <div className="stat-pill">
            <span className="dot pulse-green"></span>
            {calls.filter(c => ['initiated', 'ongoing', 'scheduled'].includes((c.status || '').toLowerCase())).length} Active
          </div>
        </div>
      </div>

      {error && (
        <div className="premium-error-banner">
          <CheckCircle size={18} />
          <span>{error}</span>
          <button onClick={fetchCalls} className="btn-retry">Retry Connection</button>
        </div>
      )}

      <div className="premium-calls-grid">
        {calls.length === 0 ? (
          <div className="premium-empty-state">
            <div className="empty-icon-wrapper">
              <Video size={48} className="empty-icon" />
            </div>
            <h3>No Active Sessions</h3>
            <p>Your scheduled calls will appear here when your consultant initiates them.</p>
          </div>
        ) : (
          calls.map(call => {
            const consultantName = getConsultantName(call);
            const initial    = consultantName.replace('Dr. ', '').charAt(0).toUpperCase();
            const status     = (call.status || '').toLowerCase();
            const meta       = getStatusMeta(call.status);
            
            const validDateStr = call.scheduled_at || call.created_at;
            const derivedPaymentStatus = getDerivedPaymentStatus(call);

            return (
              <div 
                key={call.id} 
                className="premium-call-card"
                style={{ '--theme-color': meta.color, '--theme-bg': meta.bg }}
              >
                <div className="card-glass-effect"></div>
                
                {/* Status Indicator */}
                <div className="status-indicator">
                  <div className="status-dot" style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}` }}></div>
                  <span style={{ color: meta.color }}>{meta.label}</span>
                </div>

                {/* Profile Section */}
                <div className="profile-section">
                  <div className="avatar-container">
                    <div className="avatar-ring" style={{ borderColor: meta.border }}></div>
                    <div className="patient-avatar consultant-avatar">{initial}</div>
                  </div>
                  <div className="patient-info">
                    <h3>Dr. {consultantName.replace('Dr. ', '')}</h3>
                    <div className="session-id-badge">ID: {call.session_id?.split('-')[0] || 'Unknown'}</div>
                  </div>
                  <div className="type-icon" style={{ backgroundColor: meta.bg, color: meta.color }}>
                    {call.call_type === 'audio' ? <Volume2 size={20} /> : <Video size={20} />}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="details-grid">
                  <div className="detail-item">
                    <Calendar size={14} className="detail-icon" />
                    <span>{formatDate(validDateStr)}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={14} className="detail-icon" />
                    <span>{formatTime(validDateStr)}</span>
                  </div>
                  <div className="detail-item">
                    <CreditCard size={14} className="detail-icon" />
                    <span>₹{Number(call.consultation_fee || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-item">
                    <CheckCircle size={14} className="detail-icon" />
                    <span className={derivedPaymentStatus === 'paid' ? 'text-success' : 'text-warning'}>
                      {derivedPaymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Duration */}
                {status === 'completed' && call.duration_minutes > 0 && (
                  <div className="duration-banner">
                    <Clock size={14} /> Session lasted {call.duration_minutes} minutes
                  </div>
                )}

                {/* Actions */}
                <div className="card-actions">
                  {['scheduled', 'initiated', 'ongoing'].includes(status) && (
                    <>
                      <button
                        className="btn-premium primary pulse-animation"
                        onClick={() => handleJoinCall(call.session_id)}
                      >
                        <Play size={16} fill="currentColor" />
                        <span>Join Session</span>
                      </button>
                      <button
                        className="btn-premium danger"
                        onClick={() => handleEndCall(call.session_id)}
                        style={{ marginLeft: '10px' }}
                      >
                        <PhoneOff size={16} />
                      </button>
                    </>
                  )}

                  {['completed', 'cancelled', 'missed'].includes(status) && (
                    <button className="btn-premium secondary" disabled>
                      <CheckCircle size={16} />
                      <span>Session Closed</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PatientCalls;
