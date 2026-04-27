import { useState, useEffect } from 'react';
import { consultantsAPI } from '../../services/api';
import './ConsultantAvailability.css';
import {
  Calendar, Clock, ToggleLeft, ToggleRight,
  Check, X, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';

const DAY_CHOICES = {
  0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday',
  4: 'Friday',  5: 'Saturday', 6: 'Sunday'
};

const ConsultantAvailability = () => {
  const [isAvailable, setIsAvailable]   = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [showAddSlot, setShowAddSlot]   = useState(false);
  const [newSlot, setNewSlot]           = useState({ day_of_week: 0, start_time: '', end_time: '' });
  const [toast, setToast]               = useState(null);

  useEffect(() => { fetchAvailability(); }, []);

  /* ─── toast helper ─── */
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  /* ─── fetch ─── */
  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const { data } = await consultantsAPI.getAvailability();
      console.log('Fetched availability data:', data);
      setIsAvailable(data.is_available ?? false);
      setScheduleData(data.availability_slots || []);
    } catch (err) {
      console.error('Failed to load availability', err);
      console.error('Error response:', err.response?.data);
      showToast('error', 'Failed to load availability. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── clean slots for API ─── */
  const cleanSlots = (slots) =>
    slots.map(slot => ({
      ...(slot.id && { id: slot.id }),
      day_of_week: parseInt(slot.day_of_week),
      start_time:  slot.start_time,
      end_time:    slot.end_time,
      is_active:   slot.is_active !== false,
    }));

  /* ─── toggle global availability status ─── */
  const toggleStatus = async () => {
    const previousStatus = isAvailable;
    setIsAvailable(prev => !prev);  // Optimistic update
    try {
      console.log('[toggleStatus] Calling API with current status:', previousStatus);
      const response = await consultantsAPI.toggleAvailability();
      console.log('[toggleStatus] Success response:', response.data);
      // Update with backend response if it contains the updated status
      if (response.data?.is_available !== undefined) {
        setIsAvailable(response.data.is_available);
      }
      showToast('success', `Status updated: ${!previousStatus ? 'Now Accepting Patients' : 'Now Offline'}`);
    } catch (err) {
      console.error('[toggleStatus] Failed:', err.message);
      console.error('[toggleStatus] Error status:', err.response?.status);
      console.error('[toggleStatus] Error data:', err.response?.data);
      console.error('[toggleStatus] Full error:', err);
      setIsAvailable(previousStatus);  // Rollback on failure
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to update availability status.';
      showToast('error', `Toggle Error: ${errorMsg}`);
    }
  };

  /* ─── toggle individual slot active/inactive ─── */
  const toggleSlotActive = async (slotId) => {
    const updated = scheduleData.map(slot =>
      slot.id === slotId ? { ...slot, is_active: !slot.is_active } : slot
    );
    setScheduleData(updated);        // optimistic update
    try {
      console.log('Toggling slot active status for slot:', slotId, 'New data:', { schedule: cleanSlots(updated) });
      const response = await consultantsAPI.setAvailability({ schedule: cleanSlots(updated) });
      console.log('Toggle slot response:', response);
      showToast('success', 'Slot status updated successfully.');
      await fetchAvailability();     // sync with server
    } catch (err) {
      console.error('Failed to toggle slot', err);
      console.error('Error response:', err.response?.data);
      showToast('error', 'Failed to update slot status. Reverting…');
      await fetchAvailability();     // revert on failure
    }
  };

  /* ─── add new slot ─── */
  const addSlot = async (e) => {
    e.preventDefault();
    if (!newSlot.start_time || !newSlot.end_time) {
      showToast('error', 'Please fill in both start and end time.');
      return;
    }
    if (newSlot.start_time >= newSlot.end_time) {
      showToast('error', 'End time must be after start time.');
      return;
    }
    setSaving(true);
    try {
      const slotToAdd = {
        day_of_week: parseInt(newSlot.day_of_week),
        start_time:  newSlot.start_time,
        end_time:    newSlot.end_time,
        is_active:   true,
      };
      const updatedList = [...cleanSlots(scheduleData), slotToAdd];
      const payload = { schedule: updatedList };
      console.log('[addSlot] Cleaned slots data:', updatedList);
      console.log('[addSlot] Final payload being sent:', JSON.stringify(payload, null, 2));
      const response = await consultantsAPI.setAvailability(payload);
      console.log('[addSlot] Success - Response status:', response.status);
      console.log('[addSlot] Response data:', response.data);
      console.log('[addSlot] Slots saved in response:', response.data?.slots_saved);
      await fetchAvailability();
      setNewSlot({ day_of_week: 0, start_time: '', end_time: '' });
      setShowAddSlot(false);
      showToast('success', `Slot added for ${DAY_CHOICES[newSlot.day_of_week]} — Active by default.`);
    } catch (err) {
      console.error('[addSlot] Failed:', err.message);
      console.error('[addSlot] Status:', err.response?.status);
      console.error('[addSlot] Data:', err.response?.data);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || 'Failed to save slot.';
      showToast('error', `Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setSaving(false);
    }
  };

  /* ─── remove slot ─── */
  const removeSlot = async (idToRemove) => {
    if (!window.confirm('Remove this availability slot?')) return;
    try {
      const filtered = scheduleData.filter(slot => slot.id !== idToRemove);
      console.log('Removing slot:', idToRemove, 'New data:', { schedule: cleanSlots(filtered) });
      const response = await consultantsAPI.setAvailability({ schedule: cleanSlots(filtered) });
      console.log('Remove slot response:', response);
      await fetchAvailability();
      showToast('success', 'Slot removed successfully.');
    } catch (err) {
      console.error('Failed to remove slot', err);
      console.error('Error response:', err.response?.data);
      showToast('error', 'Failed to delete slot.');
    }
  };

  /* ─── loading screen ─── */
  if (loading) {
    return (
      <div className="av-container">
        <div className="av-loading">
          <div className="av-spinner" />
          <p>Loading availability settings…</p>
        </div>
      </div>
    );
  }

  const activeCount   = scheduleData.filter(s => s.is_active).length;
  const inactiveCount = scheduleData.length - activeCount;

  return (
    <div className="av-container animate-fadeIn">
      {/* ── Toast ── */}
      {toast && (
        <div className={`av-toast av-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header">
        <h1>Manage Availability</h1>
        <p>Control your schedule and recurring time slots for patient bookings</p>
      </div>

      {/* ── Global Status Toggle ── */}
      <div className="av-status-card card mb-6">
        <div className="av-status-left">
          <div className={`av-status-indicator ${isAvailable ? 'av-online' : 'av-offline'}`} />
          <div>
            <h3 className="av-status-title">Global Profile Status</h3>
            <p className="av-status-subtitle">
              {isAvailable
                ? '✅ You are visible to patients and can receive bookings'
                : '⛔ You are hidden from patients — no new bookings allowed'}
            </p>
          </div>
        </div>
        <button
          className={`av-toggle-btn ${isAvailable ? 'av-toggle-active' : 'av-toggle-inactive'}`}
          onClick={toggleStatus}
        >
          {isAvailable ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
          {isAvailable ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="av-stats-row mb-6">
        <div className="av-stat-chip">
          <span className="av-stat-num">{scheduleData.length}</span>
          <span className="av-stat-label">Total Slots</span>
        </div>
        <div className="av-stat-chip av-stat-active">
          <span className="av-stat-num">{activeCount}</span>
          <span className="av-stat-label">Active</span>
        </div>
        <div className="av-stat-chip av-stat-inactive">
          <span className="av-stat-num">{inactiveCount}</span>
          <span className="av-stat-label">Inactive</span>
        </div>
      </div>

      {/* ── Schedule Section ── */}
      <div className="card">
        <div className="av-section-header">
          <div className="flex-gap-2">
            <Calendar size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Weekly Schedule Slots</h3>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={fetchAvailability}
              title="Refresh"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddSlot(!showAddSlot)}
            >
              <Plus size={14} /> {showAddSlot ? 'Cancel' : 'Add Slot'}
            </button>
          </div>
        </div>

        {/* ── Add Slot Form ── */}
        {showAddSlot && (
          <form className="av-add-form" onSubmit={addSlot}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 16, fontWeight: 600 }}>
              ➕ New Availability Slot
            </h4>
            <div className="av-form-row">
              <div className="form-group">
                <label className="form-label">Day of Week</label>
                <select
                  className="form-select"
                  value={newSlot.day_of_week}
                  onChange={e => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                >
                  {Object.entries(DAY_CHOICES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  required
                  className="form-input"
                  value={newSlot.start_time}
                  onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  required
                  className="form-input"
                  value={newSlot.end_time}
                  onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })}
                />
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
              💡 New slots are set to <strong style={{ color: 'var(--accent)' }}>Active</strong> by default and will be visible to patients immediately.
            </p>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? <><RefreshCw size={14} className="animate-pulse" /> Saving…</> : <><Check size={14} /> Save Slot</>}
            </button>
          </form>
        )}

        {/* ── Slot Grid ── */}
        {scheduleData.length === 0 ? (
          <div className="av-empty">
            <Calendar size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No weekly slots configured yet.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Add your first slot using the button above.
            </p>
          </div>
        ) : (
          <div className="av-slot-grid">
            {scheduleData.map(slot => (
              <div
                key={slot.id}
                className={`av-slot-card ${slot.is_active ? 'av-slot-active' : 'av-slot-inactive'}`}
              >
                {/* Top row: day + delete */}
                <div className="av-slot-top">
                  <span className="av-day-label">{DAY_CHOICES[slot.day_of_week]}</span>
                  <button
                    className="av-delete-btn"
                    onClick={() => removeSlot(slot.id)}
                    title="Remove slot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Time */}
                <div className="av-slot-time">
                  <Clock size={14} />
                  <span>
                    {slot.start_time?.substring(0, 5)} – {slot.end_time?.substring(0, 5)}
                  </span>
                </div>

                {/* Active/Inactive Toggle */}
                <button
                  className={`av-slot-toggle-btn ${slot.is_active ? 'av-active-btn' : 'av-inactive-btn'}`}
                  onClick={() => toggleSlotActive(slot.id)}
                  title={slot.is_active ? 'Click to deactivate' : 'Click to activate'}
                >
                  {slot.is_active ? (
                    <><Check size={12} /> Active — Click to Deactivate</>
                  ) : (
                    <><X size={12} /> Inactive — Click to Activate</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultantAvailability;
