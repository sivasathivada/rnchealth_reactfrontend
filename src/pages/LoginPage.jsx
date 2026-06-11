import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Activity, User, Stethoscope, ArrowRight, Loader } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import './Auth.css';

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(user.role === 'consultant' ? '/consultant/dashboard' : '/patient/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const user = await googleLogin({ token: credential, role: 'patient' });
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(user.role === 'consultant' ? '/consultant/dashboard' : '/patient/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errorMsg) => {
    setError(errorMsg || 'Google sign-in failed.');
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-container animate-fadeIn">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon"><Activity size={24} /></div>
          <div>
            <span className="auth-brand-name">RNC</span><span className="auth-brand-accent">Health</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button type="button" className="input-eye" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? <><Loader size={18} className="spin" /> Signing in…</> : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="divider-text">or</div>

          <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register" className="auth-link">Create account</Link></p>
          </div>
        </div>

        {/* Role indicator cards */}
        <div className="auth-role-cards">
          <div className="auth-role-card">
            <User size={18} />
            <div>
              <p className="font-semibold text-sm">Patient</p>
              <p className="text-xs text-muted">Book & manage appointments</p>
            </div>
          </div>
          <div className="auth-role-card">
            <Stethoscope size={18} />
            <div>
              <p className="font-semibold text-sm">Consultant</p>
              <p className="text-xs text-muted">Manage your practice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
