import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Code2, ChevronRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

/**
 * Login Page
 * Supports three auth methods: Google OAuth, Email OTP, Email + Password.
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, googleLogin, sendEmailOTP } = useAuth();

  // ── Email/Password form ────────────────────────────────────────────
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Email OTP inline panel ─────────────────────────────────────────
  const [showOTPPanel, setShowOTPPanel] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  // ── Google ─────────────────────────────────────────────────────────
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Email/Password submit ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const toastId = toast.loading('Signing you in…');
    const result = await login(formData);
    setIsLoading(false);
    if (result.success) {
      toast.success('Welcome back! 🎉', { id: toastId });
      navigate('/dashboard');
    } else {
      toast.error(result.message, { id: toastId });
    }
  };

  // ── Google credential handler ──────────────────────────────────────
  const handleGoogleCredential = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      toast.error('Google sign-in was cancelled.');
      return;
    }
    setIsGoogleLoading(true);
    const toastId = toast.loading('Signing in with Google…');
    const result = await googleLogin(credentialResponse.credential);
    setIsGoogleLoading(false);
    if (result.success) {
      toast.success('Signed in with Google! 🎉', { id: toastId });
      navigate('/dashboard');
    } else {
      toast.error(result.message, { id: toastId });
    }
  };

  // ── Email OTP: send and redirect ──────────────────────────────────
  const handleSendOTP = async () => {
    if (!otpEmail.trim() || !/^\S+@\S+\.\S+$/.test(otpEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setIsSendingOTP(true);
    const toastId = toast.loading('Sending verification code…');
    const result = await sendEmailOTP(otpEmail.trim());
    setIsSendingOTP(false);
    if (result.success) {
      toast.success(result.message, { id: toastId });
      navigate('/verify-otp', { state: { identifier: otpEmail.trim() } });
    } else {
      toast.error(result.message, { id: toastId });
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────
  const divider = (label) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      margin: '1.25rem 0', color: 'var(--color-text-muted)',
      fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      <span>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── Brand ──────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--gradient-brand)', marginBottom: '1rem',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Code2 size={26} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '1.625rem', fontWeight: 800,
            color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: '0.25rem',
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Sign in to your developer account
          </p>
        </div>

        {/* ── Google Sign-In ────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          {isGoogleLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,11,15,0.75)', borderRadius: 12,
            }}>
              <Spinner />
            </div>
          )}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <GoogleLogin
              onSuccess={handleGoogleCredential}
              onError={() => toast.error('Google sign-in failed. Please try again.')}
              theme="filled_black"
              shape="rectangular"
              width={360}
              text="signin_with"
            />
          </div>
        </div>

        {divider('or continue with email OTP')}

        {/* ── Email OTP panel ───────────────────────────────────── */}
        {!showOTPPanel ? (
          <button
            id="login-email-otp-btn"
            onClick={() => setShowOTPPanel(true)}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: 12, color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem', fontWeight: 500, fontFamily: 'var(--font-sans)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem',
              transition: 'all 0.2s ease', marginBottom: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)';
              e.currentTarget.style.background = 'rgba(139,92,246,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
          >
            <Mail size={18} color="var(--color-accent-light)" />
            Continue with Email OTP
            <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </button>
        ) : (
          <div style={{
            background: 'rgba(139,92,246,0.06)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 14, padding: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📧 Email OTP
              </span>
              <button
                onClick={() => { setShowOTPPanel(false); setOtpEmail(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>
            <div className="input-wrapper" style={{ marginBottom: '0.75rem' }}>
              <Mail className="input-icon" size={16} />
              <input
                id="otp-email-input"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                disabled={isSendingOTP}
                autoFocus
              />
            </div>
            <button id="send-otp-btn" className="btn-primary" onClick={handleSendOTP} disabled={isSendingOTP}>
              {isSendingOTP ? <Spinner /> : <Mail size={16} />}
              {isSendingOTP ? 'Sending…' : 'Send Verification Code'}
            </button>
          </div>
        )}

        {divider('or sign in with password')}

        {/* ── Email/Password form ───────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} />
              <input
                id="login-email" name="email" type="email" autoComplete="email"
                className="form-input" placeholder="you@example.com"
                value={formData.email} onChange={handleChange} disabled={isLoading}
              />
            </div>
            {errors.email && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{errors.email}</span>}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-accent-light)', textDecoration: 'none', marginBottom: '0.375rem' }}>
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                id="login-password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" className="form-input"
                placeholder="••••••••" value={formData.password}
                onChange={handleChange} disabled={isLoading}
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" className="input-icon-right"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{errors.password}</span>}
          </div>

          <button id="login-submit-btn" type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            {isLoading ? <Spinner /> : <LogIn size={18} />}
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}<Link to="/register">Create one free</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
