import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, Calendar, FileText, Users,
  Video, ClipboardList, Clock, LogOut, Activity,
  Stethoscope, Star, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import './Sidebar.css';

const patientNav = [
  { to: '/patient/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patient/profile',         icon: User,            label: 'My Profile' },
  { to: '/patient/find-consultants',icon: Users,           label: 'Find Consultants' },
  { to: '/patient/appointments',    icon: Calendar,        label: 'Appointments' },
  { to: '/patient/calls',           icon: Video,           label: 'Call Sessions' },
  { to: '/patient/medical-history', icon: FileText,        label: 'Medical History' },
];

const consultantNav = [
  { to: '/consultant/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/consultant/profile',      icon: User,            label: 'My Profile' },
  { to: '/consultant/appointments', icon: Calendar,        label: 'Appointments' },
  { to: '/consultant/calls',        icon: Video,           label: 'Call Sessions' },
  { to: '/consultant/prescriptions',icon: ClipboardList,   label: 'Prescriptions' },
  { to: '/consultant/availability', icon: Clock,           label: 'Availability' },
];

const adminNav = [
  { to: '/admin/dashboard',         icon: LayoutDashboard, label: 'Admin Dashboard' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'consultant' ? consultantNav : patientNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={20} />
        </div>
        <div>
          <span className="sidebar-logo-text">RNC</span>
          <span className="sidebar-logo-sub">Health</span>
        </div>
      </div>

      {/* User card */}
      <div className="sidebar-user-card">
        <div className="avatar avatar-md sidebar-avatar">
          {user?.avatar ? <img src={user.avatar} alt={user.full_name} /> : initials}
        </div>
        <div className="sidebar-user-info">
          <p className="sidebar-user-name truncate">{user?.full_name || 'User'}</p>
          <div className="flex-gap-2">
            <span className={`sidebar-role-badge ${user?.role}`}>{user?.role}</span>
            {user?.is_online
              ? <Wifi size={10} className="text-accent" />
              : <WifiOff size={10} className="text-muted" />}
          </div>
        </div>
      </div>

      {/* Nav section */}
      <nav className="sidebar-nav">
        <p className="sidebar-nav-label">
          {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'consultant' ? 'Consultant Panel' : 'Patient Panel'}
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-link-arrow" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user?.role === 'consultant' && (
          <div className="sidebar-verification">
            {user?.is_verified
              ? <span className="badge badge-success"><Star size={10} /> Verified</span>
              : <span className="badge badge-warning">Pending Verification</span>}
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
