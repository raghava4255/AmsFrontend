import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Clock, RefreshCw, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatDateDDMMMYYYY } from '../utils/dateFormatter';

export const AdminEmails = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryStatus, setRetryStatus] = useState({});

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/emails/logs`);
      const data = await res.json();
      if (res.ok) setLogs(data);
      else setError(data.error || 'Failed to fetch email logs');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRetry = async (id) => {
    setRetryStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch(`${API_BASE_URL}/emails/retry/${id}`, {
        method: 'POST',
      });
      if (res.ok) {
        setRetryStatus(prev => ({ ...prev, [id]: 'success' }));
        setTimeout(() => {
          fetchLogs();
          setRetryStatus(prev => ({ ...prev, [id]: null }));
        }, 1500);
      } else {
        setRetryStatus(prev => ({ ...prev, [id]: 'error' }));
        setTimeout(() => setRetryStatus(prev => ({ ...prev, [id]: null })), 3000);
      }
    } catch (err) {
      setRetryStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setRetryStatus(prev => ({ ...prev, [id]: null })), 3000);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={20} color="var(--primary-color)" />
          System Email Logs
        </h3>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {error ? (
        <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>{error}</div>
      ) : loading && logs.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading email logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>No email logs found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Recipient</th>
                <th style={{ padding: '12px' }}>Subject</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Sent At</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const isSent = log.status === 'Sent';
                const isFailed = log.status === 'Failed';
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.recipientEmail}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{log.subject}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: isSent ? 'rgba(16,185,129,0.1)' : isFailed ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isSent ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b'
                      }}>
                        {isSent ? <CheckCircle size={12} /> : isFailed ? <XCircle size={12} /> : <Clock size={12} />}
                        {log.status}
                        {!isSent && log.retryCount > 0 && ` (Retry: ${log.retryCount})`}
                      </span>
                      {isFailed && log.errorMessage && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '4px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.errorMessage}>
                          {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateDDMMMYYYY(log.sentAt)} {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {isFailed && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          disabled={retryStatus[log.id] === 'loading'}
                          style={{
                            background: retryStatus[log.id] === 'success' ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <RotateCcw size={12} className={retryStatus[log.id] === 'loading' ? 'spin' : ''} />
                          {retryStatus[log.id] === 'loading' ? 'Retrying...' : retryStatus[log.id] === 'success' ? 'Retried' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
