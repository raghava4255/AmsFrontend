import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatTime24h } from '../utils/time';
import { formatDateDDMMMYYYY } from '../utils/dateFormatter';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  LogOut, Calendar, Clock, Award, Check, X, AlertCircle, Plus,
  Users, UserCheck, ShieldAlert, BarChart3, UserPlus, MapPin,
  Sun, Moon, FileText, CheckCircle, XCircle, Hourglass, Mail,
  LayoutDashboard, Layers, Settings, HelpCircle, Bell, Menu, Info, Trash2
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import companylogo from "../assets/company logo.png"
import { PasswordPolicyContext } from '../context/PasswordPolicyContext';
import { validatePassword } from '../utils/passwordValidator';
import PasswordCriteria from './PasswordCriteria';
import { updatePasswordPolicy } from '../services/passwordPolicyService';

import { AdminShifts } from './AdminShifts';
import { AdminAttendance } from './AdminAttendance';
import { AdminEmployees } from './AdminEmployees';
import { AdminEmails } from './AdminEmails';
import EmployeeHome from './EmployeeHome';
import CredentialApprovalModal from './CredentialApprovalModal';
import { ReportingManagerDashboard } from './ReportingManagerDashboard';
import { getCurrentPosition, reverseGeocode } from '../utils/location';

/* ── Helper: extract initials from full name ─────────────────── */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const renderSignature = (sig) => {
  if (!sig) return null;
  if (sig.startsWith('data:image')) {
    return <img src={sig} alt="Signature" style={{ height: '24px', verticalAlign: 'middle', marginLeft: '6px' }} />;
  }
  return <strong style={{ marginLeft: '4px' }}>{sig}</strong>;
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
const LeaveStatusBadge = ({ status, tlStatus, hrStatus, tlName, hrName }) => {
  const getCfg = (s) => ({
    Pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: <Hourglass size={13} /> },
    'Pending HR Approval': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: <Hourglass size={13} /> },
    Approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: <CheckCircle size={13} /> },
    Rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: <XCircle size={13} /> },
  }[s] || { bg: 'rgba(100,116,139,0.12)', color: '#64748b', icon: null });

  const mainCfg = getCfg(status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: mainCfg.bg, color: mainCfg.color,
        padding: '4px 10px', borderRadius: '20px',
        fontSize: '0.78rem', fontWeight: 600,
      }}>
        {mainCfg.icon}{status}
      </span>
      {tlStatus && tlStatus !== 'Pending' && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          TL: <strong style={{ color: getCfg(tlStatus).color }}>{tlStatus}</strong> {tlName && <span>by {renderSignature(tlName)}</span>}
        </div>
      )}
      {hrStatus && hrStatus !== 'Pending' && hrStatus !== 'N/A' && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          HR: <strong style={{ color: getCfg(hrStatus).color }}>{hrStatus}</strong> {hrName && <span>by {renderSignature(hrName)}</span>}
        </div>
      )}
    </div>
  );
};

/* ── SVG Chart: Weekly Attendance Trend ──────────────────────── */
const WeeklyTrendChart = ({ trendData }) => {
  if (!trendData || trendData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No trend data available.
      </div>
    );
  }

  const width = 500;
  const height = 200;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = Math.max(
    ...trendData.map(d => d.present || 0),
    ...trendData.map(d => d.late || 0),
    5
  );

  const getX = (index) => {
    if (trendData.length <= 1) return width / 2;
    return paddingX + (index * (width - paddingX * 2)) / (trendData.length - 1);
  };

  const getY = (val) => {
    return height - paddingY - (val / maxVal) * (height - paddingY * 2);
  };

  // Generate path points
  const presentPoints = trendData.map((d, i) => `${getX(i)},${getY(d.present || 0)}`).join(' ');
  const latePoints = trendData.map((d, i) => `${getX(i)},${getY(d.late || 0)}`).join(' ');

  // Generate fill areas
  const presentAreaPoints = trendData.length > 0
    ? `${getX(0)},${height - paddingY} ` + presentPoints + ` ${getX(trendData.length - 1)},${height - paddingY}`
    : '';
  const lateAreaPoints = trendData.length > 0
    ? `${getX(0)},${height - paddingY} ` + latePoints + ` ${getX(trendData.length - 1)},${height - paddingY}`
    : '';

  // Grid lines
  const gridLines = [];
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y = paddingY + (i * (height - paddingY * 2)) / gridCount;
    const val = Math.round(maxVal - (i * maxVal) / gridCount);
    gridLines.push(
      <g key={i}>
        <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />
        <text x={paddingX - 10} y={y + 3} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}</text>
      </g>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'visible' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines}

        {/* X Axis Line */}
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255, 255, 255, 0.15)" />

        {/* Areas */}
        {presentPoints && <polygon points={presentAreaPoints} fill="url(#presentGrad)" />}
        {latePoints && <polygon points={lateAreaPoints} fill="url(#lateGrad)" />}

        {/* Lines */}
        {presentPoints && (
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            points={presentPoints}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {latePoints && (
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            points={latePoints}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {trendData.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.present || 0)} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx={getX(i)} cy={getY(d.late || 0)} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        ))}

        {/* Labels */}
        {trendData.map((d, i) => (
          <text key={i} x={getX(i)} y={height - paddingY + 18} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
            {trendData[0]?.date?.length > 3 ? formatDateDDMMMYYYY(d.date) : d.date}
          </text>
        ))}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }}></span>
          Present / Active
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b', display: 'inline-block' }}></span>
          Late Entries
        </div>
      </div>
    </div>
  );
};

