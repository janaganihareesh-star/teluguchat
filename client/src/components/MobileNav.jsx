import React from 'react';
import { NavLink } from 'react-router-dom';

const NAVY = '#1e3d75';

const MobileNav = () => {
  return (
    <div style={{
      display: 'none',
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: NAVY,
      borderTop: '1px solid rgba(255,255,255,0.15)',
      zIndex: 50,
      padding: '6px 0 env(safe-area-inset-bottom)',
    }} id="mobile-nav">
      {[
        { to: '/chat', label: 'Chat', icon: '💬' },
        { to: '/inbox', label: 'Inbox', icon: '📩' },
        { to: '/profile', label: 'Profile', icon: '👤' },
      ].map(({ to, label, icon }) => (
        <NavLink key={to} to={to} style={({ isActive }) => ({
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textDecoration: 'none',
          color: isActive ? '#e91e63' : '#90caf9',
          fontSize: '0.65rem',
          padding: '4px',
        })}>
          <span style={{ fontSize: '1.3rem' }}>{icon}</span>
          {label}
        </NavLink>
      ))}
    </div>
  );
};

export default MobileNav;
