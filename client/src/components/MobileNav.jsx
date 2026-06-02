import React, { useState, useEffect, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import api from '../services/api';

const NAVY = '#0f172a'; // Sleek dark slate
const ACTIVE_PINK = '#ec4899'; // Vibrant premium pink
const INACTIVE_TEXT = '#94a3b8'; // Cool slate gray

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useContext(AuthContext);
  const { totalUnread = 0 } = useContext(NotificationContext) || {};
  const { onlineUsers = [] } = useSocket() || {};
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [privateUnread, setPrivateUnread] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch private inbox unread count periodically or subscribe to changes
  useEffect(() => {
    const fetchPrivateUnread = async () => {
      if (!token || user?.role === 'guest') return;
      try {
        const { data } = await api.get('/api/inbox/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const unreads = data.reduce((sum, conv) => sum + (conv.unreadCount?.[user?._id] || 0), 0);
        setPrivateUnread(unreads);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPrivateUnread();
    
    // Refresh periodically if on active session
    const interval = setInterval(fetchPrivateUnread, 15000);
    return () => clearInterval(interval);
  }, [token, user]);

  if (!isMobile) return null;

  const handleProfileClick = (e) => {
    if (location.pathname === '/chat') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('open-my-profile'));
    } else {
      // Go to chat first and then open profile
      navigate('/chat');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-my-profile'));
      }, 300);
    }
  };

  const handleNotificationsClick = (e) => {
    if (location.pathname === '/chat') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('open-notifications'));
    } else {
      navigate('/chat');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-notifications'));
      }, 300);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 999,
        padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        height: '62px',
        boxSizing: 'border-box'
      }}
      id="mobile-nav"
    >
      {/* 1. Home Tab */}
      <NavLink 
        to="/" 
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          textDecoration: 'none',
          color: isActive ? ACTIVE_PINK : INACTIVE_TEXT,
          fontSize: '0.72rem',
          fontWeight: 'bold',
          flex: 1,
          transition: 'all 0.2s ease-in-out'
        })}
      >
        <span style={{ fontSize: '1.25rem' }}>🏠</span>
        <span>Home</span>
      </NavLink>

      {/* 2. Chat (General Room) Tab */}
      <NavLink 
        to="/chat" 
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          textDecoration: 'none',
          color: isActive ? ACTIVE_PINK : INACTIVE_TEXT,
          fontSize: '0.72rem',
          fontWeight: 'bold',
          flex: 1,
          position: 'relative',
          transition: 'all 0.2s ease-in-out'
        })}
      >
        <span style={{ fontSize: '1.25rem' }}>💬</span>
        <span>Chats</span>
        {/* Optional Online Badge */}
        {onlineUsers.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: '28%',
            width: '8px',
            height: '8px',
            background: '#10b981',
            borderRadius: '50%',
            border: '1.5px solid rgba(15, 23, 42, 0.95)',
          }} />
        )}
      </NavLink>

      {/* 3. Inbox Tab */}
      <NavLink 
        to="/inbox" 
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          textDecoration: 'none',
          color: isActive ? ACTIVE_PINK : INACTIVE_TEXT,
          fontSize: '0.72rem',
          fontWeight: 'bold',
          flex: 1,
          position: 'relative',
          transition: 'all 0.2s ease-in-out'
        })}
      >
        <span style={{ fontSize: '1.25rem' }}>📩</span>
        <span>Inbox</span>
        {privateUnread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '25%',
            background: '#ef4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '900',
            borderRadius: '10px',
            padding: '1px 5px',
            lineHeight: 1,
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
          }}>
            {privateUnread}
          </span>
        )}
      </NavLink>

      {/* 4. Notifications Tab */}
      <button 
        onClick={handleNotificationsClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          textDecoration: 'none',
          color: location.pathname === '/chat' && totalUnread > 0 ? ACTIVE_PINK : INACTIVE_TEXT,
          fontSize: '0.72rem',
          fontWeight: 'bold',
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 0,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🔔</span>
        <span>Alerts</span>
        {totalUnread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '25%',
            background: '#ef4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '900',
            borderRadius: '10px',
            padding: '1px 5px',
            lineHeight: 1,
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
          }}>
            {totalUnread}
          </span>
        )}
      </button>

      {/* 5. Profile Tab */}
      <button 
        onClick={handleProfileClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: INACTIVE_TEXT,
          fontSize: '0.72rem',
          fontWeight: 'bold',
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>👤</span>
        <span>Profile</span>
      </button>
    </div>
  );
};

export default MobileNav;
