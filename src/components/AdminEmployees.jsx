import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Search, Power, RotateCcw } from 'lucide-react';
import { formatTime24h } from '../utils/time';

export const AdminEmployees = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Modals and Toasts
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, shiftsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/users`),
        fetch(`${API_BASE_URL}/shifts`)
      ]);
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        setShifts(shiftsData);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: newStatus } : u));
        showToast(`Employee ${newStatus ? 'activated' : 'deactivated'}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to ${newStatus ? 'activate' : 'deactivate'} employee`);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };


  const filteredUsers = users.filter(u => {
    // If the logged in user is a manager, only show employees from their department
    if (currentUser?.role?.includes('manager')) {
      const managerDepts = (currentUser.department || '')
        .split(/[,,;/]/)
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);
        
      const userDept = (u.department || '').trim().toLowerCase();
      if (!managerDepts.includes(userDept)) {
        return false;
      }
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      if (!u.name?.toLowerCase().includes(lower) && !u.email?.toLowerCase().includes(lower)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '20px', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'absolute', top: '-60px', right: '0', zIndex: 1000,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: '#fff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Employee Details</h3>
        <button className="btn-primary" onClick={fetchData} style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            placeholder="Search by name or email..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '10px 10px 10px 36px' }}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading employees...</p>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', paddingRight: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 10px' }}>Employee</th>
                <th style={{ padding: '12px 10px' }}>Department</th>
                <th style={{ padding: '12px 10px' }}>Role</th>
                <th style={{ padding: '12px 10px' }}>Assigned Shift</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                {currentUser?.role !== 'manager' && <th style={{ padding: '12px 10px', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No employees found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}>
                      <div 
                        onClick={() => setSelectedUser(user)}
                        style={{ fontWeight: '500', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textDecoration: 'underline' }}
                        title="Click to view details"
                      >
                        {user.name}
                        {user.employeeId && (
                          <span style={{ 
                            fontSize: '0.72rem', padding: '1px 5px', borderRadius: '4px', 
                            background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                            border: '1px solid rgba(59,130,246,0.25)', fontWeight: '600'
                          }}>
                            {user.employeeId}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '10px' }}>{user.department}</td>
                    <td style={{ padding: '10px' }}>{user.role === 'manager' ? 'Team Lead' : (user.role === 'admin' ? 'HR / Admin' : (user.role === 'reporting manager' ? 'Reporting Manager' : 'Employee'))}</td>
                    <td style={{ padding: '10px' }}>
                      {user.shift ? user.shift.name : (shifts.find(s => s.id === user.shiftId)?.name || 'None')}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                        background: user.isActive !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: user.isActive !== false ? '#10b981' : '#ef4444'
                      }}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {currentUser?.role !== 'manager' && (
                      <td style={{ padding: '10px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.isActive !== false)} 
                          style={{ 
                            background: user.isActive !== false ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', 
                            border: user.isActive !== false ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)', 
                            color: user.isActive !== false ? '#ef4444' : '#10b981', 
                            cursor: 'pointer', padding: '8px 14px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.85rem',
                            transition: 'all 0.2s'
                          }} 
                          onMouseOver={(e) => e.currentTarget.style.background = user.isActive !== false ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}
                          onMouseOut={(e) => e.currentTarget.style.background = user.isActive !== false ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}
                        >
                          <Power size={16} /> {user.isActive !== false ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Details Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ padding: '24px', width: '400px', backgroundColor: 'var(--bg-dark)', borderRadius: '24px', border: '1px solid var(--bg-card-border)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)', marginBottom: '20px' }}>Employee Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Name:</strong> <span>{selectedUser.name}</span>
              <strong style={{ color: 'var(--text-primary)' }}>Email:</strong> <span>{selectedUser.email}</span>
              <strong style={{ color: 'var(--text-primary)' }}>Emp ID:</strong> <span>{selectedUser.employeeId || '---'}</span>
              <strong style={{ color: 'var(--text-primary)' }}>Role:</strong> <span>{selectedUser.role === 'manager' ? 'Team Lead' : (selectedUser.role === 'admin' ? 'HR / Admin' : (selectedUser.role === 'reporting manager' ? 'Reporting Manager' : 'Employee'))}</span>
              <strong style={{ color: 'var(--text-primary)' }}>Department:</strong> <span>{selectedUser.department || '---'}</span>
              <strong style={{ color: 'var(--text-primary)' }}>Shift:</strong> <span>{selectedUser.shift ? selectedUser.shift.name : (shifts.find(s => s.id === selectedUser.shiftId)?.name || 'None')}</span>
              <strong style={{ color: 'var(--text-primary)' }}>Shift Time:</strong> 
              <span>
                {(() => {
                  const s = selectedUser.shift || shifts.find(s => s.id === selectedUser.shiftId);
                  if (!s || !s.startTime || !s.endTime) return '---';
                  return `${formatTime24h(s.startTime)} - ${formatTime24h(s.endTime)}`;
                })()}
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>Status:</strong> 
              <span style={{ color: selectedUser.isActive !== false ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedUser(null)}
                className="btn-primary"
                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', width: 'auto' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
