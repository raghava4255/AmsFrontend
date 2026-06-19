import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Lock, User, PenTool } from 'lucide-react';

const CredentialApprovalModal = ({ isOpen, onClose, onConfirm, title = "Action Required", requireSignature = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  useEffect(() => {
    if (isOpen && requireSignature && canvasRef.current) {
      clearSignature();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, requireSignature]);

  const startDrawing = (e) => {
    e.preventDefault(); // Prevent scrolling on touch
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault(); // Prevent scrolling on touch
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (requireSignature && !hasSignature) return;

    let signatureData = null;
    if (requireSignature && canvasRef.current && hasSignature) {
      signatureData = canvasRef.current.toDataURL('image/png');
    }

    onConfirm({ email: email.trim(), password, signature: signatureData });
    // Reset state after confirm
    setEmail('');
    setPassword('');
    clearSignature();
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    clearSignature();
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
      padding: '8px 16px', backgroundColor: (email && password && (!requireSignature || hasSignature)) ? '#3b82f6' : '#94a3b8',
      border: 'none', borderRadius: '8px',
      color: '#ffffff', fontSize: '0.85rem', fontWeight: 600,
      cursor: (email && password && (!requireSignature || hasSignature)) ? 'pointer' : 'not-allowed',
      display: 'flex', alignItems: 'center', gap: '6px',
      transition: 'background-color 0.2s'
    },
    canvasContainer: {
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      backgroundColor: '#f8fafc',
      marginBottom: '16px',
      position: 'relative',
      overflow: 'hidden'
    },
    canvas: {
      width: '100%',
      height: '120px',
      cursor: 'crosshair',
      display: 'block'
    },
    clearBtn: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      fontSize: '0.75rem',
      padding: '4px 8px',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      cursor: 'pointer',
      color: '#64748b'
    }
  };

  if (!isOpen) return null;

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

            <div style={{ ...styles.inputGroup, marginBottom: requireSignature ? '16px' : 0 }}>
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

            {requireSignature && (
              <div style={{ ...styles.inputGroup, marginBottom: 0 }}>
                <label style={styles.label}><PenTool size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> E-Signature Required</label>
                <div style={styles.canvasContainer}>
                  <canvas
                    ref={canvasRef}
                    width={372} // rough width based on modal max-width (420) minus padding (48)
                    height={120}
                    style={styles.canvas}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {hasSignature && (
                    <button type="button" onClick={clearSignature} style={styles.clearBtn}>
                      Clear
                    </button>
                  )}
                  {!hasSignature && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      Draw your signature here
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={handleClose}>Cancel</button>
            <button type="submit" style={styles.confirmBtn} disabled={!email || !password || (requireSignature && !hasSignature)}>
              <Check size={16} /> Confirm Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CredentialApprovalModal;
