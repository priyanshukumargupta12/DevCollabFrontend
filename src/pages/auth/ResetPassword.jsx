import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

/**
 * ResetPassword Page
 * Allows setting a new password if the reset token is valid.
 */
const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      toast.error('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Resetting your password…');
    const result = await resetPassword(token, password);
    setIsLoading(false);

    if (result.success) {
      toast.success('Password reset successfully! Please sign in. 🎉', { id: toastId });
      navigate('/login');
    } else {
      toast.error(result.message || 'Failed to reset password. Link may be expired.', { id: toastId });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand Header */}
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
            Choose New Password
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
            Please enter your new password below to regain access to your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="new-password">New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{ paddingRight: '2.75rem' }}
                autoFocus
              />
              <button type="button" className="input-icon-right"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" className="input-icon-right"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? <Spinner /> : <Lock size={18} />}
            {isLoading ? 'Resetting…' : 'Update Password'}
          </button>
        </form>

        <div className="auth-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
