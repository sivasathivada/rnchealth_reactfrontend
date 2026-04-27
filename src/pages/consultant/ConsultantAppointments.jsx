import { useState, useEffect } from 'react';
import { appointmentsAPI, callSessionsAPI, consultantsAPI } from '../../services/api';
import { Calendar, Filter, CheckCircle, XCircle, Clock, Video, Bell, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  pending:   'badge-warning',
  confirmed: 'badge-success',
  cancelled: 'badge-danger',
  completed: 'badge-primary',
  no_show:   'badge-muted',
};

export default function ConsultantAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast]               = useState(null);   // { type, message }
  const [confirmModal, setConfirmModal] = useState(null);   // { appt }
  const [consultantProfileId, setConsultantProfileId] = useState(null);

  /* ─── fetch ─── */
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await appointmentsAPI.list(params);
      setAppointments(data.results || data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      showToast('error', 'Failed to load appointments. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [statusFilter]);

  /* ─── fetch consultant profile id once on mount ─── */
  useEffect(() => {
    consultantsAPI.myProfile()
      .then(({ data }) => setConsultantProfileId(data.id))
      .catch((err) => console.warn('Could not fetch consultant profile id:', err));
  }, []);

  /* ─── toast helper ─── */
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ─── confirm appointment + create call session ─── */
  const handleConfirm = async (appt) => {
    const id = appt.id;
    setActionLoading(p => ({ ...p, [id]: 'confirm' }));
    try {
      // Step 1 — Confirm the appointment
      await appointmentsAPI.confirm(id);

      // The call session is already initiated in the backend upon payment confirmation.
      // So we just show the success toast.
      showToast('success', `✅ Appointment confirmed for ${appt.patient_name}. They can now join the session.`);

      setConfirmModal(null);
      await fetchAppointments();
    } catch (err) {
      console.error('Confirm failed:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Could not confirm appointment.';
      showToast('error', `❌ ${msg}`);
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }));
    }
  };

  /* ─── reject / cancel ─── */
  const handleReject = async (id, reason = 'Rejected by consultant') => {
    setActionLoading(p => ({ ...p, [id]: 'cancel' }));
    try {
      await appointmentsAPI.reject(id, reason);
      showToast('success', 'Appointment rejected and patient notified.');
      await fetchAppointments();
    } catch (err) {
      console.error('Reject failed:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Could not reject appointment.';
      showToast('error', `❌ ${msg}`);
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }));
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const formatTime = (t) => {
    if (!t) return '—';
    try {
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    } catch { return t; }
  };

  // Normalize status to lowercase for safe comparison
  const normalizeStatus = (s) => (s || '').toLowerCase();

  return (
    <div className="page-container animate-fadeIn">
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '14px 20px', borderRadius: 12, maxWidth: 420,
          background: toast.type === 'success' ? 'rgba(6,214,160,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(6,214,160,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: toast.type === 'success' ? '#06d6a0' : '#ef4444',
          fontSize: '0.9rem', fontWeight: 500, backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.message}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#111d35', border: '1px solid rgba(79,142,247,0.3)',
            borderRadius: 18, padding: 32, maxWidth: 440, width: '90%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Bell size={24} color="#4f8ef7" />
              <h3 style={{ color: '#f0f4ff', fontSize: '1.1rem', fontWeight: 700 }}>Confirm Appointment</h3>
            </div>
            <p style={{ color: '#94a3b8', marginBottom: 8 }}>
              You are about to confirm the appointment for:
            </p>
            <p style={{ color: '#f0f4ff', fontWeight: 600, marginBottom: 4 }}>
              Patient: {confirmModal.appt.patient_name}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 4 }}>
              📅 {formatDate(confirmModal.appt.scheduled_date)} at {formatTime(confirmModal.appt.scheduled_time)}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 20 }}>
              This will confirm the appointment and allow the patient to join the call session.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={actionLoading[confirmModal.appt.id] === 'confirm'}
                onClick={() => handleConfirm(confirmModal.appt)}
              >
                <CheckCircle size={16} />
                {actionLoading[confirmModal.appt.id] === 'confirm' ? 'Confirming…' : 'Confirm & Schedule'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>Appointments</h1>
        <p>Manage your scheduled consultations</p>
      </div>

      {/* ── Status Filters ── */}
      <div className="card mb-6">
        <div className="flex-gap-4" style={{ flexWrap: 'wrap' }}>
          <Calendar size={18} className="text-primary" />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Filter by Status</span>
          <div className="flex-gap-2" style={{ flexWrap: 'wrap' }}>
            {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="loading-inline"><div className="loading-spinner" /></div>
      ) : appointments.length === 0 ? (
        <div className="empty-state card" style={{ textAlign: 'center', padding: 48 }}>
          <Calendar size={40} className="text-muted mb-2" style={{ margin: '0 auto 12px' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No appointments found</p>
          <p className="text-muted text-sm">Appointments will appear here once booked by patients</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Date &amp; Time</th>
                  <th>Duration</th>
                  <th>Fee</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ minWidth: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => {
                  const status = normalizeStatus(appt.status);
                  const isLoadingConfirm = actionLoading[appt.id] === 'confirm';
                  const isLoadingReject  = actionLoading[appt.id] === 'cancel';

                  return (
                    <tr key={appt.id}>
                      <td>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {appt.patient_name || 'Patient'}
                          </p>
                          <p className="text-xs text-muted truncate" style={{ maxWidth: 140 }}>
                            {appt.reason_for_visit || '—'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="flex-gap-2">
                          <Video size={14} className="text-primary" />
                          <span className="capitalize">{appt.appointment_type || 'video'}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {formatDate(appt.scheduled_date)}
                          </p>
                          <p className="text-xs text-muted">{formatTime(appt.scheduled_time)}</p>
                        </div>
                      </td>
                      <td>
                        <Clock size={13} className="text-muted" style={{ display: 'inline', marginRight: 4 }} />
                        {appt.duration_minutes || '—'}m
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        ₹{appt.consultation_fee || '—'}
                      </td>
                      <td>
                        <span className={`badge ${appt.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                          {appt.payment_status || 'unpaid'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[status] || 'badge-muted'}`}>
                          {appt.status || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* ── CONFIRM button — show for pending ── */}
                          {status === 'pending' && (
                            <button
                              onClick={() => setConfirmModal({ appt })}
                              disabled={isLoadingConfirm}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px', borderRadius: 8, border: 'none',
                                background: 'linear-gradient(135deg,#06d6a0,#059669)',
                                color: '#fff', fontWeight: 600, fontSize: '0.8125rem',
                                cursor: isLoadingConfirm ? 'not-allowed' : 'pointer',
                                opacity: isLoadingConfirm ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <CheckCircle size={13} />
                              {isLoadingConfirm ? 'Confirming…' : 'Confirm Appointment'}
                            </button>
                          )}

                          {/* ── REJECT button — show for pending ── */}
                          {status === 'pending' && (
                            <button
                              onClick={() => {
                                const reason = window.prompt('Reason for rejection (optional):') ?? 'Rejected by consultant';
                                handleReject(appt.id, reason);
                              }}
                              disabled={isLoadingReject}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px', borderRadius: 8, border: 'none',
                                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                                color: '#fff', fontWeight: 600, fontSize: '0.8125rem',
                                cursor: isLoadingReject ? 'not-allowed' : 'pointer',
                                opacity: isLoadingReject ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <XCircle size={13} />
                              {isLoadingReject ? 'Rejecting…' : 'Reject'}
                            </button>
                          )}

                          {/* ── START CALL — show for confirmed ── */}
                          {status === 'confirmed' && appt.can_start && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => window.location.href = `/call/${appt.session_id}`}
                            >
                              <Video size={13} /> Start Call
                            </button>
                          )}

                          {status === 'confirmed' && !appt.can_start && (
                            <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 500 }}>
                              ✅ Scheduled
                            </span>
                          )}

                          {(status === 'completed' || status === 'cancelled') && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {status === 'completed' ? '✔ Done' : '✗ Cancelled'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
