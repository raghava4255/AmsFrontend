import React, { useRef, useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

const ESignatureModal = ({ isOpen, onClose, onConfirm, title = "E-Signature Required" }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Set background to white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Reset state
      setHasSignature(false);
      
      // Handle resize to match container
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth - 2; // subtract border
        canvas.height = parent.clientHeight - 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Support both mouse and touch
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64Signature = canvas.toDataURL('image/png');
    onConfirm(base64Signature);
  };

  const styles = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '24px'
    },
    modal: {
      width: '100%', maxWidth: '440px',
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
      fontSize: '0.85rem', color: '#64748b', marginBottom: '12px'
    },
    canvasContainer: {
      width: '100%', height: '180px',
      border: '1px solid #cbd5e1', borderRadius: '8px',
      overflow: 'hidden', position: 'relative',
      backgroundColor: '#f8fafc', touchAction: 'none' // Prevent scrolling on touch devices while drawing
    },
    footer: {
      padding: '16px 24px', backgroundColor: '#f8fafc',
      borderTop: '1px solid #e2e8f0', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center'
    },
    clearBtn: {
      padding: '8px 16px', backgroundColor: 'transparent',
      border: '1px solid #cbd5e1', borderRadius: '8px',
      color: '#475569', fontSize: '0.85rem', fontWeight: 600,
      cursor: 'pointer'
    },
    confirmBtn: {
      padding: '8px 16px', backgroundColor: hasSignature ? '#3b82f6' : '#94a3b8',
      border: 'none', borderRadius: '8px',
      color: '#ffffff', fontSize: '0.85rem', fontWeight: 600,
      cursor: hasSignature ? 'pointer' : 'not-allowed',
      display: 'flex', alignItems: 'center', gap: '6px',
      transition: 'background-color 0.2s'
    }
  };

  return (
    <div style={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={styles.body}>
          <p style={styles.instructions}>Please sign within the box below to approve.</p>
          <div style={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              style={{ display: 'block' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
              onTouchMove={(e) => { e.preventDefault(); draw(e); }}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>
        <div style={styles.footer}>
          <button style={styles.clearBtn} onClick={clearSignature}>Clear</button>
          <button style={styles.confirmBtn} onClick={handleConfirm} disabled={!hasSignature}>
            <Check size={16} /> Confirm &amp; Sign
          </button>
        </div>
      </div>
    </div>
  );
};

export default ESignatureModal;
