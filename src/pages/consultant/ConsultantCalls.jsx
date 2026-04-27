import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { callsAPI } from '../../services/api';
import './ConsultantCalls.css';
import { Video, Phone, PhoneOff, Calendar, Clock, Volume2, CreditCard, User, MoreVertical, Play, CheckCircle } from 'lucide-react';

// Status colour map matching backend CallSession.STATUS_CHOICES
const STATUS_META = {
  scheduled:  { label: 'Scheduled',  color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)', border: 'rgba(79,142,247,0.3)' },
  initiated:  { label: 'Initiated',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  ongoing:    { label: 'Ongoing',    color: '#06d6a0', bg: 'rgba(6,214,160,0.15)',  border: 'rgba(6,214,160,0.3)' },
  completed:  { label: 'Completed',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.3)' },
  cancelled:  { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  missed:     { label: 'Missed',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
};

const ConsultantCalls = () => {
  const navigate = useNavigate();
  const [calls, setCalls]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [hoveredCall, setHoveredCall] = useState(null);

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

  const handleAction = async (id, action, session_id) => {
    try {
      if (action === 'start') {
        const ok = window.confirm('You are about to start the consultation session. Proceed?');
        if (ok) {
          try {
            await callsAPI.start(session_id);
            navigate(`/call/${session_id}`);
          } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || 'Unknown error';
            alert(`Failed to start call: ${msg}`);
          }
        }
      } else if (action === 'end') {
        const notes = prompt('Closing session. Enter consultation notes:');
        if (notes !== null) {
          try {
            await callsAPI.end(session_id, notes);
            alert('Call marked as completed.');
          } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || 'Unknown error';
            alert(`Failed to end call: ${msg}`);
          }
        }
      }
      fetchCalls();
    } catch (err) {
      console.error(`Call action ${action} failed`, err);
    }
  };

  /* ── Helpers ── */
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

  const getPatientName = (call) =>
    call.patient_name ||
    call.patient?.full_name ||
    call.patient?.user?.full_name ||
    'Patient';

  const getStatusMeta = (status) =>
    STATUS_META[(status || '').toLowerCase()] ||
    { label: status || 'Unknown', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' };

  // Fix payment status bug by deriving logical status from call status
  const getDerivedPaymentStatus = (call) => {
    const status = (call.status || '').toLowerCase();
    // If the backend has it as paid, trust it
    if (call.payment_status === 'paid') return 'paid';
    // If it's ongoing or completed, assume it's paid (since backend CallSession doesn't sync it)
    if (['ongoing', 'completed'].includes(status)) return 'paid';
    // Otherwise fallback to whatever the backend says or pending
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
          <h2>Live Consultations</h2>
          <p>Manage your active WebRTC video and audio sessions in real-time.</p>
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
            <p>Your scheduled calls will appear here once initiated.</p>
          </div>
        ) : (
          calls.map(call => {
            const patientName = getPatientName(call);
            const initial    = patientName.charAt(0).toUpperCase();
            const status     = (call.status || '').toLowerCase();
            const meta       = getStatusMeta(call.status);
            
            // Fix: Fallback to created_at if scheduled_at is null
            const validDateStr = call.scheduled_at || call.created_at;
            const derivedPaymentStatus = getDerivedPaymentStatus(call);

            return (
              <div 
                key={call.id} 
                className="premium-call-card"
                onMouseEnter={() => setHoveredCall(call.id)}
                onMouseLeave={() => setHoveredCall(null)}
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
                    <div className="patient-avatar">{initial}</div>
                  </div>
                  <div className="patient-info">
                    <h3>{patientName}</h3>
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
                  {['scheduled', 'initiated'].includes(status) && (
                    <button
                      className="btn-premium primary"
                      onClick={() => handleAction(call.id, 'start', call.session_id)}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Start Session</span>
                    </button>
                  )}

                  {status === 'ongoing' && (
                    <button
                      className="btn-premium danger pulse-animation"
                      onClick={() => handleAction(call.id, 'end', call.session_id)}
                    >
                      <PhoneOff size={16} />
                      <span>End Call</span>
                    </button>
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

export default ConsultantCalls;
