import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, Megaphone, Info, X, ShieldAlert } from 'lucide-react';

export interface BroadcastAlert {
  _id?: string;
  title: string;
  message: string;
  severity: 'emergency' | 'warning' | 'announcement' | 'info';
  createdBy?: string;
  createdAt?: string;
}

export function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<BroadcastAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchActiveBroadcasts();
    // Poll for emergency updates every 30 seconds
    const interval = setInterval(fetchActiveBroadcasts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveBroadcasts = async () => {
    try {
      const res = await fetch('/api/broadcasts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBroadcasts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch emergency broadcasts:', err);
    }
  };

  const activeAlerts = broadcasts.filter((b) => !b._id || !dismissedIds.includes(b._id));

  if (activeAlerts.length === 0) return null;

  const currentAlert = activeAlerts[currentIndex % activeAlerts.length];

  const handleDismiss = (id?: string) => {
    if (id) {
      setDismissedIds((prev) => [...prev, id]);
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return {
          bg: '#dc2626',
          border: '#b91c1c',
          text: '#ffffff',
          badgeBg: 'rgba(0,0,0,0.3)',
          badgeText: '#fee2e2',
          icon: AlertTriangle,
          label: 'EMERGENCY ALERT 🚨',
        };
      case 'warning':
        return {
          bg: '#f59e0b',
          border: '#d97706',
          text: '#0f172a',
          badgeBg: 'rgba(0,0,0,0.2)',
          badgeText: '#451a03',
          icon: ShieldAlert,
          label: 'CAMPUS NOTICE ⚠️',
        };
      case 'announcement':
        return {
          bg: '#2563eb',
          border: '#1d4ed8',
          text: '#ffffff',
          badgeBg: 'rgba(0,0,0,0.25)',
          badgeText: '#dbeafe',
          icon: Megaphone,
          label: 'ANNOUNCEMENT 📢',
        };
      default:
        return {
          bg: '#4f46e5',
          border: '#4338ca',
          text: '#ffffff',
          badgeBg: 'rgba(0,0,0,0.25)',
          badgeText: '#e0e7ff',
          icon: Info,
          label: 'CAMPUS INFO ℹ️',
        };
    }
  };

  const style = getSeverityStyles(currentAlert.severity);
  const Icon = style.icon;

  return (
    <div
      style={{
        backgroundColor: style.bg,
        borderBottom: `2px solid ${style.border}`,
        color: style.text,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 1000,
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontFamily: 'monospace',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backgroundColor: style.badgeBg,
              color: style.badgeText,
              flexShrink: 0,
            }}
          >
            {style.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ fontSize: '13px', fontWeight: 700 }}>{currentAlert.title}:</strong>
            <span style={{ fontSize: '13px', opacity: 0.95, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentAlert.message}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {activeAlerts.length > 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % activeAlerts.length)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'inherit',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Next Alert"
          >
            {currentIndex + 1} / {activeAlerts.length} &rarr;
          </button>
        )}

        <button
          onClick={() => handleDismiss(currentAlert._id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.85,
          }}
          title="Dismiss Alert"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
