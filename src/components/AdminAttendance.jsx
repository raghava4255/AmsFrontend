import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Search, Download, Edit2, Trash2 } from 'lucide-react';
import { formatTime24h } from '../utils/time';
import { formatDateDDMMMYYYY } from '../utils/dateFormatter';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';

export const AdminAttendance = ({ userRole, userId }) => {
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [editingLog, setEditingLog] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');

  const fetchHistory = async () => {
    try {
      const url = userRole?.includes('manager') && userId 
        ? `${API_BASE_URL}/attendance/history?managerId=${userId}`
        : `${API_BASE_URL}/attendance/history`;
      const res = await fetch(url);
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
    if (filterStartDate && log.date < filterStartDate) return false;
    if (filterEndDate && log.date > filterEndDate) return false;
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
      + "Date,Employee,Department,Shift,Start,End,Clock In,Clock Out,In Location,Out Location,Total Hrs,Overtime,Status,Late,Early\n"
      + filteredLogs.map(l =>
        `${l.date},${l.userName},${l.department},${l.shiftName},${formatTime24h(l.shiftStart)},${formatTime24h(l.shiftEnd)},${formatTime24h(l.clockIn)},${formatTime24h(l.clockOut)},"${l.clockInAddress || ''}","${l.clockOutAddress || ''}",${l.hours},${l.overtimeHours},${l.status},${l.lateEntry ? 'Yes' : 'No'},${l.earlyExit ? 'Yes' : 'No'}`
      ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (log) => {
    setEditingLog(log);
    setEditClockIn(log.clockIn === '---' ? '' : log.clockIn);
    setEditClockOut(log.clockOut === '---' ? '' : log.clockOut);
  };

  const submitUpdateLog = async () => {
    if (!editClockIn || !editClockOut) {
      alert("Please enter both Clock In and Clock Out times.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLog.id,
          clockIn: editClockIn,
          clockOut: editClockOut,
          clockInLat: editingLog.clockInLat,
          clockInLng: editingLog.clockInLng,
          clockInAddress: editingLog.clockInAddress,
          clockOutLat: editingLog.clockOutLat,
          clockOutLng: editingLog.clockOutLng,
          clockOutAddress: editingLog.clockOutAddress
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update log.");

      setEditingLog(null);
      fetchHistory();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteClick = async (logId) => {
    if (!window.confirm("Are you sure you want to completely delete this log? This will remove its hours from the employee's metrics.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${logId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete log.");
      }
      fetchHistory();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Complete Attendance History</h3>
        {userRole !== 'manager' && (
          <button className="btn-primary" onClick={handleExport} style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search employee or shift..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '10px 10px 10px 36px' }}
          />
        </div>
        <DatePicker 
          selected={filterStartDate ? parseISO(filterStartDate) : null}
          onChange={date => setFilterStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
          dateFormat="dd-MMM-yyyy"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          placeholderText="Start Date"
          className="glass-input"
          wrapperClassName="date-picker-wrapper"
          customInput={<input style={{ width: '150px', padding: '10px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />}
          title="Start Date"
        />
        <DatePicker 
          selected={filterEndDate ? parseISO(filterEndDate) : null}
          onChange={date => setFilterEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
          dateFormat="dd-MMM-yyyy"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          placeholderText="End Date"
          className="glass-input"
          wrapperClassName="date-picker-wrapper"
          customInput={<input style={{ width: '150px', padding: '10px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }} />}
          title="End Date"
        />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="glass-input" style={{ width: '180px', padding: '10px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
          <option style={{ color: 'black' }} value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept.id} style={{ color: 'black' }} value={dept.name}>{dept.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input" style={{ width: '180px', padding: '10px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
          <option style={{ color: 'black' }} value="">All Statuses</option>
          <option style={{ color: 'black' }} value="Present">Present</option>
          <option style={{ color: 'black' }} value="Active">Active</option>
          <option style={{ color: 'black' }} value="On Leave">On Leave</option>
        </select>
      </div>

      {loading ? (
        <p>Loading history...</p>
      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Employee</th>
                <th style={{ padding: '10px' }}>Assigned Shift</th>
                <th style={{ padding: '10px', minWidth: '130px', whiteSpace: 'nowrap' }}>In / Out</th>
                <th style={{ padding: '10px', minWidth: '250px' }}>Location</th>
                <th style={{ padding: '10px' }}>Hours</th>
                <th style={{ padding: '10px' }}>Metrics</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatDateDDMMMYYYY(log.date)}</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: '500' }}>{log.userName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.department}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div>{log.shiftName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatTime24h(log.shiftStart)} - {formatTime24h(log.shiftEnd)}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {log.status === 'On Leave' ? (
                      <div style={{ color: 'var(--text-muted)' }}>---</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ color: log.lateEntry ? '#ef4444' : 'inherit', whiteSpace: 'nowrap' }}>In: {formatTime24h(log.clockIn)}</div>
                          <div style={{ color: log.earlyExit ? '#ef4444' : 'inherit', whiteSpace: 'nowrap' }}>Out: {formatTime24h(log.clockOut)}</div>
                        </div>
                        <button
                          onClick={() => handleEditClick(log)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '4px' }}
                          title="Edit In/Out Times"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(log.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Delete Log"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                      {log.clockInLat ? (
                        <a href={`https://www.google.com/maps?q=${log.clockInLat},${log.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                          In: {log.clockInAddress || `${log.clockInLat.toFixed(4)}, ${log.clockInLng.toFixed(4)}`}
                        </a>
                      ) : 'In: ---'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {log.clockOutLat ? (
                        <a href={`https://www.google.com/maps?q=${log.clockOutLat},${log.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                          Out: {log.clockOutAddress || `${log.clockOutLat.toFixed(4)}, ${log.clockOutLng.toFixed(4)}`}
                        </a>
                      ) : 'Out: ---'}
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>{log.hours}h</div>
                    {log.overtimeHours > 0 && <div style={{ fontSize: '0.8rem', color: '#10b981' }}>+{log.overtimeHours}h OT</div>}
                    {log.pendingHours > 0 && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>-{log.pendingHours}h Short</div>}
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.8rem' }}>
                    {log.status === 'On Leave' ? (
                      <span style={{ color: 'var(--text-muted)' }}>---</span>
                    ) : (
                      <span style={{
                        fontWeight: '700',
                        color: log.lateEntry || log.earlyExit ? '#ef4444' : '#10b981'
                      }}>
                        {log.lateEntry && log.earlyExit ? 'Late Early' : 
                         log.lateEntry ? 'Late' : 
                         log.earlyExit ? 'Early' : 'On Time'}
                      </span>
                    )}
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

      {/* Edit Log Modal */}
      {editingLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ padding: '24px', width: '400px', backgroundColor: 'var(--bg-dark)', borderRadius: '24px', border: '1px solid var(--bg-card-border)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Update Attendance Times</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>Updating log for {editingLog.userName} on {formatDateDDMMMYYYY(editingLog.date)}</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Clock In (e.g. 15:45)</label>
              <input
                value={editClockIn}
                onChange={e => setEditClockIn(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '10px' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Clock Out (e.g. 18:00)</label>
              <input
                value={editClockOut}
                onChange={e => setEditClockOut(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '10px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setEditingLog(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={submitUpdateLog}
                className="btn-primary"
                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

