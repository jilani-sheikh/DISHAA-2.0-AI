import React, { useState, useEffect } from 'react';
import { Users, Search, MapPin, Mail, Building, Layers, Sparkles, X, Phone, Compass, ArrowRight } from 'lucide-react';
import { facultyApi } from '../../services/api/facultyApi';
import type { FacultyMember } from '../../types';

interface FacultyFinderPanelProps {
  onClose: () => void;
  onSelectFacultyLocation?: (block: string, floor: number, roomNo: string) => void;
  onNavigateToBlock?: (blockName: string) => void;
}

export function FacultyFinderPanel({
  onClose,
  onSelectFacultyLocation,
  onNavigateToBlock,
}: FacultyFinderPanelProps) {
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const departments = [
    'all',
    'Computer Science & Engineering',
    'Artificial Intelligence & Data Science',
    'Information Technology',
    'Mechanical Engineering',
    'Electronics & Telecommunication',
    'Civil Engineering',
    'Basic Sciences & Humanities',
  ];

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    setLoading(true);
    try {
      const res = await facultyApi.list();
      if (res.success && Array.isArray(res.data)) {
        setFacultyList(res.data);
      }
    } catch (e) {
      console.error('Failed to load faculty directory:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = facultyList.filter((f) => {
    const matchesDept = selectedDept === 'all' || f.department.toLowerCase() === selectedDept.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q) ||
      f.sittingLocation?.roomNo?.toLowerCase().includes(q) ||
      f.sittingLocation?.block?.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

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
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Faculty Directory
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Find professors, cabins & contact info
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, department, room..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Department Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 14px', overflowX: 'auto', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
        {departments.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDept(d)}
            style={{
              padding: '4px 10px',
              borderRadius: '14px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              backgroundColor: selectedDept === d ? '#2563eb' : '#ffffff',
              color: selectedDept === d ? '#ffffff' : '#475569',
            }}
          >
            {d === 'all' ? 'All' : d}
          </button>
        ))}
      </div>

      {/* Faculty List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
            <Sparkles size={22} style={{ color: '#2563eb', marginBottom: '8px' }} />
            <div>Loading faculty records...</div>
          </div>
        ) : filteredFaculty.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
            No faculty matching criteria.
          </div>
        ) : (
          filteredFaculty.map((f) => (
            <div
              key={f._id || f.email}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{f.name}</strong>
                  <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>{f.designation}</div>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                  }}
                >
                  {f.sittingLocation.block}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {f.department}
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                <div>
                  📍 <strong>{f.sittingLocation.block}</strong> &bull; Floor {f.sittingLocation.floor} &bull; Room {f.sittingLocation.roomNo}
                </div>
              </div>

              {/* Action Buttons: View in 3D & Locate on Map */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {onSelectFacultyLocation && (
                  <button
                    onClick={() => onSelectFacultyLocation(f.sittingLocation.block, f.sittingLocation.floor, f.sittingLocation.roomNo)}
                    style={{
                      flex: 1,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Layers size={13} />
                    <span>View Room in 3D</span>
                  </button>
                )}

                {onNavigateToBlock && (
                  <button
                    onClick={() => onNavigateToBlock(f.sittingLocation.block)}
                    style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <MapPin size={13} />
                    <span>Navigate Here</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
