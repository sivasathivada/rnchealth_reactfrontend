import { useState, useEffect } from 'react';
import { prescriptionsAPI, callsAPI } from '../../services/api';
import './ConsultantPrescriptions.css';
import { Pill, Plus, Calendar, User, Clock, CheckCircle, XCircle, FileText, X, Video } from 'lucide-react';

const DynamicListInput = ({ items, setItems, placeholder }) => {
  const [val, setVal] = useState('');
  const handleAdd = (e) => {
    e.preventDefault();
    if (val.trim()) {
      setItems([...items, val.trim()]);
      setVal('');
    }
  };
  const handleRemove = (idx, e) => {
    e.preventDefault();
    setItems(items.filter((_, i) => i !== idx));
  };
  return (
    <div className="dynamic-list-container">
      <div className="dynamic-input-row">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(e); }}
        />
        <button type="button" className="btn-add-item" onClick={handleAdd}>Add</button>
      </div>
      {items.length > 0 && (
        <ul className="dynamic-tags">
          {items.map((it, i) => (
            <li key={i} className="dynamic-tag">{it}
              <button type="button" onClick={(e) => handleRemove(i, e)}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ConsultantPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [callSessions, setCallSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    selected_session_id: '',   // the UUID primary key (id) of the CallSession
    medications: ['Paracetamol 500mg (1x daily)'],
    instructions: '',
    valid_until: '',
    status: 'active',
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchCompletedSessions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const { data } = await prescriptionsAPI.list();
      setPrescriptions(data.results || data);
    } catch (err) {
      console.error('Failed to load prescriptions', err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedSessions = async () => {
    try {
      setSessionsLoading(true);
      // Fetch all call sessions; filter completed ones on client side
      const { data } = await callsAPI.list({ status: 'completed' });
      const sessions = data.results || data;
      setCallSessions(sessions);
    } catch (err) {
      console.error('Failed to load call sessions', err);
      setCallSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.selected_session_id) {
      alert('Please select a call session.');
      return;
    }
    if (formData.medications.length === 0) {
      alert('Please add at least one medication.');
      return;
    }
    if (!formData.valid_until) {
      alert('Please set a valid until date.');
      return;
    }

    try {
      const payload = {
        call_session_id: formData.selected_session_id,   // UUID primary key sent to backend
        medications: formData.medications,                 // send as array, not stringified
        instructions: formData.instructions,
        valid_until: formData.valid_until,
      };

      await prescriptionsAPI.create(payload);
      setShowAddForm(false);
      setFormData({
        selected_session_id: '',
        medications: [],
        instructions: '',
        valid_until: '',
        status: 'active',
      });
      fetchPrescriptions();
    } catch (err) {
      console.error('Failed to create prescription', err);
      const errMsg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Failed to issue prescription';
      alert(`Failed to issue prescription:\n${errMsg}`);
    }
  };

  const formatSessionLabel = (session) => {
    const patientName = session.patient_name || session.patient?.full_name || 'Patient';
    const date = session.scheduled_at
      ? new Date(session.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : session.created_at
        ? new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    const shortId = (session.session_id || '').split('-')[0] || session.id?.toString().split('-')[0] || '';
    return `${patientName} — ${date}${shortId ? ` (${shortId})` : ''}`;
  };

  const getStatusIcon = (status) => {
    if (status === 'active') return <CheckCircle size={16} className="status-icon-active" />;
    if (status === 'completed') return <CheckCircle size={16} className="status-icon-completed" />;
    if (status === 'cancelled') return <XCircle size={16} className="status-icon-cancelled" />;
    return null;
  };

  if (loading) return <div className="loader">Loading Prescriptions Database...</div>;

  return (
    <div className="consultant-prescriptions-container">
      <div className="page-header">
        <div>
          <h2>Issued Prescriptions</h2>
          <p>Manage structured medication routines accurately matched to Patient tables</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} /> Write New Prescription
        </button>
      </div>

      {showAddForm && (
        <div className="add-prescription-form">
          <h3>Issue Prescription Entry</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">

              {/* ── Call Session Dropdown ── */}
              <div className="form-group full-width">
                <label>
                  <Video size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Select Completed Call Session
                </label>
                {sessionsLoading ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading sessions…</p>
                ) : callSessions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No completed call sessions found. Complete a call first.
                  </p>
                ) : (
                  <select
                    required
                    value={formData.selected_session_id}
                    onChange={(e) => setFormData({ ...formData, selected_session_id: e.target.value })}
                  >
                    <option value="">— Select a session —</option>
                    {callSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {formatSessionLabel(session)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* ── Status ── */}
              <div className="form-group">
                <label>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* ── Valid Until ── */}
              <div className="form-group">
                <label>Valid Until (Expiration)</label>
                <input
                  type="date"
                  required
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>

              {/* ── Medications ── */}
              <div className="form-group full-width">
                <label>Medications List</label>
                <DynamicListInput
                  items={formData.medications}
                  setItems={(arr) => setFormData({ ...formData, medications: arr })}
                  placeholder="e.g. Paracetamol 500mg, 1 tablet twice a day"
                />
              </div>

              {/* ── Instructions ── */}
              <div className="form-group full-width">
                <label>General Instructions / Recommendations</label>
                <textarea
                  required
                  rows="3"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Additional lifestyle or diet instructions..."
                />
              </div>
            </div>

            <div className="form-actions mt-3">
              <button type="submit" className="btn-save">Submit to Database</button>
              <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>Discard Draft</button>
            </div>
          </form>
        </div>
      )}

      <div className="prescriptions-grid">
        {prescriptions.length === 0 ? (
          <div className="no-data">No prescriptions logged in the system yet.</div>
        ) : (
          prescriptions.map((presc) => (
            <div key={presc.id} className="prescription-card">
              <div className="card-header">
                <div className="patient-info">
                  <User size={18} className="icon-patient" />
                  <h4>{presc.patient_name || presc.patient?.full_name || `Patient #${presc.patient_id}`}</h4>
                </div>
                <div className="status-badge-container">
                  {getStatusIcon(presc.status)}
                  <span className={`badge-${presc.status}`}>{presc.status}</span>
                </div>
              </div>
              <div className="card-content">
                <div className="medication-block">
                  <Pill size={18} className="icon-pill" />
                  <div className="meds-list">
                    <h5>Prescribed Medications</h5>
                    <ul className="medicines-ul">
                      {(Array.isArray(presc.medications) ? presc.medications : []).map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="instructions-block">
                  <h5><FileText size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> Instructions</h5>
                  <p>{presc.instructions}</p>
                </div>
              </div>
              <div className="card-footer">
                <div className="footer-item" title="Created At">
                  <Calendar size={12} /> {presc.created_at ? new Date(presc.created_at).toLocaleDateString() : 'N/A'}
                </div>
                <div className="footer-item expires" title="Valid Until">
                  <Clock size={12} /> Exp: {presc.valid_until ? new Date(presc.valid_until).toLocaleDateString() : 'N/A'}
                </div>
                {presc.session_id && (
                  <div className="footer-item" title="Call Session">
                    <Video size={12} /> Session: {presc.session_id.split('-')[0]}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsultantPrescriptions;
