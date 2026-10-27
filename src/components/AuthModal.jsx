import React, { useState } from 'react';
import { sendOtp, verifyOtp } from '../services/api';

/**
 * Authentication Modal supporting Email or Indian Phone Number with OTP verification.
 */
export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [step, setStep] = useState('INPUT'); // 'INPUT' | 'OTP'
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    const clean = target.trim();
    if (!clean) {
      setError('Please enter your email or 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(clean, name);
      if (!res.success) {
        setError(res.error || 'Failed to dispatch verification code.');
        setLoading(false);
        return;
      }
      setDevOtpHint(res.devOtpHint || '');
      setStep('OTP');
    } catch (err) {
      setError(err.message || 'Network error sending verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp({
        target: target.trim(),
        code: otpCode.trim(),
        name: name.trim(),
      });

      if (!res.success) {
        setError(res.error || 'Verification code failed.');
        setLoading(false);
        return;
      }

      // Save token to localStorage
      if (res.token) {
        localStorage.setItem('peaktix_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('peaktix_user', JSON.stringify(res.user));
      }

      onAuthSuccess(res.user, res.token);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('INPUT');
    setTarget('');
    setName('');
    setOtpCode('');
    setDevOtpHint('');
    setError(null);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <span style={styles.badge}>SECURE ACCESS</span>
            <h2 style={styles.title}>
              {step === 'INPUT' ? 'Sign In / Register' : 'Enter Verification Code'}
            </h2>
            <p style={styles.subtitle}>
              {step === 'INPUT'
                ? 'Access your tickets, fast checkout, and exclusive entertainment offers.'
                : `We sent a 6-digit code to ${target}`}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={handleClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert} role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {step === 'INPUT' ? (
          <form onSubmit={handleSendOtp} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="auth-name">Your Full Name (Optional for existing users)</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="auth-target">Email Address or 10-Digit Mobile Number *</label>
              <input
                id="auth-target"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="name@example.com or 9876543210"
                required
                style={styles.input}
                autoFocus
              />
              <span style={styles.helperText}>
                No password required. We verify you safely via a one-time passcode.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.primaryBtn,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending Code...' : 'Continue with OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            {devOtpHint && (
              <div style={styles.devHintBox}>
                <div style={styles.devHintTitle}>🛠️ Development Mode Test OTP:</div>
                <div style={styles.devHintCode}>{devOtpHint}</div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint)}
                  style={styles.devAutoFillBtn}
                >
                  Click to Auto-fill Code
                </button>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="auth-code">6-Digit One-Time Code *</label>
              <input
                id="auth-code"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                style={{ ...styles.input, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                autoFocus
              />
            </div>

            <div style={styles.btnRow}>
              <button
                type="button"
                onClick={() => setStep('INPUT')}
                style={styles.secondaryBtn}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ ...styles.primaryBtn, flex: 2, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </form>
        )}

        <div style={styles.footerNote}>
          🔒 By continuing, you agree to PeakTix Terms of Service. Unofficial demo platform.
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    maxWidth: '460px',
    width: '100%',
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    color: '#F8FAFC',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    marginBottom: '0.4rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    margin: '0 0 0.3rem 0',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0.4rem',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#FCA5A5',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.88rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#CBD5E1',
  },
  input: {
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#FFFFFF',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#64748B',
  },
  primaryBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s ease',
  },
  secondaryBtn: {
    backgroundColor: '#1E293B',
    color: '#CBD5E1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  devHintBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px dashed #10B981',
    borderRadius: '8px',
    padding: '0.75rem',
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  devHintTitle: {
    fontSize: '0.75rem',
    color: '#34D399',
    fontWeight: '600',
    marginBottom: '0.2rem',
  },
  devHintCode: {
    fontSize: '1.4rem',
    fontWeight: '800',
    letterSpacing: '0.2em',
    color: '#FFFFFF',
    margin: '0.2rem 0',
  },
  devAutoFillBtn: {
    backgroundColor: '#10B981',
    color: '#022C22',
    border: 'none',
    borderRadius: '4px',
    padding: '0.3rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  footerNote: {
    marginTop: '1.5rem',
    fontSize: '0.72rem',
    color: '#64748B',
    textAlign: 'center',
  },
};
