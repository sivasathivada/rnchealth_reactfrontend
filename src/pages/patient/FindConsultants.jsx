import { useState, useEffect } from 'react';
import { consultantsAPI, appointmentsAPI } from '../../services/api';
import { Search, Star, Clock, DollarSign, Video, Mic, MessageSquare, MapPin, CheckCircle, X, Navigation } from 'lucide-react';
import PaymentModal from '../../components/PaymentModal';
import './FindConsultants.css';

const typeIcon = { video: Video, audio: Mic, chat: MessageSquare, all: Video };

export default function FindConsultants() {
  const [consultants, setConsultants] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', speciality_id: '', available_only: false, online_only: false });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [bookingModal, setBookingModal] = useState({ show: false, consultant: null });
  const [reviewModal, setReviewModal] = useState({ show: false, consultant: null });
  const [paymentModal, setPaymentModal] = useState({ show: false, appointmentId: null, consultantId: null, scheduledDate: '', scheduledTime: '', consultantName: '', amount: 0 });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [bookingData, setBookingData] = useState({
     scheduled_date: '',
     scheduled_time: '',
     reason_for_visit: ''
  });

  const [reviewData, setReviewData] = useState({
     rating: 5,
     review_text: ''
  });

  const fetchConsultants = async () => {
    setLoading(true);
    try {
      const params = { page, is_active: 'true' };  // Always filter by active consultants
      if (filters.search) params.search = filters.search;
      if (filters.speciality_id) params.speciality_id = filters.speciality_id;
      // Send string 'true' or 'false' because Django backend defaults to 'true' if parameter is missing
      params.available_only = filters.available_only ? 'true' : 'false';
      if (filters.online_only) params.online_only = 'true';
      const { data } = await consultantsAPI.list(params);
      setConsultants(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
      
      if ((!data.results || data.results.length === 0) && (!data || data.length === 0)) {
        console.warn('No consultants found. Ensure consultants are verified as active in Django admin.');
      }
    } catch (err) {
      console.error('Failed to fetch consultants:', err.response?.data || err.message);
      if (err.response?.status === 403) {
        alert('Permission denied. Please ensure you are logged in as a patient.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (consultantId, date) => {
    if (!consultantId || !date) {
      setAvailableSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const { data } = await appointmentsAPI.availableSlots(consultantId, date);
      // Backend returns available_slots array — check data.results first for pagination support
      const slots = data.results || data.available_slots || data.slots || (Array.isArray(data) ? data : []);
      setAvailableSlots(slots);
      if (slots.length === 0) {
        console.info('No active slots for this date. Consultant may need to activate slots in their Availability page.');
      }
    } catch (err) {
      console.error('Failed to fetch available slots:', err?.response?.data || err.message);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    consultantsAPI.specialities().then(r => setSpecialities(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchConsultants(); }, [filters, page]);

  const renderStars = (rating) => {
    const r = parseFloat(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={13} fill={i < Math.round(r) ? '#f59e0b' : 'none'} color={i < Math.round(r) ? '#f59e0b' : '#64748b'} />
    ));
  };

  const consultationTypeLabel = { video: 'Video', audio: 'Audio', chat: 'Chat', all: 'All Types' };

  // Handlers for Modals
  const submitBooking = async (e) => {
     e.preventDefault();
     try {
        // Don't send appointment_type to backend - it will be determined from consultant's consultation_types
        const response = await appointmentsAPI.create({
           consultant_id: bookingModal.consultant.id,
           scheduled_date: bookingData.scheduled_date,
           scheduled_time: bookingData.scheduled_time,
           reason_for_visit: bookingData.reason_for_visit
        });
        
        const createdAppt = response.data;
        
        setPaymentModal({
          show: true,
          appointmentId: createdAppt.id,
          consultantId: bookingModal.consultant.id,
          scheduledDate: bookingData.scheduled_date,
          scheduledTime: bookingData.scheduled_time,
          consultantName: bookingModal.consultant.user?.full_name || bookingModal.consultant.user?.first_name || 'Consultant',
          amount: bookingModal.consultant.consultation_fee || 0
        });

        setBookingModal({ show: false, consultant: null });
        setBookingData({ scheduled_date: '', scheduled_time: '', reason_for_visit: '' });
        alert('Appointment booked successfully! Please proceed to payment.');
     } catch (err) {
        console.error('Booking error:', err);
        let errMsg = 'Failed to book appointment.';
        
        if (err.response?.data) {
          if (typeof err.response.data === 'string') {
            errMsg = err.response.data;
          } else if (err.response.data.error) {
            errMsg = err.response.data.error;
          } else if (err.response.data.scheduled_time) {
            errMsg = Array.isArray(err.response.data.scheduled_time) 
              ? err.response.data.scheduled_time[0] 
              : err.response.data.scheduled_time;
          } else if (err.response.data.scheduled_date) {
            errMsg = Array.isArray(err.response.data.scheduled_date)
              ? err.response.data.scheduled_date[0]
              : err.response.data.scheduled_date;
          } else {
            errMsg = JSON.stringify(err.response.data);
          }
        }
        
        alert(`${errMsg}\n\nTip: Ensure the selected date/time matches the consultant's availability schedule.`);
     }
  };

  const submitReview = async (e) => {
     e.preventDefault();
     try {
        await consultantsAPI.addReview(reviewModal.consultant.id, {
           rating: parseInt(reviewData.rating),
           review_text: reviewData.review_text
        });
        alert('Review submitted successfully!');
        setReviewModal({ show: false, consultant: null });
        setReviewData({ rating: 5, review_text: '' });
     } catch (err) {
        console.error(err);
        alert('Failed to submit review.');
     }
  }

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1>Find Consultants</h1>
        <p>Browse verified healthcare professionals, book appointments, and leave feedback.</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="filters-row">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text" className="form-input search-input" placeholder="Search by name or speciality…"
              value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            />
          </div>
          <select className="form-select filter-select" value={filters.speciality_id} onChange={e => setFilters(p => ({ ...p, speciality_id: e.target.value }))}>
            <option value="">All Specialities</option>
            {specialities.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="filter-toggle">
            <input type="checkbox" checked={filters.available_only} onChange={e => setFilters(p => ({ ...p, available_only: e.target.checked }))} />
            <span>Available Only</span>
          </label>
        </div>
        <p className="text-sm text-muted mt-2">{totalCount} consultant{totalCount !== 1 ? 's' : ''} found</p>
      </div>

      {/* Results */}
      {loading ? (
        <div className="loading-inline"><div className="loading-spinner" /></div>
      ) : consultants.length === 0 ? (
        <div className="empty-state card">
          <Search size={40} className="text-muted mb-2" />
          <p className="font-semibold">No consultants found</p>
          <p className="text-muted text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="consultants-grid">
          {consultants.map(c => {
            const TypeIcon = typeIcon[c.consultation_types] || Video;
            return (
              <div key={c.id} className="consultant-card">
                {c.is_featured && <div className="featured-badge">⭐ Featured</div>}
                <div className="consultant-card-header">
                  <div className="avatar avatar-lg consultant-avatar">
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.user?.full_name} /> : (c.user?.first_name?.[0] || 'D')}
                  </div>
                  <div className="consultant-card-info">
                    <div className="flex-gap-2">
                      <h3 className="consultant-name">Dr. {c.user?.full_name}</h3>
                      {c.is_verified && <CheckCircle size={16} className="text-accent" />}
                    </div>
                    <p className="consultant-speciality">{c.speciality?.name || 'General Practice'}</p>
                    <div className="consultant-rating">
                      {renderStars(c.rating)}
                      <span className="rating-text">{parseFloat(c.rating || 0).toFixed(1)} ({c.total_reviews})</span>
                    </div>
                  </div>
                </div>

                <div className="consultant-card-body">
                  {c.bio && <p className="consultant-bio">{c.bio.slice(0, 100)}{c.bio.length > 100 ? '…' : ''}</p>}
                  <div className="consultant-meta">
                    <div className="meta-item"><Clock size={14} />{c.years_of_experience} yrs exp</div>
                    <div className="meta-item"><DollarSign size={14} />₹{c.consultation_fee}/session</div>
                    <div className="meta-item"><TypeIcon size={14} />{consultationTypeLabel[c.consultation_types]}</div>
                    {c.clinic_city && <div className="meta-item"><MapPin size={14} />{c.clinic_city}</div>}
                  </div>
                  <div className="consultant-stats">
                    <button className="btn-link" onClick={() => setReviewModal({show: true, consultant: c})}>Leave a Review</button>
                  </div>
                </div>

                <div className="consultant-card-footer">
                  <span className={`badge ${c.is_available ? 'badge-success' : 'badge-muted'}`}>
                    {c.is_available ? '● Available' : '○ Unavailable'}
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={() => setBookingModal({show: true, consultant: c})}>Book Appointment</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal.show && (
         <div className="modal-overlay">
            <div className="modal-content appointment-modal">
               <div className="modal-header">
                  <h2>Book Appointment</h2>
                  <button className="modal-close" onClick={() => setBookingModal({show: false, consultant: null})}><X size={20}/></button>
               </div>
               <form onSubmit={submitBooking} className="modal-body form-grid">
                  <p>Booking with: <strong>Dr. {bookingModal.consultant.user?.full_name}</strong></p>
                  <p style={{fontSize: '0.9em', color: '#666', marginBottom: '1rem'}}>
                    <strong>Consultation Type:</strong> {bookingModal.consultant.consultation_types === 'all' ? 'Flexible' : (bookingModal.consultant.consultation_types || 'Video Call')}
                  </p>
                  <div className="form-group">
                     <label>Date</label>
                     <input 
                       type="date" 
                       required 
                       value={bookingData.scheduled_date} 
                       onChange={(e) => {
                         const newDate = e.target.value;
                         setBookingData({...bookingData, scheduled_date: newDate, scheduled_time: ''});
                         fetchAvailableSlots(bookingModal.consultant.id, newDate);
                       }} 
                     />
                  </div>
                  {bookingData.scheduled_date && (
                    <div className="form-group">
                       <label>Time (Available Slots)</label>
                       {loadingSlots ? (
                         <p style={{fontSize: '0.9em', color: '#666'}}>Loading available times...</p>
                       ) : availableSlots.length > 0 ? (
                         <select required value={bookingData.scheduled_time} onChange={e=>setBookingData({...bookingData, scheduled_time: e.target.value})}>
                            <option value="">-- Select a time --</option>
                            {availableSlots.map((slot, idx) => {
                               // slot may be a string (legacy) or an object {id, date, start_time, end_time}
                               const timeVal = typeof slot === 'string' ? slot : slot.start_time;
                               const displayTime = timeVal ? timeVal.substring(0, 5) : '';
                               return (
                                 <option key={idx} value={timeVal}>{displayTime}</option>
                               );
                            })}
                         </select>
                       ) : (
                         <>
                           <p style={{fontSize: '0.9em', color: '#d97706', marginBottom: '0.5rem'}}>No available slots for this date. Please select another date.</p>
                           <input type="time" value={bookingData.scheduled_time} onChange={e=>setBookingData({...bookingData, scheduled_time: e.target.value})} placeholder="Or enter custom time" />
                         </>
                       )}
                    </div>
                  )}
                  {!bookingData.scheduled_date && (
                    <div className="form-group">
                       <label>Time</label>
                       <input type="time" disabled placeholder="Select date first" />
                    </div>
                  )}
                  <div className="form-group full-width">
                     <label>Reason for Visit</label>
                     <textarea required rows={3} value={bookingData.reason_for_visit} onChange={e=>setBookingData({...bookingData, reason_for_visit: e.target.value})} placeholder="Describe symptoms or reasons..."></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary full-width mt-4">Confirm Request</button>
               </form>
            </div>
         </div>
      )}

      {/* Review Modal */}
      {reviewModal.show && (
         <div className="modal-overlay">
            <div className="modal-content review-modal">
               <div className="modal-header">
                  <h2>Rate Consultant</h2>
                  <button className="modal-close" onClick={() => setReviewModal({show: false, consultant: null})}><X size={20}/></button>
               </div>
               <form onSubmit={submitReview} className="modal-body form-grid">
                  <p>Leaving feedback for: <strong>Dr. {reviewModal.consultant.user?.full_name}</strong></p>
                  <div className="form-group">
                     <label>Rating (1-5)</label>
                     <select value={reviewData.rating} onChange={e=>setReviewData({...reviewData, rating: e.target.value})}>
                        <option value="1">1 Star</option>
                        <option value="2">2 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="5">5 Stars</option>
                     </select>
                  </div>
                  <div className="form-group full-width">
                     <label>Review Description</label>
                     <textarea required rows={3} value={reviewData.review_text} onChange={e=>setReviewData({...reviewData, review_text: e.target.value})} placeholder="Share your experience..."></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary full-width mt-4">Submit Review</button>
               </form>
            </div>
         </div>
      )}

      {/* Payment Processing Flow */}
      {paymentModal.show && (
        <PaymentModal
          appointmentId={paymentModal.appointmentId}
          consultantId={paymentModal.consultantId}
          scheduledDate={paymentModal.scheduledDate}
          scheduledTime={paymentModal.scheduledTime}
          consultantName={paymentModal.consultantName}
          amount={paymentModal.amount}
          onClose={() => setPaymentModal({ show: false, appointmentId: null, consultantId: null, scheduledDate: '', scheduledTime: '', consultantName: '', amount: 0 })}
          onPaymentSuccess={() => {
            // Payment succeeded — modal will auto-navigate to /patient/appointments
            console.log('Payment successful for appointment:', paymentModal.appointmentId);
          }}
        />
      )}
    </div>
  );
}
