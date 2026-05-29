import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, ShieldCheck, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

const OTP_LENGTH = 6;

/**
 * OTPVerification Page
 * Handles email OTP verification.
 * Receives { identifier: email } via router location.state.
 */
const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendEmailOTP, verifyEmailOTP } = useAuth();

  // Email passed from Login/Register via navigate state
  const { identifier = '' } = location.state || {};

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  // Masked email for display: ab***@example.com
  const maskedEmail = identifier
    ? identifier.replace(/(.{2}).*(@.*)/, '$1***$2')
    : '';

  // Redirect if no identifier was passed
  useEffect(() => {
    if (!identifier) {
      toast.error('Session expired. Please try again.');
      navigate('/login');
    }
  }, [identifier, navigate]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Input handlers ────────────────────────────────────────────────
  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = [...digits];
    [...pasted].forEach((char, i) => { newDigits[i] = char; });
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length - 1, OTP_LENGTH - 1)]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify ────────────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) {
      toast.error('Please enter the complete 6-digit code.');
      return;
    }
    setIsVerifying(true);
    const toastId = toast.loading('Verifying code…');
    const result = await verifyEmailOTP(identifier, otp);
    setIsVerifying(false);
    if (result.success) {
      toast.success('Verified! Welcome to DevCollab 🚀', { id: toastId });
      navigate('/dashboard');
    } else {
      toast.error(result.message, { id: toastId });
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [digits, identifier, verifyEmailOTP, navigate]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (digits.every((d) => d !== '') && !isVerifying) {
      handleVerify();
    }
  }, [digits, isVerifying, handleVerify]);

  // ── Resend ────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    const toastId = toast.loading('Resending code…');
    const result = await sendEmailOTP(identifier);
    setIsResending(false);
    if (result.success) {
      toast.success('New code sent!', { id: toastId });
      setDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(60);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } else {
      toast.error(result.message, { id: toastId });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── Brand ─────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--gradient-brand)', marginBottom: '1rem',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Mail size={24} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em', marginBottom: '0.375rem',
          }}>
            Check your email
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--color-text-secondary)' }}>{maskedEmail}</strong>
          </p>
        </div>

        {/* ── 6-box OTP Input ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.75rem' }}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              id={`otp-digit-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isVerifying}
              style={{
                width: 52, height: 60,
                textAlign: 'center',
                fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-sans)',
                background: digit ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${digit ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12, color: 'var(--color-text-primary)',
                outline: 'none', transition: 'all 0.2s ease',
                caretColor: 'var(--color-accent)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139,92,246,0.8)';
                e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = digit ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          ))}
        </div>

        {/* ── Verify Button ──────────────────────────────────────── */}
        <button
          id="otp-verify-btn"
          className="btn-primary"
          onClick={handleVerify}
          disabled={isVerifying || digits.join('').length < OTP_LENGTH}
        >
          {isVerifying ? <Spinner /> : <ShieldCheck size={18} />}
          {isVerifying ? 'Verifying…' : 'Verify Code'}
        </button>

        {/* ── Resend ─────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          {canResend ? (
            <button
              id="otp-resend-btn"
              onClick={handleResend}
              disabled={isResending}
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-accent-light)',
                fontSize: '0.875rem', fontWeight: 500,
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', gap: '0.375rem',
                fontFamily: 'var(--font-sans)', padding: 0,
                transition: 'color 0.2s',
              }}
            >
              {isResending ? <><Spinner /> Resending…</> : <><RefreshCw size={14} /> Resend code</>}
            </button>
          ) : (
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Resend code in{' '}
              <strong style={{ color: 'var(--color-text-secondary)' }}>{countdown}s</strong>
            </span>
          )}
        </div>

        {/* ── Back link ──────────────────────────────────────────── */}
        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem',
          }}>
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
