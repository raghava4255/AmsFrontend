import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Shield, Briefcase, Users, AlertCircle, ArrowRight, Sun, Moon } from 'lucide-react';
// import Logo from './Logo';
import companylogo from "../assets/company.png"

export const LoginPage = () => {
  const { login } = useAuth();

  const [role, setRole] = useState('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Sync body class with selected role and theme
  useEffect(() => {
    document.body.className = `role-${role}${isDark ? '' : ' light-mode'}`;
  }, [role, isDark




















  ]);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setError(null);
    // No autofill — user must type their own credentials
  };

  const toggleTheme = () => setIsDark(prev => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all the required fields.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    const result = await login(email, password, role);

    if (!result.success) {
      setError(result.error);
      triggerShake();
    }

    setIsSubmitting(false);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  return (
    <div style={styles.container}>
      {/* Ambient blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      {/* Theme toggle — top right */}
      <button
        className="theme-toggle"
        style={styles.themeBtn}
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        id="login-theme-toggle"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={styles.cardWrapper} className={shake ? 'animate-shake' : ''}>
        {/* Logo Header */}
        <div style={styles.header}>
          {/* <Logo size={46} variant="full" light={!isDark} /> */}
          <img src={companylogo} style={styles.logo} alt="logo" />

          <p style={styles.subtitle}>Employee Attendance Management</p>
        </div>

        {/* Form Panel */}
        <div className="glass-panel" style={styles.cardBody}>
          <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">

            {/* Role Selector Tabs */}
            <div style={styles.roleSelectorLabel}>Select Access Role</div>
            <div style={styles.tabContainer}>
              {[
                { id: 'employee', label: 'Employee', Icon: Briefcase },
                { id: 'manager', label: 'Manager', Icon: Users },
                { id: 'admin', label: 'HR / Admin', Icon: Shield },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  id={`role-tab-${id}`}
                  style={{
                    ...styles.tabBtn,
                    ...(role === id ? styles.tabBtnActive : {}),
                  }}
                  onClick={() => handleRoleSelect(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Corporate Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  id="login-email"
                  type="email"
                  className="glass-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <div style={styles.passwordHeader}>
                <label style={styles.label}>Password</label>
              </div>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="glass-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorContainer}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.8 : 1 }}
            >
              {isSubmitting ? (
                <div style={styles.spinner} />
              ) : (
                <>
                  <span>Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}</span>
                  <ArrowRight size={28} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', top: '10%', left: '5%',
    width: '320px', height: '320px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
    filter: 'blur(50px)', zIndex: 0, pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', bottom: '10%', right: '5%',
    width: '420px', height: '420px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
    filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none',
  },
  themeBtn: {
    position: 'absolute', top: '20px', right: '24px', zIndex: 100,
  },
  cardWrapper: {
    width: '100%', maxWidth: '460px',
    display: 'flex', flexDirection: 'column',
    gap: '15px', zIndex: 10,
  },
  header: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '0px',
  },
  logo: {
    width: '100%',
    maxWidth: '250px',
    height: 'auto',
    objectFit: 'contain',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.92rem', fontWeight: '400',
    letterSpacing: '0.02em', textAlign: 'center',
  },
  cardBody: { padding: '36px 32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '22px' },
  roleSelectorLabel: {
    fontSize: '0.82rem', fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '-10px',
  },
  tabContainer: {
    display: 'flex',
    background: 'rgba(0,0,0,0.20)',
    padding: '4px', borderRadius: '14px',
    border: '1px solid var(--bg-card-border)',
    gap: '4px',
  },
  tabBtn: {
    flex: 1, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '6px',
    padding: '10px 4px', borderRadius: '10px',
    border: 'none', background: 'transparent',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-display)', fontWeight: '500',
    fontSize: '0.83rem', cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  tabBtnActive: {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' },
  passwordHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' },
  eyeBtn: {
    position: 'absolute', right: '16px',
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  },
  errorContainer: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(239,68,68,0.10)',
    border: '1px solid rgba(239,68,68,0.20)',
    padding: '12px 16px', borderRadius: '12px',
    color: '#fca5a5', fontSize: '0.88rem', lineHeight: '1.4',
  },
  submitBtn: { marginTop: '6px' },
  spinner: {
    width: '20px', height: '20px', borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    animation: 'spin 0.8s linear infinite',
  },
};
