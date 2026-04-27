import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsAPI, consultantsAPI, appointmentsAPI } from '../../services/api';
import {
  Calendar, FileText, Users, Activity, Clock,
  TrendingUp, AlertCircle, Star, ChevronRight, Plus, Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, recordsRes] = await Promise.allSettled([
          patientsAPI.me(),
          patientsAPI.recentRecords(),
        ]);
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
        if (recordsRes.status === 'fulfilled') setRecentRecords(recordsRes.value.data.slice(0, 5));
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Medical Records', value: profile?.medical_history?.length ?? '—', icon: FileText, color: 'primary' },
    { label: 'Allergies', value: profile?.allergies?.length ?? 0, icon: AlertCircle, color: 'warning' },
    { label: 'Medications', value: profile?.current_medications?.length ?? 0, icon: Activity, color: 'accent' },
    { label: 'Conditions', value: profile?.chronic_conditions?.length ?? 0, icon: TrendingUp, color: 'danger' },
  ];

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <div className="loading-inline"><div className="loading-spinner" /></div>;

  return (
    <div className="page-container animate-fadeIn">
      {/* Header */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <h1>{greet()}, {user?.first_name}! 👋</h1>
          <p>Here's an overview of your health profile today</p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/patient/find-consultants" className="btn btn-primary">
            <Users size={16} /> Find Consultant
          </Link>
        </div>
      </div>

      {/* Email verification banner */}
      {!user?.is_verified && (
        <div className="alert alert-warning mb-6">
          <AlertCircle size={18} />
          Your email is not verified. Please check your inbox to verify your account.
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon ${color}`}><Icon size={22} color="#fff" /></div>
            <div className="stat-info">
              <p className="stat-value">{value}</p>
              <p className="stat-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Profile summary */}
        <div className="card">
          <div className="flex-between mb-4">
            <h2 className="card-title">Health Profile</h2>
            <Link to="/patient/profile" className="btn btn-outline btn-sm">Edit <ChevronRight size={14} /></Link>
          </div>
          {profile ? (
            <div className="profile-summary">
              <div className="profile-row"><span>Blood Type</span><span className="badge badge-danger">{profile.blood_type || '—'}</span></div>
              <div className="profile-row"><span>Age</span><span>{profile.age ?? '—'} yrs</span></div>
              <div className="profile-row"><span>Gender</span><span className="capitalize">{profile.gender || '—'}</span></div>
              <div className="profile-row"><span>City</span><span>{profile.city || '—'}</span></div>
              <div className="profile-row">
                <span>Allergies</span>
                <div className="tag-list">
                  {profile.allergies?.length
                    ? profile.allergies.map(a => <span key={a} className="tag">{a}</span>)
                    : <span className="text-muted text-sm">None listed</span>}
                </div>
              </div>
              <div className="profile-row">
                <span>Conditions</span>
                <div className="tag-list">
                  {profile.chronic_conditions?.length
                    ? profile.chronic_conditions.map(c => <span key={c} className="tag tag-warning">{c}</span>)
                    : <span className="text-muted text-sm">None listed</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No profile found.</p>
              <Link to="/patient/profile" className="btn btn-primary btn-sm mt-2"><Plus size={14} /> Create Profile</Link>
            </div>
          )}
        </div>

        {/* Recent Medical Records */}
        <div className="card">
          <div className="flex-between mb-4">
            <h2 className="card-title">Recent Records</h2>
            <Link to="/patient/medical-history" className="btn btn-outline btn-sm">View All <ChevronRight size={14} /></Link>
          </div>
          {recentRecords.length > 0 ? (
            <div className="records-list">
              {recentRecords.map(record => (
                <div key={record.id} className="record-item">
                  <div className={`record-type-dot ${record.record_type}`} />
                  <div className="record-info">
                    <p className="record-title">{record.title}</p>
                    <p className="text-xs text-muted">{record.date_occurred} · {record.record_type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={32} className="text-muted mb-2" />
              <p className="text-muted text-sm">No medical records yet</p>
              <Link to="/patient/medical-history" className="btn btn-outline btn-sm mt-2"><Plus size={14} /> Add Record</Link>
            </div>
          )}
        </div>
      </div>

      <div className="quick-actions mt-6">
        <h2 className="card-title mb-4">Quick Actions</h2>
        <div className="grid-4">
          {[
            { to: '/patient/find-consultants', icon: Users,    label: 'Find Doctor',      color: 'primary' },
            { to: '/patient/appointments',     icon: Calendar, label: 'Appointments',     color: 'accent' },
            { to: '/patient/calls',            icon: Video,    label: 'Call Sessions',    color: 'success' },
            { to: '/patient/medical-history',  icon: FileText, label: 'Medical History',  color: 'warning' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to} className="quick-action-card">
              <div className={`stat-icon ${color}`}><Icon size={22} color="#fff" /></div>
              <p className="font-semibold text-sm mt-2">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
