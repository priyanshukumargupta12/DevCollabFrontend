import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

/**
 * ForgotPassword Page
 * Renders the email input form to request a password reset email.
 */
const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Sending password reset link…');
    const result = await forgotPassword(email.trim());
    setIsLoading(false);

    if (result.success) {
      toast.success('Reset email sent! Check your inbox. 📧', { id: toastId });
      setIsSent(true);
    } else {
      toast.error(result.message || 'Failed to request reset.', { id: toastId });
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
            Reset Password
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
            {!isSent 
              ? "Enter your email address and we'll send you a link to reset your password."
              : "We've sent a password reset link to your email."}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="forgot-email">Email address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={16} />
                <input
                  id="forgot-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? <Spinner /> : <Mail size={18} />}
              {isLoading ? 'Sending Link…' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              marginBottom: '1rem', color: '#10b981', fontSize: '24px'
            }}>
              📧
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Please check your inbox at <strong>{email}</strong> for instructions to reset your password.
            </p>
          </div>
        )}

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

export default ForgotPassword;
