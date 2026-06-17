import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Check, X, KeyRound, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1: Email/ID, 2: OTP, 3: New Password, 4: Success
  const [emailOrId, setEmailOrId] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer for OTP expiry
  const [timer, setTimer] = useState(300); // 5 minutes
  const [resendTimer, setResendTimer] = useState(60); // 60s cooldown for resending
  
  const otpRefs = [
    useRef(null), useRef(null), useRef(null), 
    useRef(null), useRef(null), useRef(null)
  ];

  // Tick timers
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
        setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Format timer helper
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Real-time password criteria
  const criteria = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    match: newPassword === confirmPassword && newPassword !== '',
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  // Step 1: Submit Email/ID
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!emailOrId.trim()) {
      setError('Please enter your Corporate Email or Employee ID.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId: emailOrId.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request code.');
      }

      // Automatically display the OTP for local dev/testing
      if (data.otpCode) {
        console.log(`[TESTING OTP] OTP code is: ${data.otpCode}`);
      }

      setStep(2);
      setTimer(300);
      setResendTimer(60);
      setOtpValues(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Inputs handling
  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return; // numbers only
    
    const newValues = [...otpValues];
    newValues[index] = value.substring(value.length - 1);
    setOtpValues(newValues);

    // Auto focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length === 6 && /^\d+$/.test(pastedData)) {
      const chars = pastedData.split('');
      setOtpValues(chars);
      otpRefs[5].current.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (timer === 0) {
      setError('The verification code has expired. Please request a new one.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId: emailOrId.trim(), otpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify code.');
      }

      setOtpToken(data.resetToken);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please make sure your new password meets all security requirements.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrId: emailOrId.trim(),
          resetToken: otpToken,
          newPassword
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.modalBg}>
      <div className="glass-panel" style={styles.modalBody}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="var(--primary-light)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {step === 4 ? 'Password Restored' : 'Recover Account'}
            </h3>
          </div>
          {step !== 4 && (
            <button onClick={onClose} style={styles.closeBtn} title="Close">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Error Container */}
        {error && (
          <div style={styles.errorContainer}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Request OTP Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <p style={styles.desc}>
              Enter your Corporate Email or Employee ID. We will generate a secure OTP code to verify your identity.
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Corporate Email or Employee ID</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="e.g. name@company.com or 1001"
                  value={emailOrId}
                  onChange={e => setEmailOrId(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '44px' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={styles.submitBtn}>
              {isSubmitting ? <div style={styles.spinner} /> : <><span>Generate Code</span><ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <p style={styles.desc}>
              A 6-digit verification code was generated. Please enter it below.
            </p>
            
            {/* 6 digits input grid */}
            <div style={styles.otpGrid}>
              {otpValues.map((val, idx) => (
                <input
                  key={idx}
                  ref={otpRefs[idx]}
                  type="text"
                  maxLength="1"
                  value={val}
                  onChange={e => handleOtpChange(e.target.value, idx)}
                  onKeyDown={e => handleOtpKeyDown(e, idx)}
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  style={styles.otpBox}
                  className="glass-input"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <div style={styles.timerRow}>
              <span style={{ color: timer < 60 ? 'var(--danger)' : 'var(--text-muted)' }}>
                Code expires in: <strong>{formatTimer(timer)}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={resendTimer > 0 || isSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--primary-light)',
                  cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={13} />
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={styles.submitBtn}>
              {isSubmitting ? <div style={styles.spinner} /> : <><span>Verify Code</span><ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {/* Step 3: Choose New Password Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <p style={styles.desc}>
              Please choose a new, secure password. Your password cannot be any of your previous 3 passwords.
            </p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  required
                />
              </div>
            </div>

            {/* Checklist */}
            <div style={styles.checklist}>
              <div style={styles.checklistTitle}>Password Requirements:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: '8+ Characters', met: criteria.length },
                  { label: 'Uppercase Letter', met: criteria.upper },
                  { label: 'Lowercase Letter', met: criteria.lower },
                  { label: 'Contains Number', met: criteria.number },
                  { label: 'Special Character', met: criteria.special },
                  { label: 'Passwords Match', met: criteria.match },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                    <span style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: item.met ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      color: item.met ? '#10b981' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span style={{ color: item.met ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={!isPasswordValid || isSubmitting} className="btn-primary" style={styles.submitBtn}>
              {isSubmitting ? <div style={styles.spinner} /> : <><span>Reset Password</span><Check size={16} /></>}
            </button>
          </form>
        )}

        {/* Step 4: Success state */}
        {step === 4 && (
          <div style={styles.successWrapper}>
            <div style={styles.successCircle}>
              <Check size={42} strokeWidth={3} />
            </div>
            <h4 style={{ margin: '16px 0 8px 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Password Reset Complete
            </h4>
            <p style={{ ...styles.desc, textAlign: 'center', marginBottom: '24px' }}>
              Your account password has been successfully updated. You can now use your new password to sign in to the Employee Portal.
            </p>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  modalBg: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999, padding: '24px'
  },
  modalBody: {
    width: '100%', maxWidth: '440px',
    padding: '28px 32px',
    animation: 'fadeIn 0.25s ease'
  },
  modalHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: '22px'
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', padding: '4px',
    transition: 'color 0.2s'
  },
  desc: {
    fontSize: '0.85rem', color: 'var(--text-secondary)',
    lineHeight: '1.5', margin: '0 0 16px 0'
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: '18px'
  },
  inputGroup: {
    display: 'flex', flexDirection: 'column', gap: '6px'
  },
  label: {
    fontSize: '0.82rem', fontWeight: 500,
    color: 'var(--text-secondary)'
  },
  inputWrapper: {
    position: 'relative', display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute', left: '14px',
    color: 'var(--text-muted)', pointerEvents: 'none'
  },
  eyeBtn: {
    position: 'absolute', right: '14px',
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
  },
  otpGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px', margin: '8px 0'
  },
  otpBox: {
    width: '100%', height: '50px',
    textAlign: 'center', fontSize: '1.4rem',
    fontWeight: '700', borderRadius: '10px',
    padding: 0
  },
  timerRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', fontSize: '0.8rem',
    color: 'var(--text-muted)', marginTop: '4px'
  },
  checklist: {
    padding: '14px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    marginTop: '6px'
  },
  checklistTitle: {
    fontSize: '0.8rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: '8px'
  },
  submitBtn: {
    display: 'flex', justifyContent: 'center',
    alignItems: 'center', gap: '8px', marginTop: '6px'
  },
  spinner: {
    width: '20px', height: '20px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    animation: 'spin 0.8s linear infinite'
  },
  errorContainer: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(239,68,68,0.10)',
    border: '1px solid rgba(239,68,68,0.20)',
    padding: '12px 16px', borderRadius: '12px',
    color: '#fca5a5', fontSize: '0.88rem',
    lineHeight: '1.4', marginBottom: '16px'
  },
  successWrapper: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '10px 0'
  },
  successCircle: {
    width: '72px', height: '72px',
    borderRadius: '50%',
    background: 'rgba(16,185,129,0.15)',
    color: '#10b981',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', marginBottom: '8px'
  }
};
