import { useState, useEffect } from 'react';
import { Activity, Shield, Users, Clock, ArrowRight, Video, Sun, Moon, Star, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { consultantsAPI } from '../services/api';

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await consultantsAPI.list({ available_only: 'false' });
        const doctorList = data.results || data || [];
        setDoctors(doctorList);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (doctors.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % doctors.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [doctors, isHovered]);

  const handlePrev = () => {
    if (doctors.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + doctors.length) % doctors.length);
  };

  const handleNext = () => {
    if (doctors.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % doctors.length);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Self-contained CSS Styles */}
      <style>{`
        .landing-hero-container {
          padding: 60px 48px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .landing-hero-content {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 992px) {
          .landing-hero-content {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .landing-hero-left {
            text-align: center;
          }
          .landing-hero-left h1 {
            text-align: center !important;
          }
          .landing-hero-left p {
            text-align: center !important;
            margin: 0 auto 40px !important;
          }
          .landing-hero-left-actions {
            justify-content: center !important;
          }
        }
        .landing-carousel-wrapper {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-md);
          position: relative;
          overflow: hidden;
          transition: var(--transition);
        }
        .landing-carousel-wrapper:hover {
          border-color: var(--border-strong);
          box-shadow: var(--shadow-glow);
        }
        .landing-carousel-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 20px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .landing-carousel-card-container {
          position: relative;
          min-height: 390px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .landing-doctor-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .landing-doctor-card-img-wrapper {
          position: relative;
          width: 140px;
          height: 140px;
          margin-bottom: 16px;
        }
        .landing-doctor-image {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .landing-doctor-image-placeholder {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: #fff;
          font-size: 3rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .landing-online-indicator {
          position: absolute;
          bottom: 5px;
          right: 5px;
          background: var(--accent);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .landing-doctor-info-section {
          width: 100%;
        }
        .landing-doctor-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .landing-doctor-speciality {
          color: var(--primary);
          font-weight: 600;
          font-size: 0.85rem;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .landing-doctor-details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: var(--bg-base);
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          margin-bottom: 16px;
        }
        .landing-doctor-detail-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .landing-detail-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .landing-detail-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .landing-doctor-bio-peek {
          font-size: 0.8rem;
          font-style: italic;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 16px;
        }
        .landing-book-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: #fff;
          font-weight: 700;
          font-size: 0.875rem;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 14px var(--primary-glow);
          letter-spacing: 0.02em;
        }
        .landing-book-btn:hover {
          opacity: 0.92;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px var(--primary-glow);
        }
        .landing-carousel-nav-btn {
          position: absolute;
          top: 30%;
          transform: translateY(-50%);
          background: rgba(13, 21, 38, 0.8);
          border: 1px solid var(--border-strong);
          color: var(--text-primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
          font-size: 1rem;
          z-index: 10;
        }
        .landing-carousel-nav-btn:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }
        .landing-carousel-nav-btn.prev {
          left: -8px;
        }
        .landing-carousel-nav-btn.next {
          right: -8px;
        }
        @media (max-width: 768px) {
          .landing-carousel-nav-btn.prev {
            left: 2px;
          }
          .landing-carousel-nav-btn.next {
            right: 2px;
          }
        }
        .landing-carousel-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
        }
        .landing-carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--border-strong);
          cursor: pointer;
          transition: var(--transition);
        }
        .landing-carousel-dot.active {
          background: var(--primary);
          width: 16px;
          border-radius: 3px;
        }
        .landing-carousel-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 250px;
        }
        .landing-carousel-card-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 250px;
          color: var(--text-muted);
          font-style: italic;
        }
      `}</style>

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
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/login" className="btn btn-outline">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Join Now</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero-container animate-fadeIn">
        <div className="landing-hero-content">
          <div className="landing-hero-left">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(79,142,247,0.1)', color: 'var(--primary)', borderRadius: 999, fontSize: '0.875rem', fontWeight: 600, marginBottom: 32 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', animation: 'pulse 2s infinite' }} />
              Live Consultations Available
            </div>
            <h1 style={{ fontSize: '3.8rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24, background: 'linear-gradient(to right, #f0f4ff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'left' }}>
              Modern Healthcare,<br />Designed for You.
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 40, maxWidth: 600, textAlign: 'left' }}>
              Connect with world-class specialists, manage your medical history, and get care from anywhere.
            </p>
            <div className="landing-hero-left-actions" style={{ display: 'flex', gap: 16, justifyContent: 'flex-start' }}>
              <Link to="/register" className="btn btn-primary btn-lg">Get Started <ArrowRight size={20} /></Link>
              <Link to="/login" className="btn btn-outline btn-lg">For Consultants</Link>
            </div>
          </div>

          <div className="landing-hero-right">
            <div className="landing-carousel-wrapper" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
              <h2 className="landing-carousel-title">available doctors on the platform</h2>
              {loading ? (
                <div className="landing-carousel-loading">
                  <div className="loading-spinner" />
                </div>
              ) : doctors.length === 0 ? (
                <div className="landing-carousel-card-empty">
                  <p>Connecting with doctors...</p>
                </div>
              ) : (
                <div className="landing-carousel-card-container">
                  <div className="landing-doctor-card">
                    <div className="landing-doctor-card-img-wrapper">
                      {doctors[currentIndex].avatar_url ? (
                        <img src={doctors[currentIndex].avatar_url} alt={doctors[currentIndex].user?.full_name} className="landing-doctor-image" />
                      ) : (
                        <div className="landing-doctor-image-placeholder">
                          {doctors[currentIndex].user?.first_name?.[0] || 'D'}
                        </div>
                      )}
                      {doctors[currentIndex].is_available && (
                        <span className="landing-online-indicator">● Active</span>
                      )}
                    </div>
                    <div className="landing-doctor-info-section">
                      <h3 className="landing-doctor-name">Dr. {doctors[currentIndex].user?.full_name || `${doctors[currentIndex].user?.first_name} ${doctors[currentIndex].user?.last_name}`}</h3>
                      <p className="landing-doctor-speciality">{doctors[currentIndex].speciality?.name || 'General Practice'}</p>
                      
                      <div className="landing-doctor-details-grid">
                        <div className="landing-doctor-detail-item">
                          <span className="landing-detail-label">Experience</span>
                          <span className="landing-detail-val">{doctors[currentIndex].years_of_experience} Yrs</span>
                        </div>
                        <div className="landing-doctor-detail-item">
                          <span className="landing-detail-label">Fee</span>
                          <span className="landing-detail-val">₹{doctors[currentIndex].consultation_fee}</span>
                        </div>
                        <div className="landing-doctor-detail-item">
                          <span className="landing-detail-label">Rating</span>
                          <span className="landing-detail-val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            {parseFloat(doctors[currentIndex].rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      
                      {doctors[currentIndex].bio && (
                        <p className="landing-doctor-bio-peek">
                          "{doctors[currentIndex].bio.slice(0, 100)}{doctors[currentIndex].bio.length > 100 ? '...' : ''}"
                        </p>
                      )}
                      <Link to="/login" className="landing-book-btn">
                        <CalendarPlus size={16} />
                        Book Appointment
                      </Link>
                    </div>
                  </div>

                  <button className="landing-carousel-nav-btn prev" onClick={handlePrev} aria-label="Previous Doctor">
                    &lt;
                  </button>
                  <button className="landing-carousel-nav-btn next" onClick={handleNext} aria-label="Next Doctor">
                    &gt;
                  </button>

                  <div className="landing-carousel-dots">
                    {doctors.map((_, idx) => (
                      <span
                        key={idx}
                        className={`landing-carousel-dot ${idx === currentIndex ? 'active' : ''}`}
                        onClick={() => setCurrentIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
