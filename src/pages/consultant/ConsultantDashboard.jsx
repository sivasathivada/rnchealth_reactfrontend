import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { consultantsAPI } from '../../services/api';
import {
  Calendar, Video, Users, Star, TrendingUp,
  CheckCircle, Clock, ToggleLeft, ToggleRight,
  ChevronRight, Activity, DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ConsultantDashboard() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    consultantsAPI.myProfile()
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAvailability = async () => {
    setToggling(true);
    try {
      const { data } = await consultantsAPI.toggleAvailability();
      setProfile(p => ({ ...p, is_available: data.is_available }));
    } catch {}
    finally { setToggling(false); }
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <div className="loading-inline"><div className="loading-spinner" /></div>;

  const stats = [
    { label: 'Total Consultations', value: profile?.total_consultations ?? 0, icon: Users,       color: 'primary' },
    { label: 'Rating',              value: `${parseFloat(profile?.rating || 0).toFixed(1)}/5`, icon: Star, color: 'warning' },
    { label: 'Total Reviews',       value: profile?.total_reviews ?? 0,       icon: TrendingUp,  color: 'accent' },
    { label: 'Consult. Fee',        value: `₹${profile?.consultation_fee ?? 0}`, icon: DollarSign, color: 'danger' },
  ];

  return (
    <div className="page-container animate-fadeIn">
      {/* Hero */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <h1>{greet()}, Dr. {user?.first_name}! 👋</h1>
          <p>Manage your consultations and patient care</p>
        </div>
        <div className="flex-gap-2">
          <button
            className={`btn ${profile?.is_available ? 'btn-accent' : 'btn-outline'}`}
            onClick={handleToggleAvailability}
            disabled={toggling}
          >
            {profile?.is_available
              ? <><ToggleRight size={18} /> Available</>
              : <><ToggleLeft size={18} /> Go Available</>}
          </button>
          <Link to="/consultant/profile" className="btn btn-outline">Edit Profile</Link>
        </div>
      </div>

      {/* Verification banner */}
      {!profile?.is_verified && (
        <div className="alert alert-warning mb-6">
          <CheckCircle size={18} />
          Your profile is pending admin verification. It will be visible to patients once approved.
        </div>
      )}
      {!user?.is_verified && (
        <div className="alert alert-danger mb-6">
          <Activity size={18} />
          Please verify your email address to access all features.
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
        {/* Profile Summary */}
        <div className="card">
          <div className="flex-between mb-4">
            <h2 className="card-title">Profile Overview</h2>
            <Link to="/consultant/profile" className="btn btn-outline btn-sm">Edit <ChevronRight size={14} /></Link>
          </div>
          {profile ? (
            <div className="profile-summary">
              <div className="profile-row"><span>Speciality</span><span className="badge badge-primary">{profile.speciality?.name || '—'}</span></div>
              <div className="profile-row"><span>Experience</span><span>{profile.years_of_experience} years</span></div>
              <div className="profile-row"><span>License #</span><span className="text-sm">{profile.license_number || '—'}</span></div>
              <div className="profile-row"><span>Session Duration</span><span>{profile.consultation_duration} min</span></div>
              <div className="profile-row"><span>Consult. Type</span><span className="capitalize">{profile.consultation_types}</span></div>
              <div className="profile-row">
                <span>Status</span>
                <span className={`badge ${profile.is_verified ? 'badge-success' : 'badge-warning'}`}>
                  {profile.is_verified ? '✓ Verified' : 'Pending'}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-muted text-sm">No profile yet.</p>
              <Link to="/consultant/profile" className="btn btn-primary btn-sm mt-2">Setup Profile</Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="card-title mb-4">Quick Actions</h2>
          <div className="grid-2">
            {[
              { to: '/consultant/appointments', icon: Calendar, label: 'Appointments',  color: 'primary' },
              { to: '/consultant/calls',        icon: Video,    label: 'Call Sessions', color: 'accent' },
              { to: '/consultant/prescriptions',icon: Activity, label: 'Prescriptions', color: 'warning' },
              { to: '/consultant/availability', icon: Clock,    label: 'Availability',  color: 'danger' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={to} to={to} className="quick-action-card">
                <div className={`stat-icon ${color}`}><Icon size={20} color="#fff" /></div>
                <p className="font-semibold text-sm mt-2">{label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
