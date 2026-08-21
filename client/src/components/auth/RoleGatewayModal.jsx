import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RoleGatewayModal() {
  const { isRoleModalOpen, closeRoleModal, selectedRole, signup, resendOtp, verifyOtp, login, user } = useAuth();

  const [activeRole, setActiveRole] = useState('user'); // 'user' | 'landlord' | 'admin'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'otp'

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const clearFieldsOnly = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setOtp('');
    setErrorMsg('');
    setInfoMsg('');
  };

  const resetFormAll = () => {
    clearFieldsOnly();
    setAuthMode('login');
  };

  useEffect(() => {
    if (isRoleModalOpen) {
      resetFormAll();
      if (selectedRole) {
        setActiveRole(selectedRole);
      }
    }
  }, [isRoleModalOpen, selectedRole]);

  if (!isRoleModalOpen) return null;

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    resetFormAll();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await login({ email, password, role: activeRole });
      setLoading(false);
      resetFormAll();
    } catch (err) {
      setLoading(false);
      const data = err.response?.data;
      if (data?.needsOtp) {
        setInfoMsg('Email verification required. Please enter the 5-digit OTP sent to your email.');
        setAuthMode('otp');
      } else {
        setErrorMsg(data?.message || 'Login failed. Please verify your credentials.');
      }
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await signup({
        firstName,
        lastName,
        email,
        password,
        role: activeRole,
      });
      setLoading(false);
      setInfoMsg(`📩 5-digit OTP sent to ${email}. Please check your email inbox (and Spam/Junk folder).`);
      setAuthMode('otp');
    } catch (err) {
      setLoading(false);
      const data = err.response?.data;
      if (data?.alreadyExists) {
        setErrorMsg(data.message);
      } else {
        setErrorMsg(data?.message || 'Signup failed. Please try again.');
      }
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await resendOtp(email);
      setLoading(false);
      setInfoMsg(`📩 A new 5-digit OTP code has been sent to ${email}. Check your email inbox & Spam folder.`);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await verifyOtp(email, otp);
      setLoading(false);
      resetFormAll();
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.message || 'Invalid or expired OTP code.');
    }
  };

  return (
    <div className="modal-overlay" onClick={user ? closeRoleModal : undefined}>
      <div className="role-gateway-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header & Close Button */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">🏠 Welcome to RentEase</h2>
            <p className="modal-subtitle">Select your account role to continue</p>
          </div>
          {user && (
            <button className="modal-close-btn" onClick={closeRoleModal} title="Close Modal">
              ✕
            </button>
          )}
        </div>

        {/* 1. ROLE GATEWAY SELECTOR CARDS */}
        <div className="role-cards-grid">
          <div
            className={`role-card ${activeRole === 'user' ? 'selected' : ''}`}
            onClick={() => handleRoleSelect('user')}
          >
            <div className="role-card-icon">👤</div>
            <div className="role-card-content">
              <h4>Tenant / User</h4>
              <p>Browse listings, schedule viewings, & submit maintenance tickets</p>
            </div>
          </div>

          <div
            className={`role-card ${activeRole === 'landlord' ? 'selected' : ''}`}
            onClick={() => handleRoleSelect('landlord')}
          >
            <div className="role-card-icon">🏠</div>
            <div className="role-card-content">
              <h4>Landlord</h4>
              <p>Post properties, track availability, & manage applications</p>
            </div>
          </div>

          <div
            className={`role-card ${activeRole === 'admin' ? 'selected' : ''}`}
            onClick={() => handleRoleSelect('admin')}
          >
            <div className="role-card-icon">🛡</div>
            <div className="role-card-content">
              <h4>Admin</h4>
              <p>Platform oversight, landlord approvals, & complaint resolution</p>
            </div>
          </div>
        </div>

        {/* 2. AUTHENTICATION TAB CONTROLS */}
        <div className="auth-tabs-bar">
          {activeRole === 'admin' ? (
            <span className="admin-login-only-badge">
              🛡 Admin Mode: Login Only
            </span>
          ) : (
            <>
              <button
                className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { clearFieldsOnly(); setAuthMode('login'); }}
              >
                Log In
              </button>
              <button
                className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => { clearFieldsOnly(); setAuthMode('signup'); }}
              >
                Sign Up
              </button>
              {authMode === 'otp' && (
                <button className="auth-tab-btn active otp-tab">
                  🔑 OTP Verification
                </button>
              )}
            </>
          )}
        </div>

        {/* NOTIFICATIONS & ALERTS */}
        {errorMsg && (
          <div className="auth-alert error-alert">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}
        {infoMsg && (
          <div className="auth-alert info-alert">
            <span>ℹ️ {infoMsg}</span>
          </div>
        )}

        {/* 3. FORMS CONTAINER */}
        <div className="auth-form-container">
          {/* LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder={activeRole === 'admin' ? 'admin@rentease.com' : 'you@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Authenticating...' : `Log In as ${activeRole.toUpperCase()}`}
              </button>
            </form>
          )}

          {/* SIGNUP FORM (USER / LANDLORD) */}
          {authMode === 'signup' && activeRole !== 'admin' && (
            <form onSubmit={handleSignupSubmit} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Sending OTP Email...' : `Sign Up & Verify via Email OTP`}
              </button>
            </form>
          )}

          {/* OTP VERIFICATION FORM */}
          {authMode === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="auth-form otp-form">
              <p className="otp-instructions">
                We sent a 5-digit verification code to <strong>{email}</strong>. Please check your email inbox and enter it below:
              </p>

              <div className="form-group">
                <label>5-Digit OTP Code</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  pattern="\d{5}"
                  placeholder="e.g. 12345"
                  className="otp-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>

              <button type="submit" className="submit-btn success-btn" disabled={loading}>
                {loading ? 'Verifying Code...' : 'Verify OTP & Activate Account'}
              </button>

              <div className="otp-actions-row">
                <button
                  type="button"
                  className="text-link-btn"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  🔄 Didn't receive it? Resend / Get New OTP
                </button>
                <button
                  type="button"
                  className="text-link-btn"
                  onClick={() => setAuthMode('signup')}
                >
                  ← Back to Signup
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