/* ── SVG Chart: Department Attendance ────────────────────────── */
const DepartmentChart = ({ deptStats }) => {
  if (!deptStats || deptStats.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No department data available.
      </div>
    );
  }

  const width = 500;
  const height = 220;
  const paddingTop = 25;
  const paddingBottom = 45;
  const paddingLeft = 45;
  const paddingRight = 20;

  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const gridLevels = [0, 25, 50, 75, 100];
  const gridLines = gridLevels.map((level) => {
    const y = height - paddingBottom - (level / 100) * chartHeight;
    return (
      <g key={level}>
        <line
          x1={paddingLeft}
          y1={y}
          x2={width - paddingRight}
          y2={y}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeDasharray="3 3"
        />
        <text
          x={paddingLeft - 10}
          y={y + 3}
          fill="var(--text-muted)"
          fontSize="10"
          textAnchor="end"
        >
          {level}%
        </text>
      </g>
    );
  });

  const barCount = deptStats.length;
  const xStep = chartWidth / Math.max(1, barCount);
  const barWidth = Math.min(45, xStep * 0.45);

  return (
    <div style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="deptBarGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridLines}

        {/* X Axis Line */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="rgba(255, 255, 255, 0.15)"
        />

        {/* Vertical Bars */}
        {deptStats.map((dept, i) => {
          const rawAtt = parseFloat(dept.attendance) || 0;
          const barHeight = (rawAtt / 100) * chartHeight;
          const x = paddingLeft + i * xStep + (xStep - barWidth) / 2;
          const y = height - paddingBottom - barHeight;

          return (
            <g key={i}>
              {/* Tooltip background/activation group */}
              <rect
                x={x - 5}
                y={paddingTop}
                width={barWidth + 10}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />

              {/* Graphical Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx="4"
                fill="url(#deptBarGrad)"
                stroke="#06b6d4"
                strokeWidth="1.5"
                style={{
                  transition: 'height 0.4s ease, y 0.4s ease',
                  cursor: 'pointer'
                }}
              />

              {/* Attendance Value label on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fill="var(--text-primary)"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {dept.attendance}
              </text>

              {/* Department Name label below bar */}
              <text
                x={x + barWidth / 2}
                y={height - paddingBottom + 16}
                fill="var(--text-secondary)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {dept.name}
              </text>

              {/* Staff Count sublabel */}
              <text
                x={x + barWidth / 2}
                y={height - paddingBottom + 28}
                fill="var(--text-muted)"
                fontSize="9"
                textAnchor="middle"
              >
                ({dept.count} {dept.count === 1 ? 'user' : 'users'})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ── SVG Chart: Monthly Attendance Donut ─────────────────────── */
const MonthlyDonutChart = ({ monthlySummary }) => {
  const present = monthlySummary?.present || 0;
  const absent = monthlySummary?.absent || 0;
  const onLeave = monthlySummary?.onLeave || 0;
  const total = present + absent + onLeave;

  if (total === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No monthly summary data available.
      </div>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const presentPercent = (present / total) * 100;
  const absentPercent = (absent / total) * 100;
  const leavePercent = (onLeave / total) * 100;

  const strokePresent = (presentPercent / 100) * circumference;
  const strokeAbsent = (absentPercent / 100) * circumference;
  const strokeLeave = (leavePercent / 100) * circumference;

  const offsetPresent = 0;
  const offsetAbsent = -strokePresent;
  const offsetLeave = -(strokePresent + strokeAbsent);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '30px', justifyContent: 'center', padding: '10px 0' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
        <svg width="160" height="160" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {/* Background circle */}
          <circle cx="100" cy="100" r={radius} fill="transparent" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="18" />

          {/* Present segment */}
          {strokePresent > 0 && (
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth="18"
              strokeDasharray={`${strokePresent} ${circumference}`}
              strokeDashoffset={offsetPresent}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          )}

          {/* Absent segment */}
          {strokeAbsent > 0 && (
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="18"
              strokeDasharray={`${strokeAbsent} ${circumference}`}
              strokeDashoffset={offsetAbsent}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          )}

          {/* Leave segment */}
          {strokeLeave > 0 && (
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#f59e0b"
              strokeWidth="18"
              strokeDasharray={`${strokeLeave} ${circumference}`}
              strokeDashoffset={offsetLeave}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          )}
        </svg>

        {/* Center label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {Math.round((present / Math.max(1, present + absent)) * 100)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
            Att. Rate
          </div>
        </div>
      </div>

      {/* Legend & Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Present: <strong>{present}</strong> ({Math.round(presentPercent)}%)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Absent: <strong>{absent}</strong> ({Math.round(absentPercent)}%)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Approved Leave: <strong>{onLeave}</strong> ({Math.round(leavePercent)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Dashboard Component
═══════════════════════════════════════════════════════════════ */
export const Dashboard = () => {
  const { user, setUser, logout } = useAuth();
  const { policy, setPolicy } = useContext(PasswordPolicyContext) || {};

  /* ── Password Policy Admin Form State ── */
  const [policyMinLength, setPolicyMinLength] = useState(8);
  const [policyMaxLength, setPolicyMaxLength] = useState(64);
  const [policyRequireUpper, setPolicyRequireUpper] = useState(true);
  const [policyRequireLower, setPolicyRequireLower] = useState(true);
  const [policyRequireNumber, setPolicyRequireNumber] = useState(true);
  const [policyRequireSpecial, setPolicyRequireSpecial] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);

  useEffect(() => {
    if (policy) {
      setPolicyMinLength(policy.minLength ?? 8);
      setPolicyMaxLength(policy.maxLength ?? 64);
      setPolicyRequireUpper(policy.requireUpper ?? true);
      setPolicyRequireLower(policy.requireLower ?? true);
      setPolicyRequireNumber(policy.requireNumber ?? true);
      setPolicyRequireSpecial(policy.requireSpecial ?? true);
    }
  }, [policy]);

  /* ── Shared state ── */
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [currentAddress, setCurrentAddress] = useState('Fetching location...');
  const [activeMenu, setActiveMenu] = useState(() => user?.isFirstTime ? 'Change Password' : (user?.role === 'reporting manager' ? 'Reporting Manager' : 'Dashboard'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── Employee sub-tab ── */
  const [empTab, setEmpTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [myLeaves, setMyLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);

  /* ── Admin sub-tab ── */
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'shifts' | 'attendance' | 'emails'
  const [totalWorkforce, setTotalWorkforce] = useState(user?.stats?.totalEmployees ?? 0);
  const [departmentStats, setDepartmentStats] = useState([]);

  useEffect(() => {
    document.body.className = 'light-mode';
  }, []);

  /* ── Stats Detail Modal ── */
  const [statsDetailCategory, setStatsDetailCategory] = useState(null); // 'Present' | 'Absent' | 'Late' | 'Early' | 'Missing'
  const [statsDetailList, setStatsDetailList] = useState([]);

  /* ── Modals ── */
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePass, setNewEmployeePass] = useState('');
  const [newEmployeeDept, setNewEmployeeDept] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState(['employee']);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [newEmployeeLat, setNewEmployeeLat] = useState('');
  const [newEmployeeLng, setNewEmployeeLng] = useState('');
  const [newEmployeeRadius, setNewEmployeeRadius] = useState('500');

  const [departments, setDepartments] = useState([]);
  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');

  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState([]);
  const [newLeaveTypeName, setNewLeaveTypeName] = useState('');
  const [isSubmittingLeaveType, setIsSubmittingLeaveType] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
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
  const [myShiftRequests, setMyShiftRequests] = useState([]);
  const [pendingShifts, setPendingShifts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  /* ── Credential Approval Modal ── */
  const [credentialModal, setCredentialModal] = useState({ isOpen: false, requestId: null, type: null, decision: null });

  const [todayLogs, setTodayLogs] = useState([]);
  const [managerFilter, setManagerFilter] = useState('all'); // 'all' | 'present' | 'leave'

  /* ── Toast ── */
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  /* ── Profile Update ── */
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ── Shift Change Request ── */
  const [showShiftRequestModal, setShowShiftRequestModal] = useState(false);
  const [requestedShiftId, setRequestedShiftId] = useState('');
  const [shiftRequestReason, setShiftRequestReason] = useState('');

  /* ── Notifications ── */
  const [notifications, setNotifications] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const handleDeleteNotification = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/user/${user.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  // Sync user profile once on mount/id change to get latest Employee ID and details
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_BASE_URL}/auth/user/${user.id}`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data && data.id) {
          setUser(prev => {
            if (prev && prev.employeeId === data.employeeId && prev.avatar === data.avatar && prev.department === data.department && prev.name === data.name) {
              return prev;
            }
            const updated = { ...prev, ...data };
            localStorage.setItem('ams_user', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(err => console.error('Error syncing user profile:', err));
  }, [user?.id, setUser]);

  /* ── Boot: load cached data ── */
  useEffect(() => {
    if (!user) return;
    if (user.role === 'employee') {
      const logs = user.stats?.recentActivity || [];
      setActivities(logs);
      const active = logs.find(l => l.status === 'Active');
      if (active) { setClockedIn(true); setClockInTime(active.clockIn); }

      getCurrentPosition().then(async (pos) => {
        const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setCurrentAddress(addr);
      }).catch(() => setCurrentAddress('Location unavailable'));
    } else if (user.role === 'manager') {
      // Fetch pending leaves dynamically
      fetch(`${API_BASE_URL}/leaves?managerId=${user.id}&status=Pending`)
        .then(res => res.json())
        .then(data => setPendingLeaves(data.leaves || []))
        .catch(console.error);

      // Fetch pending flexy requests for manager
      fetch(`${API_BASE_URL}/flexyhours/pending?managerId=${user.id}`)
        .then(res => res.json())
        .then(data => setPendingFlexy(data.requests || []))
        .catch(console.error);

      // Fetch pending shift requests for manager
      fetch(`${API_BASE_URL}/shifts/pending?managerId=${user.id}`)
        .then(res => res.json())
        .then(data => setPendingShifts(data.requests || []))
        .catch(console.error);

      // Fetch team members and today's attendance logs
      Promise.all([
        fetch(`${API_BASE_URL}/auth/users`),
        fetch(`${API_BASE_URL}/attendance/history`)
      ])
        .then(async ([usersRes, logsRes]) => {
          const usersData = await usersRes.json();
          const logsData = await logsRes.json();

          const managerDepts = (user.department || '')
            .split(/[,,;/]/)
            .map(d => d.trim().toLowerCase())
            .filter(Boolean);

          const staff = usersData.filter(u =>
            u.role && u.role.includes('employee') &&
            managerDepts.includes((u.department || '').trim().toLowerCase())
          );
          setTeamMembers(staff);

          const staffIds = new Set(staff.map(s => s.id));
          const todayStr = new Date().toISOString().split('T')[0];
          // Include logs from today OR logs that are currently "Active" (e.g., night shifts crossing midnight)
          const todaysLogs = logsData.filter(log => staffIds.has(log.userId) && (log.date === todayStr || log.status === 'Active'));
          setTodayLogs(todaysLogs);
        })
        .catch(console.error);
    } else if (user.role === 'admin') {
      // Fetch leaves and flexy requests for admin
      fetch(`${API_BASE_URL}/leaves`)
        .then(res => res.json())
        .then(data => setPendingLeaves(data.leaves || []))
        .catch(console.error);

      fetch(`${API_BASE_URL}/flexyhours`)
        .then(res => res.json())
        .then(data => setPendingFlexy(data.requests || []))
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetch(`${API_BASE_URL}/shifts`)
        .then(res => res.json())
        .then(data => {
          setAvailableShifts(data);
          if (data.length > 0 && !newEmployeeShift) setNewEmployeeShift(data[0].id);
        })
        .catch(console.error);
    }
  }, [user]);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/types`);
      if (res.ok) {
        const data = await res.json();
        setAvailableLeaveTypes(data);
        if (data.length > 0) {
          setLeaveType(data[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeaveTypes();
    }
  }, [user, showLeaveRequestModal, fetchLeaveTypes]);

  useEffect(() => {
    if (user && user.role === 'admin') {
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

      fetch(`${API_BASE_URL}/auth/admin-stats`)
        .then(res => res.json())
        .then(data => {
          setUser(prev => {
            const updated = { ...prev, stats: data };
            localStorage.setItem('ams_user', JSON.stringify(updated));
            return updated;
          });
        })
        .catch(console.error);
    }
  }, [user?.id, departments.length, totalWorkforce]);

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

  const fetchMyShiftRequests = useCallback(async () => {
    if (!user || user.role !== 'employee') return;
    try {
      const res = await fetch(`${API_BASE_URL}/shifts/requests/user/${user.id}`);
      const data = await res.json();
      if (res.ok) setMyShiftRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch shift requests history', err);
    }
  }, [user]);

  useEffect(() => {
    if (activeMenu === 'Master Data' && user?.role === 'employee') {
      fetchMyShiftRequests();
    }
  }, [activeMenu, fetchMyShiftRequests, user]);

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

  useEffect(() => {
    if (activeMenu === 'Leaves') {
      if (user?.role === 'admin') {
        fetch(`${API_BASE_URL}/leaves`)
          .then(res => res.json())
          .then(data => setPendingLeaves(data.leaves || []))
          .catch(console.error);

        fetch(`${API_BASE_URL}/flexyhours`)
          .then(res => res.json())
          .then(data => setPendingFlexy(data.requests || []))
          .catch(console.error);
      } else if (user?.role === 'manager') {
        fetch(`${API_BASE_URL}/leaves?managerId=${user.id}&status=Pending`)
          .then(res => res.json())
          .then(data => setPendingLeaves(data.leaves || []))
          .catch(console.error);

        fetch(`${API_BASE_URL}/flexyhours/pending?managerId=${user.id}`)
          .then(res => res.json())
          .then(data => setPendingFlexy(data.requests || []))
          .catch(console.error);
      }
    }
  }, [activeMenu, user]);

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
      let lat = null;
      let lng = null;
      let address = null;

      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        address = await reverseGeocode(lat, lng);
        setCurrentAddress(address);
      } catch (locErr) {
        throw new Error("Location permission is required to clock in/out. Please enable GPS and try again.", { cause: locErr });
      }

      const res = await fetch(`${API_BASE_URL}/attendance/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          latitude: lat,
          longitude: lng,
          locationAddress: address,
          clockInLat: lat,
          clockInLng: lng,
          clockInAddress: address,
          clockOutLat: lat,
          clockOutLng: lng,
          clockOutAddress: address
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance.');

      if (!clockedIn) {
        setClockedIn(true);
        setClockInTime(data.log.clockIn);
        const augmentedLog = {
          ...data.log,
          clockInLat: lat,
          clockInLng: lng,
          clockInAddress: address
        };
        setActivities(prev => [augmentedLog, ...prev]);
        triggerToast('Clocked In! Have a great shift.', 'success');
      } else {
        setClockedIn(false);
        setClockInTime(null);
        const updated = activities.map(a => a.status === 'Active' ? {
          ...data.log,
          lateEntry: data.log.lateEntry !== undefined ? data.log.lateEntry : a.lateEntry,
          earlyExit: data.log.earlyExit !== undefined ? data.log.earlyExit : a.earlyExit,
          clockInLat: a.clockInLat || lat,
          clockInLng: a.clockInLng || lng,
          clockInAddress: a.clockInAddress || address,
          clockOutLat: lat,
          clockOutLng: lng,
          clockOutAddress: address
        } : a);
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
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      triggerToast('Please fill in all leave request fields.', 'danger');
      return;
    }
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (end < start) {
      triggerToast('End date cannot be before start date.', 'danger');
      return;
    }
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullStart = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const fullEnd = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const durationStr = `${diffDays} day${diffDays > 1 ? 's' : ''} (${startStr} - ${endStr})|${fullStart}|${fullEnd}`;
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: leaveType,
          duration: durationStr,
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
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      triggerToast('Leave request submitted to team lead!', 'success');
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

    // Client-side monthly limit check (max 2 days per month)
    const targetMonth = flexyDate.substring(0, 7); // "yyyy-MM"
    const countThisMonth = myFlexyRequests.filter(req =>
      req.date.startsWith(targetMonth) &&
      (req.status === 'Pending' || req.status === 'Approved')
    ).length;

    if (countThisMonth >= 2) {
      triggerToast('Monthly limit reached. You can only request flexy hours 2 days per month.', 'danger');
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
      triggerToast('Flexy hour request submitted to team lead!', 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleRequestShiftChange = async (e) => {
    e.preventDefault();
    if (!requestedShiftId) {
      triggerToast('Please select a shift.', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/shifts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          requestedShiftId: parseInt(requestedShiftId),
          reason: shiftRequestReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit shift request.');
      triggerToast('Shift change request submitted to team lead!', 'success');
      setShowShiftRequestModal(false);
      setShiftRequestReason('');
      fetchMyShiftRequests();
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     3. Resolve Leave (Manager)
  ═══════════════════════════════════════════════════════════════ */
  const handleLeaveDecision = async (id, decision, credentials = null) => {
    if (!credentials) {
      setCredentialModal({ isOpen: true, requestId: id, type: 'leave', decision });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, managerId: user.id, approverEmail: credentials.email, approverPassword: credentials.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve request.');
      setPendingLeaves(prev => prev.filter(r => r.id !== id));
      triggerToast(`Request ${decision === 'approve' ? 'Approved' : 'Rejected'}!`, 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleFlexyDecision = async (id, decision, credentials = null) => {
    if (!credentials) {
      setCredentialModal({ isOpen: true, requestId: id, type: 'flexy', decision });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/flexyhours/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, managerId: user.id, approverEmail: credentials.email, approverPassword: credentials.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve flexy request.');
      setPendingFlexy(prev => prev.filter(r => r.id !== id));
      triggerToast(`Flexy Request ${decision === 'approve' ? 'Approved' : 'Rejected'}!`, 'success');
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleShiftDecision = async (id, decision, credentials = null) => {
    if (!credentials) {
      setCredentialModal({ isOpen: true, requestId: id, type: 'shift', decision });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/shifts/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, managerId: user.id, approverEmail: credentials.email, approverPassword: credentials.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve shift request.');
      setPendingShifts(prev => prev.filter(r => r.id !== id));
      triggerToast(`Shift Request ${decision === 'approve' ? 'Approved' : 'Rejected'}!`, 'success');

      if (decision === 'approve') {
        // Refetch staff to update their shift details locally
        Promise.all([
          fetch(`${API_BASE_URL}/auth/users`),
          fetch(`${API_BASE_URL}/attendance/history`)
        ])
          .then(async ([usersRes, logsRes]) => {
            const usersData = await usersRes.json();
            const managerDepts = (user.department || '').split(/[,,;/]/).map(d => d.trim().toLowerCase()).filter(Boolean);
            const staff = usersData.filter(u => u.role === 'employee' && managerDepts.includes((u.department || '').trim().toLowerCase()));
            setTeamMembers(staff);
          }).catch(console.error);
      }
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     4. Add Employee (HR Admin)
  ═══════════════════════════════════════════════════════════════ */
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim() || !newEmployeePass.trim() || !newEmployeeId.trim()) {
      triggerToast('Employee ID, Name, Email and Password are all required.', 'danger');
      return;
    }
    if (newEmployeeRole.length === 0) {
      triggerToast('Please select at least one role.', 'danger');
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
          role: newEmployeeRole.join(','),
          department: newEmployeeDept,
          shiftId: newEmployeeShift ? parseInt(newEmployeeShift) : null,
          employeeId: newEmployeeId.trim(),
          allowedLat: newEmployeeLat ? parseFloat(newEmployeeLat) : null,
          allowedLng: newEmployeeLng ? parseFloat(newEmployeeLng) : null,
          allowedRadius: newEmployeeRadius ? parseFloat(newEmployeeRadius) : 500,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register employee.');
      triggerToast(`Account created for ${newEmployeeName}!`, 'success');
      setTotalWorkforce(prev => prev + 1);
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setNewEmployeePass('');
      setNewEmployeeId('');
      setNewEmployeeRole(['employee']);
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
    if (newPassword) {
      const criteriaResult = validatePassword(newPassword, policy || {}, user?.employeeId || "");
      if (!criteriaResult.valid) {
        triggerToast('New password does not meet password policy requirements.', 'danger');
        return;
      }
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
      setUser(prev => {
        const updatedUser = { ...prev, avatar: data.avatar };
        localStorage.setItem('ams_user', JSON.stringify(updatedUser));
        return updatedUser;
      });
      setShowProfileModal(false);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (policyMinLength < 1) {
      triggerToast('Minimum length must be at least 1.', 'danger');
      return;
    }
    if (policyMinLength > policyMaxLength) {
      triggerToast('Minimum length cannot be greater than maximum length.', 'danger');
      return;
    }
    setPolicySaving(true);
    try {
      const updated = await updatePasswordPolicy(user.id, {
        minLength: policyMinLength,
        maxLength: policyMaxLength,
        requireUpper: policyRequireUpper,
        requireLower: policyRequireLower,
        requireNumber: policyRequireNumber,
        requireSpecial: policyRequireSpecial
      });
      if (setPolicy) {
        setPolicy(updated);
      }
      triggerToast('System password policy updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Failed to update password policy.', 'danger');
    } finally {
      setPolicySaving(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setProfileAvatarUrl(compressedDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER: Employee View
  ═══════════════════════════════════════════════════════════════ */
  const renderEmployeeView = () => {
    const approvedLeaves = myLeaves.filter(l => l.status === 'Approved');

    // Check if the user is on leave today
    const todayStr = new Date();
    const yyyy = todayStr.getFullYear();
    const mm = String(todayStr.getMonth() + 1).padStart(2, '0');
    const dd = String(todayStr.getDate()).padStart(2, '0');
    const todayLocal = `${yyyy}-${mm}-${dd}`;
    const isOnLeaveToday = activities.some(a => a.status === 'On Leave' && a.date === todayLocal);

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
              {/* Real-Time Attendance Terminal Card */}
              {(() => {
                const todayLog = (activities || []).find(a => a.date === todayLocal);
                return (
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '24px',
                    border: '1px solid #3b82f630',
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.08), 0 8px 20px -6px rgba(0, 0, 0, 0.03)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.04)'
                  }}>
                    <div style={{
                      fontSize: '1.05rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center'
                    }}>
                      Real-Time Attendance Terminal
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '3.5rem',
                      fontWeight: '800',
                      color: '#1e293b',
                      textAlign: 'center',
                      letterSpacing: '1px',
                      margin: '12px 0 6px 0'
                    }}>
                      {format(now, 'HH:mm:ss')}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      fontWeight: '600',
                      textAlign: 'center',
                      marginBottom: '28px'
                    }}>
                      {format(now, 'dd-MMM-yyyy')}
                    </div>

                    <button
                      onClick={handleClockInOut}
                      disabled={isOnLeaveToday}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        border: 'none',
                        color: isOnLeaveToday ? '#94a3b8' : '#ffffff',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        cursor: isOnLeaveToday ? 'not-allowed' : 'pointer',
                        width: '100%',
                        marginBottom: '24px',
                        backgroundColor: isOnLeaveToday ? '#cbd5e150' : (clockedIn ? '#ef4444' : '#3b82f6'),
                        boxShadow: isOnLeaveToday ? 'none' : (clockedIn ? '0 6px 20px rgba(239, 68, 68, 0.25)' : '0 6px 20px rgba(59, 130, 246, 0.25)'),
                        transition: 'all 0.2s ease',
                        border: isOnLeaveToday ? '1px solid #cbd5e180' : 'none'
                      }}
                    >
                      <Clock size={20} />
                      {isOnLeaveToday ? 'ON LEAVE TODAY' : (clockedIn ? 'PUNCH OUT' : 'PUNCH IN')}
                    </button>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      backgroundColor: '#f1f5f960',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <MapPin size={16} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>In Location:</span>
                          {todayLog && todayLog.clockInLat ? (
                            <a href={`https://www.google.com/maps?q=${todayLog.clockInLat},${todayLog.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                              {todayLog.clockInAddress || `${todayLog.clockInLat.toFixed(4)}, ${todayLog.clockInLng.toFixed(4)}`}
                            </a>
                          ) : clockedIn ? (
                            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>{currentAddress}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>---</span>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0' }} />

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <MapPin size={16} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>Out Location:</span>
                          {todayLog && todayLog.clockOutLat ? (
                            <a href={`https://www.google.com/maps?q=${todayLog.clockOutLat},${todayLog.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                              {todayLog.clockOutAddress || `${todayLog.clockOutLat.toFixed(4)}, ${todayLog.clockOutLng.toFixed(4)}`}
                            </a>
                          ) : clockedIn ? (
                            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>{currentAddress}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>---</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Shift details */}
              {user.shift && (
                <div className="glass-panel" style={{ padding: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} /> Assigned Shift: {user.shift.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {formatTime24h(user.shift.startTime)} - {formatTime24h(user.shift.endTime)} (Break: {user.shift.breakTime}m)
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

                <div className="glass-panel" style={styles.statMiniCard}>
                  <CheckCircle size={20} color="var(--primary-color)" />
                  <div style={styles.miniCardVal}>
                    {user.stats?.presentDays ?? user.presentDays ?? 0}
                  </div>
                  <div style={styles.miniCardLabel}>Present Days</div>
                </div>
                <div className="glass-panel" style={styles.statMiniCard}>
                  <Clock size={20} color="var(--primary-color)" />
                  <div style={styles.miniCardVal}>
                    {user.stats?.workHoursThisMonth ?? user.workHoursThisMonth ?? 0}h
                  </div>
                  <div style={styles.miniCardLabel}>Hours Worked</div>
                </div>
              </div>
            </div>

            {/* Right: Recent logs */}
            <div style={styles.rightCol}>
              <div className="glass-panel" style={styles.tableCard}>
                <div style={styles.tableCardHeader}>
                  <h3 style={styles.tableTitle}>Recent Log History</h3>
                  {/*<span style={styles.badge}>Live SQL Server</span>*/}
                </div>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>In / Out</th>
                        <th style={{ ...styles.th, minWidth: '250px' }}>Location</th>
                        <th style={styles.th}>Hours</th>
                        <th style={styles.th}>Metrics</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.length === 0 ? (
                        <tr><td colSpan="6" style={styles.emptyCell}>No logs yet. Clock in to start!</td></tr>
                      ) : (
                        activities.map((act, idx) => (
                          <tr key={act.id ?? idx} style={styles.trBody}>
                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{formatDateDDMMMYYYY(act.date)}</td>
                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                              <div style={{ color: act.lateEntry ? '#ef4444' : 'inherit' }}>{formatTime24h(act.clockIn)}</div>
                              <div style={{ color: act.earlyExit ? '#ef4444' : 'inherit' }}>{formatTime24h(act.clockOut)}</div>
                            </td>
                            <td style={styles.td}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                                {act.clockInLat ? (
                                  <a href={`https://www.google.com/maps?q=${act.clockInLat},${act.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                                    In: {act.clockInAddress || `${act.clockInLat.toFixed(4)}, ${act.clockInLng.toFixed(4)}`}
                                  </a>
                                ) : 'In: ---'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                {act.clockOutLat ? (
                                  <a href={`https://www.google.com/maps?q=${act.clockOutLat},${act.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                                    Out: {act.clockOutAddress || `${act.clockOutLat.toFixed(4)}, ${act.clockOutLng.toFixed(4)}`}
                                  </a>
                                ) : 'Out: ---'}
                              </div>
                            </td>
                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 'bold' }}>{act.hours > 0 ? `${act.hours}h` : '---'}</div>
                            </td>
                            <td style={styles.td}>
                              {act.status === 'On Leave' ? (
                                <span style={{ color: 'var(--text-muted)' }}>---</span>
                              ) : (
                                <div style={{
                                  fontWeight: '700',
                                  fontSize: '0.8rem',
                                  color: act.lateEntry || act.earlyExit ? '#ef4444' : '#10b981'
                                }}>
                                  {act.lateEntry && act.earlyExit ? 'Late Early' :
                                    act.lateEntry ? 'Late' :
                                      act.earlyExit ? 'Early' : 'On Time'}
                                </div>
                              )}
                              {act.overtimeHours > 0 && <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>+{act.overtimeHours}h OT</div>}
                              {act.pendingHours > 0 && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>-{act.pendingHours}h Short</div>}
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
                  Submit a new leave application. Your team lead will be notified for approval.
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
                          <div style={styles.leaveItemDuration}>{leave.duration?.split('|')[0]}</div>
                          {leave.reason && (
                            <div style={styles.leaveItemReason}>"{leave.reason}"</div>
                          )}
                        </div>
                        <LeaveStatusBadge
                          status={leave.status}
                          tlStatus={leave.tlApprovalStatus}
                          hrStatus={leave.hrApprovalStatus}
                          tlName={leave.tlApproverSignature}
                          hrName={leave.hrApproverSignature}
                        />
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
                          <div style={styles.leaveItemDuration}>{formatDateDDMMMYYYY(flexy.date)} - {flexy.hoursRequested} hours</div>
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
  const renderManagerView = () => {
    // Dynamic Manager Stats Calculation
    const totalStaff = teamMembers.length;
    let presentCount = 0;
    let leaveCount = 0;

    // Create a map for quick lookup of today's status per user
    const statusMap = {};
    todayLogs.forEach(log => {
      statusMap[log.userId] = log.status;
      if (log.status === 'Present' || log.status === 'Active') presentCount++;
      if (log.status === 'On Leave') leaveCount++;
    });

    // Filter staff based on selected filter
    const displayedStaff = teamMembers.filter(member => {
      const status = statusMap[member.id] || 'Absent';
      if (managerFilter === 'present') return status === 'Present' || status === 'Active';
      if (managerFilter === 'leave') return status === 'On Leave';
      return true; // 'all'
    });

    return (
      <div style={styles.dashboardGrid}>
        <div style={styles.leftCol}>
          <div className="glass-panel" style={styles.managerHeaderCard}>
            <div style={styles.managerHeaderGrid}>
              {[
                { id: 'all', Icon: Users, color: 'var(--primary-color)', val: totalStaff, label: 'Total Staff' },
                { id: 'present', Icon: UserCheck, color: 'var(--success)', val: presentCount, label: 'Present Today' },
                { id: 'leave', Icon: Calendar, color: 'var(--warning)', val: leaveCount, label: 'On Leave' },
              ].map(({ id, Icon, color, val, label }) => (
                <div
                  key={id}
                  onClick={() => setManagerFilter(id)}
                  style={{
                    ...styles.mgrStatItem,
                    cursor: 'pointer',
                    background: managerFilter === id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    borderColor: managerFilter === id ? color : 'var(--bg-card-border)',
                    boxShadow: managerFilter === id ? `0 0 0 1px ${color}` : 'none'
                  }}
                >
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
                      <div style={styles.reqType}>{req.type} &bull; <span style={{ color: 'var(--text-secondary)' }}>{req.duration?.split('|')[0]}</span></div>
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

          <div className="glass-panel" style={{ ...styles.requestsCard, marginTop: '24px' }}>
            <h3 style={styles.requestsHeading}>My Team {managerFilter !== 'all' ? `(${managerFilter === 'present' ? 'Present Today' : 'On Leave'})` : ''}</h3>
            {displayedStaff.length === 0 ? (
              <div style={styles.emptyRequests}>
                <Users size={36} color="var(--text-muted)" />
                <p>No team members found for this filter.</p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Name</th>
                      <th style={{ padding: '10px' }}>Department</th>
                      <th style={{ padding: '10px' }}>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStaff.map(member => {
                      const attStatus = statusMap[member.id] || 'Absent';
                      let badgeBg = 'rgba(100,116,139,0.1)';
                      let badgeColor = '#64748b';
                      if (attStatus === 'Present' || attStatus === 'Active') { badgeBg = 'rgba(16,185,129,0.1)'; badgeColor = '#10b981'; }
                      else if (attStatus === 'On Leave') { badgeBg = 'rgba(245,158,11,0.1)'; badgeColor = '#f59e0b'; }

                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 10px', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Avatar name={member.name} role={member.role} size={28} />
                              <div>
                                <div style={{ fontWeight: 600 }}>{member.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{member.department}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', background: badgeBg, color: badgeColor }}>
                              {attStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                      <div style={styles.reqType}>{req.type} &bull; <span style={{ color: 'var(--text-secondary)' }}>{formatDateDDMMMYYYY(req.date)} ({req.hoursRequested}h)</span></div>
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

          <div className="glass-panel" style={{ ...styles.requestsCard, marginTop: '20px' }}>
            <h3 style={styles.requestsHeading}>Pending Shift Approvals</h3>
            {pendingShifts.length === 0 ? (
              <div style={styles.emptyRequests}>
                <Check size={36} color="var(--success)" />
                <p>All shift requests resolved!</p>
              </div>
            ) : (
              <div style={styles.requestsList}>
                {pendingShifts.map(req => (
                  <div key={req.id} style={styles.requestItem}>
                    <div style={styles.reqDetails}>
                      <div style={styles.reqName}>{req.userName} ({req.userDept})</div>
                      <div style={styles.reqType}>
                        {req.currentShiftName} &rarr; <span style={{ color: 'var(--primary-light)', fontWeight: '700' }}>{req.requestedShiftName}</span>
                      </div>
                      {req.reason && <div style={styles.reqReason}>"{req.reason}"</div>}
                    </div>
                    <div style={styles.reqActions}>
                      <button onClick={() => handleShiftDecision(req.id, 'reject')} style={styles.actionReject} title="Reject"><X size={16} /></button>
                      <button onClick={() => handleShiftDecision(req.id, 'approve')} style={styles.actionApprove} title="Approve"><Check size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER: Admin View
  ═══════════════════════════════════════════════════════════════ */
  const renderAdminView = () => {
    const empStats = user.stats?.empStats || { total: 0, active: 0, inactive: 0 };
    const attStats = user.stats?.attStats || { presentToday: 0, absentToday: 0, lateArrivals: 0, earlyDepartures: 0, missingPunches: 0 };
    const weeklyTrend = user.stats?.weeklyTrend || [];
    const monthlySummary = user.stats?.monthlySummary || { present: 0, absent: 0, onLeave: 0 };

    return (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Row */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 'auto', letterSpacing: '0.05em' }}>Global Admin Actions:</span>
            <button
              id="add-employee-btn"
              onClick={() => setShowAddEmployeeModal(true)}
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px', display: 'flex', gap: '6px', alignItems: 'center', background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <UserPlus size={15} /> Create Account
            </button>
            <button
              id="manage-dept-btn"
              onClick={() => setShowManageDepartmentsModal(true)}
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px', display: 'flex', gap: '6px', alignItems: 'center', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <Users size={15} /> Manage Departments
            </button>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {/* Attendance Statistics */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Stats (Today)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Present', val: attStats.presentToday, list: attStats.presentList || [], color: '#10b981', bg: 'rgba(16,185,129,0.04)' },
                  { label: 'Absent', val: attStats.absentToday, list: attStats.absentList || [], color: '#ef4444', bg: 'rgba(239,68,68,0.04)' },
                  { label: 'Late', val: attStats.lateArrivals, list: attStats.lateList || [], color: '#f59e0b', bg: 'rgba(245,158,11,0.04)' },
                  { label: 'Early', val: attStats.earlyDepartures, list: attStats.earlyList || [], color: '#3b82f6', bg: 'rgba(59,130,246,0.04)' }
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setStatsDetailCategory(stat.label);
                      setStatsDetailList(stat.list);
                    }}
                    style={{
                      textAlign: 'center',
                      padding: '10px 4px',
                      background: stat.bg,
                      borderRadius: '8px',
                      border: `1px solid ${stat.color}15`,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                      e.currentTarget.style.borderColor = stat.color + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = stat.color + '15';
                    }}
                  >
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: stat.color }}>{stat.val}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Reports Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Attendance Trend (Last 7 Days)</h4>
              <WeeklyTrendChart trendData={weeklyTrend} />
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Department-wise Attendance</h4>
              <DepartmentChart deptStats={departmentStats} />
            </div>
          </div>

          {/* Visual Reports Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Attendance Summary</h4>
              <MonthlyDonutChart monthlySummary={monthlySummary} />
            </div>
          </div>
        </div>

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
                  { label: 'Employee ID', type: 'text', ph: 'e.g. EMP-1234', val: newEmployeeId, set: setNewEmployeeId },
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

                <div style={{ ...styles.modalInputGroup, position: 'relative' }}>
                  <label style={styles.modalLabel}>Role</label>
                  <div
                    tabIndex={0}
                    onClick={() => setShowRoleDropdown(prev => !prev)}
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowRoleDropdown(false); }}
                    style={{ position: 'relative', outline: 'none' }}
                  >
                    {/* Trigger button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#f8fafc', border: `1.5px solid ${showRoleDropdown ? '#3b82f6' : '#cbd5e1'}`, borderRadius: showRoleDropdown ? '8px 8px 0 0' : '8px', cursor: 'pointer', transition: 'border-color 0.2s', minHeight: '38px', userSelect: 'none' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                        {newEmployeeRole.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Select role(s)...</span>
                        ) : newEmployeeRole.map(r => {
                          const cfg = { employee: { label: 'Employee', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' }, manager: { label: 'Team Lead', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' }, admin: { label: 'HR / Admin', color: '#e11d48', bg: 'rgba(225,29,72,0.12)' }, 'reporting manager': { label: 'Reporting Manager', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' } }[r];
                          return cfg ? (
                            <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, color: cfg.color, background: cfg.bg }}>
                              ✓ {cfg.label}
                              <span onMouseDown={e => { e.stopPropagation(); setNewEmployeeRole(prev => prev.filter(x => x !== r)); }} style={{ marginLeft: '1px', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem', lineHeight: 1 }}>×</span>
                            </span>
                          ) : null;
                        })}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '8px', transition: 'transform 0.2s', transform: showRoleDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {/* Dropdown panel */}
                    {showRoleDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1.5px solid #3b82f6', borderTop: 'none', borderRadius: '0 0 8px 8px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                        {[
                          { value: 'employee', label: 'Employee', desc: 'Standard attendance & leave access', color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', icon: '👤' },
                          { value: 'manager', label: 'Team Lead', desc: 'Approves leaves & manages team', color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', icon: '👥' },
                          { value: 'reporting manager', label: 'Reporting Manager', desc: 'View reports only', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', icon: '📊' },
                          { value: 'admin', label: 'HR / Admin', desc: 'Full system & user management', color: '#e11d48', bg: 'rgba(225,29,72,0.06)', icon: '🛡️' }
                        ].map((role, idx, arr) => {
                          const isChecked = newEmployeeRole.includes(role.value);
                          return (
                            <div key={role.value} tabIndex={0}
                              onMouseDown={e => { e.preventDefault(); setNewEmployeeRole(prev => isChecked ? prev.filter(r => r !== role.value) : [...prev, role.value]); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: isChecked ? role.bg : '#ffffff', borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.15s', userSelect: 'none' }}
                              onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = isChecked ? role.bg : '#ffffff'; }}
                            >
                              <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${isChecked ? role.color : '#cbd5e1'}`, background: isChecked ? role.color : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                {isChecked && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{role.icon}</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? role.color : '#0f172a' }}>{role.label}</span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{role.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>


                <div style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>Assign Shift</label>
                  <select value={newEmployeeShift} onChange={e => setNewEmployeeShift(e.target.value)} style={styles.modalSelect}>
                    {availableShifts.map(s => (
                      <option style={{ color: 'black' }} key={s.id} value={s.id}>{s.name} ({formatTime24h(s.startTime)} - {formatTime24h(s.endTime)})</option>
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

        {/* ── Attendance Stats Detail Modal ── */}
        {statsDetailCategory && (
          <div style={styles.modalBg}>
            <div className="glass-panel" style={{ ...styles.modalBody, maxWidth: '640px', width: '90%' }}>
              <div style={styles.modalHeader}>
                <h3 style={{ fontSize: '1.2rem', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  {statsDetailCategory} Employees Today
                  <span style={{
                    fontSize: '0.8rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: statsDetailCategory === 'Present' ? 'rgba(16, 185, 129, 0.1)' :
                      statsDetailCategory === 'Absent' ? 'rgba(239, 68, 68, 0.1)' :
                        statsDetailCategory === 'Late' ? 'rgba(245, 158, 11, 0.1)' :
                          statsDetailCategory === 'Early' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                    color: statsDetailCategory === 'Present' ? '#10b981' :
                      statsDetailCategory === 'Absent' ? '#ef4444' :
                        statsDetailCategory === 'Late' ? '#f59e0b' :
                          statsDetailCategory === 'Early' ? '#3b82f6' : '#8b5cf6',
                    fontWeight: '700'
                  }}>
                    {statsDetailList.length}
                  </span>
                </h3>
                <button onClick={() => setStatsDetailCategory(null)} style={styles.closeBtn}><X size={18} /></button>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '16px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
                {statsDetailList.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', fontSize: '0.9rem' }}>
                    No employees in this category today.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>Emp ID</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>Name</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>Department</th>

                        {statsDetailCategory === 'Present' && (
                          <>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>In Time</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>Out Time</th>
                          </>
                        )}
                        {(statsDetailCategory === 'Late' || statsDetailCategory === 'Missing') && (
                          <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>In Time</th>
                        )}
                        {statsDetailCategory === 'Early' && (
                          <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '700' }}>Out Time</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {statsDetailList.map((emp, i) => (
                        <tr key={emp.id || i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{emp.employeeId || '---'}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-primary)' }}>{emp.name}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{emp.department}</td>

                          {statsDetailCategory === 'Present' && (
                            <>
                              <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '600' }}>{emp.clockIn || '---'}</td>
                              <td style={{ padding: '12px 16px', color: emp.clockOut === '---' ? 'var(--text-muted)' : '#10b981', fontWeight: '600' }}>{emp.clockOut || '---'}</td>
                            </>
                          )}
                          {(statsDetailCategory === 'Late' || statsDetailCategory === 'Missing') && (
                            <td style={{ padding: '12px 16px', color: statsDetailCategory === 'Late' ? '#f59e0b' : '#8b5cf6', fontWeight: '600' }}>{emp.clockIn || '---'}</td>
                          )}
                          {statsDetailCategory === 'Early' && (
                            <td style={{ padding: '12px 16px', color: '#3b82f6', fontWeight: '600' }}>{emp.clockOut || '---'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleCreateLeaveType = async (e) => {
    e.preventDefault();
    if (!newLeaveTypeName.trim()) {
      triggerToast('Please enter a leave type name.', 'danger');
      return;
    }
    setIsSubmittingLeaveType(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeaveTypeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create leave type.');

      triggerToast('Leave type created successfully!', 'success');
      setNewLeaveTypeName('');
      fetchLeaveTypes(); // Refresh list
    } catch (err) {
      triggerToast(err.message, 'danger');
    } finally {
      setIsSubmittingLeaveType(false);
    }
  };

  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/types/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete leave type.');

      triggerToast('Leave type deleted successfully!', 'success');
      fetchLeaveTypes(); // Refresh list
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const renderLeaveTypesManagement = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Create Form */}
        <div className="glass-panel" style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Create Leave Type
          </h3>
          <form onSubmit={handleCreateLeaveType} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Category Name</label>
              <input
                type="text"
                placeholder="e.g., Paternity Leave, Compassionate Leave"
                value={newLeaveTypeName}
                onChange={e => setNewLeaveTypeName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '0.9rem',
                  fontFamily: "'Lucida Fax', serif",
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingLeaveType}
              className="btn-primary"
              style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: 'none',
                opacity: isSubmittingLeaveType ? 0.7 : 1,
                cursor: isSubmittingLeaveType ? 'not-allowed' : 'pointer'
              }}
            >
              <Plus size={16} />
              {isSubmittingLeaveType ? 'Creating...' : 'Create Leave Type'}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Categories List */}
        <div className="glass-panel" style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Available Categories ({availableLeaveTypes.length})
          </h3>
          <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {availableLeaveTypes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <Layers size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem' }}>No custom leave types defined.</p>
              </div>
            ) : (
              availableLeaveTypes.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                  className="leave-type-item"
                >
                  <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>{t.name}</span>
                  <button
                    onClick={() => handleDeleteLeaveType(t.id)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    title="Delete Leave Type"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveContent = () => {
    if (activeMenu === 'Shifts') {
      return <AdminShifts />;
    }
    if (activeMenu === 'Attendance History') {
      return <AdminAttendance userRole={user.role} />;
    }
    if (activeMenu === 'Employees') {
      return <AdminEmployees currentUser={user} />;
    }
    if (activeMenu === 'Leave Types') {
      return renderLeaveTypesManagement();
    }

    if (activeMenu === 'Reporting Manager') {
      return <ReportingManagerDashboard />;
    }

    if (activeMenu === 'Dashboard') {
      if (user.role === 'employee') {
        return (
          <EmployeeHome
            user={user}
            clockedIn={clockedIn}
            clockInTime={clockInTime}
            handleClockInOut={handleClockInOut}
            activities={activities}
            myLeaves={myLeaves}
            setShowLeaveRequestModal={setShowLeaveRequestModal}
            setShowFlexyModal={setShowFlexyModal}
            currentAddress={currentAddress}
            setActiveMenu={setActiveMenu}
          />
        );
      }
      if (user.role === 'manager') return renderManagerView();
      if (user.role === 'admin') return renderAdminView();
    }

    if (activeMenu === 'Reports') {
      if (user.role === 'employee') {
        return (
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>My Geolocation Activities &amp; Punch History</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Punch In</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Punch Out</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Worked Hours</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>In Location</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Out Location</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(activities || []).map((log, i) => (
                    <tr key={log.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDateDDMMMYYYY(log.date)}</td>
                      <td style={{ padding: '14px 16px' }}>{formatTime24h(log.clockIn)}</td>
                      <td style={{ padding: '14px 16px' }}>{formatTime24h(log.clockOut)}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700' }}>{log.hours ? Number(log.hours).toFixed(2) + 'h' : '---'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {log.clockInLat ? (
                          <a href={`https://www.google.com/maps?q=${log.clockInLat},${log.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            {log.clockInAddress || `${log.clockInLat.toFixed(3)}, ${log.clockInLng.toFixed(3)}`}
                          </a>
                        ) : '---'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {log.clockOutLat ? (
                          <a href={`https://www.google.com/maps?q=${log.clockOutLat},${log.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none' }}>
                            {log.clockOutAddress || `${log.clockOutLat.toFixed(3)}, ${log.clockOutLng.toFixed(3)}`}
                          </a>
                        ) : '---'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          backgroundColor: log.status === 'Present' || log.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: log.status === 'Present' || log.status === 'Active' ? '#10b981' : '#ef4444'
                        }}>{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      return <AdminAttendance userRole={user.role} userId={user.id} />;
    }

    if (activeMenu === 'Attendance') {
      if (user.role === 'employee') {
        const todayStr = format(now, 'yyyy-MM-dd');
        const todayLog = (activities || []).find(a => a.date === todayStr);
        const isOnLeaveToday = (activities || []).some(a => a?.status === 'On Leave' && a?.date === todayStr);

        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0', width: '100%' }}>
            <div style={{
              width: '100%',
              maxWidth: '480px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '24px',
              border: '1px solid #3b82f630',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.08), 0 8px 20px -6px rgba(0, 0, 0, 0.03)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                fontSize: '1.05rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: 'center'
              }}>
                Real-Time Attendance Terminal
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '3.5rem',
                fontWeight: '800',
                color: '#1e293b',
                textAlign: 'center',
                letterSpacing: '1px',
                margin: '12px 0 6px 0'
              }}>
                {format(now, 'HH:mm:ss')}
              </div>
              <div style={{
                fontSize: '1rem',
                color: '#64748b',
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: '28px'
              }}>
                {format(now, 'dd-MMM-yyyy')}
              </div>

              <button
                onClick={handleClockInOut}
                disabled={isOnLeaveToday}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  border: 'none',
                  color: isOnLeaveToday ? '#94a3b8' : '#ffffff',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  cursor: isOnLeaveToday ? 'not-allowed' : 'pointer',
                  width: '100%',
                  marginBottom: '24px',
                  backgroundColor: isOnLeaveToday ? '#cbd5e150' : (clockedIn ? '#ef4444' : '#3b82f6'),
                  boxShadow: isOnLeaveToday ? 'none' : (clockedIn ? '0 6px 20px rgba(239, 68, 68, 0.25)' : '0 6px 20px rgba(59, 130, 246, 0.25)'),
                  transition: 'all 0.2s ease',
                  border: isOnLeaveToday ? '1px solid #cbd5e180' : 'none'
                }}
              >
                <Clock size={20} />
                {isOnLeaveToday ? 'ON LEAVE TODAY' : (clockedIn ? 'PUNCH OUT' : 'PUNCH IN')}
              </button>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                backgroundColor: '#f1f5f960',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin size={16} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>In Location:</span>
                    {todayLog && todayLog.clockInLat ? (
                      <a href={`https://www.google.com/maps?q=${todayLog.clockInLat},${todayLog.clockInLng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                        {todayLog.clockInAddress || `${todayLog.clockInLat.toFixed(4)}, ${todayLog.clockInLng.toFixed(4)}`}
                      </a>
                    ) : clockedIn ? (
                      <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>{currentAddress}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>---</span>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin size={16} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>Out Location:</span>
                    {todayLog && todayLog.clockOutLat ? (
                      <a href={`https://www.google.com/maps?q=${todayLog.clockOutLat},${todayLog.clockOutLng}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                        {todayLog.clockOutAddress || `${todayLog.clockOutLat.toFixed(4)}, ${todayLog.clockOutLng.toFixed(4)}`}
                      </a>
                    ) : clockedIn ? (
                      <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>{currentAddress}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>---</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      return <AdminShifts />;
    }

    if (activeMenu === 'Leaves') {
      if (user.role === 'employee') {
        const stats = user?.stats || {};
        const leaveBalance = stats.leaveBalance ?? user?.leaveBalance ?? 15;
        const casualLeaves = Math.floor(leaveBalance * 0.4);
        const sickLeaves = Math.floor(leaveBalance * 0.3);
        const earnedLeaves = Math.max(0, leaveBalance - casualLeaves - sickLeaves);

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Leave apply/balance */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', color: '#0f172a' }}>Leave Balance &amp; Allocations</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowLeaveRequestModal(true)} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}>Apply Leave</button>
                  <button onClick={() => setShowFlexyModal(true)} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>Request Flexy</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {[
                  { name: 'Casual Leave (CL)', balance: casualLeaves, percent: '40%', color: '#f59e0b' },
                  { name: 'Sick Leave (SL)', balance: sickLeaves, percent: '60%', color: '#ef4444' },
                  { name: 'Earned Leave (EL)', balance: earnedLeaves, percent: '25%', color: '#3b82f6' }
                ].map(l => (
                  <div key={l.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      <span>{l.name}</span>
                      <span>{l.balance} Days remaining</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: l.percent, backgroundColor: l.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave History List */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', color: '#0f172a', marginBottom: '16px' }}>Leave Requests Status</h3>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {(myLeaves || []).map((l, i) => (
                  <div key={l.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{l.type}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{l.duration}</div>
                    </div>
                    <LeaveStatusBadge
                      status={l.status}
                      tlStatus={l.tlApprovalStatus}
                      hrStatus={l.hrApprovalStatus}
                      tlName={l.tlApproverSignature}
                      hrName={l.hrApproverSignature}
                    />
                  </div>
                ))}
                {(!myLeaves || myLeaves.length === 0) && (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No leave applications filed yet.</p>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Admin or Manager Leave approvals
      if (user.role === 'admin') {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Admin Leaves View */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>All Leave Requests</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '3px 10px', borderRadius: '20px' }}>HR Admin View</span>
              </div>
              <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingLeaves.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No leave requests found.</p>
                ) : (
                  pendingLeaves.map(req => (
                    <div key={req.id} style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.2)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.2)' : '#e2e8f0'}` }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>
                            {req.name}{' '}
                            <span style={{ fontWeight: 'normal', fontSize: '0.78rem', color: '#64748b' }}>({req.department})</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{req.type} &bull; {req.duration?.split('|')[0]}</div>
                          {req.reason && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>"{req.reason}"</div>}
                        </div>
                        <span style={{
                          flexShrink: 0,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: req.status === 'Approved' ? 'rgba(16,185,129,0.1)' : req.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: req.status === 'Approved' ? '#10b981' : req.status === 'Pending' ? '#f59e0b' : '#ef4444'
                        }}>{req.status}</span>
                      </div>

                      {/* Approver info (resolved requests) */}
                      {req.status !== 'Pending' && (
                        <div style={{ marginTop: '10px' }}>
                          <LeaveStatusBadge
                            status={req.status}
                            tlStatus={req.tlApprovalStatus}
                            hrStatus={req.hrApprovalStatus}
                            tlName={req.tlApproverSignature}
                            hrName={req.hrApproverSignature}
                          />
                        </div>
                      )}

                      {/* Action buttons for Pending requests */}
                      {(req.status === 'Pending' || req.status === 'Pending HR Approval') && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={() => handleLeaveDecision(req.id, 'reject')}
                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <X size={14} /> Reject
                          </button>
                          <button
                            onClick={() => handleLeaveDecision(req.id, 'approve')}
                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Check size={14} /> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Admin Flexy View */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>All Flexy Hour Requests</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '3px 10px', borderRadius: '20px' }}>HR Admin View</span>
              </div>
              <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingFlexy.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No flexy hour requests found.</p>
                ) : (
                  pendingFlexy.map(req => (
                    <div key={req.id} style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.2)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.2)' : '#e2e8f0'}` }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>
                            {req.userName}{' '}
                            <span style={{ fontWeight: 'normal', fontSize: '0.78rem', color: '#64748b' }}>({req.department})</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{req.type} &bull; {formatDateDDMMMYYYY(req.date)} ({req.hoursRequested}h)</div>
                          {req.reason && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>"{req.reason}"</div>}
                        </div>
                        <span style={{
                          flexShrink: 0,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: req.status === 'Approved' ? 'rgba(16,185,129,0.1)' : req.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: req.status === 'Approved' ? '#10b981' : req.status === 'Pending' ? '#f59e0b' : '#ef4444'
                        }}>{req.status}</span>
                      </div>

                      {/* Approver info (resolved requests) */}
                      {req.status !== 'Pending' && (
                        <div style={{ marginTop: '10px' }}>
                          <LeaveStatusBadge
                            status={req.status}
                            tlStatus={req.tlApprovalStatus}
                            hrStatus={req.hrApprovalStatus}
                            tlName={req.tlApproverSignature}
                            hrName={req.hrApproverSignature}
                          />
                        </div>
                      )}

                      {/* Action buttons for Pending requests */}
                      {(req.status === 'Pending' || req.status === 'Pending HR Approval') && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={() => handleFlexyDecision(req.id, 'reject')}
                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <X size={14} /> Reject
                          </button>
                          <button
                            onClick={() => handleFlexyDecision(req.id, 'approve')}
                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Check size={14} /> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Pending Leave Applications</h3>
            {pendingLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                <Check size={36} color="#10b981" style={{ marginBottom: '8px' }} />
                <p>No leave requests awaiting decision.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingLeaves.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '#0f172a' }}>{req.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{req.type} &bull; {req.duration}</div>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>"{req.reason}"</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleLeaveDecision(req.id, 'reject')} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
                      <button onClick={() => handleLeaveDecision(req.id, 'approve')} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', cursor: 'pointer' }}><Check size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeMenu === 'Master Data') {
      if (user.role === 'employee') {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>My Assigned Shift Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Shift Name:</span>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{user.shift?.name || 'General Shift'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Start Time:</span>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{user.shift?.startTime || '09:00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>End Time:</span>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{user.shift?.endTime || '18:00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Weekly Offs:</span>
                  <span style={{ fontWeight: '700', color: '#3b82f6' }}>{user.shift?.weeklyOffs || 'Saturday, Sunday'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Grace Period:</span>
                  <span style={{ fontWeight: '700', color: '#ef4444' }}>{user.shift?.graceTime || '15'} minutes</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowShiftRequestModal(true);
                  if (availableShifts.length > 0 && !requestedShiftId) {
                    setRequestedShiftId(availableShifts[0].id.toString());
                  }
                }}
                className="btn-primary"
                style={{
                  marginTop: '20px',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Clock size={16} /> Request Shift Edit
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', color: '#0f172a', marginBottom: '16px' }}>Shift Change Requests</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {(myShiftRequests || []).map((req, i) => (
                  <div key={req.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>Requested: {req.requestedShiftName}</div>
                      {req.reason && <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>"{req.reason}"</div>}
                    </div>
                    <span style={{
                      padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700',
                      backgroundColor: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: req.status === 'Approved' ? '#10b981' : req.status === 'Pending' ? '#f59e0b' : '#ef4444'
                    }}>{req.status}</span>
                  </div>
                ))}
                {(!myShiftRequests || myShiftRequests.length === 0) && (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No shift requests filed yet.</p>
                )}
              </div>
            </div>
          </div>
        );
      }
      return <AdminEmployees currentUser={user} />;
    }

    if (activeMenu === 'Settings') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'admin' ? 'repeat(auto-fit, minmax(480px, 1fr))' : '1fr', gap: '24px', alignItems: 'start', width: '100%' }}>
          {/* Account Profile Card */}
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} color="#64748b" /> Account &amp; Security Settings
            </h3>
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <Avatar src={profileAvatarUrl || user.avatar} name={user.name} role={user.role} size={80} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Avatar URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={profileAvatarUrl}
                    onChange={e => setProfileAvatarUrl(e.target.value)}
                    style={{ padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', flex: 1, outline: 'none' }}
                  />
                  <label className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderRadius: '10px', fontSize: '0.9rem', margin: 0, width: 'auto' }}>
                    Upload
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Name</label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    style={{
                      padding: '11px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      width: '100%',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Employee ID</label>
                  <input
                    type="text"
                    value={user.employeeId || '---'}
                    readOnly
                    style={{
                      padding: '11px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      width: '100%',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Designation</label>
                  <input
                    type="text"
                    value={user.role === 'manager' ? 'Team Lead' : (user.role === 'admin' ? 'HR / Admin' : 'Employee')}
                    readOnly
                    style={{
                      padding: '11px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      width: '100%',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Department</label>
                  <input
                    type="text"
                    value={user.department || '---'}
                    readOnly
                    style={{
                      padding: '11px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      width: '100%',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Assigned Shift</label>
                  <input
                    type="text"
                    value={user.shift ? `${user.shift.name} (${formatTime24h(user.shift.startTime)} - ${formatTime24h(user.shift.endTime)})` : 'General Shift (09:00 - 18:00)'}
                    readOnly
                    style={{
                      padding: '11px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      width: '100%',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
                <div></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Current Password (required to change password)</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  style={{ padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', width: '100%', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>New Password</label>
                <input
                  type="password"
                  placeholder={policy ? `Min length: ${policy.minLength}` : "At least 8 characters, uppercase, digit & symbol"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', width: '100%', outline: 'none' }}
                />
              </div>
              {policy && newPassword && (
                <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Password Strength Requirements:</span>
                  <PasswordCriteria criteria={validatePassword(newPassword, policy || {}, user?.employeeId || "").criteria} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', width: '100%', outline: 'none' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Save Profile Changes</button>
            </form>
          </div>

          {/* Admin Password Policy Panel */}
          {user?.role === 'admin' && (
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#e11d48" /> System Password Policy
              </h3>
              
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.1)', borderRadius: '10px', color: '#e11d48', fontSize: '0.82rem', lineHeight: '1.5', marginBottom: '20px' }}>
                <strong>Administrative Access:</strong> Configure system-wide password complexity rules. These rules are dynamically queried by the backend and enforced during user registration, profile updates, and password resets.
              </div>

              <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Length Limits */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Min Password Length</label>
                    <input
                      type="number"
                      min={4}
                      max={128}
                      value={policyMinLength}
                      onChange={e => setPolicyMinLength(parseInt(e.target.value) || 8)}
                      style={{ padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', transition: 'border-color 0.2s' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>Max Password Length</label>
                    <input
                      type="number"
                      min={6}
                      max={256}
                      value={policyMaxLength}
                      onChange={e => setPolicyMaxLength(parseInt(e.target.value) || 64)}
                      style={{ padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', transition: 'border-color 0.2s' }}
                    />
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '5px 0' }} />

                {/* Switch Toggles for Complexity Requirements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Complexity Requirements</span>
                  
                  {/* Require Uppercase */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>Require Uppercase Letter</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Must contain at least one uppercase letter (A-Z)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={policyRequireUpper}
                      onChange={e => setPolicyRequireUpper(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#e11d48' }}
                    />
                  </label>

                  {/* Require Lowercase */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>Require Lowercase Letter</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Must contain at least one lowercase letter (a-z)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={policyRequireLower}
                      onChange={e => setPolicyRequireLower(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#e11d48' }}
                    />
                  </label>

                  {/* Require Number */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>Require Digit</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Must contain at least one numeric digit (0-9)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={policyRequireNumber}
                      onChange={e => setPolicyRequireNumber(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#e11d48' }}
                    />
                  </label>

                  {/* Require Special */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>Require Special Character</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Must contain at least one special character (e.g. @, #, $, %)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={policyRequireSpecial}
                      onChange={e => setPolicyRequireSpecial(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#e11d48' }}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={policySaving}
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#e11d48',
                    borderColor: '#e11d48',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.15)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  {policySaving ? 'Saving...' : 'Save Password Policy'}
                </button>

              </form>
            </div>
          )}
        </div>
      );
    }

    if (activeMenu === 'Help') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>System Announcements &amp; Notifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {notifications.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No notifications.</p>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: notif.isRead ? '#cbd5e1' : '#ef4444', marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{notif.title}</strong>
                      <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>{notif.message}</p>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        {formatDateDDMMMYYYY(notif.createdAt)} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Help Desk &amp; Documentation</h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              Welcome to the Employee Attendance Portal. Here are quick tips for managing your shift logs:
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#475569', paddingLeft: '20px', marginTop: '10px', lineHeight: '1.8' }}>
              <li>Ensure location services (GPS) are enabled before hitting Punch In or Punch Out.</li>
              <li>You can download your monthly summary directly under the Reports tab.</li>
              <li>To file regularizations, head to the Recent Activity list and click Apply Regularization.</li>
              <li>Contact HR support if you have a discrepancy in your work hour calculations.</li>
            </ul>
          </div>
        </div>
      );
    }

    if (activeMenu === 'Change Password') {
      const criteriaResult = validatePassword(newPassword, policy || {}, user?.employeeId || "");
      const isPasswordValid = criteriaResult.valid;

      const handleFirstTimeChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
          triggerToast('New passwords do not match.', 'danger');
          return;
        }
        if (!isPasswordValid) {
          triggerToast('Password does not meet criteria.', 'danger');
          return;
        }
        try {
          const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              oldPassword: oldPassword,
              newPassword: newPassword
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to update password.');

          triggerToast('Password updated successfully!', 'success');
          // Reset password inputs
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');

          // Update local state
          setUser(prev => {
            const updatedUser = { ...prev, isFirstTime: false };
            localStorage.setItem('ams_user', JSON.stringify(updatedUser));
            return updatedUser;
          });

          // Redirect to appropriate landing tab
          setActiveMenu(user?.role === 'reporting manager' ? 'Reporting Manager' : 'Dashboard');
        } catch (err) {
          triggerToast(err.message, 'danger');
        }
      };

      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '20px 0' }}>
          <div className="glass-panel" style={{ padding: '36px', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #cbd5e180', width: '100%', maxWidth: '520px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={24} color="#3b82f6" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Change Your Password</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>First Time Login Verification</span>
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', color: '#92400e', fontSize: '0.82rem', lineHeight: '1.5', marginBottom: '24px' }}>
              <strong>Security Requirement:</strong> Because your account was recently created, you must update your temporary password before you can access the attendance dashboard.
            </div>

            <form onSubmit={handleFirstTimeChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Temporary Password</label>
                <input
                  type="password"
                  placeholder="Enter temporary password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  required
                  style={{ padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', width: '100%', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Secure Password</label>
                <input
                  type="password"
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{ padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', width: '100%', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc' }}
                />
              </div>

              {/* Real-time Password Criteria Feedback */}
              {policy && newPassword && (
                <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Password Strength Requirements:</span>
                  <PasswordCriteria criteria={criteriaResult.criteria} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{ padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', width: '100%', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!isPasswordValid || newPassword !== confirmPassword}
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  borderRadius: '10px',
                  cursor: (!isPasswordValid || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer',
                  opacity: (!isPasswordValid || newPassword !== confirmPassword) ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  boxShadow: (!isPasswordValid || newPassword !== confirmPassword) ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.25)',
                  border: 'none',
                  color: '#ffffff',
                  width: '100%'
                }}
              >
                Activate Account &amp; Login
              </button>
            </form>
          </div>
        </div>
      );
    }
  };

  /* ══════════════════════════════════════════════════════════════
     ROOT RENDER WITH SIDEBAR NAVIGATION LAYOUT
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ ...styles.appLayout, flexDirection: 'column' }}>
      {/* Toast Alert */}
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

      {/* TOP NAVBAR HEADER */}
      <header style={{ ...styles.topbar, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ ...styles.topbarLeft, display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="#3b82f6" />
            <span style={{ ...styles.sidebarBrandText, fontSize: '1.4rem', fontWeight: 'bold' }}>People</span>
          </div>


        </div>

        <div style={styles.topbarRight}>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotificationPanel(prev => !prev)}
              style={styles.topbarBell}
              title="Notifications"
            >
              <Bell size={18} color="#64748b" />
              {notifications.length > 0 && (
                <span style={styles.topbarBellBadge}>{notifications.length}</span>
              )}
            </button>

            {showNotificationPanel && (
              <div style={styles.notificationPanel}>
                <div style={styles.notificationHeader}>
                  <span style={styles.notificationTitle}>Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      style={styles.notificationClearBtn}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div style={styles.notificationList}>
                  {notifications.length === 0 ? (
                    <div style={styles.notificationEmpty}>
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map(notif => {
                      let IconComponent = Info;
                      let iconColor = '#3b82f6';
                      let bgLight = 'rgba(59, 130, 246, 0.1)';

                      if (notif.type === 'success') {
                        IconComponent = CheckCircle;
                        iconColor = '#10b981';
                        bgLight = 'rgba(16, 185, 129, 0.1)';
                      } else if (notif.type === 'warning') {
                        IconComponent = AlertCircle;
                        iconColor = '#f59e0b';
                        bgLight = 'rgba(245, 158, 11, 0.1)';
                      } else if (notif.type === 'danger') {
                        IconComponent = ShieldAlert;
                        iconColor = '#ef4444';
                        bgLight = 'rgba(239, 68, 68, 0.1)';
                      }

                      if (notif.title && notif.title.startsWith('New Email:')) {
                        IconComponent = Mail;
                        iconColor = '#8b5cf6';
                        bgLight = 'rgba(139, 92, 246, 0.1)';
                      }

                      return (
                        <div key={notif.id} style={styles.notificationItem}>
                          <div style={{
                            ...styles.notificationIconWrapper,
                            backgroundColor: bgLight,
                            color: iconColor
                          }}>
                            <IconComponent size={14} />
                          </div>
                          <div style={styles.notificationContent}>
                            <div style={notif.isRead ? styles.notificationItemTitleRead : styles.notificationItemTitleUnread}>
                              {notif.title}
                            </div>
                            <div style={styles.notificationItemMessage}>{notif.message}</div>
                            <div style={styles.notificationItemTime}>
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteNotification(notif.id)}
                            style={styles.notificationDismissBtn}
                            title="Dismiss"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              ...styles.topbarUser,
              cursor: user?.isFirstTime ? 'default' : 'pointer'
            }}
            onClick={() => {
              if (user?.isFirstTime) return;
              setProfileAvatarUrl(user.avatar || '');
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowProfileModal(true);
            }}
            title={user?.isFirstTime ? "Password change required" : "Edit Profile"}
          >
            <Avatar src={user.avatar} name={user.name} role={user.role} size={36} />
            <div style={styles.topbarUserInfo}>
              <span style={styles.topbarUserName}>{user.name}</span>
              <span style={styles.topbarUserRole}>
                {user.role === 'manager' ? 'Team Lead' : (user.role === 'admin' ? 'HR / Admin' : 'Employee')} &bull; {user.department}
              </span>
            </div>
          </div>

          <button id="logout-btn" onClick={logout} style={styles.topbarLogout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* SIDEBAR */}
        <aside style={{
          ...styles.sidebar,
          width: isSidebarCollapsed ? '80px' : '260px',
          padding: isSidebarCollapsed ? '24px 8px' : '24px 16px',
          transition: 'width 0.3s ease, padding 0.3s ease, background-color 0.3s ease',
          height: 'calc(100vh - 70px)',
          top: 0
        }}>
          <div style={{
            ...styles.sidebarBrand,
            justifyContent: 'center',
            padding: '0',
            marginBottom: '20px'
          }}>
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            style={{
              ...styles.sidebarCollapseBtn,
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              marginBottom: '16px'
            }}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu size={18} color="#64748b" />
          </button>
          <div style={styles.sidebarMenu}>
            {(() => {
              if (user?.isFirstTime) {
                return [
                  { id: 'Change Password', icon: <Settings size={18} /> }
                ];
              }
              if (user?.role === 'admin') {
                return [
                  { id: 'Dashboard', icon: <LayoutDashboard size={18} /> },
                  { id: 'Shifts', icon: <Clock size={18} /> },
                  { id: 'Attendance History', icon: <Users size={18} /> },
                  { id: 'Employees', icon: <UserCheck size={18} /> },
                  { id: 'Leaves', icon: <Calendar size={18} /> },
                  { id: 'Leave Types', icon: <Layers size={18} /> },
                  { id: 'Settings', icon: <Settings size={18} /> },
                  { id: 'Help', icon: <HelpCircle size={18} /> }
                ];
              } else if (user?.role === 'manager') {
                return [
                  { id: 'Dashboard', icon: <LayoutDashboard size={18} /> },
                  { id: 'Reports', icon: <FileText size={18} /> },
                  { id: 'Leaves', icon: <Calendar size={18} /> },
                  { id: 'Settings', icon: <Settings size={18} /> },
                  { id: 'Help', icon: <HelpCircle size={18} /> }
                ];
              } else if (user?.role === 'reporting manager') {
                return [
                  { id: 'Reporting Manager', icon: <BarChart3 size={18} /> },
                  { id: 'Settings', icon: <Settings size={18} /> },
                  { id: 'Help', icon: <HelpCircle size={18} /> }
                ];
              } else {
                return [
                  { id: 'Dashboard', icon: <LayoutDashboard size={18} /> },
                  { id: 'Attendance', icon: <Clock size={18} /> },
                  { id: 'Reports', icon: <FileText size={18} /> },
                  { id: 'Leaves', icon: <Calendar size={18} /> },
                  { id: 'Master Data', icon: <Layers size={18} /> },
                  { id: 'Settings', icon: <Settings size={18} /> },
                  { id: 'Help', icon: <HelpCircle size={18} /> }
                ];
              }
            })()
              .map(item => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveMenu(item.id)}
                    title={isSidebarCollapsed ? item.id : ''}
                    style={{
                      ...styles.sidebarBtn,
                      justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                      padding: isSidebarCollapsed ? '12px 0' : '12px 16px',
                    }}
                  >
                    {React.cloneElement(item.icon, { color: isActive ? '#ffffff' : '#64748b' })}
                    {!isSidebarCollapsed && <span>{item.id}</span>}
                  </button>
                );
              })}
          </div>
        </aside>

        {/* MAIN LAYOUT WRAPPER */}
        <div style={{ ...styles.mainContainer, overflowY: 'auto', height: 'calc(100vh - 70px)' }}>

          {/* PAGE CONTENT */}
          <main style={styles.contentArea}>
            {activeMenu === 'Dashboard' && (
              <div style={styles.banner}>
                <h2 style={styles.bannerWelcome}>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
              </div>
            )}

            {renderActiveContent()}
          </main>
        </div>
      </div>

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
                  {availableLeaveTypes.length === 0 ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    availableLeaveTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.modalInputGroup, flex: 1 }}>
                  <label style={styles.modalLabel}>Start Date</label>
                  <DatePicker
                    selected={leaveStartDate ? parseISO(leaveStartDate) : null}
                    onChange={date => setLeaveStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                    dateFormat="dd-MMM-yyyy"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    className="glass-input"
                    wrapperClassName="date-picker-wrapper"
                    customInput={<input style={styles.modalInput} />}
                  />
                </div>
                <div style={{ ...styles.modalInputGroup, flex: 1 }}>
                  <label style={styles.modalLabel}>End Date</label>
                  <DatePicker
                    selected={leaveEndDate ? parseISO(leaveEndDate) : null}
                    onChange={date => setLeaveEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                    dateFormat="dd-MMM-yyyy"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    className="glass-input"
                    wrapperClassName="date-picker-wrapper"
                    customInput={<input style={styles.modalInput} />}
                  />
                </div>
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

      {/* Shift Edit Request Modal */}
      {showShiftRequestModal && (
        <div style={styles.modalBg}>
          <div className="glass-panel" style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem' }}>Request Shift Change</h3>
              <button onClick={() => setShowShiftRequestModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleRequestShiftChange} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Current Shift</label>
                <div style={{ padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--bg-card-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {user.shift?.name || 'General Shift'} ({user.shift ? `${formatTime24h(user.shift.startTime)} - ${formatTime24h(user.shift.endTime)}` : '09:00 - 18:00'})
                </div>
              </div>

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Requested Shift</label>
                <select
                  value={requestedShiftId}
                  onChange={e => setRequestedShiftId(e.target.value)}
                  style={styles.modalSelect}
                  required
                >
                  <option value="" style={{ color: 'black' }}>Select a Shift...</option>
                  {availableShifts.map(s => (
                    <option key={s.id} value={s.id} style={{ color: 'black' }}>
                      {s.name} ({formatTime24h(s.startTime)} - {formatTime24h(s.endTime)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Reason</label>
                <textarea
                  value={shiftRequestReason}
                  onChange={e => setShiftRequestReason(e.target.value)}
                  placeholder="Enter reason for requesting shift change..."
                  style={{ ...styles.modalInput, minHeight: '80px', resize: 'vertical' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Submit Shift Request
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <Avatar src={profileAvatarUrl || user.avatar} name={user.name} role={user.role} size={80} />
              </div>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Avatar Image (URL or Upload)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={profileAvatarUrl}
                    onChange={e => setProfileAvatarUrl(e.target.value)}
                    style={{ ...styles.modalInput, flex: 1 }}
                  />
                  <label className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', fontSize: '0.9rem', margin: 0, width: 'auto' }}>
                    Upload
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>Name</label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    style={{ ...styles.modalInput, color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
                <div style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>Employee ID</label>
                  <input
                    type="text"
                    value={user.employeeId || '---'}
                    readOnly
                    style={{ ...styles.modalInput, color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>Designation</label>
                  <input
                    type="text"
                    value={user.role === 'manager' ? 'Team Lead' : (user.role === 'admin' ? 'HR / Admin' : 'Employee')}
                    readOnly
                    style={{ ...styles.modalInput, color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
                <div style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>Department</label>
                  <input
                    type="text"
                    value={user.department || '---'}
                    readOnly
                    style={{ ...styles.modalInput, color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.modalInputGroup}>
                  <label style={styles.modalLabel}>Assigned Shift</label>
                  <input
                    type="text"
                    value={user.shift ? `${user.shift.name} (${formatTime24h(user.shift.startTime)} - ${formatTime24h(user.shift.endTime)})` : 'General Shift (09:00 - 18:00)'}
                    readOnly
                    style={{ ...styles.modalInput, color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
                <div></div>
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
                <DatePicker
                  selected={flexyDate ? parseISO(flexyDate) : null}
                  onChange={date => setFlexyDate(date ? format(date, 'yyyy-MM-dd') : '')}
                  dateFormat="dd-MMM-yyyy"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  className="glass-input"
                  wrapperClassName="date-picker-wrapper"
                  customInput={<input style={styles.modalInput} required />}
                />
              </div>

              {flexyDate && (() => {
                const targetMonth = flexyDate.substring(0, 7);
                const countThisMonth = myFlexyRequests.filter(req =>
                  req.date.startsWith(targetMonth) &&
                  (req.status === 'Pending' || req.status === 'Approved')
                ).length;
                const dateObj = new Date(flexyDate);
                const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

                if (countThisMonth >= 2) {
                  return (
                    <div style={{
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertCircle size={14} /> Limit reached: You used {countThisMonth}/2 requests in {monthName}.
                    </div>
                  );
                }
                return (
                  <div style={{
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CheckCircle size={14} /> Monthly Status: {countThisMonth}/2 days requested in {monthName}.
                  </div>
                );
              })()}

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
              <button
                type="submit"
                id="submit-flexy-btn"
                className="btn-primary"
                disabled={(() => {
                  if (!flexyDate) return false;
                  const targetMonth = flexyDate.substring(0, 7);
                  const countThisMonth = myFlexyRequests.filter(req =>
                    req.date.startsWith(targetMonth) &&
                    (req.status === 'Pending' || req.status === 'Approved')
                  ).length;
                  return countThisMonth >= 2;
                })()}
                style={{
                  marginTop: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  opacity: (() => {
                    if (!flexyDate) return 1;
                    const targetMonth = flexyDate.substring(0, 7);
                    const countThisMonth = myFlexyRequests.filter(req =>
                      req.date.startsWith(targetMonth) &&
                      (req.status === 'Pending' || req.status === 'Approved')
                    ).length;
                    return countThisMonth >= 2 ? 0.5 : 1;
                  })(),
                  cursor: (() => {
                    if (!flexyDate) return 'pointer';
                    const targetMonth = flexyDate.substring(0, 7);
                    const countThisMonth = myFlexyRequests.filter(req =>
                      req.date.startsWith(targetMonth) &&
                      (req.status === 'Pending' || req.status === 'Approved')
                    ).length;
                    return countThisMonth >= 2 ? 'not-allowed' : 'pointer';
                  })()
                }}
              >
                File Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Credential Approval Modal ── */}
      <CredentialApprovalModal
        isOpen={credentialModal.isOpen}
        requireSignature={user?.role === 'admin'}
        onClose={() => setCredentialModal({ isOpen: false, requestId: null, type: null, decision: null })}
        onConfirm={(credentials) => {
          const { requestId, type, decision } = credentialModal;
          setCredentialModal({ isOpen: false, requestId: null, type: null, decision: null });
          if (type === 'leave') handleLeaveDecision(requestId, decision, credentials);
          else if (type === 'flexy') handleFlexyDecision(requestId, decision, credentials);
          else if (type === 'shift') handleShiftDecision(requestId, decision, credentials);
        }}
      />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   Styles (White/Light Theme with Sidebar - matching image exactly)
═══════════════════════════════════════════════════════════════ */
const styles = {
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Lucida Fax', serif"
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
    padding: '0 8px',
    position: 'relative'
  },
  sidebarBrandText: {
    fontFamily: "'Lucida Fax', serif",
    fontSize: '1.35rem',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '0.02em'
  },
  sidebarCollapseBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px'
  },
  sidebarMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  sidebarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    width: '100%'
  },
  sidebarBtnActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    position: 'relative',
    overflowX: 'hidden'
  },
  topbar: {
    height: '70px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 90
  },
  topbarLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  topbarTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#0f172a'
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  topbarSearchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  topbarSearchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#94a3b8'
  },
  topbarSearchInput: {
    padding: '8px 12px 8px 36px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    width: '180px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  topbarBell: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    padding: '4px'
  },
  topbarBellBadge: {
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    minWidth: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.65rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1
  },
  notificationPanel: {
    position: 'absolute',
    top: '40px',
    right: '0',
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    maxHeight: '400px'
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#f8fafc'
  },
  notificationTitle: {
    fontWeight: '700',
    fontSize: '0.9rem',
    color: '#0f172a'
  },
  notificationClearBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    outline: 'none'
  },
  notificationList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '340px'
  },
  notificationEmpty: {
    padding: '24px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.82rem'
  },
  notificationItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'flex-start',
    transition: 'background-color 0.2s',
    position: 'relative'
  },
  notificationIconWrapper: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px'
  },
  notificationContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  notificationItemTitleUnread: {
    fontWeight: '700',
    fontSize: '0.82rem',
    color: '#1e293b'
  },
  notificationItemTitleRead: {
    fontWeight: '500',
    fontSize: '0.82rem',
    color: '#64748b'
  },
  notificationItemMessage: {
    fontSize: '0.78rem',
    color: '#475569',
    lineHeight: '1.4',
    textAlign: 'left'
  },
  notificationItemTime: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginTop: '2px',
    textAlign: 'left'
  },
  notificationDismissBtn: {
    background: 'none',
    border: 'none',
    color: '#cbd5e1',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s',
    outline: 'none',
    alignSelf: 'center',
    marginLeft: '4px'
  },
  topbarUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  },
  topbarUserInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  topbarUserName: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#0f172a'
  },
  topbarUserRole: {
    fontSize: '0.72rem',
    color: '#64748b'
  },
  topbarLogout: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: 'none',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  contentArea: {
    flex: 1,
    padding: '32px',
    width: '100%',
    maxWidth: '1440px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  banner: { marginBottom: '8px' },
  bannerWelcome: { fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' },
  bannerSub: { color: '#64748b', fontSize: '0.94rem' },

  /* Approval banner */
  approvalBanner: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', color: '#059669', fontSize: '0.88rem', fontWeight: 600, marginBottom: '16px' },

  /* Stats mini cards (employee quick metrics) */
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' },
  statMiniCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', borderRadius: '12px', textAlign: 'center', gap: '6px' },
  miniCardVal: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 },
  miniCardLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '2px' },

  /* Table card */
  tableCard: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  tableCardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  tableTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  tableWrapper: { overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  trHead: { borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  trBody: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  th: { padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', color: '#1e293b', verticalAlign: 'middle' },
  emptyCell: { padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' },
  statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-block' },

  /* Leave CTA card */
  leaveCtaCard: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' },
  leaveCtaIcon: { width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' },
  leaveCtaTitle: { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  leaveCtaDesc: { fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.5 },

  /* Refresh button */
  refreshBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '4px 10px', transition: 'all 0.2s' },

  /* Leave list */
  leaveList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  leaveItem: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '12px' },
  leaveItemLeft: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  leaveItemType: { fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' },
  leaveItemDuration: { fontSize: '0.82rem', color: '#64748b' },
  leaveItemReason: { fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' },

  /* Sub-tabs */
  subTabRow: { display: 'flex', gap: '8px', marginBottom: '24px' },
  subTab: { display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontFamily: "'Lucida Fax', serif", fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' },
  subTabActive: { background: '#ffffff', color: '#0f172a', borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' },

  /* Grid */
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'minmax(380px, 1fr) 2fr', gap: '24px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },

  /* Manager */
  managerHeaderCard: { padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' },
  managerHeaderGrid: { display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  mgrStatItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center', flex: 1, padding: '16px', borderRadius: '12px', transition: 'all 0.2s', border: '1px solid #e2e8f0' },
  mgrStatVal: { fontFamily: "'Lucida Fax', serif", fontSize: '2rem', fontWeight: 800, color: '#0f172a' },
  mgrStatLabel: { fontSize: '0.85rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' },
  teamGoalCard: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' },
  goalHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  goalLabel: { fontSize: '0.85rem', color: '#64748b', fontWeight: 500 },
  goalValue: { fontFamily: "'Lucida Fax', serif", fontSize: '2rem', fontWeight: 800, color: '#0f172a' },
  progressBarBg: { height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '10px', transition: 'width 0.8s ease' },
  goalFooter: { fontSize: '0.78rem', color: '#94a3b8' },
  requestsCard: { padding: '24px', minHeight: '240px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' },
  requestsHeading: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '18px' },
  emptyRequests: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px', color: '#64748b' },
  requestsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  requestItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px' },
  reqDetails: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  reqName: { fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' },
  reqType: { fontSize: '0.82rem', color: '#64748b' },
  reqReason: { fontSize: '0.80rem', color: '#64748b', fontStyle: 'italic' },
  reqActions: { display: 'flex', gap: '8px' },
  actionReject: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionApprove: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(16,185,129,0.12)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '24px' },
  modalBody: { width: '100%', maxWidth: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px 32px', animation: 'fadeIn 0.25s ease', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexShrink: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '20px' },
  modalInputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  modalLabel: { fontSize: '0.78rem', fontWeight: 500, color: '#475569' },
  modalInput: { width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '0.85rem', fontFamily: "'Lucida Fax', serif", outline: 'none' },
  modalSelect: { width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '0.85rem', fontFamily: "'Lucida Fax', serif", outline: 'none', cursor: 'pointer' },

  toastCard: { position: 'fixed', top: '20px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderRadius: '14px', color: '#fff', fontWeight: 600, fontSize: '0.9rem', animation: 'fadeIn 0.3s ease', maxWidth: '360px' },
};
