import React, { useState, useEffect, useCallback } from 'react';
import { facultyApi } from '../../services/api/facultyApi';
import type { FacultyMember } from '../../types';
import { IndoorMapDialog } from '../layout/IndoorMapDialog';
import { IconArrowRight, IconUsers, IconBuilding, IconPins } from './icons';
import './landing.css';
import './faculty-portal.css';

interface FacultyPortalProps {
  onBack: () => void;
}

const DEPARTMENTS = [
  'All Departments',
  'Computer Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Information Technology',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Basic Sciences & Humanities',
];

const BLOCKS = ['BLOCK A', 'BLOCK B', 'BLOCK C'] as const;

export function FacultyPortal({ onBack }: FacultyPortalProps) {
  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<'directory' | 'login' | 'register' | 'dashboard'>('directory');
  
  // Faculty List & Search
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Authenticated Faculty Session
  const [currentFaculty, setCurrentFaculty] = useState<FacultyMember | null>(() => {
    try {
      const saved = localStorage.getItem('dishaa_faculty_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form
  const [regName, setRegName] = useState('');
  const [regDesignation, setRegDesignation] = useState('Assistant Professor');
  const [regDept, setRegDept] = useState('Computer Science & Engineering');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBlock, setRegBlock] = useState<'BLOCK A' | 'BLOCK B' | 'BLOCK C'>('BLOCK B');
  const [regFloor, setRegFloor] = useState<number>(1);
  const [regRoomNo, setRegRoomNo] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Profile Edit Form inside Dashboard
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editBlock, setEditBlock] = useState<'BLOCK A' | 'BLOCK B' | 'BLOCK C'>('BLOCK B');
  const [editFloor, setEditFloor] = useState<number>(1);
  const [editRoomNo, setEditRoomNo] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  // Indoor Map Modal Integration
  const [indoorTarget, setIndoorTarget] = useState<{
    isOpen: boolean;
    block: 'BLOCK A' | 'BLOCK B' | 'BLOCK C';
    floor: number;
    roomNo?: string;
  } | null>(null);

  // Fetch faculties
  const loadFaculties = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const res = await facultyApi.list({
        department: selectedDept,
        q: searchQuery,
      });
      if (res.success && Array.isArray(res.data)) {
        setFacultyList(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not retrieve faculty members.';
      setListError(msg);
    } finally {
      setIsLoadingList(false);
    }
  }, [selectedDept, searchQuery]);

  useEffect(() => {
    loadFaculties();
  }, [loadFaculties]);

  // If user is already logged in, show dashboard on initial open if requested
  useEffect(() => {
    if (currentFaculty && activeTab === 'login') {
      setActiveTab('dashboard');
    }
  }, [currentFaculty, activeTab]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await facultyApi.login(loginEmail, loginPassword);
      if (res.success && res.faculty) {
        setCurrentFaculty(res.faculty);
        localStorage.setItem('dishaa_faculty_user', JSON.stringify(res.faculty));
        if (res.token) {
          localStorage.setItem('dishaa_faculty_token', res.token);
        }
        setActiveTab('dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regRoomNo.trim()) {
      setRegError('Please complete all required fields including office room number.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await facultyApi.register({
        name: regName,
        designation: regDesignation,
        department: regDept,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        block: regBlock,
        floor: Number(regFloor),
        roomNo: regRoomNo,
      });

      if (res.success && res.faculty) {
        setRegSuccess('Registration successful! Profile registered to campus directory.');
        setCurrentFaculty(res.faculty);
        localStorage.setItem('dishaa_faculty_user', JSON.stringify(res.faculty));
        if (res.token) {
          localStorage.setItem('dishaa_faculty_token', res.token);
        }
        loadFaculties();
        setTimeout(() => {
          setActiveTab('dashboard');
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Check if email is already in use.';
      setRegError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Profile Update
  const handleStartEdit = () => {
    if (!currentFaculty) return;
    setEditDesignation(currentFaculty.designation || '');
    setEditPhone(currentFaculty.phone || '');
    const cleanBlock = (currentFaculty.sittingLocation?.block || 'BLOCK B').toUpperCase();
    setEditBlock(cleanBlock.includes('A') ? 'BLOCK A' : cleanBlock.includes('C') ? 'BLOCK C' : 'BLOCK B');
    setEditFloor(currentFaculty.sittingLocation?.floor ?? 1);
    setEditRoomNo(currentFaculty.sittingLocation?.roomNo || '');
    setIsEditingProfile(true);
    setUpdateMsg(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFaculty?._id) return;

    setIsUpdating(true);
    setUpdateMsg(null);
    try {
      const token = localStorage.getItem('dishaa_faculty_token');
      const res = await facultyApi.update(
        currentFaculty._id,
        {
          designation: editDesignation,
          phone: editPhone,
          block: editBlock,
          floor: Number(editFloor),
          roomNo: editRoomNo,
        },
        token
      );

      if (res.success && res.faculty) {
        setCurrentFaculty(res.faculty);
        localStorage.setItem('dishaa_faculty_user', JSON.stringify(res.faculty));
        setUpdateMsg('Profile & Sitting Location updated successfully!');
        setIsEditingProfile(false);
        loadFaculties();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      setUpdateMsg(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('dishaa_faculty_user');
    localStorage.removeItem('dishaa_faculty_token');
    setCurrentFaculty(null);
    setActiveTab('directory');
  };

  // Open Indoor Map for a Faculty Member
  const handleLocateOffice = (blockStr: string, floorNum: number, roomNo?: string) => {
    const clean = blockStr.toUpperCase();
    const block: 'BLOCK A' | 'BLOCK B' | 'BLOCK C' =
      clean.includes('A') ? 'BLOCK A' : clean.includes('C') ? 'BLOCK C' : 'BLOCK B';
    setIndoorTarget({
      isOpen: true,
      block,
      floor: Number(floorNum) || 0,
      roomNo,
    });
  };

  return (
    <div className="dishaa-landing">
      <div className="fp-wrapper">
        <div className="fp-container">
          {/* Header Card */}
          <div className="fp-header-card">
            <div className="fp-header-left">
              <div className="fp-header-icon" aria-hidden="true">
                <IconUsers size={32} />
              </div>
              <div className="fp-header-title">
                <h1>Faculty Portal & Directory</h1>
                <p>Find faculty office rooms, view 3D indoor locations, and manage academic profiles</p>
              </div>
            </div>

            <button type="button" className="lp-btn lp-btn-secondary" onClick={onBack}>
              &larr; Back to DISHAA
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="fp-tabs-row">
            <button
              type="button"
              className={`fp-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
              onClick={() => setActiveTab('directory')}
            >
              <IconPins size={16} />
              <span>Faculty Directory & Office Finder</span>
            </button>

            {currentFaculty ? (
              <button
                type="button"
                className={`fp-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <IconUsers size={16} />
                <span>My Faculty Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`fp-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  <IconArrowRight size={16} />
                  <span>Faculty Sign In</span>
                </button>
                <button
                  type="button"
                  className={`fp-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  <span>+ Register Profile</span>
                </button>
              </>
            )}
          </div>

          {/* ── TAB 1: FACULTY DIRECTORY & SEARCH ── */}
          {activeTab === 'directory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Search and Filters */}
              <div className="fp-search-bar">
                <div className="fp-search-input-wrap">
                  <span className="fp-search-icon">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by professor name, designation, room (e.g. B-108)..."
                  />
                </div>

                <select
                  className="fp-dept-select"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status messages */}
              {isLoadingList && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#5c5878' }}>
                  Loading faculty directory...
                </div>
              )}

              {listError && (
                <div className="fp-alert fp-alert-error">
                  <span>⚠️</span>
                  <span>{listError}</span>
                </div>
              )}

              {/* Faculty Cards Grid */}
              {!isLoadingList && (
                <div className="fp-faculty-grid">
                  {facultyList.map((faculty) => {
                    const initials = faculty.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase();

                    const sitting = faculty.sittingLocation;
                    const locationText = sitting
                      ? `${sitting.block} • Floor ${sitting.floor} • Room ${sitting.roomNo}`
                      : 'Location not registered';

                    return (
                      <div key={faculty._id || faculty.email} className="fp-faculty-card">
                        <div className="fp-card-top">
                          <div className="fp-avatar">{initials || 'FC'}</div>
                          <div className="fp-faculty-info">
                            <h3>{faculty.name}</h3>
                            <span className="fp-badge-designation">{faculty.designation}</span>
                          </div>
                        </div>

                        <div className="fp-dept-name">{faculty.department}</div>

                        <div className="fp-location-box">
                          <div className="fp-location-label">
                            <IconBuilding size={16} />
                            <span>Office</span>
                          </div>
                          <span className="fp-location-room">
                            {sitting?.roomNo || 'TBD'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {locationText}
                        </div>

                        {sitting && (
                          <button
                            type="button"
                            className="fp-locate-btn"
                            onClick={() =>
                              handleLocateOffice(sitting.block, sitting.floor, sitting.roomNo)
                            }
                          >
                            <span>✦ View Office on Indoor Map</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!isLoadingList && facultyList.length === 0 && !listError && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No faculty members found matching your search.
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: FACULTY LOGIN ── */}
          {activeTab === 'login' && !currentFaculty && (
            <div className="fp-form-card">
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Faculty Sign In</h2>
              <p style={{ color: '#5c5878', fontSize: '0.9rem', marginTop: '6px' }}>
                Access faculty profile tools and manage your sitting location on the campus map.
              </p>

              {loginError && (
                <div className="fp-alert fp-alert-error" style={{ marginTop: '16px' }}>
                  <span>⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form className="fp-form-grid" onSubmit={handleLogin}>
                <div>
                  <label className="fp-input-label">Institute Email</label>
                  <input
                    type="email"
                    className="fp-text-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="hod.cse@ghrcem.edu.in"
                    required
                  />
                </div>

                <div>
                  <label className="fp-input-label">Password</label>
                  <input
                    type="password"
                    className="fp-text-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="lp-btn lp-btn-primary"
                  style={{ width: '100%', marginTop: '10px' }}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Signing In...' : 'Sign In to Portal'}
                </button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.88rem' }}>
                <span style={{ color: '#5c5878' }}>New faculty member? </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--lp-violet)', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setActiveTab('register')}
                >
                  Register your profile
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 3: REGISTER NEW FACULTY ── */}
          {activeTab === 'register' && (
            <div className="fp-form-card" style={{ maxWidth: '640px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Register Faculty Profile</h2>
              <p style={{ color: '#5c5878', fontSize: '0.9rem', marginTop: '6px' }}>
                Add your profile and office location to the DISHAA campus indoor map.
              </p>

              {regError && (
                <div className="fp-alert fp-alert-error" style={{ marginTop: '16px' }}>
                  <span>⚠️</span>
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="fp-alert fp-alert-success" style={{ marginTop: '16px' }}>
                  <span>✓</span>
                  <span>{regSuccess}</span>
                </div>
              )}

              <form className="fp-form-grid" onSubmit={handleRegister}>
                <div className="fp-form-row">
                  <div>
                    <label className="fp-input-label">Full Name *</label>
                    <input
                      type="text"
                      className="fp-text-input"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. A. K. Sharma"
                      required
                    />
                  </div>
                  <div>
                    <label className="fp-input-label">Designation</label>
                    <input
                      type="text"
                      className="fp-text-input"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor"
                    />
                  </div>
                </div>

                <div>
                  <label className="fp-input-label">Department *</label>
                  <select
                    className="fp-select-input"
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fp-form-row">
                  <div>
                    <label className="fp-input-label">Email (Username) *</label>
                    <input
                      type="email"
                      className="fp-text-input"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@ghrcem.edu.in"
                      required
                    />
                  </div>
                  <div>
                    <label className="fp-input-label">Phone Number</label>
                    <input
                      type="tel"
                      className="fp-text-input"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="fp-input-label">Password *</label>
                  <input
                    type="password"
                    className="fp-text-input"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                  />
                </div>

                {/* Sitting Location Fields */}
                <div style={{ marginTop: '10px', padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '12px' }}>
                    🏢 Sitting / Office Location
                  </span>
                  <div className="fp-form-row">
                    <div>
                      <label className="fp-input-label">Building Block *</label>
                      <select
                        className="fp-select-input"
                        value={regBlock}
                        onChange={(e) => {
                          const b = e.target.value as 'BLOCK A' | 'BLOCK B' | 'BLOCK C';
                          setRegBlock(b);
                          if (b === 'BLOCK B') setRegFloor(1);
                          else setRegFloor(0);
                        }}
                      >
                        {BLOCKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="fp-input-label">Floor Number *</label>
                      <select
                        className="fp-select-input"
                        value={regFloor}
                        onChange={(e) => setRegFloor(Number(e.target.value))}
                      >
                        {regBlock === 'BLOCK B' ? (
                          <>
                            <option value={1}>Floor 1 (1F)</option>
                            <option value={2}>Floor 2 (2F)</option>
                            <option value={3}>Floor 3 (3F)</option>
                            <option value={4}>Floor 4 (4F)</option>
                          </>
                        ) : (
                          <option value={0}>Floor 0 (Ground Floor)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <label className="fp-input-label">Room Number / Identifier *</label>
                    <input
                      type="text"
                      className="fp-text-input"
                      value={regRoomNo}
                      onChange={(e) => setRegRoomNo(e.target.value)}
                      placeholder="e.g. B-108, A-102, C-005"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="lp-btn lp-btn-primary"
                  style={{ width: '100%', marginTop: '14px' }}
                  disabled={isRegistering}
                >
                  {isRegistering ? 'Registering...' : 'Register Faculty Profile'}
                </button>
              </form>
            </div>
          )}

          {/* ── TAB 4: AUTHENTICATED DASHBOARD ── */}
          {activeTab === 'dashboard' && currentFaculty && (
            <div className="fp-dash-card">
              <div className="fp-dash-top">
                <div className="fp-dash-profile-row">
                  <div className="fp-dash-avatar">
                    {currentFaculty.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'FC'}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{currentFaculty.name}</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--lp-body)', fontSize: '0.92rem' }}>
                      {currentFaculty.designation} &bull; {currentFaculty.department}
                    </p>
                    <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                      {currentFaculty.email} {currentFaculty.phone ? `• ${currentFaculty.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="lp-btn lp-btn-secondary"
                    onClick={handleStartEdit}
                  >
                    Edit Profile & Office
                  </button>
                  <button
                    type="button"
                    className="lp-btn lp-btn-secondary"
                    style={{ color: '#b91c1c' }}
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>
              </div>

              {updateMsg && (
                <div className="fp-alert fp-alert-success">
                  <span>✓</span>
                  <span>{updateMsg}</span>
                </div>
              )}

              {/* Office Location Banner */}
              <div className="fp-dash-office-banner">
                <div className="fp-dash-office-details">
                  <h4>📍 Current Office Location</h4>
                  <p>
                    {currentFaculty.sittingLocation
                      ? `${currentFaculty.sittingLocation.block} • Floor ${currentFaculty.sittingLocation.floor} • Room ${currentFaculty.sittingLocation.roomNo}`
                      : 'Office location not configured'}
                  </p>
                </div>

                {currentFaculty.sittingLocation && (
                  <button
                    type="button"
                    className="lp-btn lp-btn-primary"
                    style={{ minHeight: '44px', padding: '0 18px', fontSize: '0.88rem' }}
                    onClick={() =>
                      handleLocateOffice(
                        currentFaculty.sittingLocation.block,
                        currentFaculty.sittingLocation.floor,
                        currentFaculty.sittingLocation.roomNo
                      )
                    }
                  >
                    <span>✦ Open in 3D Indoor Map</span>
                  </button>
                )}
              </div>

              {/* Edit Mode Modal / Sub-card */}
              {isEditingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Update Sitting Location & Profile</h3>

                  <div className="fp-form-row">
                    <div>
                      <label className="fp-input-label">Designation</label>
                      <input
                        type="text"
                        className="fp-text-input"
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="fp-input-label">Phone Number</label>
                      <input
                        type="tel"
                        className="fp-text-input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fp-form-row">
                    <div>
                      <label className="fp-input-label">Building Block</label>
                      <select
                        className="fp-select-input"
                        value={editBlock}
                        onChange={(e) => {
                          const b = e.target.value as 'BLOCK A' | 'BLOCK B' | 'BLOCK C';
                          setEditBlock(b);
                          if (b === 'BLOCK B') setEditFloor(1);
                          else setEditFloor(0);
                        }}
                      >
                        {BLOCKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="fp-input-label">Floor</label>
                      <select
                        className="fp-select-input"
                        value={editFloor}
                        onChange={(e) => setEditFloor(Number(e.target.value))}
                      >
                        {editBlock === 'BLOCK B' ? (
                          <>
                            <option value={1}>Floor 1 (1F)</option>
                            <option value={2}>Floor 2 (2F)</option>
                            <option value={3}>Floor 3 (3F)</option>
                            <option value={4}>Floor 4 (4F)</option>
                          </>
                        ) : (
                          <option value={0}>Floor 0 (Ground Floor)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="fp-input-label">Room Number</label>
                    <input
                      type="text"
                      className="fp-text-input"
                      value={editRoomNo}
                      onChange={(e) => setEditRoomNo(e.target.value)}
                      placeholder="e.g. B-108"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="lp-btn lp-btn-secondary"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="lp-btn lp-btn-primary"
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Indoor Map Dialog Launcher ── */}
      {indoorTarget?.isOpen && (
        <IndoorMapDialog
          initialBlock={indoorTarget.block}
          initialFloor={indoorTarget.floor}
          initialRoom={indoorTarget.roomNo}
          autoLaunchFullscreen={true}
          onClose={() => setIndoorTarget(null)}
        />
      )}
    </div>
  );
}

export default FacultyPortal;
