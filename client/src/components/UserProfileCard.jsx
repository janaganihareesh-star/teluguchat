import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

const NAVY = '#1e3d75';

const UserProfileCard = ({ user: targetUser, position, onClose, onPrivate, onViewFullProfile }) => {
  const { user: currentUser, token } = useContext(AuthContext);
  const { onlineUsers = [] } = useSocket() || {};
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionsStatus, setActionsStatus] = useState({
    isBlocked: false,
    isRestricted: false,
    doesBlockMe: false,
    doesRestrictMe: false
  });

  useEffect(() => {
    const fetchStatus = async () => {
      if (!targetUser || !currentUser || targetUser._id === currentUser._id || !token) return;
      try {
        const { data } = await axios.get(`http://localhost:3500/api/users/actions-status/${targetUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActionsStatus(data);
      } catch (err) {
        console.error('Error fetching actions status:', err);
      }
    };
    fetchStatus();
  }, [targetUser, currentUser, token]);

  if (!targetUser) return null;

  const handleBlockToggle = async () => {
    if (targetUser._id === currentUser._id) return;
    setLoading(true);
    try {
      const endpoint = actionsStatus.isBlocked ? 'unblock' : 'block';
      await axios.post(`http://localhost:3500/api/users/${endpoint}/${targetUser._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionsStatus(prev => ({ ...prev, isBlocked: !prev.isBlocked }));
      alert(`User ${actionsStatus.isBlocked ? 'unblocked' : 'blocked'} successfully!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error processing request');
    } finally {
      setLoading(false);
    }
  };

  const handleRestrictToggle = async () => {
    if (targetUser._id === currentUser._id) return;
    setLoading(true);
    try {
      const endpoint = actionsStatus.isRestricted ? 'unrestrict' : 'restrict';
      await axios.post(`http://localhost:3500/api/users/${endpoint}/${targetUser._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionsStatus(prev => ({ ...prev, isRestricted: !prev.isRestricted }));
      alert(`User ${actionsStatus.isRestricted ? 'unrestricted' : 'restricted'} successfully!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error processing request');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (targetUser._id === currentUser._id) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`http://localhost:3500/api/users/friend-request/${targetUser._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(data.message || 'Friend request sent successfully.');
      onClose(); // Close card after sending
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.message || 'Error sending friend request.');
    } finally {
      setLoading(false);
    }
  };

  // Adjust card position to prevent overflow off-screen
  const cardStyle = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 250),
    width: '230px',
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    zIndex: 900,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const rowButtonStyle = {
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    padding: '14px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'background 0.2s',
  };

  return (
    <>
      {/* Click outside overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 899, background: 'transparent' }} onClick={onClose} />
      
      <div style={cardStyle}>
        {/* Navy Header */}
        <div style={{ background: NAVY, padding: '20px 16px', textAlign: 'center', color: '#fff' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
            <img 
              src={targetUser.profilePic || `https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png`}
              alt="avatar" 
              style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #fff', objectFit: 'cover' }} 
            />
            {(() => {
              const isOnline = onlineUsers.some(u => u._id?.toString() === targetUser._id?.toString() || u.username === targetUser.username || targetUser.isOnline);
              return (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '2px', 
                  right: '2px', 
                  width: '12px', 
                  height: '12px', 
                  background: isOnline ? '#4caf50' : '#f44336', 
                  borderRadius: '50%', 
                  border: '2px solid #fff',
                  boxShadow: isOnline ? '0 0 6px rgba(76,175,80,0.6)' : '0 0 6px rgba(244,67,54,0.6)'
                }} 
                title={isOnline ? "Online" : "Offline"}
                />
              );
            })()}
          </div>
          
          <div style={{ fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '0.3px' }}>{targetUser.username}</div>
          <div style={{ fontSize: '0.75rem', color: '#b3e5fc', marginTop: '3px', fontWeight: '500' }}>
            {targetUser.role === 'admin' 
              ? 'Administrator'
              : `${targetUser.age || 28} years · ${targetUser.gender ? targetUser.gender.charAt(0).toUpperCase() + targetUser.gender.slice(1) : 'Male'}`
            }
          </div>
        </div>

        {/* Options List */}
        <div style={{ background: '#fff' }}>
          {targetUser.role === 'admin' ? (
            <div style={{ padding: '24px 16px', fontSize: '0.85rem', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
              Admin details are private and cannot be viewed.
            </div>
          ) : !showActions ? (
            <>
              {/* Row 1: View profile */}
              <button 
                onClick={() => { onViewFullProfile(targetUser.username); onClose(); }} 
                style={rowButtonStyle}
                onMouseOver={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '1.1rem', marginRight: '8px' }}>👤</span>
                <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 'bold' }}>View profile</span>
              </button>

              {/* Row 2: Private */}
              <button 
                onClick={() => { onPrivate(targetUser); onClose(); }} 
                style={rowButtonStyle}
                onMouseOver={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '1.1rem', marginRight: '8px', color: '#2196f3' }}>💬</span>
                <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 'bold' }}>Private</span>
              </button>

              {/* Row 2.5: Add Friend */}
              {targetUser._id !== currentUser._id && (
                <button 
                  onClick={handleAddFriend} 
                  disabled={loading}
                  style={rowButtonStyle}
                  onMouseOver={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: '1.1rem', marginRight: '8px', color: '#10b981' }}>➕</span>
                  <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 'bold' }}>Add friend</span>
                </button>
              )}

              {/* Row 3: Action */}
              <button 
                onClick={() => setShowActions(true)} 
                style={{ ...rowButtonStyle, borderBottom: 'none' }}
                onMouseOver={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '1.1rem', marginRight: '8px', color: '#ff3b30' }}>✓</span>
                <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 'bold' }}>Action</span>
              </button>
            </>
          ) : (
            <>
              {/* Action sub-menu */}
              {targetUser._id !== currentUser._id ? (
                <>
                  {/* Row 1: Block toggle */}
                  <button 
                    onClick={handleBlockToggle} 
                    disabled={loading}
                    style={rowButtonStyle}
                    onMouseOver={e => e.currentTarget.style.background = '#fcf2f2'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '1.1rem', marginRight: '8px', color: '#ff3b30' }}>🚫</span>
                    <span style={{ fontSize: '0.85rem', color: '#ff3b30', fontWeight: 'bold' }}>
                      {actionsStatus.isBlocked ? 'Unblock User' : 'Block User'}
                    </span>
                  </button>

                  {/* Row 2: Restrict toggle */}
                  <button 
                    onClick={handleRestrictToggle} 
                    disabled={loading}
                    style={rowButtonStyle}
                    onMouseOver={e => e.currentTarget.style.background = '#fffbeb'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '1.1rem', marginRight: '8px', color: '#d97706' }}>🔒</span>
                    <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 'bold' }}>
                      {actionsStatus.isRestricted ? 'Unrestrict User' : 'Restrict User'}
                    </span>
                  </button>
                </>
              ) : (
                <div style={{ padding: '16px', fontSize: '0.8rem', color: '#666', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                  Self actions not available.
                </div>
              )}

              {/* Row 3: Back */}
              <button 
                onClick={() => setShowActions(false)} 
                style={{ ...rowButtonStyle, borderBottom: 'none' }}
                onMouseOver={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '1rem', marginRight: '8px', color: '#777' }}>←</span>
                <span style={{ fontSize: '0.85rem', color: '#777', fontWeight: 'bold' }}>Back</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UserProfileCard;
