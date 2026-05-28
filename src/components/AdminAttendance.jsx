import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Search, Download } from 'lucide-react';

export const AdminAttendance = () => {
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/history`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchDepartments();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterDept && log.department !== filterDept) return false;
    if (filterStatus && log.status !== filterStatus) return false;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      if (!log.userName.toLowerCase().includes(lower) && !log.shiftName.toLowerCase().includes(lower)) {
        return false;
      }
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Employee,Department,Shift,Start,End,Clock In,Clock Out,Total Hrs,Overtime,Status,Late,Early\n"
      + filteredLogs.map(l => 
          `${l.date},${l.userName},${l.department},${l.shiftName},${l.shiftStart},${l.shiftEnd},${l.clockIn},${l.clockOut},${l.hours},${l.overtimeHours},${l.status},${l.lateEntry?'Yes':'No'},${l.earlyExit?'Yes':'No'}`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Complete Attendance History</h3>
        <button className="btn-primary" onClick={handleExport} style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            placeholder="Search employee or shift..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '10px 10px 10px 36px' }}
          />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="glass-input" style={{ width: '200px', padding: '10px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
          <option style={{color:'black'}} value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept.id} style={{color:'black'}} value={dept.name}>{dept.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input" style={{ width: '200px', padding: '10px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
          <option style={{color:'black'}} value="">All Statuses</option>
          <option style={{color:'black'}} value="Present">Present</option>
          <option style={{color:'black'}} value="Active">Active</option>
          <option style={{color:'black'}} value="On Leave">On Leave</option>
        </select>
      </div>

      {loading ? (
        <p>Loading history...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Employee</th>
                <th style={{ padding: '10px' }}>Assigned Shift</th>
                <th style={{ padding: '10px' }}>In / Out</th>
                <th style={{ padding: '10px' }}>Hours</th>
                <th style={{ padding: '10px' }}>Metrics</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px' }}>{log.date}</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: '500' }}>{log.userName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.department}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div>{log.shiftName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.shiftStart} - {log.shiftEnd}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ color: log.lateEntry ? '#ef4444' : 'inherit' }}>In: {log.clockIn}</div>
                    <div style={{ color: log.earlyExit ? '#ef4444' : 'inherit' }}>Out: {log.clockOut}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>{log.hours}h</div>
                    {log.overtimeHours > 0 && <div style={{ fontSize: '0.8rem', color: '#10b981' }}>+{log.overtimeHours}h OT</div>}
                    {log.pendingHours > 0 && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>-{log.pendingHours}h Short</div>}
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.8rem' }}>
                    {log.lateEntry && <span style={{ color: '#ef4444', marginRight: '6px' }}>Late</span>}
                    {log.earlyExit && <span style={{ color: '#ef4444' }}>Early</span>}
                    {!log.lateEntry && !log.earlyExit && <span style={{ color: '#10b981' }}>On Time</span>}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                      background: log.status === 'Present' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                      color: log.status === 'Present' ? '#10b981' : '#3b82f6'
                    }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
