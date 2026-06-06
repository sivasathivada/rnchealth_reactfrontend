import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  Users, Activity, Shield, Stethoscope, Calendar, CreditCard, Award, 
  Search, Edit3, Plus, Trash2, Eye, Check, X, FileText, UserCheck, 
  TrendingUp, CheckCircle, XCircle, DollarSign, List, BookOpen, 
  Heart, Briefcase, Clock, ShieldAlert, UserX, ToggleLeft, ToggleRight,
  Database, RefreshCw, Key, MessageSquare, Star, HeartHandshake, ShieldCheck
} from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('');
  
  // Platform Overviews
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users Directory
  const [users, setUsers] = useState([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '', first_name: '', last_name: '', role: 'patient', password: '', is_active: true, is_staff: false
  });

  // Email Verification Tokens
  const [emailTokens, setEmailTokens] = useState([]);
  const [emailTokensSearch, setEmailTokensSearch] = useState('');
  const [loadingEmailTokens, setLoadingEmailTokens] = useState(false);
  const [editingEmailToken, setEditingEmailToken] = useState(null);
  const [showCreateEmailToken, setShowCreateEmailToken] = useState(false);
  const [newEmailTokenForm, setNewEmailTokenForm] = useState({ user: '', expires_at: '', is_used: false });

  // Consultants Tab
  const [consultants, setConsultants] = useState([]);
  const [consultantsSearch, setConsultantsSearch] = useState('');
  const [consultantsVerifiedFilter, setConsultantsVerifiedFilter] = useState('');
  const [loadingConsultants, setLoadingConsultants] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState(null);
  const [viewingConsultant, setViewingConsultant] = useState(null);

  // Specialities Tab
  const [specialities, setSpecialities] = useState([]);
  const [loadingSpecialities, setLoadingSpecialities] = useState(false);
  const [newSpeciality, setNewSpeciality] = useState({ name: '', description: '', icon: '', is_active: true });
  const [editingSpeciality, setEditingSpeciality] = useState(null);

  // Consultant Availabilities
  const [availabilities, setAvailabilities] = useState([]);
  const [availabilitiesSearch, setAvailabilitiesSearch] = useState('');
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [showCreateAvailability, setShowCreateAvailability] = useState(false);
  const [newAvailabilityForm, setNewAvailabilityForm] = useState({ consultant: '', day_of_week: 0, start_time: '09:00', end_time: '17:00', is_active: true });
  const [editingAvailability, setEditingAvailability] = useState(null);

  // Consultant Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  // Patients Directory
  const [patients, setPatients] = useState([]);
  const [patientsSearch, setPatientsSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [patientHistoryRecords, setPatientHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Patient Medical History Database
  const [allHistoryRecords, setAllHistoryRecords] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [loadingAllHistory, setLoadingAllHistory] = useState(false);
  const [showCreateHistoryRecord, setShowCreateHistoryRecord] = useState(false);
  const [newHistoryForm, setNewHistoryForm] = useState({ patient: '', record_type: 'diagnosis', title: '', description: '', date_occurred: '', healthcare_provider: '' });
  const [editingHistoryRecord, setEditingHistoryRecord] = useState(null);

  // Appointments Directory
  const [appointments, setAppointments] = useState([]);
  const [appointmentsSearch, setAppointmentsSearch] = useState('');
  const [appointmentsStatusFilter, setAppointmentsStatusFilter] = useState('');
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Appointment Slots
  const [slots, setSlots] = useState([]);
  const [slotsSearch, setSlotsSearch] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState({ consultant: '', date: '', start_time: '09:00', end_time: '09:30', is_available: true, is_blocked: false });
  const [editingSlot, setEditingSlot] = useState(null);

  // Call Sessions
  const [callSessions, setCallSessions] = useState([]);
  const [callSessionsSearch, setCallSessionsSearch] = useState('');
  const [loadingCallSessions, setLoadingCallSessions] = useState(false);
  const [editingCallSession, setEditingCallSession] = useState(null);

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsSearch, setPrescriptionsSearch] = useState('');
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [newPrescriptionForm, setNewPrescriptionForm] = useState({ call_seesion: '', consultant: '', patient: '', medications: '[]', instructions: '', diagnosis: 'active', status: 'active', valid_until: '' });
  const [editingPrescription, setEditingPrescription] = useState(null);

  // Payments, Wallets, Audit Logs, Webhooks
  const [payments, setPayments] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [stripeEvents, setStripeEvents] = useState([]);
  const [stripeEventsSearch, setStripeEventsSearch] = useState('');
  const [loadingPaymentsTab, setLoadingPaymentsTab] = useState(false);
  const [loadingStripeEvents, setLoadingStripeEvents] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Alerts toast state
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Set default sub-tab when activeTab changes
  useEffect(() => {
    if (activeTab === 'users') setActiveSubTab('users_list');
    else if (activeTab === 'consultants') setActiveSubTab('consultants_list');
    else if (activeTab === 'patients') setActiveSubTab('patients_list');
    else if (activeTab === 'appointments') setActiveSubTab('appointments_list');
    else if (activeTab === 'payments') setActiveSubTab('stripe_payments');
    else if (activeTab === 'analytics') setActiveSubTab('');
    else setActiveSubTab('');
  }, [activeTab]);

  // Loaders
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeSubTab === 'users_list') fetchUsers();
    if (activeSubTab === 'email_tokens') fetchEmailTokens();
    if (activeSubTab === 'consultants_list') fetchConsultants();
    if (activeSubTab === 'specialities') fetchSpecialities();
    if (activeSubTab === 'availabilities') fetchAvailabilities();
    if (activeSubTab === 'reviews') fetchReviews();
    if (activeSubTab === 'patients_list') fetchPatients();
    if (activeSubTab === 'medical_records') fetchAllHistoryRecords();
    if (activeSubTab === 'appointments_list') fetchAppointments();
    if (activeSubTab === 'appointment_slots') fetchAppointmentSlots();
    if (activeSubTab === 'call_sessions') fetchCallSessions();
    if (activeSubTab === 'prescriptions') fetchPrescriptions();
    if (activeSubTab === 'stripe_payments' || activeSubTab === 'user_wallets' || activeSubTab === 'wallet_transactions') fetchPaymentsData();
    if (activeSubTab === 'stripe_events') fetchStripeEvents();
  }, [activeTab, activeSubTab]);

  // ── API CALLS ──────────────────────────────────────────

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const { data } = await adminAPI.getStats();
      setStats(data);
    } catch (err) {
      showAlert('Failed to fetch platform statistics', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  // --- Users ---
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const params = {};
      if (usersSearch) params.q = usersSearch;
      if (usersRoleFilter) params.role = usersRoleFilter;
      const { data } = await adminAPI.getUsers(params);
      setUsers(data);
    } catch (err) {
      showAlert('Failed to load users list', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUserForm);
      showAlert('User created successfully');
      setShowCreateUser(false);
      setNewUserForm({ email: '', first_name: '', last_name: '', role: 'patient', password: '', is_active: true, is_staff: false });
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Failed to create user', 'error');
    }
  };

  const handleToggleUserActive = async (user) => {
    try {
      const updatedActive = !user.is_active;
      // Filter out properties like full_name to prevent serializer issues
      const { full_name, last_seen, created_at, ...cleanUser } = user;
      await adminAPI.updateUser(user.id, { ...cleanUser, is_active: updatedActive });
      showAlert(`User account ${updatedActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (err) {
      showAlert('Failed to update user active status', 'error');
    }
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    try {
      // Exclude read-only properties
      const { full_name, last_seen, created_at, is_online, ...payload } = editingUser;
      await adminAPI.updateUser(editingUser.id, payload);
      showAlert('User details updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      showAlert('Failed to update user details', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this user?')) return;
    try {
      await adminAPI.deleteUser(id);
      showAlert('User account deactivated/deleted successfully');
      fetchUsers();
    } catch (err) {
      showAlert('Failed to delete user', 'error');
    }
  };

  // --- Verification Tokens ---
  const fetchEmailTokens = async () => {
    try {
      setLoadingEmailTokens(true);
      const params = {};
      if (emailTokensSearch) params.q = emailTokensSearch;
      const { data } = await adminAPI.getEmailTokens(params);
      setEmailTokens(data);
    } catch (err) {
      showAlert('Failed to load email verification tokens', 'error');
    } finally {
      setLoadingEmailTokens(false);
    }
  };

  const handleCreateEmailToken = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createEmailToken(newEmailTokenForm);
      showAlert('Verification token created');
      setShowCreateEmailToken(false);
      setNewEmailTokenForm({ user: '', expires_at: '', is_used: false });
      fetchEmailTokens();
    } catch (err) {
      showAlert('Failed to create token', 'error');
    }
  };

  const handleSaveEmailTokenEdit = async (e) => {
    e.preventDefault();
    try {
      const { token, user_name, user_email, is_expired, created_at, ...payload } = editingEmailToken;
      await adminAPI.updateEmailToken(editingEmailToken.id, payload);
      showAlert('Verification token updated');
      setEditingEmailToken(null);
      fetchEmailTokens();
    } catch (err) {
      showAlert('Failed to update token', 'error');
    }
  };

  const handleDeleteEmailToken = async (id) => {
    if (!window.confirm('Delete this verification token?')) return;
    try {
      await adminAPI.deleteEmailToken(id);
      showAlert('Verification token deleted');
      fetchEmailTokens();
    } catch (err) {
      showAlert('Failed to delete token', 'error');
    }
  };

  // --- Consultants ---
  const fetchConsultants = async () => {
    try {
      setLoadingConsultants(true);
      const params = {};
      if (consultantsSearch) params.q = consultantsSearch;
      if (consultantsVerifiedFilter) params.is_verified = consultantsVerifiedFilter;
      const { data } = await adminAPI.getConsultants(params);
      setConsultants(data);
    } catch (err) {
      showAlert('Failed to load consultants profile list', 'error');
    } finally {
      setLoadingConsultants(false);
    }
  };

  const handleVerifyConsultant = async (consultant) => {
    const name = consultant.user?.full_name || 'this consultant';
    if (!window.confirm(`Approve and VERIFY Dr. ${name}?\n\nThis grants them full platform access as a verified medical professional.`)) return;
    try {
      await adminAPI.updateConsultant(consultant.id, { is_verified: true });
      showAlert(`Dr. ${name} has been verified and approved ✓`, 'success');
      setViewingConsultant(null);
      fetchConsultants();
    } catch (err) {
      showAlert('Failed to verify consultant', 'error');
    }
  };

  const handleRevokeConsultantVerification = async (consultant) => {
    const name = consultant.user?.full_name || 'this consultant';
    if (!window.confirm(`REVOKE verification for Dr. ${name}?\n\nThey will no longer appear as a verified consultant.`)) return;
    try {
      await adminAPI.updateConsultant(consultant.id, { is_verified: false });
      showAlert(`Verification for Dr. ${name} has been revoked`);
      setViewingConsultant(null);
      fetchConsultants();
    } catch (err) {
      showAlert('Failed to revoke verification', 'error');
    }
  };

  const handleToggleConsultantFeatured = async (consultant) => {
    try {
      const updatedFeatured = !consultant.is_featured;
      await adminAPI.updateConsultant(consultant.id, { is_featured: updatedFeatured });
      showAlert(`Consultant ${updatedFeatured ? 'marked as featured' : 'removed from featured list'}`);
      fetchConsultants();
    } catch (err) {
      showAlert('Failed to update consultant featured status', 'error');
    }
  };

  const handleSaveConsultantEdit = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateConsultant(editingConsultant.id, {
        consultation_fee: editingConsultant.consultation_fee,
        years_of_experience: editingConsultant.years_of_experience,
        clinic_name: editingConsultant.clinic_name,
        clinic_city: editingConsultant.clinic_city,
        speciality: editingConsultant.speciality
      });
      showAlert('Consultant profile settings updated successfully');
      setEditingConsultant(null);
      setViewingConsultant(null);
      fetchConsultants();
    } catch (err) {
      showAlert('Failed to update consultant profile', 'error');
    }
  };

  // --- Specialities ---
  const fetchSpecialities = async () => {
    try {
      setLoadingSpecialities(true);
      const { data } = await adminAPI.getSpecialities();
      setSpecialities(data);
    } catch (err) {
      showAlert('Failed to load specialities list', 'error');
    } finally {
      setLoadingSpecialities(false);
    }
  };

  const handleCreateSpeciality = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createSpeciality(newSpeciality);
      showAlert('Medical speciality created successfully');
      setNewSpeciality({ name: '', description: '', icon: '', is_active: true });
      fetchSpecialities();
    } catch (err) {
      showAlert('Failed to create speciality', 'error');
    }
  };

  const handleToggleSpecialityActive = async (spec) => {
    try {
      await adminAPI.deleteSpeciality(spec.id);
      showAlert(`Speciality status toggled successfully`);
      fetchSpecialities();
    } catch (err) {
      showAlert('Failed to toggle speciality status', 'error');
    }
  };

  const handleSaveSpecialityEdit = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateSpeciality(editingSpeciality.id, editingSpeciality);
      showAlert('Speciality updated successfully');
      setEditingSpeciality(null);
      fetchSpecialities();
    } catch (err) {
      showAlert('Failed to update speciality', 'error');
    }
  };

  // --- Availabilities ---
  const fetchAvailabilities = async () => {
    try {
      setLoadingAvailabilities(true);
      const params = {};
      if (availabilitiesSearch) params.q = availabilitiesSearch;
      const { data } = await adminAPI.getConsultantAvailabilities(params);
      setAvailabilities(data);
    } catch (err) {
      showAlert('Failed to load availabilities rules', 'error');
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  const handleCreateAvailability = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createConsultantAvailability(newAvailabilityForm);
      showAlert('Availability rule created successfully');
      setShowCreateAvailability(false);
      setNewAvailabilityForm({ consultant: '', day_of_week: 0, start_time: '09:00', end_time: '17:00', is_active: true });
      fetchAvailabilities();
    } catch (err) {
      showAlert('Failed to create availability rule', 'error');
    }
  };

  const handleSaveAvailabilityEdit = async (e) => {
    e.preventDefault();
    try {
      const { consultant_name, day_name, created_at, ...payload } = editingAvailability;
      await adminAPI.updateConsultantAvailability(editingAvailability.id, payload);
      showAlert('Availability rule updated');
      setEditingAvailability(null);
      fetchAvailabilities();
    } catch (err) {
      showAlert('Failed to save availability rule', 'error');
    }
  };

  const handleDeleteAvailability = async (id) => {
    if (!window.confirm('Delete this availability rule?')) return;
    try {
      await adminAPI.deleteConsultantAvailability(id);
      showAlert('Availability rule deleted');
      fetchAvailabilities();
    } catch (err) {
      showAlert('Failed to delete availability rule', 'error');
    }
  };

  // --- Reviews ---
  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const params = {};
      if (reviewsSearch) params.q = reviewsSearch;
      const { data } = await adminAPI.getConsultantReviews(params);
      setReviews(data);
    } catch (err) {
      showAlert('Failed to load reviews', 'error');
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSaveReviewEdit = async (e) => {
    e.preventDefault();
    try {
      const { patient_name, patient_email, consultant_name, created_at, ...payload } = editingReview;
      await adminAPI.updateConsultantReview(editingReview.id, payload);
      showAlert('Review updated successfully');
      setEditingReview(null);
      fetchReviews();
    } catch (err) {
      showAlert('Failed to update review', 'error');
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await adminAPI.deleteConsultantReview(id);
      showAlert('Review deleted successfully');
      fetchReviews();
    } catch (err) {
      showAlert('Failed to delete review', 'error');
    }
  };

  // --- Patients ---
  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const params = {};
      if (patientsSearch) params.q = patientsSearch;
      const { data } = await adminAPI.getPatients(params);
      setPatients(data);
    } catch (err) {
      showAlert('Failed to load patients list', 'error');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSavePatientEdit = async (e) => {
    e.preventDefault();
    try {
      const { user, age, medical_records_count, created_at, avatar, ...payload } = editingPatient;
      await adminAPI.updatePatient(editingPatient.id, payload);
      showAlert('Patient details updated successfully');
      setEditingPatient(null);
      fetchPatients();
    } catch (err) {
      showAlert('Failed to update patient profile', 'error');
    }
  };

  const handleDeletePatient = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this patient profile?')) return;
    try {
      await adminAPI.deletePatient(id);
      showAlert('Patient profile deactivated and deleted successfully');
      fetchPatients();
    } catch (err) {
      showAlert('Failed to delete patient profile', 'error');
    }
  };

  const handleViewPatientMedicalHistory = async (patient) => {
    try {
      setLoadingHistory(true);
      setSelectedPatientHistory(patient);
      const { data } = await adminAPI.getPatientMedicalHistory(patient.id);
      setPatientHistoryRecords(data);
    } catch (err) {
      showAlert('Failed to retrieve patient medical records', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // --- Medical History Database ---
  const fetchAllHistoryRecords = async () => {
    try {
      setLoadingAllHistory(true);
      const params = {};
      if (historySearch) params.q = historySearch;
      const { data } = await adminAPI.getMedicalHistory(params);
      setAllHistoryRecords(data);
    } catch (err) {
      showAlert('Failed to load medical history records', 'error');
    } finally {
      setLoadingAllHistory(false);
    }
  };

  const handleCreateHistoryRecord = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createMedicalRecord(newHistoryForm);
      showAlert('Medical history record added successfully');
      setShowCreateHistoryRecord(false);
      setNewHistoryForm({ patient: '', record_type: 'diagnosis', title: '', description: '', date_occurred: '', healthcare_provider: '' });
      fetchAllHistoryRecords();
    } catch (err) {
      showAlert('Failed to add medical record', 'error');
    }
  };

  // --- Appointments ---
  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const params = {};
      if (appointmentsSearch) params.q = appointmentsSearch;
      if (appointmentsStatusFilter) params.status = appointmentsStatusFilter;
      const { data } = await adminAPI.getAppointments(params);
      setAppointments(data);
    } catch (err) {
      showAlert('Failed to load appointments', 'error');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    const reason = prompt("Enter cancellation reason:");
    if (reason === null) return;
    try {
      await adminAPI.updateAppointment(apptId, { status: 'cancelled', cancellation_reason: reason });
      showAlert('Appointment cancelled successfully');
      fetchAppointments();
    } catch (err) {
      showAlert('Failed to cancel appointment', 'error');
    }
  };

  // --- Appointment Slots ---
  const fetchAppointmentSlots = async () => {
    try {
      setLoadingSlots(true);
      const params = {};
      if (slotsSearch) params.q = slotsSearch;
      const { data } = await adminAPI.getAppointmentSlots(params);
      setSlots(data);
    } catch (err) {
      showAlert('Failed to load appointment slots', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createAppointmentSlot(newSlotForm);
      showAlert('Appointment slot created successfully');
      setShowCreateSlot(false);
      setNewSlotForm({ consultant: '', date: '', start_time: '09:00', end_time: '09:30', is_available: true, is_blocked: false });
      fetchAppointmentSlots();
    } catch (err) {
      showAlert('Failed to create appointment slot', 'error');
    }
  };

  const handleSaveSlotEdit = async (e) => {
    e.preventDefault();
    try {
      const { consultant_name, created_at, ...payload } = editingSlot;
      await adminAPI.updateAppointmentSlot(editingSlot.id, payload);
      showAlert('Appointment slot updated');
      setEditingSlot(null);
      fetchAppointmentSlots();
    } catch (err) {
      showAlert('Failed to update slot', 'error');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this appointment slot?')) return;
    try {
      await adminAPI.deleteAppointmentSlot(id);
      showAlert('Appointment slot deleted');
      fetchAppointmentSlots();
    } catch (err) {
      showAlert('Failed to delete slot', 'error');
    }
  };

  // --- Call Sessions ---
  const fetchCallSessions = async () => {
    try {
      setLoadingCallSessions(true);
      const params = {};
      if (callSessionsSearch) params.q = callSessionsSearch;
      const { data } = await adminAPI.getCallSessions(params);
      setCallSessions(data);
    } catch (err) {
      showAlert('Failed to load call sessions', 'error');
    } finally {
      setLoadingCallSessions(false);
    }
  };

  const handleSaveCallSessionEdit = async (e) => {
    e.preventDefault();
    try {
      const { consultant_name, patient_name, connection_health, duration_formatted, created_at, ...payload } = editingCallSession;
      await adminAPI.updateCallSession(editingCallSession.id, payload);
      showAlert('Call session details updated');
      setEditingCallSession(null);
      fetchCallSessions();
    } catch (err) {
      showAlert('Failed to update call session', 'error');
    }
  };

  const handleDeleteCallSession = async (id) => {
    if (!window.confirm('Delete this call session record?')) return;
    try {
      await adminAPI.deleteCallSession(id);
      showAlert('Call session deleted');
      fetchCallSessions();
    } catch (err) {
      showAlert('Failed to delete call session', 'error');
    }
  };

  // --- Prescriptions ---
  const fetchPrescriptions = async () => {
    try {
      setLoadingPrescriptions(true);
      const params = {};
      if (prescriptionsSearch) params.q = prescriptionsSearch;
      const { data } = await adminAPI.getPrescriptions(params);
      setPrescriptions(data);
    } catch (err) {
      showAlert('Failed to load prescriptions', 'error');
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    try {
      // Parse medications JSON
      const parsedMedications = JSON.parse(newPrescriptionForm.medications);
      await adminAPI.createPrescription({
        ...newPrescriptionForm,
        medications: parsedMedications
      });
      showAlert('Prescription created successfully');
      setShowCreatePrescription(false);
      setNewPrescriptionForm({ call_seesion: '', consultant: '', patient: '', medications: '[]', instructions: '', diagnosis: 'active', status: 'active', valid_until: '' });
      fetchPrescriptions();
    } catch (err) {
      showAlert('Failed to create prescription. Verify medications is a valid JSON array.', 'error');
    }
  };

  const handleSavePrescriptionEdit = async (e) => {
    e.preventDefault();
    try {
      const parsedMedications = typeof editingPrescription.medications === 'string' 
        ? JSON.parse(editingPrescription.medications) 
        : editingPrescription.medications;
      const { consultant_name, patient_name, created_at, ...payload } = editingPrescription;
      await adminAPI.updatePrescription(editingPrescription.id, {
        ...payload,
        medications: parsedMedications
      });
      showAlert('Prescription updated');
      setEditingPrescription(null);
      fetchPrescriptions();
    } catch (err) {
      showAlert('Failed to update prescription. Verify medications JSON format.', 'error');
    }
  };

  const handleDeletePrescription = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await adminAPI.deletePrescription(id);
      showAlert('Prescription deleted');
      fetchPrescriptions();
    } catch (err) {
      showAlert('Failed to delete prescription', 'error');
    }
  };

  // --- Payments, Wallets, Transactions ---
  const fetchPaymentsData = async () => {
    try {
      setLoadingPaymentsTab(true);
      const [pmtsRes, walletsRes, txRes] = await Promise.all([
        adminAPI.getPayments(),
        adminAPI.getWallets(),
        adminAPI.getWalletTransactions()
      ]);
      setPayments(pmtsRes.data);
      setWallets(walletsRes.data);
      setWalletTransactions(txRes.data);
    } catch (err) {
      showAlert('Failed to load payments ledger data', 'error');
    } finally {
      setLoadingPaymentsTab(false);
    }
  };

  // --- Stripe Webhook Events Logs ---
  const fetchStripeEvents = async () => {
    try {
      setLoadingStripeEvents(true);
      const params = {};
      if (stripeEventsSearch) params.q = stripeEventsSearch;
      const { data } = await adminAPI.getStripeEvents(params);
      setStripeEvents(data);
    } catch (err) {
      showAlert('Failed to load Stripe webhook logs', 'error');
    } finally {
      setLoadingStripeEvents(false);
    }
  };

  // --- Analytics ---
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const { data } = await adminAPI.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      showAlert('Failed to load analytics data', 'error');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  return (
    <div className="admin-dashboard-container animate-fadeIn">
      {/* Alert Notification Toast */}
      {alert && (
        <div className={`admin-notification-toast alert-${alert.type}`}>
          {alert.type === 'error' ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Modern Dashboard Header */}
      <div className="admin-page-header">
        <div className="flex align-center gap-3">
          <div className="admin-logo-badge">
            <ShieldCheck size={28} className="text-accent" />
          </div>
          <div>
            <h1>Admin Control Panel</h1>
            <p className="text-muted">Manage users, verification, consultations, payments, and system audit logs</p>
          </div>
        </div>
        <div className="admin-quick-badge">
          <Shield size={18} className="text-accent animate-pulse" />
          <span>System Administrator Mode</span>
        </div>
      </div>

      <div className="admin-workspace-layout">
        {/* Modern Sidebar Navigation */}
        <aside className="admin-sidebar-nav">
          <button 
            className={`admin-sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={18} /> <span>Overview</span>
          </button>
          <button 
            className={`admin-sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} /> <span>User Management</span>
          </button>
          <button 
            className={`admin-sidebar-item ${activeTab === 'consultants' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultants')}
          >
            <Stethoscope size={18} /> <span>Consultants</span>
          </button>
          <button 
            className={`admin-sidebar-item ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <Heart size={18} /> <span>Patients</span>
          </button>
          <button 
            className={`admin-sidebar-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar size={18} /> <span>Appointments</span>
          </button>
          <button 
            className={`admin-sidebar-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard size={18} /> <span>Payments & Wallets</span>
          </button>
          <button
            className={`admin-sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={18} /> <span>Analytics</span>
          </button>
        </aside>

        {/* Content Pane */}
        <main className="admin-main-content">
          
          {/* Sub Tab Navigation for Categories */}
          {activeTab === 'users' && (
            <div className="admin-subtabs-nav flex gap-2 mb-4">
              <button className={`subtab-btn ${activeSubTab === 'users_list' ? 'active' : ''}`} onClick={() => setActiveSubTab('users_list')}>Users Directory</button>
              <button className={`subtab-btn ${activeSubTab === 'email_tokens' ? 'active' : ''}`} onClick={() => setActiveSubTab('email_tokens')}>Email Tokens</button>
            </div>
          )}
          {activeTab === 'consultants' && (
            <div className="admin-subtabs-nav flex gap-2 mb-4">
              <button className={`subtab-btn ${activeSubTab === 'consultants_list' ? 'active' : ''}`} onClick={() => setActiveSubTab('consultants_list')}>Profiles</button>
              <button className={`subtab-btn ${activeSubTab === 'specialities' ? 'active' : ''}`} onClick={() => setActiveSubTab('specialities')}>Specialities</button>
              <button className={`subtab-btn ${activeSubTab === 'availabilities' ? 'active' : ''}`} onClick={() => setActiveSubTab('availabilities')}>Availability Rules</button>
              <button className={`subtab-btn ${activeSubTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveSubTab('reviews')}>Review logs</button>
            </div>
          )}
          {activeTab === 'patients' && (
            <div className="admin-subtabs-nav flex gap-2 mb-4">
              <button className={`subtab-btn ${activeSubTab === 'patients_list' ? 'active' : ''}`} onClick={() => setActiveSubTab('patients_list')}>Patient Directory</button>
              <button className={`subtab-btn ${activeSubTab === 'medical_records' ? 'active' : ''}`} onClick={() => setActiveSubTab('medical_records')}>Medical Database</button>
            </div>
          )}
          {activeTab === 'appointments' && (
            <div className="admin-subtabs-nav flex gap-2 mb-4">
              <button className={`subtab-btn ${activeSubTab === 'appointments_list' ? 'active' : ''}`} onClick={() => setActiveSubTab('appointments_list')}>Appointments</button>
              <button className={`subtab-btn ${activeSubTab === 'appointment_slots' ? 'active' : ''}`} onClick={() => setActiveSubTab('appointment_slots')}>Booking Slots</button>
              <button className={`subtab-btn ${activeSubTab === 'call_sessions' ? 'active' : ''}`} onClick={() => setActiveSubTab('call_sessions')}>Call Sessions</button>
              <button className={`subtab-btn ${activeSubTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveSubTab('prescriptions')}>Prescriptions</button>
            </div>
          )}
          {activeTab === 'payments' && (
            <div className="admin-subtabs-nav flex gap-2 mb-4">
              <button className={`subtab-btn ${activeSubTab === 'stripe_payments' ? 'active' : ''}`} onClick={() => setActiveSubTab('stripe_payments')}>Stripe Payments</button>
              <button className={`subtab-btn ${activeSubTab === 'user_wallets' ? 'active' : ''}`} onClick={() => setActiveSubTab('user_wallets')}>User Wallets</button>
              <button className={`subtab-btn ${activeSubTab === 'wallet_transactions' ? 'active' : ''}`} onClick={() => setActiveSubTab('wallet_transactions')}>Transactions Ledger</button>
              <button className={`subtab-btn ${activeSubTab === 'stripe_events' ? 'active' : ''}`} onClick={() => setActiveSubTab('stripe_events')}>Webhook logs</button>
            </div>
          )}

          {/* Render Contents */}
          <div className="tab-pane-view">

            {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <>
                {loadingStats ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <>
                    {stats && (
                      <div className="admin-stats-summary-grid animate-fadeIn">
                        <div className="overview-metric-card">
                          <div className="metric-icon users-icon"><Users size={24} /></div>
                          <div className="metric-details">
                            <h3>{stats.total_users}</h3>
                            <p>Total Registered Users</p>
                            <span className="metric-subtext">{stats.active_users} Active Accounts</span>
                          </div>
                        </div>
                        <div className="overview-metric-card">
                          <div className="metric-icon consultants-icon"><Stethoscope size={24} /></div>
                          <div className="metric-details">
                            <h3>{stats.total_consultants}</h3>
                            <p>Medical Consultants</p>
                            {stats.pending_verifications > 0 ? (
                              <span className="metric-badge-warning">{stats.pending_verifications} Pending Verification</span>
                            ) : (
                              <span className="metric-subtext">All profiles verified</span>
                            )}
                          </div>
                        </div>
                        <div className="overview-metric-card">
                          <div className="metric-icon patients-icon"><Heart size={24} /></div>
                          <div className="metric-details">
                            <h3>{stats.total_patients}</h3>
                            <p>Patient Members</p>
                            <span className="metric-subtext">Registered profiles</span>
                          </div>
                        </div>
                        <div className="overview-metric-card">
                          <div className="metric-icon appts-icon"><Calendar size={24} /></div>
                          <div className="metric-details">
                            <h3>{stats.total_appointments}</h3>
                            <p>Total Consultations</p>
                            <span className="metric-subtext">{(stats.appointments_by_status?.completed || 0)} Completed</span>
                          </div>
                        </div>
                        <div className="overview-metric-card span-2">
                          <div className="metric-icon revenue-icon"><DollarSign size={24} /></div>
                          <div className="metric-details">
                            <h3>${stats.total_revenue?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                            <p>Total Platform Revenue</p>
                            <div className="payment-methods-breakdown">
                              {Object.entries(stats.revenue_by_method || {}).map(([method, data]) => (
                                <span key={method} className="method-breakdown-pill">
                                  {method}: <strong>${data.total?.toFixed(2)}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="admin-overview-tables-row mt-6">
                      <div className="card overview-table-card">
                        <h3 className="card-title flex align-center gap-2"><Clock size={18} /> Recent Appointments</h3>
                        <div className="admin-table-wrapper mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Patient</th>
                                <th>Consultant</th>
                                <th>Date / Time</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats?.recent_appointments?.map(app => (
                                <tr key={app.id}>
                                  <td>{app.patient_name}</td>
                                  <td>{app.consultant_name}</td>
                                  <td>{app.scheduled_date} <br/><span className="text-muted text-xs">{app.scheduled_time}</span></td>
                                  <td><span className={`status-pill pill-${app.status?.toLowerCase()}`}>{app.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card overview-table-card">
                        <h3 className="card-title flex align-center gap-2"><CreditCard size={18} /> Recent Payments</h3>
                        <div className="admin-table-wrapper mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Patient</th>
                                <th>Amount</th>
                                <th>Gateway</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats?.recent_payments?.map(pay => (
                                <tr key={pay.id}>
                                  <td>{pay.patient_name}</td>
                                  <td><strong>${pay.amount}</strong></td>
                                  <td><span className="gateway-pill">{pay.Payment_method}</span></td>
                                  <td><span className={`status-pill pill-${pay.status?.toLowerCase()}`}>{pay.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── USERS TAB - DIRECTORY ─────────────────────────────── */}
            {activeSubTab === 'users_list' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search users by name, email..."
                        value={usersSearch}
                        onChange={(e) => setUsersSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      />
                    </div>
                    <select 
                      className="filter-select"
                      value={usersRoleFilter}
                      onChange={(e) => setUsersRoleFilter(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="patient">Patients</option>
                      <option value="consultant">Consultants</option>
                      <option value="admin">Administrators</option>
                    </select>
                    <button className="btn btn-secondary" onClick={fetchUsers}>Apply</button>
                  </div>
                  <button className="btn btn-primary flex align-center gap-2" onClick={() => setShowCreateUser(true)}>
                    <Plus size={18} /> Create User
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Full Name & Contact</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id}>
                            <td>
                              <strong>{u.full_name || `${u.first_name} ${u.last_name}`}</strong><br/>
                              <span className="text-sm text-muted">{u.email}</span>
                            </td>
                            <td>
                              <span className={`role-pill role-${u.role}`}>{u.role}</span>
                              {u.is_staff && <span className="admin-staff-tag ml-1">Staff</span>}
                            </td>
                            <td>
                              {u.is_verified ? (
                                <span className="text-success flex align-center gap-1"><Check size={16} /> Verified</span>
                              ) : (
                                <span className="text-muted">Unverified</span>
                              )}
                            </td>
                            <td>
                              <button 
                                className={`btn-toggle-switch ${u.is_active ? 'active' : ''}`}
                                onClick={() => handleToggleUserActive(u)}
                              >
                                {u.is_active ? <ToggleRight size={32} className="text-success" /> : <ToggleLeft size={32} className="text-muted" />}
                              </button>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingUser(u)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeleteUser(u.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── USERS TAB - EMAIL TOKENS ──────────────────────────── */}
            {activeSubTab === 'email_tokens' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by user email..."
                        value={emailTokensSearch}
                        onChange={(e) => setEmailTokensSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchEmailTokens()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchEmailTokens}>Apply</button>
                  </div>
                  <button className="btn btn-primary flex align-center gap-2" onClick={() => setShowCreateEmailToken(true)}>
                    <Plus size={18} /> New Token
                  </button>
                </div>

                {loadingEmailTokens ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>User Email</th>
                          <th>Token Preview</th>
                          <th>Expires At</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailTokens.map(t => (
                          <tr key={t.id}>
                            <td>
                              <strong>{t.user_name || 'N/A'}</strong><br/>
                              <span className="text-sm text-muted">{t.user_email}</span>
                            </td>
                            <td><code className="license-badge">{t.token ? String(t.token).substring(0, 16) + '...' : 'N/A'}</code></td>
                            <td>{new Date(t.expires_at).toLocaleString()}</td>
                            <td>
                              {t.is_used ? (
                                <span className="status-pill pill-completed">Used</span>
                              ) : t.is_expired ? (
                                <span className="status-pill pill-cancelled">Expired</span>
                              ) : (
                                <span className="status-pill pill-confirmed">Active</span>
                              )}
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingEmailToken(t)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeleteEmailToken(t.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── CONSULTANTS TAB - PROFILES ────────────────────────── */}
            {activeSubTab === 'consultants_list' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by doctor, degree, license..."
                        value={consultantsSearch}
                        onChange={(e) => setConsultantsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchConsultants()}
                      />
                    </div>
                    <select 
                      className="filter-select"
                      value={consultantsVerifiedFilter}
                      onChange={(e) => setConsultantsVerifiedFilter(e.target.value)}
                    >
                      <option value="">All Verification</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Pending Verification</option>
                    </select>
                    <button className="btn btn-secondary" onClick={fetchConsultants}><RefreshCw size={14} /> Refresh</button>
                  </div>
                </div>

                {/* Pending verification alert */}
                {consultants.filter(c => !c.is_verified).length > 0 && (
                  <div className="verification-alert-banner animate-fadeIn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className="flex align-center gap-2">
                      <ShieldAlert size={18} />
                      <span><strong>{consultants.filter(c => !c.is_verified).length}</strong> consultant{consultants.filter(c => !c.is_verified).length > 1 ? 's' : ''} pending verification — review their credentials and click <strong>Verify</strong> to approve.</span>
                    </div>
                    <button 
                      className="btn btn-verify-consultant"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        const pending = consultants.find(c => !c.is_verified);
                        if (pending) setViewingConsultant(pending);
                      }}
                    >
                      <ShieldCheck size={14} /> Verify Now
                    </button>
                  </div>
                )}

                {loadingConsultants ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Doctor Detail</th>
                          <th>Specialty & Degree</th>
                          <th>Email Verified</th>
                          <th>Fee / Experience</th>
                          <th>Profile Status</th>
                          <th>Featured</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultants.length === 0 ? (
                          <tr><td colSpan="7" className="empty-state-row"><UserX size={32} /><br/>No consultant profiles found. Doctors must register and create a profile.</td></tr>
                        ) : consultants.map(c => (
                          <tr key={c.id} className={!c.is_verified ? 'row-pending-verification' : ''}>
                            <td>
                              <strong>Dr. {c.user?.full_name}</strong><br/>
                              <span className="text-sm text-muted">{c.user?.email}</span><br/>
                              {c.license_number && <code className="license-badge text-xs">{c.license_number}</code>}
                            </td>
                            <td>
                              <span className="text-semibold text-primary">{c.speciality_name || 'N/A'}</span><br/>
                              <span className="text-xs text-muted">{c.medical_degree || 'No Degree Registered'}</span>
                            </td>
                            <td>
                              {c.user?.is_verified ? (
                                <span className="status-pill pill-completed flex align-center gap-1"><Check size={12} /> Email OK</span>
                              ) : (
                                <span className="status-pill pill-pending">Email Unverified</span>
                              )}
                            </td>
                            <td>
                              <span>{c.years_of_experience} yrs exp</span><br/>
                              <strong className="text-accent">${c.consultation_fee}/slot</strong>
                            </td>
                            <td>
                              {c.is_verified ? (
                                <span className="status-pill pill-completed flex align-center gap-1"><ShieldCheck size={12} /> Verified</span>
                              ) : (
                                <span className="status-pill pill-pending">Pending Review</span>
                              )}
                            </td>
                            <td>
                              <button 
                                className={`btn-toggle-switch ${c.is_featured ? 'active' : ''}`}
                                title={c.is_featured ? 'Remove from featured' : 'Mark as featured'}
                                onClick={() => handleToggleConsultantFeatured(c)}
                              >
                                {c.is_featured ? <ToggleRight size={28} className="text-accent" /> : <ToggleLeft size={28} className="text-muted" />}
                              </button>
                            </td>
                            <td>
                              <div className="flex gap-2 align-center">
                                <button 
                                  className="btn btn-icon-only text-info" 
                                  title="View full profile & verify"
                                  onClick={() => setViewingConsultant(c)}
                                ><Eye size={15} /></button>
                                {!c.is_verified ? (
                                  <button 
                                    className="btn btn-verify-consultant"
                                    title="Approve & verify this consultant"
                                    onClick={() => handleVerifyConsultant(c)}
                                  ><ShieldCheck size={14} /> Verify</button>
                                ) : (
                                  <button 
                                    className="btn btn-revoke-verification"
                                    title="Revoke verification"
                                    onClick={() => handleRevokeConsultantVerification(c)}
                                  ><X size={14} /> Revoke</button>
                                )}
                                <button className="btn btn-icon-only text-primary" title="Edit profile" onClick={() => setEditingConsultant(c)}><Edit3 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── CONSULTANTS TAB - SPECIALITIES ────────────────────── */}
            {activeSubTab === 'specialities' && (
              <div className="specialities-layout-grid animate-fadeIn">
                <div className="specialities-list-column">
                  <h3 className="mb-4">Medical Specialities</h3>
                  {loadingSpecialities ? (
                    <div className="loading-container"><div className="loading-spinner" /></div>
                  ) : (
                    <div className="admin-table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Specialty Name</th>
                            <th>Description</th>
                            <th>Icon</th>
                            <th>Active</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {specialities.map(s => (
                            <tr key={s.id}>
                              <td><strong>{s.name}</strong></td>
                              <td><span className="text-sm block max-w-xs">{s.description || 'N/A'}</span></td>
                              <td><code className="license-badge">{s.icon || 'N/A'}</code></td>
                              <td>
                                <span className={`status-pill pill-${s.is_active ? 'completed' : 'pending'}`}>
                                  {s.is_active ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                              <td>
                                <div className="flex gap-2">
                                  <button className="btn btn-secondary text-xs py-1 px-2" onClick={() => setEditingSpeciality(s)}>Edit</button>
                                  <button className={`btn text-xs py-1 px-2 ${s.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggleSpecialityActive(s)}>
                                    {s.is_active ? 'Disable' : 'Enable'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="speciality-form-column">
                  {editingSpeciality ? (
                    <div className="card">
                      <h3 className="card-title">Edit Specialty</h3>
                      <form onSubmit={handleSaveSpecialityEdit} className="mt-4 form-column-layout">
                        <div className="form-group">
                          <label className="form-label">Speciality Name</label>
                          <input type="text" className="form-input" required value={editingSpeciality.name} onChange={(e) => setEditingSpeciality({...editingSpeciality, name: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <textarea rows="3" className="form-input" value={editingSpeciality.description} onChange={(e) => setEditingSpeciality({...editingSpeciality, description: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Icon Identifier (Lucide Icon name)</label>
                          <input type="text" className="form-input" value={editingSpeciality.icon} onChange={(e) => setEditingSpeciality({...editingSpeciality, icon: e.target.value})} />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button type="submit" className="btn btn-primary">Save Changes</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setEditingSpeciality(null)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="card">
                      <h3 className="card-title">Add New Specialty</h3>
                      <form onSubmit={handleCreateSpeciality} className="mt-4 form-column-layout">
                        <div className="form-group">
                          <label className="form-label">Speciality Name</label>
                          <input type="text" placeholder="e.g. Cardiology" className="form-input" required value={newSpeciality.name} onChange={(e) => setNewSpeciality({...newSpeciality, name: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <textarea placeholder="Brief description of the specialty..." rows="3" className="form-input" value={newSpeciality.description} onChange={(e) => setNewSpeciality({...newSpeciality, description: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Icon Identifier</label>
                          <input type="text" placeholder="e.g. Heart" className="form-input" value={newSpeciality.icon} onChange={(e) => setNewSpeciality({...newSpeciality, icon: e.target.value})} />
                        </div>
                        <button type="submit" className="btn btn-primary mt-4 flex align-center justify-center gap-2">
                          <Plus size={16} /> Create Specialty
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CONSULTANTS TAB - AVAILABILITIES ─────────────────── */}
            {activeSubTab === 'availabilities' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by consultant..."
                        value={availabilitiesSearch}
                        onChange={(e) => setAvailabilitiesSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAvailabilities()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchAvailabilities}>Apply</button>
                  </div>
                  <button className="btn btn-primary flex align-center gap-2" onClick={() => setShowCreateAvailability(true)}>
                    <Plus size={18} /> Create Rule
                  </button>
                </div>

                {loadingAvailabilities ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Consultant</th>
                          <th>Day of Week</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availabilities.map(a => (
                          <tr key={a.id}>
                            <td><strong>{a.consultant_name}</strong></td>
                            <td><span className="gateway-pill">{a.day_name || a.day_of_week}</span></td>
                            <td>{a.start_time}</td>
                            <td>{a.end_time}</td>
                            <td>
                              <span className={`status-pill pill-${a.is_active ? 'completed' : 'pending'}`}>
                                {a.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingAvailability(a)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeleteAvailability(a.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── CONSULTANTS TAB - REVIEWS ─────────────────────────── */}
            {activeSubTab === 'reviews' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by patient, consultant..."
                        value={reviewsSearch}
                        onChange={(e) => setReviewsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchReviews()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchReviews}>Apply</button>
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Consultant Name</th>
                          <th>Rating</th>
                          <th>Review Text</th>
                          <th>Verified Call</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviews.map(r => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.is_anonymous ? 'Anonymous' : r.patient_name}</strong><br/>
                              <span className="text-xs text-muted">{r.patient_email}</span>
                            </td>
                            <td><strong>{r.consultant_name}</strong></td>
                            <td>
                              <span className="flex align-center text-accent">
                                <Star size={14} className="fill-accent text-accent mr-1" />
                                {r.rating} / 5
                              </span>
                            </td>
                            <td><span className="text-sm block max-w-sm italic">"{r.review_text || 'No review text'}"</span></td>
                            <td>
                              {r.is_verified_consultation ? (
                                <span className="text-success text-semibold">✓ Yes</span>
                              ) : (
                                <span className="text-muted">No</span>
                              )}
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingReview(r)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeleteReview(r.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PATIENTS TAB - PATIENT DIRECTORY ─────────────────── */}
            {activeSubTab === 'patients_list' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search patients by name, email, city..."
                        value={patientsSearch}
                        onChange={(e) => setPatientsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchPatients()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchPatients}>Apply</button>
                  </div>
                </div>

                {loadingPatients ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Patient Profile</th>
                          <th>Age / Gender</th>
                          <th>Address City</th>
                          <th>Medical Records</th>
                          <th>Emergency Contact</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.length === 0 ? (
                          <tr><td colSpan="6" className="empty-state-row"><Heart size={32} /><br/>No patient profiles found. Patients must complete their profile setup after registration.</td></tr>
                        ) : patients.map(p => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.user?.full_name}</strong><br/>
                              <span className="text-xs text-muted">{p.user?.email}</span><br/>
                              {p.user?.is_verified ? (
                                <span className="text-xs text-success">✓ Email verified</span>
                              ) : (
                                <span className="text-xs text-muted">Email unverified</span>
                              )}
                            </td>
                            <td>
                              <span>{p.age || 'N/A'} Years</span><br/>
                              <span className="text-xs text-muted capitalized">{p.gender || 'N/A'}</span>
                            </td>
                            <td>{p.city || 'N/A'}, {p.country || ''}</td>
                            <td>
                              <span className="badge badge-primary">{p.medical_records_count || 0} Records</span>
                            </td>
                            <td>
                              {p.emergency_contact_name ? (
                                <span className="text-xs font-semibold text-danger block">{p.emergency_contact_name} <br/> ({p.emergency_contact_relationship})</span>
                              ) : (
                                <span className="text-muted text-xs">Not set</span>
                              )}
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-secondary text-xs flex align-center gap-1" onClick={() => handleViewPatientMedicalHistory(p)}><Eye size={12} /> Records</button>
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingPatient(p)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeletePatient(p.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PATIENTS TAB - MEDICAL HISTORIES ─────────────────── */}
            {activeSubTab === 'medical_records' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Search by title, patient, provider..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAllHistoryRecords()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchAllHistoryRecords}>Apply</button>
                  </div>
                  <button className="btn btn-primary flex align-center gap-2" onClick={() => setShowCreateHistoryRecord(true)}>
                    <Plus size={18} /> Add Record
                  </button>
                </div>

                {loadingAllHistory ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Record Type</th>
                          <th>Title</th>
                          <th>Date Occurred</th>
                          <th>Healthcare Provider</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allHistoryRecords.map(rec => (
                          <tr key={rec.id}>
                            <td><strong>Patient #{String(rec.patient).substring(0,8)}</strong></td>
                            <td><span className="gateway-pill">{rec.record_type}</span></td>
                            <td><strong>{rec.title}</strong></td>
                            <td>{rec.date_occurred}</td>
                            <td>{rec.healthcare_provider || 'N/A'}</td>
                            <td><span className="text-sm text-muted">{rec.description?.substring(0, 60)}{rec.description?.length > 60 ? '...' : ''}</span></td>
                            <td>
                              <button
                                className="btn btn-icon-only text-danger"
                                onClick={async () => {
                                  if (!window.confirm('Delete this medical record?')) return;
                                  try {
                                    await adminAPI.deleteMedicalRecord(rec.id);
                                    showAlert('Medical record deleted');
                                    fetchAllHistoryRecords();
                                  } catch { showAlert('Failed to delete record', 'error'); }
                                }}
                              ><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── APPOINTMENTS TAB - APPOINTMENTS ──────────────────── */}
            {activeSubTab === 'appointments_list' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search appointments..."
                        value={appointmentsSearch}
                        onChange={(e) => setAppointmentsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAppointments()}
                      />
                    </div>
                    <select 
                      className="filter-select"
                      value={appointmentsStatusFilter}
                      onChange={(e) => setAppointmentsStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button className="btn btn-secondary" onClick={fetchAppointments}>Apply</button>
                  </div>
                </div>

                {loadingAppointments ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Doctor / Speciality</th>
                          <th>Scheduled Date</th>
                          <th>Time Slot</th>
                          <th>Status</th>
                          <th>Payment Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(a => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.patient_name}</strong><br/>
                              <span className="text-xs text-muted">{a.patient_email}</span>
                            </td>
                            <td>
                              <strong>{a.consultant_name}</strong><br/>
                              <span className="text-xs text-primary">{a.speciality_name}</span>
                            </td>
                            <td><strong>{a.scheduled_date}</strong></td>
                            <td><span className="flex align-center gap-1 text-sm"><Clock size={12} /> {a.scheduled_time}</span></td>
                            <td><span className={`status-pill pill-${a.status?.toLowerCase()}`}>{a.status}</span></td>
                            <td><span className={`status-pill pill-${a.payment_status?.toLowerCase() === 'paid' ? 'completed' : 'pending'}`}>{a.payment_status || 'Unpaid'}</span></td>
                            <td>
                              {a.status !== 'cancelled' && a.status !== 'completed' && (
                                <button className="btn btn-danger flex align-center gap-1 text-xs py-1 px-2" onClick={() => handleCancelAppointment(a.id)}>
                                  <XCircle size={12} /> Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── APPOINTMENTS TAB - BOOKING SLOTS ─────────────────── */}
            {activeSubTab === 'appointment_slots' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search slot consultant..."
                        value={slotsSearch}
                        onChange={(e) => setSlotsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAppointmentSlots()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchAppointmentSlots}>Apply</button>
                  </div>
                  <button className="btn btn-primary flex align-center gap-2" onClick={() => setShowCreateSlot(true)}>
                    <Plus size={18} /> Create Slot
                  </button>
                </div>

                {loadingSlots ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Slot Consultant</th>
                          <th>Date</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Availability</th>
                          <th>Blocked</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map(s => (
                          <tr key={s.id}>
                            <td><strong>{s.consultant_name}</strong></td>
                            <td>{s.date}</td>
                            <td>{s.start_time}</td>
                            <td>{s.end_time}</td>
                            <td>
                              <span className={`status-pill pill-${s.is_available ? 'completed' : 'pending'}`}>
                                {s.is_available ? 'Available' : 'Booked'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill pill-${s.is_blocked ? 'cancelled' : 'completed'}`}>
                                {s.is_blocked ? 'Blocked' : 'Open'}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingSlot(s)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeleteSlot(s.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── APPOINTMENTS TAB - CALL SESSIONS ─────────────────── */}
            {activeSubTab === 'call_sessions' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search session ID, names..."
                        value={callSessionsSearch}
                        onChange={(e) => setCallSessionsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchCallSessions()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchCallSessions}>Apply</button>
                  </div>
                </div>

                {loadingCallSessions ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Session ID</th>
                          <th>Participants</th>
                          <th>Type / Status</th>
                          <th>Connection Quality</th>
                          <th>Duration</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {callSessions.map(c => (
                          <tr key={c.id}>
                            <td><code className="license-badge text-xs">{c.session_id ? String(c.session_id).substring(0, 16) + '...' : c.id}</code></td>
                            <td>
                              <strong>Dr. {c.consultant_name}</strong><br/>
                              <span className="text-xs text-muted">Patient: {c.patient_name}</span>
                            </td>
                            <td>
                              <span className="text-sm capitalized block">{c.call_type}</span>
                              <span className={`status-pill pill-${c.status?.toLowerCase()}`}>{c.status}</span>
                            </td>
                            <td>
                              <span className={`status-pill pill-${c.connection_health?.toLowerCase() === 'healthy' ? 'completed' : 'pending'}`}>
                                {c.connection_health}
                              </span>
                            </td>
                            <td><strong>{c.duration_formatted || `${c.duration_minutes}m`}</strong></td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingCallSession(c)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeleteCallSession(c.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── APPOINTMENTS TAB - PRESCRIPTIONS ─────────────────── */}
            {activeSubTab === 'prescriptions' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search prescription keywords..."
                        value={prescriptionsSearch}
                        onChange={(e) => setPrescriptionsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchPrescriptions()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchPrescriptions}>Apply</button>
                  </div>
                  <button className="btn btn-primary flex align-center gap-2" onClick={() => setShowCreatePrescription(true)}>
                    <Plus size={18} /> Add Prescription
                  </button>
                </div>

                {loadingPrescriptions ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Prescription Details</th>
                          <th>Instructions</th>
                          <th>Diagnosis</th>
                          <th>Valid Until</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map(p => (
                          <tr key={p.id}>
                            <td>
                              <strong>Dr. {p.consultant_name}</strong><br/>
                              <span className="text-xs text-muted">Patient: {p.patient_name}</span>
                            </td>
                            <td><span className="text-sm block max-w-xs">{p.instructions || 'N/A'}</span></td>
                            <td><span className="gateway-pill">{p.diagnosis}</span></td>
                            <td>{new Date(p.valid_until).toLocaleDateString()}</td>
                            <td><span className={`status-pill pill-${p.status?.toLowerCase() === 'active' ? 'completed' : 'cancelled'}`}>{p.status}</span></td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-icon-only text-primary" onClick={() => setEditingPrescription(p)}><Edit3 size={16} /></button>
                                <button className="btn btn-icon-only text-danger" onClick={() => handleDeletePrescription(p.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PAYMENTS & WALLETS - STRIPE LEDGER ──────────────── */}
            {activeSubTab === 'stripe_payments' && (
              <div className="animate-fadeIn">
                {loadingPaymentsTab ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Transaction / ID</th>
                          <th>Patient</th>
                          <th>Appointment</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(pay => (
                          <tr key={pay.id}>
                            <td><code className="text-xs">{pay.transaction_id || pay.id}</code></td>
                            <td>
                              <strong>{pay.patient_name}</strong><br/>
                              <span className="text-xs text-muted">{pay.patient_email}</span>
                            </td>
                            <td>
                              {pay.appointment_details ? (
                                <span className="text-sm">
                                  {pay.appointment_details.consultant} <br/>
                                  <span className="text-muted text-xs">{pay.appointment_details.date}</span>
                                </span>
                              ) : (
                                <span className="text-muted">Direct Call Session</span>
                              )}
                            </td>
                            <td><strong>${pay.amount}</strong></td>
                            <td><span className="gateway-pill">{pay.Payment_method}</span></td>
                            <td><span className={`status-pill pill-${pay.status?.toLowerCase()}`}>{pay.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PAYMENTS & WALLETS - USER WALLETS ────────────────── */}
            {activeSubTab === 'user_wallets' && (
              <div className="animate-fadeIn">
                {loadingPaymentsTab ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Wallet Owner</th>
                          <th>Email Address</th>
                          <th>Current Balance</th>
                          <th>Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallets.map(w => (
                          <tr key={w.user}>
                            <td><strong>{w.user_name}</strong></td>
                            <td>{w.user_email}</td>
                            <td><strong className="text-success">${w.balance}</strong></td>
                            <td>{w.updated_at ? new Date(w.updated_at).toLocaleString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PAYMENTS & WALLETS - TRANSACTION AUDIT ───────────── */}
            {activeSubTab === 'wallet_transactions' && (
              <div className="animate-fadeIn">
                {loadingPaymentsTab ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Balance After</th>
                          <th>Description</th>
                          <th>Reference</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletTransactions.map(tx => (
                          <tr key={tx.id}>
                            <td>
                              <strong>{tx.wallet_user}</strong><br/>
                              <span className="text-xs text-muted">{tx.wallet_email}</span>
                            </td>
                            <td><span className={`status-pill pill-${tx.transaction_type?.toLowerCase() === 'credit' ? 'completed' : 'pending'}`}>{tx.transaction_type}</span></td>
                            <td><strong>${tx.amount}</strong></td>
                            <td>${tx.balance_after}</td>
                            <td>{tx.description}</td>
                            <td><code className="text-xs">{tx.reference || 'N/A'}</code></td>
                            <td>{new Date(tx.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PAYMENTS & WALLETS - WEBHOOK logs ────────────────── */}
            {activeSubTab === 'stripe_events' && (
              <div className="animate-fadeIn">
                <div className="admin-actions-bar">
                  <div className="search-filters-group">
                    <div className="search-input-wrapper">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Search webhook events..."
                        value={stripeEventsSearch}
                        onChange={(e) => setStripeEventsSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchStripeEvents()}
                      />
                    </div>
                    <button className="btn btn-secondary" onClick={fetchStripeEvents}>Apply</button>
                  </div>
                </div>

                {loadingStripeEvents ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : (
                  <div className="admin-table-wrapper mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Webhook Event ID</th>
                          <th>Event Type</th>
                          <th>Processed Status</th>
                          <th>Received Date</th>
                          <th>Processed Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stripeEvents.map(e => (
                          <tr key={e.id}>
                            <td><code className="license-badge text-xs">{e.stripe_event_id}</code></td>
                            <td><strong>{e.event_type}</strong></td>
                            <td>
                              <span className={`status-pill pill-${e.processed ? 'completed' : 'pending'}`}>
                                {e.processed ? 'Processed' : 'Pending'}
                              </span>
                            </td>
                            <td>{new Date(e.created_at).toLocaleString()}</td>
                            <td>{e.processed_at ? new Date(e.processed_at).toLocaleString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYTICS TAB ─────────────────────────────────────── */}
            {activeTab === 'analytics' && (
              <div className="animate-fadeIn">
                {loadingAnalytics ? (
                  <div className="loading-container"><div className="loading-spinner" /></div>
                ) : analytics ? (
                  <>
                    <div className="admin-stats-summary-grid">
                      {/* User Role Distribution */}
                      <div className="overview-metric-card">
                        <div className="metric-icon users-icon"><Users size={24} /></div>
                        <div className="metric-details">
                          <h3>User Roles</h3>
                          <p>Platform Distribution</p>
                          {Object.entries(analytics.user_role_distribution || {}).map(([role, count]) => (
                            <div key={role} className="flex align-center gap-2 mt-1">
                              <span className="text-xs text-muted capitalize">{role}:</span>
                              <strong className="text-sm">{count}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Consultant Verification */}
                      <div className="overview-metric-card">
                        <div className="metric-icon consultants-icon"><Shield size={24} /></div>
                        <div className="metric-details">
                          <h3>Verification Rate</h3>
                          <p>Consultant Status</p>
                          <div className="flex align-center gap-2 mt-1">
                            <span className="text-xs text-muted">Verified:</span>
                            <strong className="text-success">{analytics.consultant_verification_rate?.verified || 0}</strong>
                          </div>
                          <div className="flex align-center gap-2 mt-1">
                            <span className="text-xs text-muted">Pending:</span>
                            <strong className="text-warning">{analytics.consultant_verification_rate?.unverified || 0}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Payment Distribution */}
                      <div className="overview-metric-card">
                        <div className="metric-icon revenue-icon"><CreditCard size={24} /></div>
                        <div className="metric-details">
                          <h3>Payment Status</h3>
                          <p>Transaction Health</p>
                          {Object.entries(analytics.payment_status_distribution || {}).map(([s, count]) => (
                            <div key={s} className="flex align-center gap-2 mt-1">
                              <span className={`status-pill pill-${s === 'completed' ? 'completed' : s === 'failed' ? 'cancelled' : 'pending'} text-xs`}>{s}</span>
                              <strong className="text-sm">{count}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Specialities */}
                      <div className="overview-metric-card">
                        <div className="metric-icon appts-icon"><Stethoscope size={24} /></div>
                        <div className="metric-details">
                          <h3>Top Specialities</h3>
                          <p>By Appointment Count</p>
                          {(analytics.top_specialities || []).map((s, i) => (
                            <div key={i} className="flex align-center gap-2 mt-1">
                              <span className="text-xs text-muted">{s.consultant__speciality__name || 'N/A'}:</span>
                              <strong className="text-sm">{s.count}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Monthly Revenue Table */}
                    {analytics.monthly_revenue?.length > 0 && (
                      <div className="card mt-6">
                        <h3 className="card-title flex align-center gap-2"><DollarSign size={18} /> Monthly Revenue (Last 6 Months)</h3>
                        <div className="admin-table-wrapper mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Revenue (Completed Payments)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.monthly_revenue.map((item, i) => (
                                <tr key={i}>
                                  <td><strong>{new Date(item.month).toLocaleDateString(undefined, {year: 'numeric', month: 'long'})}</strong></td>
                                  <td><span className="text-success font-bold">${parseFloat(item.total || 0).toFixed(2)}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Appointment Status Breakdown */}
                    {analytics.monthly_appointments?.length > 0 && (
                      <div className="card mt-6">
                        <h3 className="card-title flex align-center gap-2"><Calendar size={18} /> Monthly Appointments Breakdown</h3>
                        <div className="admin-table-wrapper mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Status</th>
                                <th>Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.monthly_appointments.map((item, i) => (
                                <tr key={i}>
                                  <td><strong>{new Date(item.month).toLocaleDateString(undefined, {year: 'numeric', month: 'long'})}</strong></td>
                                  <td><span className={`status-pill pill-${item.status}`}>{item.status}</span></td>
                                  <td><strong>{item.count}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <TrendingUp size={48} className="text-muted" />
                    <p>Click the Analytics tab to load platform insights.</p>
                    <button className="btn btn-primary mt-4" onClick={fetchAnalytics}>Load Analytics</button>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── MODALS & FORMS FOR ALL CRUD OPERATIONS ───────────── */}

      {/* Create Medical History Record Modal */}
      {showCreateHistoryRecord && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Add Medical History Record</h2>
              <button className="modal-close" onClick={() => setShowCreateHistoryRecord(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateHistoryRecord} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Patient Profile UUID</label>
                  <input type="text" className="form-input" required placeholder="Paste patient profile UUID" value={newHistoryForm.patient} onChange={(e) => setNewHistoryForm({...newHistoryForm, patient: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Record Type</label>
                  <select className="form-input" required value={newHistoryForm.record_type} onChange={(e) => setNewHistoryForm({...newHistoryForm, record_type: e.target.value})}>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="procedure">Medical Procedure</option>
                    <option value="surgery">Surgery</option>
                    <option value="hospitalization">Hospitalization</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="test_result">Test Result</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-input" required value={newHistoryForm.title} onChange={(e) => setNewHistoryForm({...newHistoryForm, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date Occurred</label>
                  <input type="date" className="form-input" required value={newHistoryForm.date_occurred} onChange={(e) => setNewHistoryForm({...newHistoryForm, date_occurred: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Healthcare Provider</label>
                  <input type="text" className="form-input" value={newHistoryForm.healthcare_provider} onChange={(e) => setNewHistoryForm({...newHistoryForm, healthcare_provider: e.target.value})} />
                </div>
                <div className="form-group" style={{gridColumn: '1 / -1'}}>
                  <label className="form-label">Description</label>
                  <textarea rows="3" className="form-input" required value={newHistoryForm.description} onChange={(e) => setNewHistoryForm({...newHistoryForm, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateHistoryRecord(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Form Modal */}
      {showCreateUser && (

        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Create New User Profile</h2>
              <button className="modal-close" onClick={() => setShowCreateUser(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input type="email" className="form-input" required value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" required value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" required value={newUserForm.first_name} onChange={(e) => setNewUserForm({...newUserForm, first_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" required value={newUserForm.last_name} onChange={(e) => setNewUserForm({...newUserForm, last_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value, is_staff: e.target.value === 'admin'})}>
                    <option value="patient">Patient</option>
                    <option value="consultant">Consultant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateUser(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit User Account</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUserEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={editingUser.email} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" value={editingUser.first_name} onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={editingUser.last_name} onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value, is_staff: e.target.value === 'admin'})}>
                    <option value="patient">Patient</option>
                    <option value="consultant">Consultant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Verification Token Modal */}
      {showCreateEmailToken && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Create Verification Token</h2>
              <button className="modal-close" onClick={() => setShowCreateEmailToken(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateEmailToken} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">User ID (Integer PK)</label>
                  <input type="number" className="form-input" required value={newEmailTokenForm.user} onChange={(e) => setNewEmailTokenForm({...newEmailTokenForm, user: parseInt(e.target.value) || ''})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expires At</label>
                  <input type="datetime-local" className="form-input" required value={newEmailTokenForm.expires_at} onChange={(e) => setNewEmailTokenForm({...newEmailTokenForm, expires_at: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateEmailToken(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Token</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Verification Token Modal */}
      {editingEmailToken && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Verification Token</h2>
              <button className="modal-close" onClick={() => setEditingEmailToken(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEmailTokenEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Used Status</label>
                  <select className="form-input" value={editingEmailToken.is_used ? 'true' : 'false'} onChange={(e) => setEditingEmailToken({...editingEmailToken, is_used: e.target.value === 'true'})}>
                    <option value="true">Used</option>
                    <option value="false">Unused</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiration Date</label>
                  <input type="datetime-local" className="form-input" value={editingEmailToken.expires_at ? new Date(editingEmailToken.expires_at).toISOString().slice(0, 16) : ''} onChange={(e) => setEditingEmailToken({...editingEmailToken, expires_at: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingEmailToken(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Consultant Modal */}
      {editingConsultant && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Consultant Profile</h2>
              <button className="modal-close" onClick={() => setEditingConsultant(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveConsultantEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Consultation Fee ($)</label>
                  <input type="number" step="0.01" className="form-input" value={editingConsultant.consultation_fee} onChange={(e) => setEditingConsultant({...editingConsultant, consultation_fee: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input type="number" className="form-input" value={editingConsultant.years_of_experience} onChange={(e) => setEditingConsultant({...editingConsultant, years_of_experience: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Clinic / Hospital Name</label>
                  <input type="text" className="form-input" value={editingConsultant.clinic_name} onChange={(e) => setEditingConsultant({...editingConsultant, clinic_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Clinic City</label>
                  <input type="text" className="form-input" value={editingConsultant.clinic_city} onChange={(e) => setEditingConsultant({...editingConsultant, clinic_city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialty (Select ID)</label>
                  <select className="form-input" value={editingConsultant.speciality || ''} onChange={(e) => setEditingConsultant({...editingConsultant, speciality: parseInt(e.target.value) || null})}>
                    <option value="">No Specialty Assigned</option>
                    {specialities.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingConsultant(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Availability Modal */}
      {showCreateAvailability && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Add Availability Rule</h2>
              <button className="modal-close" onClick={() => setShowCreateAvailability(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAvailability} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Consultant Profile UUID</label>
                  <input type="text" placeholder="UUID format" className="form-input" required value={newAvailabilityForm.consultant} onChange={(e) => setNewAvailabilityForm({...newAvailabilityForm, consultant: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Day of Week</label>
                  <select className="form-input" value={newAvailabilityForm.day_of_week} onChange={(e) => setNewAvailabilityForm({...newAvailabilityForm, day_of_week: parseInt(e.target.value) || 0})}>
                    <option value="0">Monday</option>
                    <option value="1">Tuesday</option>
                    <option value="2">Wednesday</option>
                    <option value="3">Thursday</option>
                    <option value="4">Friday</option>
                    <option value="5">Saturday</option>
                    <option value="6">Sunday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input" required value={newAvailabilityForm.start_time} onChange={(e) => setNewAvailabilityForm({...newAvailabilityForm, start_time: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input" required value={newAvailabilityForm.end_time} onChange={(e) => setNewAvailabilityForm({...newAvailabilityForm, end_time: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateAvailability(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Availability Modal */}
      {editingAvailability && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Availability Rule</h2>
              <button className="modal-close" onClick={() => setEditingAvailability(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAvailabilityEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Day of Week</label>
                  <select className="form-input" value={editingAvailability.day_of_week} onChange={(e) => setEditingAvailability({...editingAvailability, day_of_week: parseInt(e.target.value)})}>
                    <option value="0">Monday</option>
                    <option value="1">Tuesday</option>
                    <option value="2">Wednesday</option>
                    <option value="3">Thursday</option>
                    <option value="4">Friday</option>
                    <option value="5">Saturday</option>
                    <option value="6">Sunday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input" value={editingAvailability.start_time} onChange={(e) => setEditingAvailability({...editingAvailability, start_time: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input" value={editingAvailability.end_time} onChange={(e) => setEditingAvailability({...editingAvailability, end_time: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Active</label>
                  <select className="form-input" value={editingAvailability.is_active ? 'true' : 'false'} onChange={(e) => setEditingAvailability({...editingAvailability, is_active: e.target.value === 'true'})}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingAvailability(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Review Record</h2>
              <button className="modal-close" onClick={() => setEditingReview(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveReviewEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Rating Value (1-5)</label>
                  <input type="number" min="1" max="5" className="form-input" value={editingReview.rating} onChange={(e) => setEditingReview({...editingReview, rating: parseInt(e.target.value) || 5})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Review Text</label>
                  <textarea rows="3" className="form-input" value={editingReview.review_text} onChange={(e) => setEditingReview({...editingReview, review_text: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Verified Consultation</label>
                  <select className="form-input" value={editingReview.is_verified_consultation ? 'true' : 'false'} onChange={(e) => setEditingReview({...editingReview, is_verified_consultation: e.target.value === 'true'})}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingReview(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Patient Profile</h2>
              <button className="modal-close" onClick={() => setEditingPatient(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePatientEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Bio Details</label>
                  <input type="text" className="form-input" value={editingPatient.bio || ''} onChange={(e) => setEditingPatient({...editingPatient, bio: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" value={editingPatient.date_of_birth || ''} onChange={(e) => setEditingPatient({...editingPatient, date_of_birth: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-input" value={editingPatient.gender || ''} onChange={(e) => setEditingPatient({...editingPatient, gender: e.target.value})}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="form-input" value={editingPatient.phone_number || ''} onChange={(e) => setEditingPatient({...editingPatient, phone_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Type</label>
                  <input type="text" className="form-input" value={editingPatient.blood_type || ''} onChange={(e) => setEditingPatient({...editingPatient, blood_type: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact Name</label>
                  <input type="text" className="form-input" value={editingPatient.emergency_contact_name || ''} onChange={(e) => setEditingPatient({...editingPatient, emergency_contact_name: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPatient(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Medical History Drawer / Modal */}
      {selectedPatientHistory && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container max-w-lg animate-scaleIn">
            <div className="modal-header">
              <div>
                <h2>Medical Records & History</h2>
                <p className="text-muted text-sm">Patient: {selectedPatientHistory.user?.full_name}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedPatientHistory(null)}><X size={20} /></button>
            </div>
            <div className="modal-scroll-body mt-4">
              {loadingHistory ? (
                <div className="loading-container"><div className="loading-spinner" /></div>
              ) : (
                <div className="patient-medical-timeline">
                  {patientHistoryRecords.map(rec => (
                    <div key={rec.id} className="timeline-record-card card">
                      <div className="timeline-badge">
                        <span className={`record-type-label type-${rec.record_type}`}>{rec.record_type}</span>
                      </div>
                      <div className="record-details mt-2">
                        <h4>{rec.title}</h4>
                        <p className="text-sm mt-1">{rec.description}</p>
                        <div className="record-footer mt-3 flex justify-between align-center text-xs text-muted">
                          <span>Provider: {rec.healthcare_provider || 'N/A'}</span>
                          <span className="flex align-center gap-1"><Calendar size={12} /> {rec.date_occurred}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {patientHistoryRecords.length === 0 && (
                    <div className="empty-state text-center py-6">
                      <FileText size={40} className="text-muted mb-2" />
                      <p>No medical history records found for this patient.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Appointment Slot Modal */}
      {showCreateSlot && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Create Booking Slot</h2>
              <button className="modal-close" onClick={() => setShowCreateSlot(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSlot} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Consultant Profile ID (UUID)</label>
                  <input type="text" className="form-input" required value={newSlotForm.consultant} onChange={(e) => setNewSlotForm({...newSlotForm, consultant: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" required value={newSlotForm.date} onChange={(e) => setNewSlotForm({...newSlotForm, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input" required value={newSlotForm.start_time} onChange={(e) => setNewSlotForm({...newSlotForm, start_time: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input" required value={newSlotForm.end_time} onChange={(e) => setNewSlotForm({...newSlotForm, end_time: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSlot(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Slot Modal */}
      {editingSlot && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Booking Slot</h2>
              <button className="modal-close" onClick={() => setEditingSlot(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveSlotEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={editingSlot.date} onChange={(e) => setEditingSlot({...editingSlot, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input" value={editingSlot.start_time} onChange={(e) => setEditingSlot({...editingSlot, start_time: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input" value={editingSlot.end_time} onChange={(e) => setEditingSlot({...editingSlot, end_time: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Available</label>
                  <select className="form-input" value={editingSlot.is_available ? 'true' : 'false'} onChange={(e) => setEditingSlot({...editingSlot, is_available: e.target.value === 'true'})}>
                    <option value="true">Available</option>
                    <option value="false">Booked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Blocked</label>
                  <select className="form-input" value={editingSlot.is_blocked ? 'true' : 'false'} onChange={(e) => setEditingSlot({...editingSlot, is_blocked: e.target.value === 'true'})}>
                    <option value="true">Blocked</option>
                    <option value="false">Open</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSlot(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Call Session Modal */}
      {editingCallSession && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Call Session Details</h2>
              <button className="modal-close" onClick={() => setEditingCallSession(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCallSessionEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Call Type</label>
                  <select className="form-input" value={editingCallSession.call_type} onChange={(e) => setEditingCallSession({...editingCallSession, call_type: e.target.value})}>
                    <option value="video">Video Call</option>
                    <option value="audio">Audio Call</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Call Status</label>
                  <select className="form-input" value={editingCallSession.status} onChange={(e) => setEditingCallSession({...editingCallSession, status: e.target.value})}>
                    <option value="scheduled">Scheduled</option>
                    <option value="initiated">Initiated</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fee Charged ($)</label>
                  <input type="number" step="0.01" className="form-input" value={editingCallSession.consultation_fee} onChange={(e) => setEditingCallSession({...editingCallSession, consultation_fee: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select className="form-input" value={editingCallSession.payment_status} onChange={(e) => setEditingCallSession({...editingCallSession, payment_status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Consultant Notes</label>
                  <textarea rows="2" className="form-input" value={editingCallSession.consultant_notes || ''} onChange={(e) => setEditingCallSession({...editingCallSession, consultant_notes: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCallSession(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Prescription Modal */}
      {showCreatePrescription && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Add Digital Prescription</h2>
              <button className="modal-close" onClick={() => setShowCreatePrescription(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreatePrescription} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Call Session ID (UUID)</label>
                  <input type="text" className="form-input" required value={newPrescriptionForm.call_seesion} onChange={(e) => setNewPrescriptionForm({...newPrescriptionForm, call_seesion: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultant User ID</label>
                  <input type="number" className="form-input" required value={newPrescriptionForm.consultant} onChange={(e) => setNewPrescriptionForm({...newPrescriptionForm, consultant: parseInt(e.target.value) || ''})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Patient User ID</label>
                  <input type="number" className="form-input" required value={newPrescriptionForm.patient} onChange={(e) => setNewPrescriptionForm({...newPrescriptionForm, patient: parseInt(e.target.value) || ''})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Medications JSON Array</label>
                  <input type="text" className="form-input" required placeholder='e.g. [{"name":"Aspirin","dosage":"50mg","frequency":"daily"}]' value={newPrescriptionForm.medications} onChange={(e) => setNewPrescriptionForm({...newPrescriptionForm, medications: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Validity Expiration Date</label>
                  <input type="datetime-local" className="form-input" required value={newPrescriptionForm.valid_until} onChange={(e) => setNewPrescriptionForm({...newPrescriptionForm, valid_until: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Usage Instructions</label>
                  <textarea rows="2" className="form-input" required value={newPrescriptionForm.instructions} onChange={(e) => setNewPrescriptionForm({...newPrescriptionForm, instructions: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreatePrescription(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Prescription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Prescription Modal */}
      {editingPrescription && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-container animate-scaleIn">
            <div className="modal-header">
              <h2>Edit Prescription</h2>
              <button className="modal-close" onClick={() => setEditingPrescription(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePrescriptionEdit} className="admin-modal-form mt-4">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Medications JSON Array</label>
                  <input type="text" className="form-input" value={typeof editingPrescription.medications === 'string' ? editingPrescription.medications : JSON.stringify(editingPrescription.medications)} onChange={(e) => setEditingPrescription({...editingPrescription, medications: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Instructions</label>
                  <textarea rows="2" className="form-input" value={editingPrescription.instructions} onChange={(e) => setEditingPrescription({...editingPrescription, instructions: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiration Date</label>
                  <input type="datetime-local" className="form-input" value={editingPrescription.valid_until ? new Date(editingPrescription.valid_until).toISOString().slice(0, 16) : ''} onChange={(e) => setEditingPrescription({...editingPrescription, valid_until: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnosis status</label>
                  <input type="text" className="form-input" value={editingPrescription.diagnosis} onChange={(e) => setEditingPrescription({...editingPrescription, diagnosis: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prescription status</label>
                  <select className="form-input" value={editingPrescription.status} onChange={(e) => setEditingPrescription({...editingPrescription, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPrescription(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONSULTANT PROFILE DETAIL MODAL ─────────────────────────── */}
      {viewingConsultant && (
        <div className="admin-modal-backdrop" onClick={(e) => e.target.classList.contains('admin-modal-backdrop') && setViewingConsultant(null)}>
          <div className="admin-modal-container admin-modal-wide animate-scaleIn">
            <div className="modal-header">
              <div>
                <h2>Consultant Profile Review</h2>
                <p className="text-muted text-sm mt-1">Review credentials before approving or revoking verification</p>
              </div>
              <button className="modal-close" onClick={() => setViewingConsultant(null)}><X size={20} /></button>
            </div>

            <div className="consultant-detail-modal-body mt-4">
              {/* Profile Header */}
              <div className="consultant-profile-header-strip">
                <div className="consultant-avatar-placeholder">
                  <Stethoscope size={36} />
                </div>
                <div className="consultant-header-info">
                  <h3>Dr. {viewingConsultant.user?.full_name}</h3>
                  <p className="text-muted">{viewingConsultant.user?.email}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {viewingConsultant.user?.is_verified ? (
                      <span className="status-pill pill-completed"><Check size={12} /> Email Verified</span>
                    ) : (
                      <span className="status-pill pill-cancelled">Email NOT Verified</span>
                    )}
                    {viewingConsultant.is_verified ? (
                      <span className="status-pill pill-completed"><ShieldCheck size={12} /> Profile Verified</span>
                    ) : (
                      <span className="status-pill pill-pending">Awaiting Verification</span>
                    )}
                    {viewingConsultant.is_featured && (
                      <span className="status-pill pill-confirmed"><Star size={12} /> Featured</span>
                    )}
                  </div>
                </div>
                {/* Big Verify / Revoke button */}
                <div className="consultant-verify-action">
                  {!viewingConsultant.is_verified ? (
                    <button 
                      className="btn btn-verify-consultant-large"
                      onClick={() => handleVerifyConsultant(viewingConsultant)}
                    >
                      <ShieldCheck size={20} />
                      Approve & Verify
                    </button>
                  ) : (
                    <button 
                      className="btn btn-revoke-verification-large"
                      onClick={() => handleRevokeConsultantVerification(viewingConsultant)}
                    >
                      <X size={20} />
                      Revoke Verification
                    </button>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="consultant-detail-grid mt-4">
                <div className="detail-section">
                  <h4 className="detail-section-title"><Award size={16} /> Professional Credentials</h4>
                  <div className="detail-row"><span className="detail-label">Medical Degree</span><span className="detail-value">{viewingConsultant.medical_degree || 'Not provided'}</span></div>
                  <div className="detail-row"><span className="detail-label">License Number</span><span className="detail-value"><code className="license-badge">{viewingConsultant.license_number || 'Not provided'}</code></span></div>
                  <div className="detail-row"><span className="detail-label">Speciality</span><span className="detail-value text-primary">{viewingConsultant.speciality_name || 'Not set'}</span></div>
                  <div className="detail-row"><span className="detail-label">Experience</span><span className="detail-value">{viewingConsultant.years_of_experience} years</span></div>
                  <div className="detail-row"><span className="detail-label">Board Certifications</span><span className="detail-value">{(viewingConsultant.board_certifications || []).length > 0 ? viewingConsultant.board_certifications.join(', ') : 'None listed'}</span></div>
                  <div className="detail-row"><span className="detail-label">Additional Qualifications</span><span className="detail-value">{(viewingConsultant.additional_qualifications || []).length > 0 ? viewingConsultant.additional_qualifications.join(', ') : 'None listed'}</span></div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title"><Briefcase size={16} /> Practice Details</h4>
                  <div className="detail-row"><span className="detail-label">Clinic Name</span><span className="detail-value">{viewingConsultant.clinic_name || 'Not provided'}</span></div>
                  <div className="detail-row"><span className="detail-label">City / Country</span><span className="detail-value">{viewingConsultant.clinic_city || 'N/A'}, {viewingConsultant.clinic_country || 'N/A'}</span></div>
                  <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{viewingConsultant.phone_number || 'Not provided'}</span></div>
                  <div className="detail-row"><span className="detail-label">Consultation Fee</span><span className="detail-value text-accent">${viewingConsultant.consultation_fee} per session</span></div>
                  <div className="detail-row"><span className="detail-label">Consult Type</span><span className="detail-value capitalize">{viewingConsultant.consultation_types || 'All'}</span></div>
                  <div className="detail-row"><span className="detail-label">Languages</span><span className="detail-value">{(viewingConsultant.languages_spoken || []).join(', ') || 'Not specified'}</span></div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title"><Activity size={16} /> Statistics & Dates</h4>
                  <div className="detail-row"><span className="detail-label">Rating</span><span className="detail-value"><Star size={13} className="text-accent" /> {viewingConsultant.rating || 0} / 5</span></div>
                  <div className="detail-row"><span className="detail-label">Total Consultations</span><span className="detail-value">{viewingConsultant.total_consultation}</span></div>
                  <div className="detail-row"><span className="detail-label">Total Reviews</span><span className="detail-value">{viewingConsultant.total_reviews}</span></div>
                  <div className="detail-row"><span className="detail-label">Profile Created</span><span className="detail-value">{viewingConsultant.created_at ? new Date(viewingConsultant.created_at).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="detail-row"><span className="detail-label">Verified On</span><span className="detail-value">{viewingConsultant.verification_date ? new Date(viewingConsultant.verification_date).toLocaleDateString() : 'Not yet verified'}</span></div>
                </div>
              </div>

              {/* Bio */}
              {viewingConsultant.bio && (
                <div className="detail-bio mt-4">
                  <h4 className="detail-section-title"><FileText size={16} /> Professional Bio</h4>
                  <p className="text-sm mt-2">{viewingConsultant.bio}</p>
                </div>
              )}
            </div>

            <div className="modal-footer mt-6">
              <button className="btn btn-secondary" onClick={() => setViewingConsultant(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setEditingConsultant(viewingConsultant); setViewingConsultant(null); }}><Edit3 size={14} /> Edit Profile</button>
              {!viewingConsultant.is_verified ? (
                <button className="btn btn-verify-consultant" onClick={() => handleVerifyConsultant(viewingConsultant)}><ShieldCheck size={14} /> Approve & Verify</button>
              ) : (
                <button className="btn btn-revoke-verification" onClick={() => handleRevokeConsultantVerification(viewingConsultant)}><X size={14} /> Revoke Verification</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
