import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsAPI } from '../../services/api';
import './PatientAppointments.css';
import {
  Calendar, Clock, Video, User, XCircle, Phone,
  CheckCircle, AlertCircle, RefreshCw, Stethoscope
} from 'lucide-react';

const PatientAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [toast, setToast]               = useState(null);

  useEffect(() => { fetchAppointments(); }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await appointmentsAPI.myList();
      const list = data.results || data || [];
      setAppointments(list);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Could not load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentsAPI.cancel(id, 'Patient requested cancellation');
      showToast('success', 'Appointment cancelled successfully.');
      fetchAppointments();
    } catch (err) {
      console.error('Cancellation failed:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to cancel appointment.';
      showToast('error', msg);
    }
  };

  // ── Resolve consultant display name from any possible field shape ──
  const getConsultantName = (apt) => {
    if (apt.consultant_name && apt.consultant_name !== 'Consultant') return apt.consultant_name;
    if (apt.consultant?.user?.full_name) return `Dr. ${apt.consultant.user.full_name}`;
    if (apt.consultant?.user?.first_name) {
      const fn = apt.consultant.user.first_name;
      const ln = apt.consultant.user.last_name || '';
      return `Dr. ${fn} ${ln}`.trim();
    }
    if (apt.consultant?.full_name) return `Dr. ${apt.consultant.full_name}`;
    if (apt.consultant_full_name) return apt.consultant_full_name;
    return 'Consultant';
  };

  // ── Resolve date / time from any field name ──
  const getDate = (apt) => apt.scheduled_date || apt.date || null;
  const getTime = (apt) => apt.scheduled_time || apt.time || null;

  const formatDate = (d) => {
    if (!d) return 'Date TBD';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return d; }
  };

  const formatTime = (t) => {
    if (!t) return null;
    try {
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    } catch { return t; }
  };

  const getSpeciality = (apt) =>
    apt.consultant?.speciality?.name ||
    apt.consultant_speciality ||
    apt.speciality ||
    '';

  const getAppointmentType = (apt) =>
    apt.appointment_type || apt.type || 'video';

  const normalizeStatus = (s) => (s || '').toLowerCase();

  const statusMeta = {
    pending:   { label: 'Awaiting Confirmation', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
    confirmed: { label: 'Confirmed',             color: '#06d6a0', bg: 'rgba(6,214,160,0.12)',  dot: '#06d6a0' },
    scheduled: { label: 'Scheduled',             color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)', dot: '#4f8ef7' },
    completed: { label: 'Completed',             color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',dot: '#94a3b8' },
    cancelled: { label: 'Cancelled',             color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444' },
    initiated: { label: 'Initiated',             color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)', dot: '#4f8ef7' },
  };

  const getStatusMeta = (status) =>
    statusMeta[normalizeStatus(status)] ||
    { label: status || 'Unknown', color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#64748b' };

  if (loading) {
    return (
      <div className="pa-container">
        <div className="pa-header">
          <h1>My Appointments</h1>
          <p>Manage your upcoming and past consultations</p>
        </div>
        <div className="pa-loading">
          <div className="pa-spinner" />
          <p>Loading your appointments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pa-container animate-fadeIn">
      {/* ── Toast ── */}
      {toast && (
        <div className={`pa-toast pa-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="pa-header">
        <div className="pa-header-left">
          <h1>My Appointments</h1>
          <p>Manage your upcoming and past consultations</p>
        </div>
        <button className="pa-refresh-btn" onClick={fetchAppointments} title="Refresh">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="pa-error-card">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchAppointments} className="pa-retry-btn">Retry</button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!error && appointments.length === 0 && (
        <div className="pa-empty">
          <div className="pa-empty-icon">
            <Calendar size={40} />
          </div>
          <h3>No Appointments Yet</h3>
          <p>Book your first consultation with a healthcare professional</p>
          <button className="pa-book-btn" onClick={() => navigate('/patient/find-consultants')}>
            Find Consultants
          </button>
        </div>
      )}

      {/* ── Appointments List ── */}
      {!error && appointments.length > 0 && (
        <div className="pa-list">
          {appointments.map(apt => {
            const status       = normalizeStatus(apt.status);
            const meta         = getStatusMeta(apt.status);
            const consultantName = getConsultantName(apt);
            const date         = getDate(apt);
            const time         = getTime(apt);
            const type         = getAppointmentType(apt);
            const speciality   = getSpeciality(apt);
            const initial      = consultantName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() || 'C';

            return (
              <div key={apt.id} className="pa-card">
                {/* ── Left: Consultant Info ── */}
                <div className="pa-card-left">
                  <div className="pa-avatar">
                    {apt.consultant?.avatar_url ? (
                      <img src={apt.consultant.avatar_url} alt={consultantName} />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                  <div className="pa-info">
                    <h3 className="pa-consultant-name">{consultantName}</h3>
                    {speciality && <p className="pa-speciality">{speciality}</p>}
                    <span className="pa-status-badge" style={{ background: meta.bg, color: meta.color }}>
                      <span className="pa-status-dot" style={{ background: meta.dot }} />
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* ── Center: Details ── */}
                <div className="pa-card-center">
                  <div className="pa-detail-item">
                    <Calendar size={15} />
                    <span>{formatDate(date)}</span>
                  </div>
                  <div className="pa-detail-item">
                    <Clock size={15} />
                    <span>{formatTime(time) || 'Time TBD'}</span>
                  </div>
                  <div className="pa-detail-item">
                    {type === 'video' ? <Video size={15} /> : type === 'audio' ? <Phone size={15} /> : <Stethoscope size={15} />}
                    <span className="capitalize">
                      {type === 'video' ? 'Video Call' : type === 'audio' ? 'Audio Call' : type === 'in-person' ? 'In Person' : type}
                    </span>
                  </div>
                  {apt.reason_for_visit && (
                    <div className="pa-detail-item pa-reason">
                      <span>📋 {apt.reason_for_visit.slice(0, 60)}{apt.reason_for_visit.length > 60 ? '…' : ''}</span>
                    </div>
                  )}
                  {apt.consultation_fee && (
                    <div className="pa-detail-item">
                      <span className="pa-fee">₹{apt.consultation_fee}</span>
                      {apt.payment_status && (
                        <span className="pa-pay-badge" style={{
                          background: apt.payment_status === 'paid' ? 'rgba(6,214,160,0.12)' : 'rgba(245,158,11,0.12)',
                          color: apt.payment_status === 'paid' ? '#06d6a0' : '#f59e0b',
                        }}>
                          {apt.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                  )}
                  {['confirmed', 'initiated', 'scheduled'].includes(status) && apt.session_id && (
                    <div className="pa-detail-item pa-session">
                      <span>Session: {apt.session_id}</span>
                    </div>
                  )}
                </div>

                {/* ── Right: Actions ── */}
                <div className="pa-card-actions">
                  {/* Join Call — for confirmed/initiated/scheduled with session */}
                  {['confirmed', 'initiated', 'scheduled'].includes(status) && apt.session_id && (
                    <button
                      className="pa-action-btn pa-action-primary"
                      onClick={() => navigate(`/call/${apt.session_id}`)}
                    >
                      <Video size={15} />
                      Join Call
                    </button>
                  )}

                  {/* Cancel — for pending or confirmed */}
                  {['pending', 'confirmed', 'scheduled'].includes(status) && (
                    <button
                      className="pa-action-btn pa-action-cancel"
                      onClick={() => handleCancel(apt.id)}
                    >
                      <XCircle size={15} />
                      Cancel
                    </button>
                  )}

                  {/* View details for completed */}
                  {status === 'completed' && (
                    <button className="pa-action-btn pa-action-secondary">
                      View Details
                    </button>
                  )}

                  {/* Pending — waiting message */}
                  {status === 'pending' && (
                    <span className="pa-waiting-msg">⏳ Awaiting consultant confirmation</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;
