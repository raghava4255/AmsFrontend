import React, { useState } from 'react';
import { X, Check, Lock, User } from 'lucide-react';

const CredentialApprovalModal = ({ isOpen, onClose, onConfirm, title = "Action Required" }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onConfirm({ email: email.trim(), password });
    // Reset state after confirm
    setEmail('');
    setPassword('');
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    onClose();
  };

  const styles = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '24px'
    },
    modal: {
      width: '100%', maxWidth: '420px',
      backgroundColor: '#ffffff', borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', animation: 'fadeIn 0.25s ease'
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 24px', borderBottom: '1px solid #e2e8f0'
    },
    title: { margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' },
    closeBtn: {
      background: 'transparent', border: 'none', color: '#64748b',
      cursor: 'pointer', padding: '4px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', borderRadius: '8px'
    },
    body: { padding: '24px' },
    instructions: {
      fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: '1.5'
    },
    inputGroup: {
      display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px'
    },
    label: {
      fontSize: '0.8rem', fontWeight: 600, color: '#475569'
    },
    inputWrapper: {
      position: 'relative', display: 'flex', alignItems: 'center'
    },
    inputIcon: {
      position: 'absolute', left: '12px', color: '#94a3b8'
    },
    input: {
      width: '100%', padding: '10px 12px 10px 38px',
      background: '#f8fafc', border: '1px solid #cbd5e1',
      borderRadius: '8px', color: '#0f172a', fontSize: '0.9rem',
      outline: 'none', transition: 'border-color 0.2s'
    },
    footer: {
      padding: '16px 24px', backgroundColor: '#f8fafc',
      borderTop: '1px solid #e2e8f0', display: 'flex',
      justifyContent: 'flex-end', gap: '12px'
    },
    cancelBtn: {
      padding: '8px 16px', backgroundColor: 'transparent',
      border: '1px solid #cbd5e1', borderRadius: '8px',
      color: '#475569', fontSize: '0.85rem', fontWeight: 600,
      cursor: 'pointer'
    },
    confirmBtn: {
      padding: '8px 16px', backgroundColor: (email && password) ? '#3b82f6' : '#94a3b8',
      border: 'none', borderRadius: '8px',
      color: '#ffffff', fontSize: '0.85rem', fontWeight: 600,
      cursor: (email && password) ? 'pointer' : 'not-allowed',
      display: 'flex', alignItems: 'center', gap: '6px',
      transition: 'background-color 0.2s'
    }
  };

  return (
    <div style={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button type="button" style={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleConfirm}>
          <div style={styles.body}>
            <p style={styles.instructions}>
              Please enter your login credentials to securely authorize this action.
            </p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email / Employee ID</label>
              <div style={styles.inputWrapper}>
                <User size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@example.com"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={{ ...styles.inputGroup, marginBottom: 0 }}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={16} style={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your login password"
                  style={styles.input}
                  required
                />
              </div>
            </div>
          </div>
          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={handleClose}>Cancel</button>
            <button type="submit" style={styles.confirmBtn} disabled={!email || !password}>
              <Check size={16} /> Confirm Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CredentialApprovalModal;
