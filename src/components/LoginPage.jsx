import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Lock, Eye, EyeOff, Shield, Briefcase, Users, 
  AlertCircle, Fingerprint, Calendar, 
  FileText, ShieldCheck, ChevronDown 
} from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { API_BASE_URL } from '../config';
import loginIllustration from "../assets/login_illustration.png";
import companyLogo from "../assets/company.png";

export const LoginPage = () => {
  const { login } = useAuth();

  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [role, setRole] = useState('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [shake, setShake] = useState(false);

  // Fetch available roles from backend
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/roles`);
        const data = await response.json();
        setRoles(data);
        if (data && data.length > 0) {
          setRole(data[0].value);
        }
      } catch (err) {
        console.error('Failed to fetch roles:', err);
        setRoles([
          { value: 'employee', label: 'Employee' },
          { value: 'manager', label: 'Team Lead' },
          { value: 'admin', label: 'HR / Admin' }
        ]);
      } finally {
        setIsLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // Sync body class with selected role and theme
  useEffect(() => {
    document.body.className = `role-${role} light-mode`;
  }, [role]);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setError(null);
  };

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
      setError(result.error || "Authentication failed. Please try again.");
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
      <style>{`
        @media (max-width: 960px) {
          .login-card-wrapper {
            width: 100% !important;
            max-width: 460px !important;
            height: auto !important;
            min-height: auto !important;
            border-radius: 16px !important;
            margin: 16px !important;
            box-shadow: 0 15px 30px rgba(0,0,0,0.08) !important;
          }
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            flex: 1 !important;
            padding: 36px 24px !important;
          }
        }
        .login-input:focus {
          border-color: #0b4fbf !important;
          box-shadow: 0 0 0 3px rgba(11, 79, 191, 0.1) !important;
          outline: none;
        }
        .login-button-primary:hover {
          background-color: #032b80 !important;
          box-shadow: 0 4px 12px rgba(11, 79, 191, 0.2) !important;
        }
        .login-role-select:focus {
          border-color: #0b4fbf !important;
          box-shadow: 0 0 0 3px rgba(11, 79, 191, 0.1) !important;
          outline: none;
        }
        .login-role-select:hover {
          border-color: #94a3b8 !important;
        }
      `}</style>

      {/* Floating Centered Card Wrapper */}
      <div className="login-card-wrapper" style={styles.cardWrapper}>
        
        {/* LEFT COLUMN: BRANDING & ILLUSTRATION */}
        <div className="login-left-panel" style={styles.leftPanel}>
          {/* Top Header Logo */}
          <div style={styles.leftHeader}>
            <div style={styles.logoBadge}>
              <Users size={28} color="#ffffff" />
              <div style={styles.logoBadgeClock}>
                <Calendar size={10} color="#0b4fbf" />
              </div>
            </div>
            <div style={styles.leftHeaderText}>
              <h1 style={styles.leftTitle}>AMS</h1>
              <p style={styles.leftSubtitle}>Attendance Management System</p>
            </div>
          </div>

          {/* Central Mock Illustration */}
          <div style={styles.illustrationContainer}>
            <img 
              src={loginIllustration} 
              alt="AMS Dashboard illustration" 
              style={styles.illustration} 
            />
          </div>

          {/* Bottom Feature Badges */}
          <div style={styles.featureGrid}>
            <div style={styles.featureItem}>
              <div style={styles.featureIconContainer}>
                <Fingerprint size={18} color="#ffffff" />
              </div>
              <span style={styles.featureText}>Mark Attendance</span>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIconContainer}>
                <Calendar size={18} color="#ffffff" />
              </div>
              <span style={styles.featureText}>Manage Leaves</span>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIconContainer}>
                <FileText size={18} color="#ffffff" />
              </div>
              <span style={styles.featureText}>View Reports</span>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIconContainer}>
                <ShieldCheck size={18} color="#ffffff" />
              </div>
              <span style={styles.featureText}>Secure &amp; Reliable</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="login-right-panel" style={styles.rightPanel}>
          
          {/* Main form card content wrapper */}
          <div style={{ ...styles.formContainer, ...(shake ? styles.shakeAnimation : {}) }}>
            
            <div style={styles.formHeader}>
              <img src={companyLogo} alt="Company Logo" style={styles.companyLogo} />
            </div>

            <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
              {/* Role selector dropdown */}
              <div style={styles.inputGroup}>
                <label style={styles.roleLabel}>Access Role</label>
                <div style={styles.inputWrapper}>
                  <Shield size={16} style={styles.inputIcon} />
                  <select
                    id="login-role"
                    className="login-role-select"
                    style={styles.roleSelect}
                    value={role}
                    onChange={e => handleRoleSelect(e.target.value)}
                    disabled={isLoadingRoles}
                  >
                    {isLoadingRoles ? (
                      <option value="">Loading roles...</option>
                    ) : (
                      roles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} style={styles.selectChevron} />
                </div>
              </div>

              {/* Email/Username Input */}
              <div style={styles.inputGroup}>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input
                    id="login-email"
                    type="text"
                    className="login-input"
                    style={styles.input}
                    placeholder="Username or Corporate Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={styles.inputGroup}>
                <div style={styles.inputWrapper}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    style={styles.input}
                    placeholder="Password"
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Row */}
              <div style={styles.formRow}>
                <label style={styles.rememberLabel}>
                  <input type="checkbox" style={styles.checkbox} />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                  style={styles.forgotBtn}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Error display */}
              {error && (
                <div style={styles.errorContainer}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                id="login-submit"
                disabled={isSubmitting}
                className="login-button-primary"
                style={styles.submitBtn}
              >
                {isSubmitting ? (
                  <div style={styles.spinner} />
                ) : (
                  <>
                    <span>Login</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <span>© 2026 AMS. All rights reserved.</span>
            <div style={styles.footerLinks}>
              <span style={styles.footerLink}>Privacy Policy</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={styles.footerLink}>Terms &amp; Conditions</span>
            </div>
          </div>
        </div>
      </div>

      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
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
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '24px',
  },
  cardWrapper: {
    display: 'flex',
    width: '960px',
    height: '600px',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #0b4fbf 0%, #032b80 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  leftHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 2,
  },
  logoBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoBadgeClock: {
    position: 'absolute',
    bottom: '-3px',
    right: '-3px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  leftHeaderText: {
    display: 'flex',
    flexDirection: 'column',
  },
  leftTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    lineHeight: '1',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  leftSubtitle: {
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    margin: '2px 0 0 0',
  },
  illustrationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    padding: '16px 0',
    zIndex: 2,
  },
  illustration: {
    width: '320px',
    height: '240px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.2))',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    zIndex: 2,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '20px',
  },
  featureItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '6px',
  },
  featureIconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 48px',
    position: 'relative',
  },
  langSelector: {
    alignSelf: 'flex-end',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    userSelect: 'none',
  },
  formContainer: {
    width: '100%',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formHeader: {
    textAlign: 'center',
  },
  companyLogo: {
    maxWidth: '320px',
    maxHeight: '120px',
    objectFit: 'contain',
  },
  formTitle: {
    fontSize: '1.65rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  formSubtitle: {
    fontSize: '0.88rem',
    color: '#64748b',
    margin: '6px 0 0 0',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  roleLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  },
  roleSelect: {
    width: '100%',
    padding: '12px 40px 12px 40px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  },
  selectChevron: {
    position: 'absolute',
    right: '14px',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 40px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  formRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
  },
  rememberLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#475569',
    fontWeight: '500',
    cursor: 'pointer',
  },
  checkbox: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
  },
  forgotBtn: {
    background: 'transparent',
    border: 'none',
    color: '#0b4fbf',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    padding: '8px 12px',
    borderRadius: '6px',
    color: '#991b1b',
    fontSize: '0.8rem',
    lineHeight: '1.4',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0b4fbf',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '2px 0',
  },
  line: {
    flex: 1,
    height: '1px',
    backgroundColor: '#f1f5f9',
  },
  separatorText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  ssoBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  spinner: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    animation: 'spin 0.8s linear infinite',
    margin: 'auto',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.7rem',
    color: '#64748b',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '16px',
  },
  footerLinks: {
    display: 'flex',
    gap: '6px',
  },
  footerLink: {
    cursor: 'pointer',
    fontWeight: '500',
  },
  shakeAnimation: {
    animation: 'shake 0.4s ease',
  },
};

