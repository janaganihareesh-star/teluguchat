import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import UserBadge from './UserBadge';
import axios from 'axios';

const OnlineUsers = ({ onSelectUser, onClose, theme = 'dark' }) => {
  const { socket, onlineUsers, isConnected, reconnecting } = useSocket();
  const { token, user: currentUser } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [ignoredUsers, setIgnoredUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'friends' | 'ignored' | 'search'
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = theme === 'light';

  const fetchFriends = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get('http://localhost:3500/api/users/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(data);
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  useEffect(() => {
    fetchFriends();

    // Seed ignored users list from localStorage
    const savedIgnored = JSON.parse(localStorage.getItem('ignoredUsers') || '[]');
    setIgnoredUsers(savedIgnored);

    if (socket) {
      socket.on('friend-status-updated', () => {
        fetchFriends();
      });
      socket.on('update-users', () => {
        fetchFriends();
      });
    }

    return () => {
      if (socket) {
        socket.off('friend-status-updated');
        socket.off('update-users');
      }
    };
  }, [token, socket]);

  const handleUnfriend = async (e, friendId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await axios.delete(`http://localhost:3500/api/users/friends/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends();
    } catch (err) {
      console.error('Error unfriending:', err);
    }
  };

  const handleRemoveIgnore = (e, userId) => {
    e.stopPropagation();
    const updated = ignoredUsers.filter(id => id !== userId);
    setIgnoredUsers(updated);
    localStorage.setItem('ignoredUsers', JSON.stringify(updated));
  };

  // Check if a friend is currently in the onlineUsers list
  const isFriendOnline = (friendId) => {
    return onlineUsers.some(u => u._id === friendId);
  };

  // Helper function to return beautiful custom style for names
  const getUsernameStyle = (item) => {
    if (isLight) {
      if (item.role === 'admin') return { color: '#dc2626', fontWeight: '800' };
      
      if (item.role === 'guest') return { color: '#64748b', fontWeight: '500' };
      if (item.gender === 'female') return { color: '#db2777', fontWeight: '800' };
      if (item.gender === 'male')   return { color: '#0284c7', fontWeight: '800' };
      return { color: '#0f172a', fontWeight: '600' };
    }

    // Dark theme styles with glowing shadow
    if (item.role === 'admin') {
      return {
        color: '#ff3b30',
        textShadow: '0 0 10px rgba(255, 59, 48, 0.95), 0 0 20px rgba(255, 59, 48, 0.5)',
        fontWeight: '900',
        letterSpacing: '0.025em'
      };
    }

    if (item.role === 'guest') {
      return {
        color: '#94a3b8',
        fontWeight: '500'
      };
    }
    if (item.gender === 'female') {
      return {
        color: '#ec4899',
        textShadow: '0 0 10px rgba(236, 72, 153, 0.95), 0 0 20px rgba(236, 72, 153, 0.45)',
        fontWeight: '800'
      };
    }
    if (item.gender === 'male') {
      return {
        color: '#0ea5e9',
        textShadow: '0 0 10px rgba(14, 165, 233, 0.95), 0 0 20px rgba(14, 165, 233, 0.45)',
        fontWeight: '800'
      };
    }
    return {
      color: '#f8fafc',
      fontWeight: '600'
    };
  };

  // Helper: Returns avatar background color and initial char based on gender/role
  const getAvatarStyle = (item) => {
    if (item.role === 'admin') return { bg: '#ff3b30', shadow: '0 0 8px rgba(255,59,48,0.6)' };

    // Gender takes priority for avatar color — even for guests
    if (item.gender === 'female') return { bg: '#db2777', shadow: '0 0 8px rgba(236,72,153,0.5)' };
    if (item.gender === 'male')   return { bg: '#0284c7', shadow: '0 0 8px rgba(14,165,233,0.5)' };
    return { bg: '#475569', shadow: 'none' };
  };

  // Filter list by search query if in search tab
  const getFilteredOnlineUsers = () => {
    if (!searchQuery) return onlineUsers;
    return onlineUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getFilteredFriends = () => {
    if (!searchQuery) return friends;
    return friends.filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  return (
    <div 
      className="p-4 h-full flex flex-col font-sans select-none" 
      style={{ background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.2)' }}
    >
      {/* Connection / Reconnect Indicator */}
      <div className="mb-3 shrink-0">
        {reconnecting && (
          <div className="flex items-center gap-2 bg-yellow-950/40 border border-yellow-700/50 p-2.5 rounded-xl text-yellow-400 text-xs animate-pulse">
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-ping" />
            <span>Reconnecting to chat...</span>
          </div>
        )}
        {!isConnected && !reconnecting && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-700/50 p-2.5 rounded-xl text-red-400 text-xs">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            <span>You are offline</span>
          </div>
        )}
      </div>

      {/* TABS HEADER - EXACT REPLICA OF THE SCREENSHOT OPTIONS BAR */}
      <div className={`flex p-1 rounded-xl items-center mb-4 border shrink-0 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/60 border-white/5'}`}>
        <button
          onClick={() => { if (onClose) onClose(); }}
          className={`p-2 transition cursor-pointer text-sm font-bold flex items-center justify-center w-8 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
          title="Close Sidebar"
        >
          ✕
        </button>
        <div className="flex-1 flex gap-0.5 justify-end">
          <button
            onClick={() => setActiveTab('online')}
            className={`p-2 rounded-lg transition text-base flex items-center justify-center w-9.5 cursor-pointer ${
              activeTab === 'online' 
                ? (isLight ? 'bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm' : 'bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-600/10')
                : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
            }`}
            title="Online Users"
          >
            👥
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`p-2 rounded-lg transition text-base flex items-center justify-center w-9.5 cursor-pointer ${
              activeTab === 'friends'
                ? (isLight ? 'bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm' : 'bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-600/10')
                : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
            }`}
            title="Friends List"
          >
            👤
          </button>
          <button
            onClick={() => setActiveTab('ignored')}
            className={`p-2 rounded-lg transition text-base flex items-center justify-center w-9.5 cursor-pointer ${
              activeTab === 'ignored'
                ? (isLight ? 'bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm' : 'bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-600/10')
                : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
            }`}
            title="Ignore List"
          >
            🚫
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`p-2 rounded-lg transition text-base flex items-center justify-center w-9.5 cursor-pointer ${
              activeTab === 'search'
                ? (isLight ? 'bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm' : 'bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-600/10')
                : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
            }`}
            title="Search Users"
          >
            🔍
          </button>
        </div>
      </div>

      {/* SEARCH HEADER BAR IF SEARCH ACTIVE */}
      {activeTab === 'search' && (
        <div className="mb-4 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition shadow-inner border ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950/60 border-white/10 text-white'
            }`}
            placeholder="Type to search users..."
            autoFocus
          />
        </div>
      )}

      {/* TAB CONTENTS */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence mode="wait">
          {activeTab === 'online' || (activeTab === 'search' && searchQuery) ? (
            <motion.div
              key="online-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {/* Header Info badge */}
              <div className="flex items-center justify-between px-1 mb-2">
                <span className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Online</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                  isLight ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                }`}>
                  {getFilteredOnlineUsers().length}
                </span>
              </div>

              {getFilteredOnlineUsers().map((item) => (
                <div
                  key={item._id}
                  onClick={(e) => onSelectUser && onSelectUser(item, e)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                    isLight 
                      ? 'hover:bg-slate-100 border-transparent hover:border-slate-200 text-slate-800' 
                      : 'hover:bg-gray-800/60 border-transparent hover:border-gray-700 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {item.profilePic && !item.profilePic.includes('cloudinary.com/demo') ? (
                        <img
                          src={item.profilePic}
                          alt="avatar"
                          className="w-9 h-9 rounded-full object-cover"
                          style={{ boxShadow: getAvatarStyle(item).shadow, border: `2px solid ${getAvatarStyle(item).bg}` }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm select-none"
                          style={{ background: getAvatarStyle(item).bg, boxShadow: getAvatarStyle(item).shadow }}
                        >
                          {item.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 shadow-md shadow-green-500/50 ${
                        isLight ? 'border-white' : 'border-slate-900'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span 
                          style={getUsernameStyle(item)}
                          className="text-sm truncate max-w-[110px]"
                        >
                          {item.username}
                        </span>
                        <UserBadge level={item.level} gender={item.gender} role={item.role} />
                      </div>
                      <div className={`text-[10px] truncate max-w-[160px] italic ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        {item.motto ? `"${item.motto}"` : `Level ${item.level}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {getFilteredOnlineUsers().length === 0 && (
                <div className="text-center p-8 text-gray-500 text-xs">
                  No users found matching your search.
                </div>
              )}
            </motion.div>
          ) : activeTab === 'friends' ? (
            <motion.div
              key="friends-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {getFilteredFriends().map((friend) => {
                const online = isFriendOnline(friend._id);
                return (
                  <div
                    key={friend._id}
                    onClick={(e) => onSelectUser && onSelectUser({ ...friend, isOnline: online }, e)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                      isLight 
                        ? 'hover:bg-slate-100 border-transparent hover:border-slate-200 text-slate-800' 
                        : 'hover:bg-gray-800/60 border-transparent hover:border-gray-700 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {friend.profilePic && !friend.profilePic.includes('cloudinary.com/demo') ? (
                          <img
                            src={friend.profilePic}
                            alt="avatar"
                            className="w-9 h-9 rounded-full object-cover"
                            style={{ boxShadow: getAvatarStyle(friend).shadow, border: `2px solid ${getAvatarStyle(friend).bg}` }}
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm select-none"
                            style={{ background: getAvatarStyle(friend).bg, boxShadow: getAvatarStyle(friend).shadow }}
                          >
                            {friend.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        {online ? (
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 shadow-md shadow-green-500/50 ${
                            isLight ? 'border-white' : 'border-slate-900'
                          }`} />
                        ) : (
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 shadow-md shadow-red-500/50 ${
                            isLight ? 'border-white' : 'border-slate-900'
                          }`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span style={getUsernameStyle(friend)} className="text-sm truncate max-w-[110px]">
                            {friend.username}
                          </span>
                          <UserBadge level={friend.level} gender={friend.gender} role={friend.role} />
                        </div>
                        <div className={`text-[10px] truncate max-w-[160px] italic ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                          {friend.motto ? `"${friend.motto}"` : (online ? 'Online' : 'Offline')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleUnfriend(e, friend._id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 cursor-pointer border-0 bg-transparent"
                        title="Remove Friend"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* EMPTY STATE REPLICA OF THE SAD FACE SCREENSHOT */}
              {friends.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center animate-in fade-in duration-200">
                  <div className="text-6xl mb-4 opacity-50 select-none">😢</div>
                  <div className="text-sm font-extrabold text-slate-400">You have no friends</div>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'ignored' ? (
            <motion.div
              key="ignored-tab"
              className="space-y-2"
            >
              {ignoredUsers.map((userId) => (
                <div
                  key={userId}
                  className={`flex items-center justify-between p-2.5 border rounded-xl text-sm ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
                  }`}
                >
                  <span className="font-semibold">Ignored User</span>
                  <button
                    onClick={(e) => handleRemoveIgnore(e, userId)}
                    className="text-xs bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg hover:bg-indigo-600/50 transition cursor-pointer"
                  >
                    Unignore
                  </button>
                </div>
              ))}

              {ignoredUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center animate-in fade-in duration-200">
                  <div className="text-6xl mb-4 opacity-50 select-none">🚫</div>
                  <div className="text-sm font-extrabold text-slate-400">Your ignore list is empty</div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Search initial empty view */
            <div className={`text-center p-8 text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
              Type above to search online users...
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnlineUsers;
