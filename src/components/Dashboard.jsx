import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Calendar, Clock, Award, Check, X, AlertCircle, Plus,
  Users, UserCheck, ShieldAlert, BarChart3, UserPlus, MapPin,
  Sun, Moon, FileText, CheckCircle, XCircle, Hourglass
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import companylogo from "../assets/company.png"

import { AdminShifts } from './AdminShifts';
import { AdminAttendance } from './AdminAttendance';

/* ── Helper: extract initials from full name ─────────────────── */
const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ── Role-based gradient for initials avatar ─────────────────── */
const roleGradient = {
  employee: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  manager: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  admin: 'linear-gradient(135deg, #e11d48 0%, #f97316 100%)',
};

/* ── Avatar component: image or initials badge ───────────────── */
const Avatar = ({ src, name, role, size = 42 }) => {
  if (src && src.trim()) {
    return (
      <img
        src={src} alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          border: '2px solid var(--primary-color)',
          objectFit: 'cover',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: roleGradient[role] || roleGradient.employee,
      border: '2px solid var(--primary-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 800,
      fontSize: `${Math.round(size * 0.38)}px`,
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.20)',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  );
};

/* ── Leave status badge ──────────────────────────────────────── */
const LeaveStatusBadge = ({ status }) => {
  const cfg = {
    Pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: <Hourglass size={13} /> },
    Approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: <CheckCircle size={13} /> },
    Rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: <XCircle size={13} /> },
  }[status] || { bg: 'rgba(100,116,139,0.12)', color: '#64748b', icon: null };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: cfg.bg, color: cfg.color,
      padding: '4px 10px', borderRadius: '20px',
      fontSize: '0.78rem', fontWeight: 600,
    }}>
      {cfg.icon}{status}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Dashboard Component
