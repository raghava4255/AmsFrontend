import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Bell, ChevronLeft, ChevronRight, Activity,
  CheckCircle2, AlertTriangle, Gift, LogOut, Compass,
  User, Check, AlertCircle, HelpCircle, Navigation, Shield
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, subMonths, addMonths, startOfWeek, endOfWeek, isSameMonth 
} from 'date-fns';
import { formatDateDDMMMYYYY } from '../utils/dateFormatter';

const EmployeeHome = ({
  user,
  clockedIn,
  clockInTime,
  handleClockInOut,
  activities,
  myLeaves,
  setShowLeaveRequestModal,
  setShowFlexyModal,
  currentAddress,
  setActiveMenu
}) => {
  // Real-time clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  
  const [gpsStatus, setGpsStatus] = useState('checking');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('disabled');
      return;
    }

    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (result.state === 'granted') {
            setGpsStatus('enabled');
          } else if (result.state === 'denied') {
            setGpsStatus('disabled');
          } else {
            // Prompt state - check by attempting a quick low accuracy lookup
            navigator.geolocation.getCurrentPosition(
              () => setGpsStatus('enabled'),
              () => setGpsStatus('disabled'),
              { enableHighAccuracy: false, timeout: 2000, maximumAge: 10000 }
            );
          }

          result.onchange = () => {
            if (result.state === 'granted') {
              setGpsStatus('enabled');
            } else {
              setGpsStatus('disabled');
            }
          };
        } else {
          navigator.geolocation.getCurrentPosition(
            () => setGpsStatus('enabled'),
            () => setGpsStatus('disabled'),
            { enableHighAccuracy: false, timeout: 2000, maximumAge: 10000 }
          );
        }
      } catch (err) {
        navigator.geolocation.getCurrentPosition(
          () => setGpsStatus('enabled'),
          () => setGpsStatus('disabled'),
          { enableHighAccuracy: false, timeout: 2000 }
        );
      }
    };

    checkPermission();
  }, []);

  // MOCK NOTIFICATIONS
  const mockNotifications = [
    { id: 1, type: 'alert', title: 'Missing Punch', message: 'You have a missing punch on June 5th.', time: '2h ago', read: false },
    { id: 2, type: 'success', title: 'Leave Approved', message: 'Your casual leave for June 12th was approved.', time: '1d ago', read: true },
    { id: 3, type: 'info', title: 'Company Announcement', message: 'Townhall meeting scheduled for Friday 3PM.', time: '2d ago', read: true }
  ];

  // 1. STATS CALCULATIONS
  const stats = user?.stats || {};
  const leaveBalance = stats.leaveBalance ?? user?.leaveBalance ?? 15;
  const pendingLeavesCount = (myLeaves || []).filter(l => l?.status === 'Pending').length;

  // Selected year and month string (e.g. "2026-06")
  const selectedYearMonthStr = useMemo(() => {
    return format(currentDate, 'yyyy-MM');
  }, [currentDate]);

  // Public holidays list
  const publicHolidays = useMemo(() => [
    '2026-01-01', // New Year
    '2026-01-26', // Republic Day
    '2026-03-13', // Holi
    '2026-04-02', // Good Friday
    '2026-05-01', // May Day
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-11-09', // Diwali
    '2026-12-25', // Christmas
  ], []);

  // Filter activities for the selected month
  const activitiesThisMonth = useMemo(() => {
    return (activities || []).filter(a => a?.date && a.date.startsWith(selectedYearMonthStr));
  }, [activities, selectedYearMonthStr]);

  // Completed days in the selected month
  const completedDaysThisMonth = useMemo(() => {
    return activitiesThisMonth.filter(a => a.clockOut && a.clockOut !== '---').length;
  }, [activitiesThisMonth]);

  const casualLeaves = Math.floor(leaveBalance * 0.4);
  const sickLeaves = Math.floor(leaveBalance * 0.3);
  const earnedLeaves = Math.max(0, leaveBalance - casualLeaves - sickLeaves);

  const isOnLeaveToday = (activities || []).some(a => a?.status === 'On Leave' && a?.date === format(now, 'yyyy-MM-dd'));

  const formatTime24h = (timeStr) => {
    if (!timeStr || timeStr === '---') return '---';
    return timeStr;
  };

  // Find today's log for location display
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayLog = useMemo(() => {
    return (activities || []).find(a => a.date === todayStr);
  }, [activities, todayStr]);

  // 2. CALENDAR LOGIC
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); 
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  function getApprovedLeaveForDate(date) {
    const targetStr = format(date, 'yyyy-MM-dd');
    return (myLeaves || []).find(l => {
      if (l.status !== 'Approved') return false;
      const parts = l.duration?.split('|');
      if (parts && parts.length >= 3) {
        const startStr = parts[1]; // yyyy-MM-dd
        const endStr = parts[2]; // yyyy-MM-dd
        return targetStr >= startStr && targetStr <= endStr;
      }
      return false;
    });
  }

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Holiday check
    if (publicHolidays.includes(dateStr)) {
      return {
        type: 'holiday',
        color: 'rgba(139, 92, 246, 0.12)',
        textColor: '#8b5cf6',
        label: 'H',
        text: 'Public Holiday'
      };
    }

    const log = (activities || []).find(a => a?.date === dateStr);
    
    // Future dates check
    if (date > new Date()) {
      const leave = getApprovedLeaveForDate(date);
      if (leave) {
        return { 
          type: 'leave', 
          color: 'rgba(16, 185, 129, 0.12)', 
          textColor: '#10b981', 
          label: 'L', 
          text: `Leave: ${leave.type}` 
        };
      }
      return { type: 'future', color: 'transparent', textColor: '#cbd5e1', label: '', text: 'Future' };
    }
    
    // Log exists
    if (log) {
      if (log.status === 'Present' || log.status === 'Active') {
        const hrsText = log.hours ? ` (${Number(log.hours).toFixed(1)}h)` : '';
        return { 
          type: 'present', 
          color: 'rgba(59, 130, 246, 0.12)', 
          textColor: '#3b82f6', 
          label: 'P', 
          text: `Present${hrsText}` 
        };
      }
      if (log.status === 'On Leave') {
        return { 
          type: 'leave', 
          color: 'rgba(16, 185, 129, 0.12)', 
          textColor: '#10b981', 
          label: 'L', 
          text: 'Approved Leave' 
        };
      }
    }
    
    // Check approved leaves in myLeaves
    const leave = getApprovedLeaveForDate(date);
    if (leave) {
      return { 
        type: 'leave', 
        color: 'rgba(16, 185, 129, 0.12)', 
        textColor: '#10b981', 
        label: 'L', 
        text: `Leave: ${leave.type}` 
      };
    }
    
    // Weekoff check
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { 
        type: 'weekoff', 
        color: 'rgba(100, 116, 139, 0.08)', 
        textColor: '#64748b', 
        label: 'W', 
        text: 'Weekly Off' 
      };
    }
    
    // Today pending check
    if (isSameDay(date, new Date())) {
      return {
        type: 'today_pending',
        color: 'rgba(245, 158, 11, 0.12)', 
        textColor: '#f59e0b',
        label: 'T',
        text: 'Today (Pending)'
      };
    }
    
    // Absent
    return { 
      type: 'absent', 
      color: 'rgba(239, 68, 68, 0.12)', 
      textColor: '#ef4444', 
      label: 'A', 
      text: 'Absent' 
    };
  };

  const monthStats = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    let present = 0;
    let absent = 0;
    let leave = 0;
    let weekoff = 0;
    let holiday = 0;
    
    days.forEach(d => {
      const status = getDayStatus(d);
      if (status.type === 'present') {
        present++;
      } else if (status.type === 'absent') {
        absent++;
      } else if (status.type === 'leave') {
        leave++;
      } else if (status.type === 'weekoff') {
        weekoff++;
      } else if (status.type === 'holiday') {
        holiday++;
      }
    });
    
    return { present, absent, leave, weekoff, holiday };
  }, [currentDate, activities, myLeaves, publicHolidays]);

  const totalWorkingDaysThisMonth = monthStats.present + monthStats.absent;
  const attendancePercentage = totalWorkingDaysThisMonth > 0 
    ? Math.round((monthStats.present / totalWorkingDaysThisMonth) * 100) 
    : 100;

  // 3. PIE CHART DATA (Donut in Statistics Card)
  const donutData = useMemo(() => {
    return [
      { name: 'Present', value: monthStats.present, color: '#3b82f6' },
      { name: 'Absent', value: monthStats.absent, color: '#ef4444' },
      { name: 'On Leave', value: monthStats.leave, color: '#10b981' },
      { name: 'Weekly Off', value: monthStats.weekoff, color: '#64748b' },
      { name: 'Holidays', value: monthStats.holiday, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
  }, [monthStats]);

  // 4. GRAPH DATA (Monthly Scheduled vs Worked Hours)
  const graphData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStr = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM');
      
      // Filter activities for this month
      const logs = (activities || []).filter(a => a?.date && a.date.startsWith(monthStr));
      
      // Sum actual worked hours
      const worked = logs.reduce((sum, log) => sum + (log.hours || 0), 0);
      
      // Calculate total scheduled hours for this month (excluding weekends)
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start, end });
      let scheduled = 0;
      days.forEach(d => {
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          scheduled += 8;
        }
      });
      
      data.push({
        day: monthLabel,
        worked: Math.round(worked * 100) / 100,
        scheduled: scheduled
      });
    }
    return data;
  }, [activities]);

  // Overtime chart data has been replaced by the dynamic monthly attendance calendar

  // Exceptions
  const lateComingCount = useMemo(() => {
    return (activities || []).filter(a => a.lateEntry).length;
  }, [activities]);

  const earlyGoingCount = useMemo(() => {
    return (activities || []).filter(a => a.earlyExit).length;
  }, [activities]);

  // CSS Styles for white theme matching the screenshot
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      width: '100%',
      backgroundColor: '#f8fafc',
      padding: '4px 0 24px 0'
    },
    topRow: {
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      gap: '24px'
    },
    statsCard: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)'
    },
    cardTitle: {
      fontSize: '0.95rem',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '16px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    donutContainer: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '180px'
    },
    donutCenterText: {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    },
    donutPercentage: {
      fontSize: '1.6rem',
      fontWeight: '800',
      color: '#0f172a'
    },
    donutSub: {
      fontSize: '0.75rem',
      color: '#64748b',
      fontWeight: '500'
    },
    attendanceGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '16px'
    },
    attMiniCard: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    },
    attIconWrapper: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '12px'
    },
    attValue: {
      fontSize: '1.8rem',
      fontWeight: '800',
      color: '#0f172a',
      lineHeight: '1.2'
    },
    attLabel: {
      fontSize: '0.78rem',
      fontWeight: '600',
      color: '#64748b',
      marginTop: '4px'
    },
    middleRow: {
      display: 'grid',
      gridTemplateColumns: '2.2fr 1fr',
      gap: '24px'
    },
    chartCard: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column'
    },
    calendarCard: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '24px'
    },
    calendarOverviewGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      alignContent: 'start'
    },
    calendarOverviewCard: {
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '12px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
      transition: 'transform 0.2s'
    },
    calendarAttIconWrapper: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '6px'
    },
    calendarAttValue: {
      fontSize: '1.4rem',
      fontWeight: '800',
      color: '#0f172a',
      lineHeight: '1.2'
    },
    calendarAttLabel: {
      fontSize: '0.72rem',
      fontWeight: '600',
      color: '#64748b',
      marginTop: '2px'
    },
    calendarHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    calendarNav: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    calendarNavBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      color: '#475569',
      transition: 'all 0.2s',
      outline: 'none'
    },
    calendarMonthTitle: {
      fontSize: '0.9rem',
      fontWeight: '700',
      color: '#0f172a',
      minWidth: '100px',
      textAlign: 'center'
    },
    calendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '6px'
    },
    calendarWeekDay: {
      fontSize: '0.7rem',
      fontWeight: '700',
      color: '#64748b',
      textAlign: 'center',
      padding: '4px 0',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    calendarCell: {
      aspectRatio: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 4px',
      borderRadius: '8px',
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.2s ease',
      border: '1px solid transparent'
    },
    calendarLegend: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      justifyContent: 'center',
      marginTop: '6px',
      paddingTop: '10px',
      borderTop: '1px solid #f1f5f9'
    },
    calendarLegendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.72rem',
      color: '#475569',
      fontWeight: '600'
    },
    calendarLegendDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%'
    },
    chartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    toggleContainer: {
      display: 'flex',
      backgroundColor: '#f1f5f9',
      padding: '3px',
      borderRadius: '8px'
    },
    toggleBtn: {
      padding: '6px 12px',
      fontSize: '0.75rem',
      fontWeight: '600',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    activeToggle: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    inactiveToggle: {
      backgroundColor: 'transparent',
      color: '#64748b'
    },
    sourceGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '12px',
      marginTop: '8px'
    },
    sourceBox: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column'
    },
    sourceVal: {
      fontSize: '1.4rem',
      fontWeight: '800',
      color: '#0f172a'
    },
    sourceLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      fontWeight: '500',
      marginTop: '2px'
    },
    bottomRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.2fr 0.8fr',
      gap: '24px'
    },
    exceptionsBox: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    punchCard: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      border: '1px solid #3b82f630',
      boxShadow: '0 4px 12px rgba(59,130,246,0.04)',
      padding: '24px'
    },
    punchTimeDisplay: {
      fontFamily: 'monospace',
      fontSize: '2.4rem',
      fontWeight: '800',
      color: '#1e293b',
      textAlign: 'center',
      letterSpacing: '1px',
      margin: '10px 0'
    },
    punchDateDisplay: {
      fontSize: '0.9rem',
      color: '#64748b',
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: '20px'
    },
    btnPunch: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '14px',
      borderRadius: '12px',
      border: 'none',
      color: '#ffffff',
      fontWeight: '700',
      fontSize: '1rem',
      cursor: 'pointer',
      width: '100%',
      transition: 'all 0.2s',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
    },
    locIndicator: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#f1f5f9',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '0.8rem',
      border: '1px solid #e2e8f0'
    },
    locRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      color: '#475569'
    },
    tableWrapper: {
      overflowX: 'auto',
      marginTop: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '12px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.88rem',
      textAlign: 'left'
    },
    th: {
      backgroundColor: '#f8fafc',
      color: '#475569',
      fontWeight: '700',
      padding: '12px 16px',
      borderBottom: '1px solid #e2e8f0'
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #e2e8f0',
      color: '#1e293b',
      verticalAlign: 'middle'
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.78rem',
      fontWeight: '700'
    },
    progressBarBg: {
      height: '6px',
      backgroundColor: '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '6px'
    },
    progressBarFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.4s ease'
    }
  };

  return (
    <div style={styles.container}>
      
      {/* TOP ROW: STATISTICS & 6 ATTENDANCE CARDS */}
      <div style={styles.topRow}>
        
        {/* Statistics Circle Donut */}
        <div style={styles.statsCard}>
          <div style={styles.cardTitle}>My Statistics</div>
          <div style={styles.donutContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.donutCenterText}>
              <span style={styles.donutPercentage}>{attendancePercentage}%</span>
              <span style={styles.donutSub}>Attendance</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></span>
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Working Hours chart */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div style={{fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Monthly Scheduled vs Worked Hours</div>
          </div>
          <div style={{height: '220px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: '500' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: '500' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '0.8rem' }}
                />
                <Bar dataKey="scheduled" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={10} name="Scheduled" />
                <Bar dataKey="worked" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={10} name="Worked">
                  {graphData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.worked >= entry.scheduled ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* MIDDLE ROW: ATTENDANCE CALENDAR & ATTENDANCE SOURCE */}
      <div style={styles.middleRow}>

        {/* Monthly Attendance Calendar (with integrated statistics) */}
        <div style={styles.calendarCard}>
          
          {/* LEFT PANEL: Navigation, Days, Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={styles.calendarHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <CalendarIcon size={18} color="#3b82f6" />
                <div style={{fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Attendance Calendar</div>
              </div>
              
              <div style={styles.calendarNav}>
                <button 
                  onClick={prevMonth} 
                  style={styles.calendarNavBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={styles.calendarMonthTitle}>
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <button 
                  onClick={nextMonth} 
                  style={styles.calendarNavBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div style={styles.calendarGrid}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={styles.calendarWeekDay}>{d}</div>
              ))}

              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = getDayStatus(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    style={{
                      ...styles.calendarCell,
                      backgroundColor: status.color,
                      color: status.textColor,
                      opacity: isCurrentMonth ? 1 : 0.35,
                      border: isToday ? '1.5px solid #3b82f6' : '1px solid transparent',
                      boxShadow: isToday ? '0 0 6px rgba(59, 130, 246, 0.2)' : 'none',
                      transform: hoveredDate === dateStr ? 'scale(1.08)' : 'scale(1)',
                      zIndex: hoveredDate === dateStr ? 10 : 1,
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>
                      {format(day, 'd')}
                    </span>
                    
                    {status.label && (
                      <span style={{ 
                        fontSize: '0.62rem', 
                        fontWeight: '800', 
                        opacity: 0.9,
                        marginTop: '1px'
                      }}>
                        {status.label}
                      </span>
                    )}

                    {hoveredDate === dateStr && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%) translateY(-6px)',
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        zIndex: 50,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        pointerEvents: 'none'
                      }}>
                        <div style={{ fontWeight: '700', marginBottom: '2px', color: '#f8fafc' }}>
                          {format(day, 'dd MMMM yyyy')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <span style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            backgroundColor: status.textColor 
                          }} />
                          {status.text}
                        </div>
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '0',
                          height: '0',
                          borderLeft: '5px solid transparent',
                          borderRight: '5px solid transparent',
                          borderTop: '5px solid #1e293b'
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={styles.calendarLegend}>
              {[
                { label: 'Present', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
                { label: 'Absent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
                { label: 'Leave', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
                { label: 'Week Off', color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' },
                { label: 'Holiday', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' }
              ].map(item => (
                <div key={item.label} style={styles.calendarLegendItem}>
                  <span style={{
                    ...styles.calendarLegendDot,
                    backgroundColor: item.color
                  }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
 
          {/* RIGHT PANEL: Monthly Attendance Overview Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{...styles.cardTitle, marginBottom: '0'}}>Monthly Overview</div>
            
            <div style={styles.calendarOverviewGrid}>
              {/* Present / Checked In */}
              <div 
                style={styles.calendarOverviewCard}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.01)'; }}
              >
                <div style={{...styles.calendarAttIconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.1)'}}>
                  <CheckCircle2 size={16} color="#3b82f6" />
                </div>
                <span style={styles.calendarAttValue}>{monthStats.present}</span>
                <span style={styles.calendarAttLabel}>Present Days</span>
              </div>
 
              {/* Absent / Not Checked In */}
              <div 
                style={styles.calendarOverviewCard}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.01)'; }}
              >
                <div style={{...styles.calendarAttIconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.1)'}}>
                  <AlertTriangle size={16} color="#ef4444" />
                </div>
                <span style={{...styles.calendarAttValue, color: '#ef4444'}}>{monthStats.absent}</span>
                <span style={{...styles.calendarAttLabel, color: '#e11d48'}}>Absent Days</span>
              </div>
 
              {/* On Leave */}
              <div 
                style={styles.calendarOverviewCard}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.01)'; }}
              >
                <div style={{...styles.calendarAttIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.1)'}}>
                  <Compass size={16} color="#10b981" />
                </div>
                <span style={{...styles.calendarAttValue, color: '#10b981'}}>{monthStats.leave}</span>
                <span style={{...styles.calendarAttLabel, color: '#10b981'}}>Approved Leaves</span>
              </div>
 
              {/* Weekly Off */}
              <div 
                style={styles.calendarOverviewCard}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.01)'; }}
              >
                <div style={{...styles.calendarAttIconWrapper, backgroundColor: 'rgba(100, 116, 139, 0.1)'}}>
                  <CalendarIcon size={16} color="#64748b" />
                </div>
                <span style={styles.calendarAttValue}>{monthStats.weekoff}</span>
                <span style={styles.calendarAttLabel}>Weekly Offs</span>
              </div>
 
              {/* Completed Days */}
              <div 
                style={{
                  ...styles.calendarOverviewCard,
                  gridColumn: 'span 2'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.01)'; }}
              >
                <div style={{...styles.calendarAttIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.1)'}}>
                  <LogOut size={16} color="#f59e0b" />
                </div>
                <span style={{...styles.calendarAttValue, color: '#f59e0b'}}>{completedDaysThisMonth}</span>
                <span style={styles.calendarAttLabel}>Completed Days</span>
              </div>
            </div>
          </div>

        </div>

        {/* Attendance Source */}
        <div style={styles.chartCard}>
          <div style={styles.cardTitle}>Attendance Source</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
            <div style={styles.sourceGrid}>
              <div style={styles.sourceBox}>
                <span style={{...styles.sourceVal, color: isOnline ? '#10b981' : '#ef4444'}}>
                  {isOnline ? 'Active' : 'Offline'}
                </span>
                <span style={styles.sourceLabel}>Device Status</span>
              </div>
            </div>
            <div style={{
              ...styles.sourceBox,
              marginTop: '0',
              borderColor: gpsStatus === 'disabled' ? '#ef444430' : '#e2e8f0',
              backgroundColor: gpsStatus === 'disabled' ? '#fef2f2' : '#f8fafc',
              transition: 'all 0.3s ease'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: gpsStatus === 'disabled' ? '#ef4444' : '#1e293b'
                  }}>
                    GPS Verification {gpsStatus === 'disabled' && '(Disabled)'}
                  </span>
                  <p style={{
                    fontSize: '0.7rem',
                    color: gpsStatus === 'disabled' ? '#ef4444' : '#64748b',
                    marginTop: '2px'
                  }}>
                    {gpsStatus === 'enabled' ? 'Geofencing is active' : 
                     gpsStatus === 'disabled' ? 'Location services are disabled' : 'Checking GPS status...'}
                  </p>
                </div>
                <Shield size={24} color={gpsStatus === 'enabled' ? '#10b981' : gpsStatus === 'disabled' ? '#ef4444' : '#64748b'} style={{opacity: 0.8}} />
              </div>
            </div>
            <button 
              onClick={() => setActiveMenu && setActiveMenu('Leaves')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #3b82f630',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                color: '#3b82f6',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s ease',
                marginTop: '4px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'; }}
            >
              <CalendarIcon size={16} />
              Manage Leaves
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: PUNCH PANEL, LEAVE BALANCE, EXCEPTIONS & PENDING REQUESTS */}
      <div style={styles.bottomRow}>
        
        {/* Punch In / Out Panel */}
        <div style={{...styles.chartCard, ...styles.punchCard}}>
          <div style={{...styles.cardTitle, textAlign: 'center', marginBottom: '8px'}}>Real-Time Attendance Terminal</div>
          <div style={styles.punchTimeDisplay}>{format(now, 'HH:mm:ss')}</div>
          <div style={styles.punchDateDisplay}>{format(now, 'dd-MMM-yyyy')}</div>

          <button 
            onClick={handleClockInOut} 
            disabled={isOnLeaveToday}
            style={{
              ...styles.btnPunch,
              backgroundColor: isOnLeaveToday ? '#cbd5e1' : (clockedIn ? '#ef4444' : '#3b82f6'),
              opacity: isOnLeaveToday ? 0.5 : 1,
              cursor: isOnLeaveToday ? 'not-allowed' : 'pointer'
            }}
          >
            <Clock size={20} />
            {isOnLeaveToday ? 'ON LEAVE TODAY' : (clockedIn ? 'PUNCH OUT' : 'PUNCH IN')}
          </button>

          {/* Today's Punch Location Details */}
          <div style={styles.locIndicator}>
            <div style={styles.locRow}>
              <MapPin size={15} color="#3b82f6" style={{marginTop: '2px', flexShrink: '0'}} />
              <div>
                <strong style={{fontSize: '0.75rem', display: 'block', color: '#1e293b'}}>In Location:</strong>
                {todayLog && todayLog.clockInLat ? (
                  <a href={`https://www.google.com/maps?q=${todayLog.clockInLat},${todayLog.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', wordBreak: 'break-all' }}>
                    {todayLog.clockInAddress || `${todayLog.clockInLat.toFixed(4)}, ${todayLog.clockInLng.toFixed(4)}`}
                  </a>
                ) : clockedIn ? (
                  <span style={{color: '#64748b'}}>{currentAddress}</span>
                ) : '---'}
              </div>
            </div>

            <div style={{...styles.locRow, borderTop: '1px solid #e2e8f0', paddingTop: '8px'}}>
              <MapPin size={15} color="#f59e0b" style={{marginTop: '2px', flexShrink: '0'}} />
              <div>
                <strong style={{fontSize: '0.75rem', display: 'block', color: '#1e293b'}}>Out Location:</strong>
                {todayLog && todayLog.clockOutLat ? (
                  <a href={`https://www.google.com/maps?q=${todayLog.clockOutLat},${todayLog.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none', wordBreak: 'break-all' }}>
                    {todayLog.clockOutAddress || `${todayLog.clockOutLat.toFixed(4)}, ${todayLog.clockOutLng.toFixed(4)}`}
                  </a>
                ) : clockedIn ? (
                  <span style={{color: '#64748b'}}>{currentAddress}</span>
                ) : '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Leave & Flexy Request / Exceptions & Pending Requests Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Exceptions Box */}
          <div style={styles.chartCard}>
            <div style={styles.cardTitle}>Exceptions</div>
            <div style={styles.exceptionsBox}>
              <div style={{backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '1.6rem', fontWeight: '800', color: '#ef4444'}}>{lateComingCount}</span>
                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '4px'}}>Late Coming</span>
              </div>
              <div style={{backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b'}}>{earlyGoingCount}</span>
                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '4px'}}>Early Going</span>
              </div>
            </div>
          </div>

          {/* Pending Requests Box */}
          <div style={styles.chartCard}>
            <div style={styles.cardTitle}>Pending Requests</div>
            <div style={styles.exceptionsBox}>
              <div style={{backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '1.6rem', fontWeight: '800', color: '#3b82f6'}}>{pendingLeavesCount}</span>
                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '4px'}}>Leave Requests</span>
              </div>
              <div style={{backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6'}}>{pendingLeavesCount}</span>
                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '4px'}}>Regularizations</span>
              </div>
            </div>
          </div>

        </div>

        {/* Leave Balance Box */}
        <div style={styles.chartCard}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px'}}>
            <div style={{fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Leave Balance</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <span>Casual Leave (CL)</span>
                <span>{casualLeaves} Days</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: '40%', backgroundColor: '#f59e0b' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <span>Sick Leave (SL)</span>
                <span>{sickLeaves} Days</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: '60%', backgroundColor: '#ef4444' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <span>Earned Leave (EL)</span>
                <span>{earnedLeaves} Days</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: '25%', backgroundColor: '#3b82f6' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RECENT PUNCHE ACTIVITY WITH LOCATION ADDRESSES & GOOGLE MAPS LINKS */}
      <div style={styles.chartCard}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px'}}>
          <div style={{fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Recent Activity &amp; Geolocation Logs</div>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Punch In</th>
                <th style={styles.th}>Punch Out</th>
                <th style={styles.th}>Worked Hours</th>
                <th style={styles.th}>In Location</th>
                <th style={styles.th}>Out Location</th>
                <th style={styles.th}>Metrics</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(activities || []).slice(0, 8).map((log, i) => (
                <tr key={log.id || i}>
                  <td style={{...styles.td, fontWeight: '600', whiteSpace: 'nowrap'}}>{formatDateDDMMMYYYY(log.date)}</td>
                  <td style={styles.td}>{formatTime24h(log.clockIn)}</td>
                  <td style={styles.td}>{formatTime24h(log.clockOut)}</td>
                  <td style={{...styles.td, fontFamily: 'monospace', fontWeight: '700'}}>{log.hours ? Number(log.hours).toFixed(2) + 'h' : '---'}</td>
                  
                  {/* Punch In Location column */}
                  <td style={styles.td}>
                    {log.clockInLat ? (
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <MapPin size={14} color="#3b82f6" />
                        <a href={`https://www.google.com/maps?q=${log.clockInLat},${log.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.8rem' }} title={log.clockInAddress}>
                          {log.clockInAddress ? (log.clockInAddress.substring(0, 25) + '...') : `${log.clockInLat.toFixed(3)}, ${log.clockInLng.toFixed(3)}`}
                        </a>
                      </div>
                    ) : '---'}
                  </td>

                  {/* Punch Out Location column */}
                  <td style={styles.td}>
                    {log.clockOutLat ? (
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <MapPin size={14} color="#f59e0b" />
                        <a href={`https://www.google.com/maps?q=${log.clockOutLat},${log.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none', fontSize: '0.8rem' }} title={log.clockOutAddress}>
                          {log.clockOutAddress ? (log.clockOutAddress.substring(0, 25) + '...') : `${log.clockOutLat.toFixed(3)}, ${log.clockOutLng.toFixed(3)}`}
                        </a>
                      </div>
                    ) : '---'}
                  </td>

                  {/* Metrics column */}
                  <td style={styles.td}>
                    {log.status === 'On Leave' ? (
                      <span style={{ color: '#64748b' }}>---</span>
                    ) : (
                      <span style={{
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        color: log.lateEntry || log.earlyExit ? '#ef4444' : '#10b981'
                      }}>
                        {log.lateEntry && log.earlyExit ? 'Late Early' : 
                         log.lateEntry ? 'Late' : 
                         log.earlyExit ? 'Early' : 'On Time'}
                      </span>
                    )}
                  </td>

                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: log.status === 'Present' || log.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 
                                       log.status === 'On Leave' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: log.status === 'Present' || log.status === 'Active' ? '#10b981' : 
                             log.status === 'On Leave' ? '#f59e0b' : '#64748b'
                    }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!activities || activities.length === 0) && (
                <tr>
                  <td colSpan="8" style={{...styles.td, textAlign: 'center', color: '#64748b'}}>No recent activity found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default EmployeeHome;
