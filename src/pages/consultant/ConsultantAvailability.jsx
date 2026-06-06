import { useState, useEffect } from 'react';
import { consultantsAPI, appointmentsAPI } from '../../services/api';
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

  // Specific Date Slots State
  const [specificSlots, setSpecificSlots] = useState([]);
  const [loadingSpecific, setLoadingSpecific] = useState(false);
  const [showAddSpecific, setShowAddSpecific] = useState(false);
  const [newSpecificSlot, setNewSpecificSlot] = useState({ date: '', start_time: '', end_time: '' });

  useEffect(() => { 
    fetchAvailability(); 
    fetchSpecificSlots();
  }, []);

  /* ─── toast helper ─── */
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  /* ─── fetch availability ─── */
  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const { data } = await consultantsAPI.getAvailability();
      console.log('Fetched availability data:', data);
      setIsAvailable(data.is_available ?? false);
      setScheduleData(data.availability_slots || []);
    } catch (err) {
      console.error('Failed to load availability', err);
      showToast('error', 'Failed to load availability. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── fetch specific slots ─── */
  const fetchSpecificSlots = async () => {
    try {
      setLoadingSpecific(true);
      const { data } = await appointmentsAPI.listSpecificSlots();
      const slots = data.results || (Array.isArray(data) ? data : []);
      setSpecificSlots(slots);
    } catch (err) {
      console.error('Failed to load specific date slots', err);
      showToast('error', 'Failed to load specific date slots.');
    } finally {
      setLoadingSpecific(false);
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
      if (response.data?.is_available !== undefined) {
        setIsAvailable(response.data.is_available);
      }
      showToast('success', `Status updated: ${!previousStatus ? 'Now Accepting Patients' : 'Now Offline'}`);
    } catch (err) {
      console.error('[toggleStatus] Failed:', err);
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
      await consultantsAPI.setAvailability({ schedule: cleanSlots(updated) });
      showToast('success', 'Slot status updated successfully.');
      await fetchAvailability();     // sync with server
    } catch (err) {
      console.error('Failed to toggle slot', err);
      showToast('error', 'Failed to update slot status. Reverting…');
      await fetchAvailability();     // revert on failure
    }
  };

  /* ─── add new weekly slot ─── */
  const addWeeklySlot = async (e) => {
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
      await consultantsAPI.setAvailability({ schedule: updatedList });
      await fetchAvailability();
      setNewSlot({ day_of_week: 0, start_time: '', end_time: '' });
      setShowAddSlot(false);
      showToast('success', `Slot added for ${DAY_CHOICES[newSlot.day_of_week]} — Active by default.`);
    } catch (err) {
      console.error('[addSlot] Failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || 'Failed to save slot.';
      showToast('error', `Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setSaving(false);
    }
  };

  /* ─── remove weekly slot ─── */
  const removeWeeklySlot = async (idToRemove) => {
    if (!window.confirm('Remove this availability slot?')) return;
    try {
      const filtered = scheduleData.filter(slot => slot.id !== idToRemove);
      await consultantsAPI.setAvailability({ schedule: cleanSlots(filtered) });
      await fetchAvailability();
      showToast('success', 'Slot removed successfully.');
    } catch (err) {
      console.error('Failed to remove slot', err);
      showToast('error', 'Failed to delete slot.');
    }
  };

  /* ─── add specific date slot ─── */
  const addSpecificSlot = async (e) => {
    e.preventDefault();
    if (!newSpecificSlot.date || !newSpecificSlot.start_time || !newSpecificSlot.end_time) {
      showToast('error', 'Please fill in all specific slot fields.');
      return;
    }
    if (newSpecificSlot.start_time >= newSpecificSlot.end_time) {
      showToast('error', 'End time must be after start time.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: newSpecificSlot.date,
        start_time: newSpecificSlot.start_time,
        end_time: newSpecificSlot.end_time,
        is_available: true,
        is_blocked: false
      };
      await appointmentsAPI.createSpecificSlot(payload);
      showToast('success', `Slot created for specific date: ${newSpecificSlot.date}`);
      setNewSpecificSlot({ date: '', start_time: '', end_time: '' });
      setShowAddSpecific(false);
      await fetchSpecificSlots();
    } catch (err) {
      console.error('Failed to add specific slot', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save specific slot.';
      showToast('error', `Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setSaving(false);
    }
  };

  /* ─── remove specific date slot ─── */
  const removeSpecificSlot = async (id) => {
    if (!window.confirm('Remove this specific date slot?')) return;
    try {
      await appointmentsAPI.deleteSpecificSlot(id);
      showToast('success', 'Specific date slot removed.');
      await fetchSpecificSlots();
    } catch (err) {
      console.error('Failed to remove specific slot', err);
      showToast('error', 'Failed to delete specific slot.');
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

  // Format date helper
  const getDayNameFromDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

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
        <p>Control your schedule, recurring weekly availability, and specific calendar date slots</p>
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
          <span className="av-stat-label">Weekly Slots</span>
        </div>
        <div className="av-stat-chip av-stat-active">
          <span className="av-stat-num">{specificSlots.length}</span>
          <span className="av-stat-label">Specific Date Slots</span>
        </div>
        <div className="av-stat-chip av-stat-active">
          <span className="av-stat-num">{activeCount}</span>
          <span className="av-stat-label">Active Weekly</span>
        </div>
        <div className="av-stat-chip av-stat-inactive">
          <span className="av-stat-num">{inactiveCount}</span>
          <span className="av-stat-label">Inactive Weekly</span>
        </div>
      </div>

      {/* ── Weekly Schedule Section ── */}
      <div className="card mb-6">
        <div className="av-section-header">
          <div className="flex-gap-2">
            <Calendar size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Weekly Schedule Slots (Recurring)</h3>
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
              <Plus size={14} /> {showAddSlot ? 'Cancel' : 'Add Weekly Slot'}
            </button>
          </div>
        </div>

        {/* ── Add Weekly Slot Form ── */}
        {showAddSlot && (
          <form className="av-add-form" onSubmit={addWeeklySlot}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 16, fontWeight: 600 }}>
              ➕ New Recurring Weekly Slot
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
              💡 Weekly slots repeat every week on the designated weekday, unless overridden by specific-date slot records.
            </p>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? <><RefreshCw size={14} className="animate-pulse" /> Saving…</> : <><Check size={14} /> Save Slot</>}
            </button>
          </form>
        )}

        {/* ── Weekly Slot Grid ── */}
        {scheduleData.length === 0 ? (
          <div className="av-empty">
            <Calendar size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No weekly slots configured yet.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Add your first recurring weekly slot using the button above.
            </p>
          </div>
        ) : (
          <div className="av-slot-grid">
            {scheduleData.map(slot => (
              <div
                key={slot.id}
                className={`av-slot-card ${slot.is_active ? 'av-slot-active' : 'av-slot-inactive'}`}
              >
                <div className="av-slot-top">
                  <span className="av-day-label">{DAY_CHOICES[slot.day_of_week]}</span>
                  <button
                    className="av-delete-btn"
                    onClick={() => removeWeeklySlot(slot.id)}
                    title="Remove slot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="av-slot-time">
                  <Clock size={14} />
                  <span>
                    {slot.start_time?.substring(0, 5)} – {slot.end_time?.substring(0, 5)}
                  </span>
                </div>

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

      {/* ── Specific Date Slots Section ── */}
      <div className="card">
        <div className="av-section-header">
          <div className="flex-gap-2">
            <Calendar size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Specific Date Availability Slots</h3>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={fetchSpecificSlots}
              disabled={loadingSpecific}
              title="Refresh Specific Slots"
            >
              <RefreshCw size={14} className={loadingSpecific ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              className="btn btn-accent btn-sm"
              onClick={() => setShowAddSpecific(!showAddSpecific)}
            >
              <Plus size={14} /> {showAddSpecific ? 'Cancel' : 'Add Specific Date Slot'}
            </button>
          </div>
        </div>

        {/* ── Add Specific Slot Form ── */}
        {showAddSpecific && (
          <form className="av-add-form" onSubmit={addSpecificSlot} style={{ borderLeft: '4px solid var(--accent)' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 16, fontWeight: 600 }}>
              📅 Add One-Off Calendar Slot
            </h4>
            <div className="av-form-row">
              <div className="form-group">
                <label className="form-label">Calendar Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="form-input"
                  value={newSpecificSlot.date}
                  onChange={e => setNewSpecificSlot({ ...newSpecificSlot, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  required
                  className="form-input"
                  value={newSpecificSlot.start_time}
                  onChange={e => setNewSpecificSlot({ ...newSpecificSlot, start_time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  required
                  className="form-input"
                  value={newSpecificSlot.end_time}
                  onChange={e => setNewSpecificSlot({ ...newSpecificSlot, end_time: e.target.value })}
                />
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
              💡 Specific date slots apply only to the chosen calendar date. They let you offer consultations on days you don't normally work, or set custom times.
            </p>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? <><RefreshCw size={14} className="animate-pulse" /> Saving…</> : <><Check size={14} /> Save Date Slot</>}
            </button>
          </form>
        )}

        {/* ── Specific Slots Grid ── */}
        {specificSlots.length === 0 ? (
          <div className="av-empty">
            <Calendar size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No specific date slots set yet.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Create custom slots for specific calendar dates using the button above.
            </p>
          </div>
        ) : (
          <div className="av-slot-grid">
            {specificSlots.map(slot => (
              <div
                key={slot.id}
                className="av-slot-card av-slot-active"
                style={{ borderLeft: '4px solid var(--accent)' }}
              >
                <div className="av-slot-top">
                  <span className="av-day-label" style={{ fontSize: '0.85rem' }}>
                    {getDayNameFromDate(slot.date)}
                  </span>
                  <button
                    className="av-delete-btn"
                    onClick={() => removeSpecificSlot(slot.id)}
                    title="Remove specific date slot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="av-slot-time">
                  <Clock size={14} />
                  <span>
                    {slot.start_time?.substring(0, 5)} – {slot.end_time?.substring(0, 5)}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto' }}>
                  {slot.is_available ? '🟢 Available for Booking' : '🔴 Booked / Unavailable'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultantAvailability;
