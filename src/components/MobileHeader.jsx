import { Menu, Activity } from 'lucide-react';
import './MobileHeader.css';

export default function MobileHeader({ onMenuClick }) {
  return (
    <header className="mobile-header">
      <button
        className="mobile-menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        id="mobile-menu-toggle"
      >
        <Menu size={22} />
      </button>

      <div className="mobile-header-logo">
        <div className="mobile-logo-icon">
          <Activity size={16} />
        </div>
        <span className="mobile-logo-text">RNC</span>
        <span className="mobile-logo-sub">Health</span>
      </div>

      {/* Spacer to center logo */}
      <div style={{ width: 40 }} />
    </header>
  );
}
