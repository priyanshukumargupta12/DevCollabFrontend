import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, Code2, ChevronRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

/**
 * Register Page
 * Supports three auth methods: Google OAuth, Email OTP, Email + Password.
 */
const Register = () => {
  const navigate = useNavigate();
  const { register, googleLogin, sendEmailOTP } = useAuth();

  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [showOTPPanel, setShowOTPPanel] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    else if (formData.username.trim().length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const toastId = toast.loading('Creating your account…');
    const { username, email, password } = formData;
    const result = await register({ username, email, password });
    setIsLoading(false);
    if (result.success) {
      toast.success('Account created! Welcome aboard 🚀', { id: toastId });
      navigate('/dashboard');
    } else {
      toast.error(result.message, { id: toastId });
    }
  };

  // Password strength indicator
  const getStrength = (pwd) => {
    if (!pwd) return { label: '', color: 'transparent', width: '0%' };
    if (pwd.length < 6) return { label: 'Too short', color: 'var(--color-error)', width: '20%' };
    if (pwd.length < 8) return { label: 'Weak', color: 'var(--color-warning)', width: '45%' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd))
      return { label: 'Strong', color: 'var(--color-success)', width: '100%' };
    return { label: 'Good', color: '#3b82f6', width: '70%' };
  };
  const strength = getStrength(formData.password);

  // Google handler
  const handleGoogleCredential = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      toast.error('Google sign-up was cancelled.');
      return;
    }
    setIsGoogleLoading(true);
    const toastId = toast.loading('Signing up with Google…');
    const result = await googleLogin(credentialResponse.credential);
    setIsGoogleLoading(false);
    if (result.success) {
      toast.success('Account created with Google! 🎉', { id: toastId });
      navigate('/dashboard');
    } else {
      toast.error(result.message, { id: toastId });
    }
  };

  // Email OTP handler
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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
            Create account
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Join the developer collaboration platform
          </p>
        </div>

        {/* ── Google Sign-Up ────────────────────────────────────── */}
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
              onError={() => toast.error('Google sign-up failed. Please try again.')}
              theme="filled_black"
              shape="rectangular"
              width={360}
              text="signup_with"
            />
          </div>
        </div>

        {divider('or register with email OTP')}

        {/* ── Email OTP panel ───────────────────────────────────── */}
        {!showOTPPanel ? (
          <button
            id="reg-email-otp-btn"
            onClick={() => setShowOTPPanel(true)}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: 12, color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem', fontWeight: 500, fontFamily: 'var(--font-sans)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '0.625rem', transition: 'all 0.2s ease',
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
            Register with Email OTP
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
                id="reg-otp-email"
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
            <button id="reg-send-otp-btn" className="btn-primary" onClick={handleSendOTP} disabled={isSendingOTP}>
              {isSendingOTP ? <Spinner /> : <Mail size={16} />}
              {isSendingOTP ? 'Sending…' : 'Send Verification Code'}
            </button>
          </div>
        )}

        {divider('or register with password')}

        {/* ── Email/Password form ───────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <div className="input-wrapper">
              <User className="input-icon" size={16} />
              <input id="reg-username" name="username" type="text" autoComplete="username"
                className="form-input" placeholder="cooldevuser"
                value={formData.username} onChange={handleChange} disabled={isLoading} />
            </div>
            {errors.username && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{errors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} />
              <input id="reg-email" name="email" type="email" autoComplete="email"
                className="form-input" placeholder="you@example.com"
                value={formData.email} onChange={handleChange} disabled={isLoading} />
            </div>
            {errors.email && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input id="reg-password" name="password"
                type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                className="form-input" placeholder="Min. 6 characters"
                value={formData.password} onChange={handleChange} disabled={isLoading}
                style={{ paddingRight: '2.75rem' }} />
              <button type="button" className="input-icon-right" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formData.password && (
              <div>
                <div style={{ height: 4, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden', marginTop: '0.375rem' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 999, transition: 'all 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: strength.color, display: 'block', marginTop: '0.2rem' }}>{strength.label}</span>
              </div>
            )}
            {errors.password && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input id="reg-confirm" name="confirmPassword"
                type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                className="form-input" placeholder="Repeat your password"
                value={formData.confirmPassword} onChange={handleChange} disabled={isLoading}
                style={{ paddingRight: '2.75rem' }} />
              <button type="button" className="input-icon-right" onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <span style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{errors.confirmPassword}</span>}
          </div>

          <button id="register-submit-btn" type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            {isLoading ? <Spinner /> : <UserPlus size={18} />}
            {isLoading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in instead</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