═══════════════════════════════════════════════════════════════ */
export const Dashboard = () => {
  const { user, setUser, logout } = useAuth();

  /* ── Shared state ── */
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);

  /* ── Employee sub-tab ── */
  const [empTab, setEmpTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [myLeaves, setMyLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);

  /* ── Admin sub-tab ── */
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'shifts' | 'attendance'
  const [totalWorkforce, setTotalWorkforce] = useState(user?.stats?.totalEmployees ?? 0);
  const [departmentStats, setDepartmentStats] = useState([]);

  useEffect(() => {
    document.body.className = 'light-mode';
  }, []);

  /* ── Modals ── */
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePass, setNewEmployeePass] = useState('');
  const [newEmployeeDept, setNewEmployeeDept] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('employee');

  const [departments, setDepartments] = useState([]);
  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');

  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [leaveDuration, setLeaveDuration] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const [availableShifts, setAvailableShifts] = useState([]);
  const [newEmployeeShift, setNewEmployeeShift] = useState('');

  /* ── Flexy Hours ── */
  const [showFlexyModal, setShowFlexyModal] = useState(false);
  const [flexyDate, setFlexyDate] = useState('');
  const [flexyType, setFlexyType] = useState('Morning Flexy');
  const [flexyHours, setFlexyHours] = useState('2');
  const [flexyReason, setFlexyReason] = useState('');
  const [myFlexyRequests, setMyFlexyRequests] = useState([]);
  const [pendingFlexy, setPendingFlexy] = useState([]);

  /* ── Toast ── */
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  /* ── Profile Update ── */
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ── Boot: load cached data ── */
  useEffect(() => {
    if (!user) return;
    if (user.role === 'employee') {
      const logs = user.stats?.recentActivity || [];
      setActivities(logs);
      const active = logs.find(l => l.status === 'Active');
      if (active) { setClockedIn(true); setClockInTime(active.clockIn); }
    } else if (user.role === 'manager') {
      setPendingLeaves(user.stats?.pendingRequests || []);
      // Fetch pending flexy requests for manager
      fetch(`${API_BASE_URL}/flexyhours/pending`)
        .then(res => res.json())
        .then(data => setPendingFlexy(data.requests || []))
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetch(`${API_BASE_URL}/shifts`)
        .then(res => res.json())
        .then(data => {
          setAvailableShifts(data);
          if (data.length > 0 && !newEmployeeShift) setNewEmployeeShift(data[0].id);
        })
        .catch(console.error);

      fetch(`${API_BASE_URL}/departments`)
        .then(res => res.json())
        .then(data => {
          setDepartments(data);
          if (data.length > 0 && !newEmployeeDept) setNewEmployeeDept(data[0].name);
        })
        .catch(console.error);
    }
  }, [user, showAddEmployeeModal, adminTab]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetch(`${API_BASE_URL}/departments/stats`)
        .then(res => res.json())
        .then(data => setDepartmentStats(data))
        .catch(console.error);
    }
  }, [user, departments.length, totalWorkforce]);

  /* ── Fetch employee's own leave history ── */
  const fetchMyLeaves = useCallback(async () => {
    if (!user || user.role !== 'employee') return;
    setLeavesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/user/${user.id}`);
      const data = await res.json();
      if (res.ok) setMyLeaves(data.leaves || []);
    } catch (err) {
      console.error('Failed to fetch leave history', err);
    } finally {
      setLeavesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (empTab === 'leaves') {
      fetchMyLeaves();
      // Fetch flexy requests when opening leaves tab
      fetch(`${API_BASE_URL}/flexyhours/user/${user?.id}`)
        .then(res => res.json())
        .then(data => setMyFlexyRequests(data.requests || []))
        .catch(console.error);
    }
  }, [empTab, fetchMyLeaves, user]);

  /* ── Toast helper ── */
  const triggerToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4500);
  };

  /* ══════════════════════════════════════════════════════════════
     1. Clock In / Out
  ═══════════════════════════════════════════════════════════════ */
  const handleClockInOut = async () => {
    const endpoint = clockedIn ? 'clock-out' : 'clock-in';
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance.');

      if (!clockedIn) {
        setClockedIn(true);
        setClockInTime(data.log.clockIn);
        setActivities(prev => [data.log, ...prev]);
        triggerToast('Clocked In! Have a great shift.', 'success');
      } else {
        setClockedIn(false);
        setClockInTime(null);
        const updated = activities.map(a => a.status === 'Active' ? data.log : a);
        setActivities(updated);
        const updatedUser = {
          ...user,
          presentDays: data.user.presentDays,
          workHoursThisMonth: data.user.workHoursThisMonth,
          attendanceRate: data.user.attendanceRate,
          stats: {
            ...user.stats,
            presentDays: data.user.presentDays,
            workHoursThisMonth: data.user.workHoursThisMonth,
            attendanceRate: data.user.attendanceRate,
            recentActivity: updated,
          },
        };
        setUser(updatedUser);
        localStorage.setItem('ams_user', JSON.stringify(updatedUser));
        triggerToast('Clocked Out! Rest well.', 'success');
      }
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     2. Request Leave (Employee)
  ═══════════════════════════════════════════════════════════════ */
  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveDuration.trim() || !leaveReason.trim()) {
      triggerToast('Please fill in all leave request fields.', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: leaveType,
          duration: leaveDuration.trim(),
          reason: leaveReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit leave request.');

      // Optimistically add to local list so Leave Center updates immediately
      if (data.leave) {
        setMyLeaves(prev => [data.leave, ...prev]);
      }
      setShowLeaveRequestModal(false);
      setLeaveDuration('');
      setLeaveReason('');
      triggerToast('Leave request submitted to manager!', 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     2.5. Request Flexy Hours (Employee)
  ═══════════════════════════════════════════════════════════════ */
  const handleRequestFlexy = async (e) => {
    e.preventDefault();
    if (!flexyDate || !flexyReason.trim()) {
      triggerToast('Please provide date and reason.', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/flexyhours/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: flexyDate,
          type: flexyType,
          hoursRequested: parseInt(flexyHours),
          reason: flexyReason.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit flexy request.');

      if (data.request) {
        setMyFlexyRequests(prev => [data.request, ...prev]);
      }
      setShowFlexyModal(false);
      setFlexyReason('');
      triggerToast('Flexy hour request submitted to manager!', 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     3. Resolve Leave (Manager)
  ═══════════════════════════════════════════════════════════════ */
  const handleLeaveDecision = async (id, decision) => {
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve request.');
      setPendingLeaves(prev => prev.filter(r => r.id !== id));
      triggerToast(`Request ${decision === 'approve' ? 'Approved' : 'Rejected'}!`, 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleFlexyDecision = async (id, decision) => {
    try {
      const res = await fetch(`${API_BASE_URL}/flexyhours/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve flexy request.');
      setPendingFlexy(prev => prev.filter(r => r.id !== id));
      triggerToast(`Flexy Request ${decision === 'approve' ? 'Approved' : 'Rejected'}!`, 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     4. Add Employee (HR Admin)
  ═══════════════════════════════════════════════════════════════ */
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim() || !newEmployeePass.trim()) {
      triggerToast('Name, Email and Password are all required.', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmployeeName.trim(),
          email: newEmployeeEmail.trim(),
          password: newEmployeePass.trim(),
          role: newEmployeeRole,
          department: newEmployeeDept,
          shiftId: newEmployeeShift ? parseInt(newEmployeeShift) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register employee.');
      triggerToast(`Account created for ${newEmployeeName}!`, 'success');
      setTotalWorkforce(prev => prev + 1);
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setNewEmployeePass('');
      setShowAddEmployeeModal(false);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) {
      triggerToast('Department name is required.', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDepartmentName.trim() }),
      });
      if (!res.ok) {
        let errorMsg = 'Failed to create department. Is the backend running?';
        try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) { }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      triggerToast(`Department ${data.name} created!`, 'success');
      setDepartments(prev => [...prev, data]);
      setNewDepartmentName('');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleDeleteDepartment = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        let errorMsg = 'Failed to delete department. Is the backend running?';
        try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) { }
        throw new Error(errorMsg);
      }
      triggerToast(`Department deleted!`, 'success');
      setDepartments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     5. Profile Update
  ═══════════════════════════════════════════════════════════════ */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      triggerToast('New passwords do not match.', 'danger');
      return;
    }
    if (newPassword && !oldPassword) {
      triggerToast('Old password is required to set a new password.', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          avatarUrl: profileAvatarUrl,
          oldPassword: oldPassword,
          newPassword: newPassword
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');
      
      triggerToast(data.message || 'Profile updated!', 'success');
      setUser(prev => ({ ...prev, avatar: data.avatar }));
      setShowProfileModal(false);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER: Employee View
  ═══════════════════════════════════════════════════════════════ */
  const renderEmployeeView = () => {
    const approvedLeaves = myLeaves.filter(l => l.status === 'Approved');

    return (
      <div>
        {/* Approved leave notification banner */}
        {empTab === 'leaves' && approvedLeaves.length > 0 && (
          <div style={styles.approvalBanner}>
            <CheckCircle size={18} />
            <span>
              <strong>{approvedLeaves.length} leave request{approvedLeaves.length > 1 ? 's' : ''} approved</strong>
              {' '}— your attendance has been updated to "On Leave" for those dates.
            </span>
          </div>
        )}

        {/* Sub-Tab Navigation */}
        <div style={styles.subTabRow}>
          <button
            id="emp-tab-attendance"
            style={{ ...styles.subTab, ...(empTab === 'attendance' ? styles.subTabActive : {}) }}
            onClick={() => setEmpTab('attendance')}
          >
            <Clock size={15} /> Attendance Console
          </button>
          <button
            id="emp-tab-leaves"
            style={{ ...styles.subTab, ...(empTab === 'leaves' ? styles.subTabActive : {}) }}
            onClick={() => setEmpTab('leaves')}
          >
            <Calendar size={15} /> Leave Center
          </button>
        </div>

        {/* ── Attendance Tab ── */}
        {empTab === 'attendance' && (
          <div style={styles.dashboardGrid}>
            {/* Left: Clock panel + stats */}
            <div style={styles.leftCol}>
              <div className="glass-panel" style={styles.clockPanel}>
                <div style={styles.clockHeader}>
                  <Clock size={20} color="var(--primary-color)" />
                  <span style={styles.clockHeading}>Shift Console</span>
                </div>
                <div style={styles.clockTime}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>

                <div style={styles.clockCircleWrapper}>
                  <div style={{
                    ...styles.clockCircle,
                    borderColor: clockedIn ? 'var(--success)' : 'rgba(255,255,255,0.08)',
                    boxShadow: clockedIn ? '0 0 30px rgba(16,185,129,0.25)' : 'none',
                  }}>
                    <div style={styles.clockPulse}>
                      <div style={styles.realtimeClock}>
                        {clockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
                      </div>
                      {clockedIn && <span style={styles.activeSince}>Active since {clockInTime}</span>}
                    </div>
                  </div>
                </div>

                <button
                  id="clock-btn"
                  onClick={handleClockInOut}
                  className="btn-primary"
                  style={{
                    ...styles.clockBtn,
                    background: clockedIn
                      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
                    boxShadow: clockedIn
                      ? '0 4px 20px rgba(239,68,68,0.25)'
                      : '0 4px 20px rgba(59,130,246,0.25)',
                  }}
                >
                  {clockedIn ? 'CLOCK OUT' : 'CLOCK IN NOW'}
                </button>

                <div style={styles.officeLoc}>
                  <MapPin size={14} />
                  <span>Headquarters (IP Verified)</span>
                </div>
              </div>

              {/* Shift details */}
              {user.shift && (
                <div className="glass-panel" style={{ padding: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} /> Assigned Shift: {user.shift.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {user.shift.startTime} - {user.shift.endTime} (Break: {user.shift.breakTime}m)
                  </div>
                </div>
              )}

              {/* Quick metrics */}
              <div style={styles.statsContainer}>
                <div className="glass-panel" style={styles.statMiniCard}>
                  <Award size={20} color="var(--primary-color)" />
                  <div style={styles.miniCardVal}>
                    {user.stats?.attendanceRate ?? user.attendanceRate}%
                  </div>
                  <div style={styles.miniCardLabel}>Attendance Rate</div>
                </div>
                <div
                  className="glass-panel"
                  style={{ ...styles.statMiniCard, cursor: 'pointer' }}
                  onClick={() => setShowLeaveRequestModal(true)}
                  id="leave-balance-card"
                >
                  <Calendar size={20} color="var(--success)" />
                  <div style={{ ...styles.miniCardVal, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{user.stats?.leaveBalance ?? user.leaveBalance} Days</span>
                    <Plus size={14} style={{ color: 'var(--success)' }} />
                  </div>
                  <div style={styles.miniCardLabel}>Leave Balance (Request)</div>
                </div>
              </div>
            </div>

            {/* Right: Recent logs */}
            <div style={styles.rightCol}>
              <div className="glass-panel" style={styles.tableCard}>
                <div style={styles.tableCardHeader}>
                  <h3 style={styles.tableTitle}>Recent Log History</h3>
                  <span style={styles.badge}>Live SQL Server</span>
                </div>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>In / Out</th>
                        <th style={styles.th}>Hours</th>
                        <th style={styles.th}>Metrics</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.length === 0 ? (
                        <tr><td colSpan="5" style={styles.emptyCell}>No logs yet. Clock in to start!</td></tr>
                      ) : (
                        activities.map((act, idx) => (
                          <tr key={act.id ?? idx} style={styles.trBody}>
                            <td style={styles.td}>{act.date}</td>
                            <td style={styles.td}>
                              <div style={{ color: act.lateEntry ? '#ef4444' : 'inherit' }}>{act.clockIn}</div>
                              <div style={{ color: act.earlyExit ? '#ef4444' : 'inherit' }}>{act.clockOut}</div>
                            </td>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 'bold' }}>{act.hours > 0 ? `${act.hours}h` : '---'}</div>
                            </td>
                            <td style={styles.td}>
                              {act.lateEntry && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Late Entry</div>}
                              {act.earlyExit && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Early Exit</div>}
                              {act.overtimeHours > 0 && <div style={{ fontSize: '0.8rem', color: '#10b981' }}>+{act.overtimeHours}h OT</div>}
                              {act.pendingHours > 0 && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>-{act.pendingHours}h Short</div>}
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor:
                                  act.status === 'Present' ? 'rgba(16,185,129,0.10)' :
                                    act.status === 'Active' ? 'rgba(59,130,246,0.10)' :
                                      act.status === 'On Leave' ? 'rgba(245,158,11,0.10)' :
                                        'rgba(100,116,139,0.10)',
                                color:
                                  act.status === 'Present' ? 'var(--success)' :
                                    act.status === 'Active' ? 'var(--primary-light)' :
                                      act.status === 'On Leave' ? 'var(--warning)' :
                                        'var(--text-muted)',
                              }}>
                                {act.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Leave Center Tab ── */}
        {empTab === 'leaves' && (
          <div style={styles.dashboardGrid}>
            <div style={styles.leftCol}>
              {/* Apply for leave CTA */}
              <div className="glass-panel" style={styles.leaveCtaCard}>
                <div style={styles.leaveCtaIcon}>
                  <FileText size={28} color="var(--primary-color)" />
                </div>
                <h3 style={styles.leaveCtaTitle}>Apply for Leave</h3>
                <p style={styles.leaveCtaDesc}>
                  Submit a new leave application. Your manager will be notified for approval.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    id="apply-leave-btn"
                    className="btn-primary"
                    onClick={() => setShowLeaveRequestModal(true)}
                  >
                    <Plus size={16} /> New Leave
                  </button>
                  <button
                    id="apply-flexy-btn"
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    onClick={() => setShowFlexyModal(true)}
                  >
                    <Clock size={16} /> Flexy Hour
                  </button>
                </div>
              </div>

              {/* Balance card */}
              <div className="glass-panel" style={{ ...styles.statMiniCard, padding: '20px' }}>
                <Calendar size={20} color="var(--success)" />
                <div style={styles.miniCardVal}>{user.stats?.leaveBalance ?? user.leaveBalance} Days</div>
                <div style={styles.miniCardLabel}>Remaining Balance</div>
              </div>
            </div>

            {/* Right: Leave history */}
            <div style={styles.rightCol}>
              <div className="glass-panel" style={styles.tableCard}>
                <div style={styles.tableCardHeader}>
                  <h3 style={styles.tableTitle}>My Leave Requests</h3>
                  <button
                    style={styles.refreshBtn}
                    onClick={fetchMyLeaves}
                    title="Refresh"
                    id="refresh-leaves-btn"
                  >↻ Refresh</button>
                </div>

                {leavesLoading ? (
                  <div style={styles.emptyCell}>Loading leave history…</div>
                ) : myLeaves.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No leave requests found.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Submit one using the button on the left.</p>
                  </div>
                ) : (
                  <div style={styles.leaveList}>
                    {myLeaves.map(leave => (
                      <div key={leave.id} style={styles.leaveItem}>
                        <div style={styles.leaveItemLeft}>
                          <div style={styles.leaveItemType}>{leave.type}</div>
                          <div style={styles.leaveItemDuration}>{leave.duration}</div>
                          {leave.reason && (
                            <div style={styles.leaveItemReason}>"{leave.reason}"</div>
                          )}
                        </div>
                        <LeaveStatusBadge status={leave.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Flexy Requests Table */}
              <div className="glass-panel" style={{ ...styles.tableCard, marginTop: '20px' }}>
                <div style={styles.tableCardHeader}>
                  <h3 style={styles.tableTitle}>My Flexy Requests</h3>
                </div>
                {myFlexyRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    <p>No flexy hour requests found.</p>
                  </div>
                ) : (
                  <div style={styles.leaveList}>
                    {myFlexyRequests.map(flexy => (
                      <div key={flexy.id} style={styles.leaveItem}>
                        <div style={styles.leaveItemLeft}>
                          <div style={styles.leaveItemType}>{flexy.type}</div>
                          <div style={styles.leaveItemDuration}>{flexy.date} - {flexy.hoursRequested} hours</div>
                          {flexy.reason && (
                            <div style={styles.leaveItemReason}>"{flexy.reason}"</div>
                          )}
                        </div>
                        <LeaveStatusBadge status={flexy.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER: Manager View
  ═══════════════════════════════════════════════════════════════ */
  const renderManagerView = () => (
    <div style={styles.dashboardGrid}>
      <div style={styles.leftCol}>
        <div className="glass-panel" style={styles.managerHeaderCard}>
          <div style={styles.managerHeaderGrid}>
            {[
              { Icon: Users, color: 'var(--primary-color)', val: user.stats?.teamSize ?? 12, label: 'Total Staff' },
              { Icon: UserCheck, color: 'var(--success)', val: user.stats?.presentToday ?? 10, label: 'Present Today' },
              { Icon: Calendar, color: 'var(--warning)', val: user.stats?.onLeaveToday ?? 1, label: 'On Leave' },
            ].map(({ Icon, color, val, label }, i) => (
              <div key={i} style={styles.mgrStatItem}>
                <Icon size={20} color={color} />
                <div style={styles.mgrStatVal}>{val}</div>
                <div style={styles.mgrStatLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={styles.teamGoalCard}>
          <div style={styles.goalHeader}>
            <BarChart3 size={18} color="var(--primary-light)" />
            <span style={styles.goalLabel}>Team Presence Rate</span>
          </div>
          <div style={styles.goalValue}>{user.stats?.teamAttendanceRate ?? 94}%</div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${user.stats?.teamAttendanceRate ?? 94}%` }} />
          </div>
          <div style={styles.goalFooter}>Target: 95% threshold</div>
        </div>
      </div>

      <div style={styles.rightCol}>
        <div className="glass-panel" style={styles.requestsCard}>
          <h3 style={styles.requestsHeading}>Pending Leave Approvals</h3>
          {pendingLeaves.length === 0 ? (
            <div style={styles.emptyRequests}>
              <Check size={36} color="var(--success)" />
              <p>All leave approvals resolved!</p>
            </div>
          ) : (
            <div style={styles.requestsList}>
              {pendingLeaves.map(req => (
                <div key={req.id} style={styles.requestItem}>
                  <div style={styles.reqDetails}>
                    <div style={styles.reqName}>{req.name}</div>
                    <div style={styles.reqType}>{req.type} &bull; <span style={{ color: 'var(--text-secondary)' }}>{req.duration}</span></div>
                    <div style={styles.reqReason}>"{req.reason}"</div>
                  </div>
                  <div style={styles.reqActions}>
                    <button onClick={() => handleLeaveDecision(req.id, 'reject')} style={styles.actionReject} title="Reject"><X size={16} /></button>
                    <button onClick={() => handleLeaveDecision(req.id, 'approve')} style={styles.actionApprove} title="Approve"><Check size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ ...styles.requestsCard, marginTop: '20px' }}>
          <h3 style={styles.requestsHeading}>Pending Flexy Approvals</h3>
          {pendingFlexy.length === 0 ? (
            <div style={styles.emptyRequests}>
              <Check size={36} color="var(--success)" />
              <p>All flexy requests resolved!</p>
            </div>
          ) : (
            <div style={styles.requestsList}>
              {pendingFlexy.map(req => (
                <div key={req.id} style={styles.requestItem}>
                  <div style={styles.reqDetails}>
                    <div style={styles.reqName}>{req.userName}</div>
                    <div style={styles.reqType}>{req.type} &bull; <span style={{ color: 'var(--text-secondary)' }}>{req.date} ({req.hoursRequested}h)</span></div>
                    <div style={styles.reqReason}>"{req.reason}"</div>
                  </div>
                  <div style={styles.reqActions}>
                    <button onClick={() => handleFlexyDecision(req.id, 'reject')} style={styles.actionReject} title="Reject"><X size={16} /></button>
                    <button onClick={() => handleFlexyDecision(req.id, 'approve')} style={styles.actionApprove} title="Approve"><Check size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     RENDER: Admin View
  ═══════════════════════════════════════════════════════════════ */
  const renderAdminView = () => (
    <div>
      <div style={styles.subTabRow}>
        <button style={{ ...styles.subTab, ...(adminTab === 'overview' ? styles.subTabActive : {}) }} onClick={() => setAdminTab('overview')}>
          <BarChart3 size={15} /> Overview
        </button>
        <button style={{ ...styles.subTab, ...(adminTab === 'shifts' ? styles.subTabActive : {}) }} onClick={() => setAdminTab('shifts')}>
          <Clock size={15} /> Shifts
        </button>
        <button style={{ ...styles.subTab, ...(adminTab === 'attendance' ? styles.subTabActive : {}) }} onClick={() => setAdminTab('attendance')}>
          <Users size={15} /> Attendance History
        </button>
      </div>

      {adminTab === 'shifts' && <AdminShifts />}
      {adminTab === 'attendance' && <AdminAttendance />}
      {adminTab === 'overview' && (
        <div style={styles.dashboardGrid}>
          <div style={styles.leftCol}>
            <div className="glass-panel" style={styles.adminStatsPanel}>
              <div style={styles.adminHeaderGrid}>
                {[
                  { label: 'Total Workforce', val: totalWorkforce },
                  { label: 'System Shifts', val: availableShifts?.length === 0 ? 'No shifts' : availableShifts.length },
                  { label: 'Avg Work Hrs', val: `${user.stats?.avgWorkingHours ?? 8.2} hr` },
                ].map(({ label, val }, i) => (
                  <div key={i}>
                    <div style={styles.miniCardLabel}>{label}</div>
                    <div style={styles.adminStatVal}>{val}</div>
                  </div>
                ))}
              </div>
              <hr style={styles.adminDivider} />
              <div style={styles.adminSummary}>
                <span style={styles.dotSuccess} />
                <span>Enterprise attendance: <strong>{user.stats?.overallAttendanceRate ?? 96.5}%</strong></span>
              </div>
            </div>

            <div className="glass-panel" style={styles.quickActionCard}>
              <h4 style={styles.quickActionTitle}>Global Admin Panel</h4>
              <p style={styles.quickActionDesc}>Provision accounts and manage departments.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  id="add-employee-btn"
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="btn-primary"
                  style={styles.actionBtn}
                >
                  <UserPlus size={16} /> Create Employee Account
                </button>
                <button
                  id="manage-dept-btn"
                  onClick={() => setShowManageDepartmentsModal(true)}
                  className="btn-primary"
                  style={{ ...styles.actionBtn, background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)' }}
                >
                  <Users size={16} /> Manage Departments
                </button>
              </div>
            </div>
          </div>

          <div style={styles.rightCol}>
            <div className="glass-panel" style={styles.deptCard}>
              <h3 style={styles.requestsHeading}>Department Logs</h3>
              <div style={styles.deptList}>
                {departmentStats.map((dept, i) => (
                  <div key={i} style={styles.deptItem}>
                    <span style={styles.deptName}>{dept.name}</span>
                    <div style={styles.deptRight}>
                      <span style={styles.deptCount}>{dept.count} members</span>
                      <span style={styles.deptRate}>{dept.attendance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ ...styles.deptCard, marginTop: '20px' }}>
              <h3 style={styles.requestsHeading}>Security Feed</h3>
              <div style={styles.alertList}>
                {(user.stats?.systemAlerts ?? []).map(alert => (
                  <div key={alert.id} style={styles.alertItem}>
                    <ShieldAlert size={16} color={alert.type === 'warning' ? 'var(--warning)' : 'var(--info)'} />
                    <div style={styles.alertText}>
                      <span>{alert.message}</span>
                      <span style={styles.alertTime}>{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HR: Add Employee Modal ── */}
      {showAddEmployeeModal && (
        <div style={styles.modalBg}>
          <div className="glass-panel" style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem' }}>Provision Account</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEmployee} style={styles.modalForm}>
              {[
                { label: 'Full Name', type: 'text', ph: 'e.g. John Miller', val: newEmployeeName, set: setNewEmployeeName },
                { label: 'Corporate Email', type: 'email', ph: 'e.g. j.miller@company.com', val: newEmployeeEmail, set: setNewEmployeeEmail },
                { label: 'Set Password', type: 'password', ph: 'Initial login password', val: newEmployeePass, set: setNewEmployeePass },
              ].map(({ label, type, ph, val, set }) => (
                <div key={label} style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>{label}</label>
                  <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} style={styles.modalInput} autoComplete="off" />
                </div>
              ))}

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Department</label>
                <select value={newEmployeeDept} onChange={e => setNewEmployeeDept(e.target.value)} style={styles.modalSelect}>
                  {departments.map(d => <option style={{ color: 'black' }} key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Role</label>
                <select value={newEmployeeRole} onChange={e => setNewEmployeeRole(e.target.value)} style={styles.modalSelect}>
                  <option style={{ color: 'black' }} value="employee">Employee</option>
                  <option style={{ color: 'black' }} value="manager">Manager</option>
                  <option style={{ color: 'black' }} value="admin">HR / Admin</option>
                </select>
              </div>

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Assign Shift</label>
                <select value={newEmployeeShift} onChange={e => setNewEmployeeShift(e.target.value)} style={styles.modalSelect}>
                  {availableShifts.map(s => (
                    <option style={{ color: 'black' }} key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>

              <button type="submit" id="confirm-provision-btn" className="btn-primary" style={{ marginTop: '12px' }}>
                Confirm &amp; Provision
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HR: Manage Departments Modal ── */}
      {showManageDepartmentsModal && (
        <div style={styles.modalBg}>
          <div className="glass-panel" style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem' }}>Manage Departments</h3>
              <button onClick={() => setShowManageDepartmentsModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <form onSubmit={handleAddDepartment} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="New Department Name"
                  value={newDepartmentName}
                  onChange={e => setNewDepartmentName(e.target.value)}
                  style={{ ...styles.modalInput, flex: 1 }}
                />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 24px' }}>Add</button>
              </form>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {departments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No departments found.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {departments.map(dept => (
                    <li key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{dept.name}</span>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                        title="Delete Department"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     ROOT RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={styles.layout}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          ...styles.toastCard,
          backgroundColor: toastType === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          boxShadow: toastType === 'success' ? '0 8px 30px rgba(16,185,129,0.3)' : '0 8px 30px rgba(239,68,68,0.3)',
        }}>
          {toastType === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navBrand}>
          <img src={companylogo} alt="companylogo" style={{ height: '100px', width: '150px', marginRight: '10px' }} />
        </div>

        <div style={styles.navUser}>

          <div 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '15px' }} 
            onClick={() => {
              setProfileAvatarUrl(user.avatar || '');
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowProfileModal(true);
            }}
            title="Edit Profile"
          >
            <Avatar src={user.avatar} name={user.name} role={user.role} size={42} />
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userRole}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} &bull; {user.department}
              </div>
            </div>
          </div>
          
          <button id="logout-btn" onClick={logout} style={styles.logoutBtn} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={styles.content}>
        <div style={styles.banner}>
          <h2 style={styles.bannerWelcome}>Welcome back, {user.name.split(' ')[0]}!</h2>
          <p style={styles.bannerSub}>Real-time attendance monitoring powered by SQL Server.</p>
        </div>

        {user.role === 'employee' && renderEmployeeView()}
        {user.role === 'manager' && renderManagerView()}
        {user.role === 'admin' && renderAdminView()}
      </main>

      {/* Leave Request Modal */}
      {showLeaveRequestModal && (
        <div style={styles.modalBg}>
          <div className="glass-panel" style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem' }}>Submit Leave Application</h3>
              <button onClick={() => setShowLeaveRequestModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleRequestLeave} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Leave Category</label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} style={styles.modalSelect}>
                  {['Sick Leave', 'Annual Leave', 'Casual Leave', 'Maternity Leave'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 3 days (May 24–26)"
                  value={leaveDuration}
                  onChange={e => setLeaveDuration(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Reason</label>
                <textarea
                  placeholder="Describe your reason…"
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  style={{ ...styles.modalInput, height: '90px', resize: 'none', fontFamily: 'var(--font-body)' }}
                />
              </div>
              <button type="submit" id="submit-leave-btn" className="btn-primary" style={{ marginTop: '10px' }}>
                File Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div style={styles.modalBg}>
          <div className="glass-panel" style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem' }}>Profile Settings</h3>
              <button onClick={() => setShowProfileModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateProfile} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Avatar Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={profileAvatarUrl}
                  onChange={e => setProfileAvatarUrl(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }} />
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Old Password (to change password)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Flexy Request Modal */}
      {showFlexyModal && (
        <div style={styles.modalBg}>
          <div className="glass-panel" style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem' }}>Request Flexy Hours</h3>
              <button onClick={() => setShowFlexyModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleRequestFlexy} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Date</label>
                <input
                  type="date"
                  value={flexyDate}
                  onChange={e => setFlexyDate(e.target.value)}
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Type</label>
                <select value={flexyType} onChange={e => setFlexyType(e.target.value)} style={styles.modalSelect}>
                  <option value="Morning Flexy">Morning Flexy (Late Login)</option>
                  <option value="Evening Flexy">Evening Flexy (Early Logout)</option>
                </select>
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Hours Requested</label>
                <select value={flexyHours} onChange={e => setFlexyHours(e.target.value)} style={styles.modalSelect}>
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                </select>
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Reason / Remarks</label>
                <textarea
                  placeholder="Describe your reason…"
                  value={flexyReason}
                  onChange={e => setFlexyReason(e.target.value)}
                  style={{ ...styles.modalInput, height: '90px', resize: 'none', fontFamily: 'var(--font-body)' }}
                  required
                />
              </div>
              <button type="submit" id="submit-flexy-btn" className="btn-primary" style={{ marginTop: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                File Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   Styles
═══════════════════════════════════════════════════════════════ */
const styles = {
  layout: { minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', position: 'relative' },
  navbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 32px', background: 'rgba(15,18,26,0.45)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', zIndex: 50 },
  navBrand: { display: 'flex', alignItems: 'center' },
  navUser: { display: 'flex', alignItems: 'center', gap: '12px' },
  userInfo: { display: 'flex', flexDirection: 'column' },
  userName: { fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' },
  userRole: { fontSize: '0.75rem', color: 'var(--text-secondary)' },
  logoutBtn: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: 'var(--text-secondary)', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  content: { flex: 1, padding: '36px', maxWidth: '1280px', width: '100%', margin: '0 auto' },
  banner: { marginBottom: '28px' },
  bannerWelcome: { fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' },
  bannerSub: { color: 'var(--text-secondary)', fontSize: '0.94rem' },

  /* Sub-tabs */
  subTabRow: { display: 'flex', gap: '8px', marginBottom: '24px' },
  subTab: { display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '10px', border: '1px solid var(--bg-card-border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' },
  subTabActive: { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--primary-color)', boxShadow: '0 0 0 1px var(--primary-color)' },

  /* Approval banner */
  approvalBanner: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '13px 18px', marginBottom: '20px', color: 'var(--success)', fontSize: '0.9rem' },

  /* Grid */
  dashboardGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },

  /* Clock */
  clockPanel: { padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  clockHeader: { display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'flex-start' },
  clockHeading: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' },
  clockTime: { fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 },
  clockCircleWrapper: { width: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0' },
  clockCircle: { width: '140px', height: '140px', borderRadius: '50%', border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s ease' },
  clockPulse: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  realtimeClock: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em', color: 'var(--text-primary)' },
  activeSince: { fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 },
  clockBtn: { width: '100%', padding: '13px' },
  officeLoc: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' },

  /* Stat mini cards */
  statsContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  statMiniCard: { padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' },
  miniCardVal: { fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' },
  miniCardLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 },

  /* Table */
  tableCard: { padding: '24px', height: '100%' },
  tableCardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' },
  tableTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' },
  badge: { fontSize: '0.73rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.10)', color: 'var(--primary-light)', fontWeight: 600 },
  refreshBtn: { fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--bg-card-border)', borderRadius: '8px', padding: '5px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  trHead: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  trBody: { borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '12px 12px', fontSize: '0.875rem', color: 'var(--text-secondary)' },
  emptyCell: { textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.9rem' },
  statusBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 },

  /* Leave Center */
  leaveCtaCard: { padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' },
  leaveCtaIcon: { width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(59,130,246,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  leaveCtaTitle: { fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' },
  leaveCtaDesc: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 },
  leaveList: { display: 'flex', flexDirection: 'column', gap: '2px' },
  leaveItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: '12px' },
  leaveItemLeft: { display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 },
  leaveItemType: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' },
  leaveItemDuration: { fontSize: '0.82rem', color: 'var(--text-secondary)' },
  leaveItemReason: { fontSize: '0.80rem', color: 'var(--text-muted)', fontStyle: 'italic' },

  /* Manager */
  managerHeaderCard: { padding: '24px' },
  managerHeaderGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  mgrStatItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' },
  mgrStatVal: { fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' },
  mgrStatLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 },
  teamGoalCard: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  goalHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  goalLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 },
  goalValue: { fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' },
  progressBarBg: { height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))', borderRadius: '10px', transition: 'width 0.8s ease' },
  goalFooter: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  requestsCard: { padding: '24px', minHeight: '240px' },
  requestsHeading: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' },
  emptyRequests: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px', color: 'var(--text-muted)' },
  requestsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  requestItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', gap: '12px' },
  reqDetails: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  reqName: { fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' },
  reqType: { fontSize: '0.82rem', color: 'var(--text-muted)' },
  reqReason: { fontSize: '0.80rem', color: 'var(--text-muted)', fontStyle: 'italic' },
  reqActions: { display: 'flex', gap: '8px' },
  actionReject: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionApprove: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(16,185,129,0.12)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  /* Admin */
  adminStatsPanel: { padding: '24px' },
  adminHeaderGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  adminStatVal: { fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' },
  adminDivider: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '16px 0' },
  adminSummary: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' },
  dotSuccess: { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', flexShrink: 0 },
  quickActionCard: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  quickActionTitle: { fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' },
  quickActionDesc: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 },
  actionBtn: {},
  deptCard: { padding: '24px' },
  deptList: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' },
  deptItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  deptName: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' },
  deptRight: { display: 'flex', gap: '12px', alignItems: 'center' },
  deptCount: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  deptRate: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' },
  alertList: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' },
  alertItem: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  alertText: { display: 'flex', flexDirection: 'column', gap: '2px' },
  alertTime: { fontSize: '0.75rem', color: 'var(--text-muted)' },

  /* Modal */
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '24px' },
  modalBody: { width: '100%', maxWidth: '440px', padding: '28px 32px', animation: 'fadeIn 0.25s ease' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  modalInputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  modalLabel: { fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' },
  modalInput: { width: '100%', padding: '11px 14px', background: 'var(--bg-input)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none' },
  modalSelect: { width: '100%', padding: '11px 14px', background: 'var(--bg-input)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' },

  /* Toast */
  toastCard: { position: 'fixed', top: '20px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.9rem', animation: 'fadeIn 0.3s ease', maxWidth: '360px' },
};
