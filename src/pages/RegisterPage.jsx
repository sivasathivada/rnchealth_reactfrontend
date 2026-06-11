import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Activity, User, Stethoscope, ArrowRight, Loader, CheckCircle } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import './Auth.css';

const ROLES = [
  { value: 'patient',    icon: User,          label: 'Patient',    desc: 'Book consultations & manage health' },
  { value: 'consultant', icon: Stethoscope,   label: 'Consultant', desc: 'Provide medical consultations' },
];

export default function RegisterPage() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', password_confirmation: '', role: 'patient',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === 'consultant' ? '/consultant/dashboard' : '/patient/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === 'object') {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs);
      } else {
        setError(data?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const user = await googleLogin({ token: credential, role: form.role });
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(user.role === 'consultant' ? '/consultant/dashboard' : '/patient/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errorMsg) => {
    setError(errorMsg || 'Google registration failed.');
  };

  const update = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-container auth-container-wide animate-fadeIn">
        <div className="auth-brand">
          <div className="auth-brand-icon"><Activity size={24} /></div>
          <div>
            <span className="auth-brand-name">RNC</span><span className="auth-brand-accent">Health</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h1>Create your account</h1>
            <p>Join thousands managing their health smarter</p>
          </div>

          {/* Role selector */}
          <div className="role-selector">
            {ROLES.map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                type="button"
                className={`role-option ${form.role === value ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, role: value }))}
              >
                <Icon size={20} />
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
                {form.role === value && <CheckCircle size={16} className="role-check" />}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">First name</label>
                <input className="form-input" placeholder="John" value={form.first_name} onChange={update('first_name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last name</label>
                <input className="form-input" placeholder="Doe" value={form.last_name} onChange={update('last_name')} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min 8 chars"
                    value={form.password}
                    onChange={update('password')}
                    required minLength={8}
                  />
                  <button type="button" className="input-eye" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Repeat password"
                  value={form.password_confirmation}
                  onChange={update('password_confirmation')}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? <><Loader size={18} className="spin" /> Creating account…</> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="divider-text">or</div>

          <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
