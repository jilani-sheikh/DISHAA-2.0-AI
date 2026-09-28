import React from 'react';
import { Bot, Layers, Users, Calendar, Shield, Compass, Sparkles } from 'lucide-react';

interface BottomNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onGoWelcome: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export function BottomNavbar({
  activeTab,
  setActiveTab,
  onGoWelcome,
  isChatOpen,
  onToggleChat,
}: BottomNavbarProps) {
  const navItems = [
    { id: 'ai', label: 'AI & Routes', icon: Bot, badge: 'AI' },
    { id: 'inside-block', label: '3D Indoor', icon: Layers, badge: '3D' },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'admin', label: 'Admin', icon: Shield },
  ];

  return (
    <>
      {/* ── DESKTOP NAVIGATION RAIL (Left 68px Sidebar) ── */}
      <nav
        className="dishaa-desktop-nav-rail"
        style={{
          width: '68px',
          height: '100%',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          boxShadow: '2px 0 10px rgba(0,0,0,0.15)',
          zIndex: 1050,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
          {/* Logo / Home button */}
          <button
            onClick={onGoWelcome}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
            }}
            title="DISHAA 2.0 Campus Home"
          >
            <Compass size={22} />
          </button>

          <div style={{ width: '32px', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          {/* Navigation Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && isChatOpen;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (activeTab === item.id && isChatOpen) {
                      onToggleChat();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title={item.label}
                >
                  <Icon size={20} />
                  <span style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px', letterSpacing: '0.02em' }}>
                    {item.label.split(' ')[0]}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        fontSize: '8px',
                        fontWeight: 800,
                        backgroundColor: isActive ? '#ffffff' : '#38bdf8',
                        color: isActive ? '#2563eb' : '#0f172a',
                        padding: '1px 3px',
                        borderRadius: '4px',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Brand Info */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, letterSpacing: '0.05em' }}>
            2.0
          </span>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAVBAR (Fixed on Mobile Viewports) ── */}
      <nav
        className="dishaa-mobile-nav-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'none', // Handled via CSS media query
          alignItems: 'center',
          justifyContent: 'space-around',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1050,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && isChatOpen;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                flex: 1,
                height: '100%',
                background: 'none',
                border: 'none',
                color: isActive ? '#38bdf8' : '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: '2px',
              }}
            >
              <Icon size={19} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
