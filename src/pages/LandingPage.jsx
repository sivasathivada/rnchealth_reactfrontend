import { Activity, Shield, Users, Clock, ArrowRight, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 48px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 20px var(--primary-glow)' }}>
            <Activity size={24} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            RNC<span style={{ color: 'var(--primary)' }}>Health</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" className="btn btn-outline">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Join Now</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '80px 48px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }} className="animate-fadeIn">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(79,142,247,0.1)', color: 'var(--primary)', borderRadius: 999, fontSize: '0.875rem', fontWeight: 600, marginBottom: 32 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', animation: 'pulse 2s infinite' }} />
          Live Consultations Available
        </div>
        <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24, background: 'linear-gradient(to right, #f0f4ff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Modern Healthcare,<br />Designed for You.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: 40, maxWidth: 640, margin: '0 auto 40px' }}>
          Connect with world-class specialists, manage your medical history, and get care from anywhere.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary btn-lg">Get Started <ArrowRight size={20} /></Link>
          <Link to="/login" className="btn btn-outline btn-lg">For Consultants</Link>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {[
          { icon: Video, color: 'primary', title: 'Video Consultations', desc: 'Secure, high-quality video calls with your doctors anywhere, anytime.' },
          { icon: Users, color: 'accent', title: 'Expert Specialists', desc: 'Access to a vetted network of top healthcare professionals.' },
          { icon: Shield, color: 'warning', title: 'Private & Secure', desc: 'Your medical history and data are encrypted and strictly confidential.' },
          { icon: Clock, color: 'danger', title: '24/7 Availability', desc: 'Book appointments instantly based on live availability.' },
        ].map((f, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div className={`stat-icon ${f.color}`} style={{ margin: '0 auto 20px', width: 64, height: 64 }}><f.icon size={28} color="#fff" /></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
