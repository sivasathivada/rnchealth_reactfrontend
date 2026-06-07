import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, Calendar, FileText,
  Users, Video, ClipboardList, Clock
} from 'lucide-react';
import './MobileBottomNav.css';

const patientBottomNav = [
  { to: '/patient/dashboard',        icon: LayoutDashboard, label: 'Home' },
  { to: '/patient/find-consultants', icon: Users,           label: 'Find' },
  { to: '/patient/appointments',     icon: Calendar,        label: 'Appts' },
  { to: '/patient/calls',            icon: Video,           label: 'Calls' },
  { to: '/patient/profile',          icon: User,            label: 'Profile' },
];

const consultantBottomNav = [
  { to: '/consultant/dashboard',     icon: LayoutDashboard, label: 'Home' },
  { to: '/consultant/appointments',  icon: Calendar,        label: 'Appts' },
  { to: '/consultant/calls',         icon: Video,           label: 'Calls' },
  { to: '/consultant/prescriptions', icon: ClipboardList,   label: 'Rx' },
  { to: '/consultant/profile',       icon: User,            label: 'Profile' },
];

const adminBottomNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
];

export default function MobileBottomNav() {
  const { user } = useAuth();

  const navItems =
    user?.role === 'admin'      ? adminBottomNav :
    user?.role === 'consultant' ? consultantBottomNav :
                                  patientBottomNav;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
