import React, { useState, useEffect } from 'react';
import {
  Shield, Users, User, Building, Layers, MapPin, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle2, X, Sparkles, LogOut, Check, Save, Database, AlertCircle, Settings, LogIn, UserPlus,
  Search, Calendar, PlusCircle, Tag, DollarSign, Megaphone, Trash2
} from 'lucide-react';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFacultyLocation?: (block: string, floor: number, roomNo: string) => void;
}

export function AdminPortalModal({ isOpen, onClose, onSelectFacultyLocation }: AdminPortalModalProps) {
  // Main Portal Role State: 'faculty' | 'admin'
  const [selectedRole, setSelectedRole] = useState<'faculty' | 'admin'>('faculty');
  const [facultySubMode, setFacultySubMode] = useState<'login' | 'register'>('login');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{
    role: 'faculty' | 'admin';
    name: string;
    department?: string;
    location?: string;
    email?: string;
    token?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('dishaa_portal_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (loggedInUser) {
      setIsAuthenticated(true);
      setSelectedRole(loggedInUser.role);
    }
  }, [loggedInUser]);

  // Dashboard Tabs: 'broadcasts' | 'host-event' | 'faculty-list' | 'my-profile'
  const [dashboardTab, setDashboardTab] = useState<'broadcasts' | 'host-event' | 'faculty-list' | 'my-profile'>('faculty-list');

  // Faculty Form Fields
  const [facultyName, setFacultyName] = useState('');
  const [facultyDesignation, setFacultyDesignation] = useState('Assistant Professor');
  const [facultyDept, setFacultyDept] = useState('Computer Science & Engineering');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [facultyPhone, setFacultyPhone] = useState('');
  const [facultyBlock, setFacultyBlock] = useState<'BLOCK A' | 'BLOCK B' | 'BLOCK C'>('BLOCK B');
  const [facultyFloor, setFacultyFloor] = useState<number>(1);
  const [facultyRoomNo, setFacultyRoomNo] = useState('');

  // Admin Form Fields
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Status & Messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Broadcasts state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'emergency' | 'warning' | 'announcement' | 'info'>('warning');
  const [broadcastList, setBroadcastList] = useState<any[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);

  // Host Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('Technical');
  const [eventDept, setEventDept] = useState('Computer Science & Engineering');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEntryFee, setEventEntryFee] = useState('Free');
  const [eventLocType, setEventLocType] = useState<'indoor' | 'outdoor'>('indoor');
  const [eventLocDetails, setEventLocDetails] = useState('BLOCK B - Floor 1 - Lab 105');
  const [eventDescription, setEventDescription] = useState('');

  // Faculty Directory in portal
  const [portalFacultyList, setPortalFacultyList] = useState<any[]>([]);
  const [facultySearch, setFacultySearch] = useState('');

  const departments = [
    'Computer Science & Engineering',
    'Artificial Intelligence & Data Science',
    'Information Technology',
    'Mechanical Engineering',
    'Electronics & Telecommunication',
    'Civil Engineering',
    'Basic Sciences & Humanities',
  ];

  useEffect(() => {
    if (isAuthenticated) {
      if (dashboardTab === 'broadcasts') loadBroadcasts();
      if (dashboardTab === 'faculty-list') loadFaculties();
    }
  }, [isAuthenticated, dashboardTab]);

  const loadBroadcasts = async () => {
    setLoadingBroadcasts(true);
    try {
      const res = await fetch('/api/broadcasts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBroadcastList(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  const loadFaculties = async () => {
    try {
      const res = await fetch('/api/faculty');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPortalFacultyList(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (adminUsername === 'admin' && adminPassword === 'dishaa2026') {
      const user = {
        role: 'admin' as const,
        name: 'Chief Campus Administrator',
        email: 'admin@ghrcem.edu.in',
      };
      setLoggedInUser(user);
      setIsAuthenticated(true);
      setDashboardTab('broadcasts');
      localStorage.setItem('dishaa_portal_auth', JSON.stringify(user));
    } else {
      setErrorMessage('Invalid Admin Credentials. (Default: admin / dishaa2026)');
    }
  };

  const handleFacultyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (facultySubMode === 'login') {
        const res = await fetch('/api/faculty/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: facultyEmail, password: facultyPassword }),
        });
        const data = await res.json();
        if (data.success) {
          const user = {
            role: 'faculty' as const,
            name: data.data.name,
            department: data.data.department,
            email: data.data.email,
            token: data.token,
            location: `${data.data.sittingLocation.block} Floor ${data.data.sittingLocation.floor} Room ${data.data.sittingLocation.roomNo}`,
          };
          setLoggedInUser(user);
          setIsAuthenticated(true);
          setDashboardTab('host-event');
          localStorage.setItem('dishaa_portal_auth', JSON.stringify(user));
        } else {
          setErrorMessage(data.error || 'Login failed.');
        }
      } else {
        const res = await fetch('/api/faculty/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: facultyName,
            designation: facultyDesignation,
            department: facultyDept,
            email: facultyEmail,
            password: facultyPassword,
            phone: facultyPhone,
            block: facultyBlock,
            floor: facultyFloor,
            roomNo: facultyRoomNo,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMessage('Registration successful! You can now log in.');
          setFacultySubMode('login');
        } else {
          setErrorMessage(data.error || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dishaa_portal_auth');
    setLoggedInUser(null);
    setIsAuthenticated(false);
  };

  const handlePublishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          severity: broadcastSeverity,
          createdBy: loggedInUser?.name || 'Administrator',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastTitle('');
        setBroadcastMessage('');
        loadBroadcasts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      await fetch(`/api/broadcasts/${id}`, { method: 'DELETE' });
      loadBroadcasts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleHostEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStartDate || !eventEndDate || !eventDescription) return;
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          type: eventType,
          organizingDept: eventDept,
          startDate: eventStartDate,
          endDate: eventEndDate,
          entryFee: eventEntryFee,
          locationType: eventLocType,
          locationDetails: eventLocDetails,
          description: eventDescription,
          hostedBy: {
            name: loggedInUser?.name,
            department: loggedInUser?.department,
            email: loggedInUser?.email,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEventTitle('');
        setEventDescription('');
        alert('Event successfully published to the Campus Map & Events Board!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
              {isAuthenticated ? `${loggedInUser?.role.toUpperCase()} PORTAL` : 'CAMPUS ADMIN & FACULTY PORTAL'}
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              {isAuthenticated ? `Signed in as ${loggedInUser?.name}` : 'Administrative access, emergency alerts & event hosting'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!isAuthenticated ? (
        /* Login / Registration View */
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Role Selector Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
              marginBottom: '18px',
            }}
          >
            <button
              onClick={() => setSelectedRole('faculty')}
              style={{
                border: 'none',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: selectedRole === 'faculty' ? '#ffffff' : 'transparent',
                color: selectedRole === 'faculty' ? '#2563eb' : '#64748b',
                boxShadow: selectedRole === 'faculty' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Users size={15} />
              <span>Faculty Member</span>
            </button>
            <button
              onClick={() => setSelectedRole('admin')}
              style={{
                border: 'none',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: selectedRole === 'admin' ? '#ffffff' : 'transparent',
                color: selectedRole === 'admin' ? '#2563eb' : '#64748b',
                boxShadow: selectedRole === 'admin' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Shield size={15} />
              <span>Campus Admin</span>
            </button>
          </div>

          {errorMessage && (
            <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
              {successMessage}
            </div>
          )}

          {selectedRole === 'admin' ? (
            /* Admin Login Form */
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Admin Username
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Admin Master Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Sign In as Administrator
              </button>
            </form>
          ) : (
            /* Faculty Login / Registration */
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFacultySubMode('login')}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: facultySubMode === 'login' ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Faculty Login
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  type="button"
                  onClick={() => setFacultySubMode('register')}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: facultySubMode === 'register' ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  New Faculty Registration
                </button>
              </div>

              <form onSubmit={handleFacultyAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {facultySubMode === 'register' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Full Name</label>
                      <input
                        type="text"
                        value={facultyName}
                        onChange={(e) => setFacultyName(e.target.value)}
                        placeholder="Dr. Sunita Sharma"
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Designation</label>
                        <input
                          type="text"
                          value={facultyDesignation}
                          onChange={(e) => setFacultyDesignation(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Department</label>
                        <select
                          value={facultyDept}
                          onChange={(e) => setFacultyDept(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        >
                          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Block</label>
                        <select
                          value={facultyBlock}
                          onChange={(e) => setFacultyBlock(e.target.value as any)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        >
                          <option value="BLOCK A">BLOCK A</option>
                          <option value="BLOCK B">BLOCK B</option>
                          <option value="BLOCK C">BLOCK C</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Floor</label>
                        <input
                          type="number"
                          value={facultyFloor}
                          onChange={(e) => setFacultyFloor(Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Room No</label>
                        <input
                          type="text"
                          value={facultyRoomNo}
                          onChange={(e) => setFacultyRoomNo(e.target.value)}
                          placeholder="B-204"
                          required
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Email Address</label>
                  <input
                    type="email"
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    placeholder="faculty@ghrcem.edu.in"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Password</label>
                  <input
                    type="password"
                    value={facultyPassword}
                    onChange={(e) => setFacultyPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Processing...' : facultySubMode === 'login' ? 'Sign In as Faculty' : 'Register Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* Authenticated Dashboard View */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Dashboard Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
            {loggedInUser?.role === 'admin' && (
              <button
                onClick={() => setDashboardTab('broadcasts')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: dashboardTab === 'broadcasts' ? '#dc2626' : '#ffffff',
                  color: dashboardTab === 'broadcasts' ? '#ffffff' : '#334155',
                }}
              >
                Emergency Broadcasts
              </button>
            )}

            <button
              onClick={() => setDashboardTab('host-event')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: dashboardTab === 'host-event' ? '#2563eb' : '#ffffff',
                color: dashboardTab === 'host-event' ? '#ffffff' : '#334155',
              }}
            >
              Host Campus Event
            </button>

            <button
              onClick={() => setDashboardTab('faculty-list')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: dashboardTab === 'faculty-list' ? '#2563eb' : '#ffffff',
                color: dashboardTab === 'faculty-list' ? '#ffffff' : '#334155',
              }}
            >
              Faculty Directory
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* 1. Broadcasts Tab (Admin) */}
            {dashboardTab === 'broadcasts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handlePublishBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#dc2626' }}>
                    Publish Live Emergency Campus Broadcast
                  </h4>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Broadcast Headline (e.g. Main Gate Heavy Rain Notice)"
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Broadcast message details..."
                    required
                    rows={2}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={broadcastSeverity}
                      onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    >
                      <option value="emergency">Emergency 🚨</option>
                      <option value="warning">Warning ⚠️</option>
                      <option value="announcement">Announcement 📢</option>
                      <option value="info">Info ℹ️</option>
                    </select>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Publish Broadcast Live
                    </button>
                  </div>
                </form>

                {/* Active Broadcasts */}
                <div>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                    Active Broadcast Alerts ({broadcastList.length})
                  </h5>
                  {broadcastList.map((b) => (
                    <div key={b._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '12px' }}>{b.title}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{b.message}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteBroadcast(b._id)}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Host Event Tab */}
            {dashboardTab === 'host-event' && (
              <form onSubmit={handleHostEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Create & Host Campus Event
                </h4>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Event Title</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. AI Hackathon 2026 / Annual Cricket Fest"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Category</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    >
                      <option value="Technical">Technical</option>
                      <option value="Non-Technical">Non-Technical</option>
                      <option value="Sports">Sports</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Seminar">Seminar</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Entry Fee</label>
                    <input
                      type="text"
                      value={eventEntryFee}
                      onChange={(e) => setEventEntryFee(e.target.value)}
                      placeholder="Free or ₹100"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Start Date</label>
                    <input
                      type="date"
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>End Date</label>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Venue Location Details</label>
                  <input
                    type="text"
                    value={eventLocDetails}
                    onChange={(e) => setEventLocDetails(e.target.value)}
                    placeholder="e.g. BLOCK B - Floor 1 - Lab 105 OR Main Ground Turf"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Description</label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Event objectives, guidelines, eligibility..."
                    required
                    rows={3}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Publish Campus Event
                </button>
              </form>
            )}

            {/* 3. Faculty Directory Tab */}
            {dashboardTab === 'faculty-list' && (
              <div>
                <input
                  type="text"
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty by name, department, or room..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '10px' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {portalFacultyList
                    .filter((f) =>
                      f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
                      f.department.toLowerCase().includes(facultySearch.toLowerCase()) ||
                      f.sittingLocation?.roomNo?.toLowerCase().includes(facultySearch.toLowerCase())
                    )
                    .map((f) => (
                      <div key={f._id} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px' }}>{f.name}</strong>
                          <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>{f.designation}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{f.department}</div>
                        <div style={{ fontSize: '11px', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>📍 {f.sittingLocation?.block} &bull; Floor {f.sittingLocation?.floor} &bull; Room {f.sittingLocation?.roomNo}</span>
                          {onSelectFacultyLocation && f.sittingLocation && (
                            <button
                              onClick={() => onSelectFacultyLocation(f.sittingLocation.block, f.sittingLocation.floor, f.sittingLocation.roomNo)}
                              style={{
                                border: '1px solid #2563eb',
                                background: '#eff6ff',
                                color: '#2563eb',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              View in 3D
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
