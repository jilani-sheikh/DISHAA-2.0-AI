import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Tag, Users, DollarSign, Sparkles, X, Filter, ChevronRight, Award } from 'lucide-react';

export interface CampusEvent {
  _id?: string;
  title: string;
  type: string;
  organizingDept: string;
  startDate: string;
  endDate: string;
  entryFee: string;
  locationType: 'indoor' | 'outdoor';
  locationDetails: string;
  description: string;
  hostedBy?: {
    name: string;
    department?: string;
    email?: string;
  };
}

interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLocation?: (locationName: string) => void;
}

export function EventsModal({ isOpen, onClose, onNavigateToLocation }: EventsModalProps) {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  const categories = [
    'all',
    'Technical',
    'Non-Technical',
    'Sports',
    'Cultural',
    'Workshop',
    'Seminar',
  ];

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.data) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch campus events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedType === 'all') return true;
    return ev.type.toLowerCase() === selectedType.toLowerCase();
  });

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
      {/* Header */}
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
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Campus Events & Activities
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Active workshops, fests, hackathons & sports
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close Panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 14px',
          overflowX: 'auto',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f1f5f9',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedType(cat)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: selectedType === cat ? '#2563eb' : '#ffffff',
              color: selectedType === cat ? '#ffffff' : '#475569',
              boxShadow: selectedType === cat ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {cat === 'all' ? 'All Events' : cat}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
            <Sparkles size={24} style={{ animation: 'spin 1s linear infinite', color: '#2563eb', marginBottom: '8px' }} />
            <div>Loading latest campus events...</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
            <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div>No events found for the selected category.</div>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event._id || event.title}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  {event.type}
                </span>
                <span
                  style={{
                    backgroundColor: event.entryFee === 'Free' ? '#ecfdf5' : '#fef3c7',
                    color: event.entryFee === 'Free' ? '#059669' : '#d97706',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {event.entryFee}
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                {event.title}
              </h4>

              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                {event.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="#2563eb" />
                  <span>{event.startDate} to {event.endDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#ea580c" />
                  <span>{event.locationDetails}</span>
                </div>
              </div>

              {event.hostedBy?.name && (
                <div style={{ fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '4px' }}>
                  Organized by <strong>{event.organizingDept}</strong> &bull; {event.hostedBy.name}
                </div>
              )}

              {onNavigateToLocation && (
                <button
                  onClick={() => onNavigateToLocation(event.locationDetails)}
                  style={{
                    marginTop: '4px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <MapPin size={13} />
                  <span>Locate Event Venue</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
