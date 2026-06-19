import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Download } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const ReportingManagerDashboard = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReport();
  }, [date]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/daily-attendance?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch report", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Basic CSV export
    if (data.length === 0) return;
    const headers = ['Employee ID', 'Name', 'Department', 'Shift', 'Punch In', 'Punch Out', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.map(r => `"${r.employeeId}","${r.name}","${r.department}","${r.shift || '---'}","${r.punchIn}","${r.punchOut}","${r.status}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `daily_attendance_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // filter data
  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    let bg = 'rgba(100, 116, 139, 0.1)';
    let color = '#64748b';
    let text = status;

    if (status === 'Present') {
      bg = 'rgba(16, 185, 129, 0.1)';
      color = '#10b981';
    } else if (status === 'Absent') {
      bg = 'rgba(239, 68, 68, 0.1)';
      color = '#ef4444';
    } else if (status === 'Late' || status === 'Early' || status === 'Late & Early') {
      bg = 'rgba(245, 158, 11, 0.1)';
      color = '#f59e0b';
    } else if (status === 'On Leave') {
      bg = 'rgba(59, 130, 246, 0.1)';
      color = '#3b82f6';
    } else if (status === 'Active') {
      bg = 'rgba(139, 92, 246, 0.1)';
      color = '#8b5cf6';
    }

    return (
      <span style={{
        background: bg, color: color,
        padding: '6px 12px', borderRadius: '20px',
        fontSize: '0.8rem', fontWeight: 600,
        display: 'inline-block'
      }}>
        {text}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.5s ease', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText className="text-blue-500" /> Reporting Manager
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Overview of employee daily attendance.</p>
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderRadius: '16px', 
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: '8px', padding: '0 12px', border: '1px solid var(--border-color)', flex: 1, minWidth: '250px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search by ID, Name or Department..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '12px', width: '100%', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: '8px', padding: '0 12px', border: '1px solid var(--border-color)' }}>
            <Calendar size={18} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '12px 0', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            />
          </div>
          
          <button onClick={handleExport} style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white', border: 'none', borderRadius: '8px',
            padding: '0 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 0.2s ease', height: '48px'
          }}>
            <Download size={18} /> Export
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px', fontWeight: 600 }}>Employee ID</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Shift</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Punch In</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Punch Out</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No records found for the selected date.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => (
                  <tr key={i} style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>{row.employeeId}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{row.department}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{row.shift || '---'}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '1.05rem' }}>{row.punchIn}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '1.05rem' }}>{row.punchOut}</td>
                    <td style={{ padding: '16px' }}>{getStatusBadge(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
