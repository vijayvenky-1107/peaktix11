import React, { useState } from 'react';
import { API_BASE } from '../services/api.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' | 'new'

  // Existing User State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // New User State
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Auto-detect whether existing user input is Email or Phone
  const cleanLoginInput = loginIdentifier.trim();
  const detectedType = cleanLoginInput.includes('@')
    ? 'email'
    : cleanLoginInput.replace(/\D/g, '').length === 10
      ? 'phone'
      : cleanLoginInput.length > 0
        ? 'unknown'
        : null;

  // Handle Existing User Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!cleanLoginInput) {
      setErrorMsg('Please enter your phone number or email address.');
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends and receives cookies
        body: JSON.stringify({
          identifier: cleanLoginInput,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid phone/email or password.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Signed in successfully! Loading your entertainment experience...');
      if (data.token) {
        localStorage.setItem('peaktix_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('peaktix_user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to login server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle New User Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Frontend Validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }

    if (!address.trim() || address.trim().length < 3) {
      setErrorMsg('Address must be at least 3 characters.');
      return;
    }

    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.in).');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || !PHONE_REGEX.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!registerPassword || registerPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please recheck your confirm password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fullName.trim(),
          address: address.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          password: registerPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Account created successfully! Redirecting...');
      if (data.token) {
        localStorage.setItem('peaktix_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('peaktix_user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to registration server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        {/* Brand Header */}
        <div style={styles.brandHeader}>
          <div style={styles.logoRow}>
            <div style={styles.logoMark}>▲</div>
            <span style={styles.brandName}>PeakTix</span>
          </div>
          <h1 style={styles.title}>India's Live Entertainment Gateway</h1>
          <p style={styles.subtitle}>
            Please sign in to access movies, concerts, stadium ticket drops, and your bookings.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabBar} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'existing'}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'existing' ? styles.tabBtnActive : {}),
            }}
            onClick={() => {
              setActiveTab('existing');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            Existing User
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'new'}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'new' ? styles.tabBtnActive : {}),
            }}
            onClick={() => {
              setActiveTab('new');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            New User
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div style={styles.errorAlert} role="alert">
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={styles.successAlert} role="status">
            <span style={{ fontSize: 16 }}>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: Existing User Form */}
        {activeTab === 'existing' && (
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            {/* Phone or Email Input */}
            <div style={styles.fieldGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label} htmlFor="login-identifier">
                  Phone Number OR Email Address *
                </label>
                {detectedType === 'email' && (
                  <span style={styles.detectBadgeEmail}>✉️ Email detected</span>
                )}
                {detectedType === 'phone' && (
                  <span style={styles.detectBadgePhone}>📱 Mobile detected</span>
                )}
              </div>
              <input
                id="login-identifier"
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or yourname@example.in"
                style={styles.input}
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

            {/* Password Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="login-password">
                Password *
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={styles.passwordInput}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? '👁️‍🗨️ Hide' : '👁️ Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to PeakTix'}
            </button>
          </form>
        )}

        {/* TAB 2: New User Form */}
        {activeTab === 'new' && (
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            {/* Full Name */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="reg-name">
                Full Name *
              </label>
              <input
                id="reg-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                style={styles.input}
                disabled={loading}
                required
              />
            </div>

            {/* Address */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="reg-address">
                Address (City / Street) *
              </label>
              <input
                id="reg-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Bandra West, Mumbai, Maharashtra"
                style={styles.input}
                disabled={loading}
                required
              />
            </div>

            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="reg-email">
                Email Address *
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. aarav.sharma@example.in"
                style={styles.input}
                disabled={loading}
                required
              />
            </div>

            {/* Phone Number */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="reg-phone">
                Phone Number (10-Digit Indian Mobile) *
              </label>
              <div style={styles.phoneInputWrapper}>
                <span style={styles.prefix}>+91</span>
                <input
                  id="reg-phone"
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  style={styles.phoneInput}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="reg-password">
                Password (Min 8 characters) *
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={styles.passwordInput}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? '👁️‍🗨️ Hide' : '👁️ Show'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="reg-confirm">
                Confirm Password *
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  style={styles.passwordInput}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '👁️‍🗨️ Hide' : '👁️ Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register & Enter PeakTix'}
            </button>
          </form>
        )}

        {/* Security Footer Notice */}
        <div style={styles.securityFooter}>
          <span>🔒 Passwords cryptographically hashed with bcrypt • Secure httpOnly sessions</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080C16',
    padding: '40px 20px',
    boxSizing: 'border-box',
    backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(225, 29, 72, 0.12) 0%, transparent 60%)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: '36px 32px',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
  },
  brandHeader: {
    textAlign: 'center',
    marginBottom: 24,
  },
  logoRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 26,
    fontWeight: 800,
    color: '#F8FAFC',
    letterSpacing: '-0.02em',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.5,
  },
  tabBar: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    background: '#131C31',
    padding: 6,
    borderRadius: 14,
    marginBottom: 24,
  },
  tabBtn: {
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    fontWeight: 700,
    boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    lineHeight: 1.4,
  },
  successAlert: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#34D399',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#CBD5E1',
    letterSpacing: '0.02em',
  },
  detectBadgeEmail: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: 600,
  },
  detectBadgePhone: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: 600,
  },
  input: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#F8FAFC',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  passwordWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '12px 14px',
    color: '#F8FAFC',
    fontSize: 14,
    outline: 'none',
  },
  eyeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    padding: '0 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  phoneInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  prefix: {
    padding: '0 12px',
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 700,
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  },
  phoneInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '12px 14px',
    color: '#F8FAFC',
    fontSize: 14,
    outline: 'none',
    letterSpacing: '0.05em',
  },
  submitBtn: {
    marginTop: 8,
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 6px 20px rgba(225, 29, 72, 0.35)',
  },
  securityFooter: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    lineHeight: 1.5,
  },
};
