import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { FaPlay, FaBars, FaSyncAlt, FaCheckSquare, FaTrashAlt } from 'react-icons/fa';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import ModerationOverlay from '../components/ModerationOverlay';
import OnlineUsers from '../components/OnlineUsers';
import UserProfileCard from '../components/UserProfileCard';
import NotificationBell from '../components/NotificationBell';
import Logo from '../components/Logo';
import axios from 'axios';
import UserMenuDropdown from '../components/UserMenuDropdown';
import LevelInfoModal from '../components/LevelInfoModal';
import FullProfileModal from '../components/FullProfileModal';
import PrivateChatWindow from '../components/PrivateChatWindow';
import LevelUpPopup from '../components/LevelUpPopup';
import WalletModal from '../components/WalletModal';
import SoundsModal from '../components/SoundsModal';
import ThemeModal from '../components/ThemeModal';
import NewsModal from '../components/NewsModal';
import LeaderboardsModal from '../components/LeaderboardsModal';
import { soundSystem } from '../utils/soundSystem';

const HEADER_BG = 'rgba(15, 23, 42, 0.75)';
const CARD_BG = 'rgba(30, 41, 59, 0.45)';
const GOLD = '#f59e0b';
const INDIGO = '#6366f1';

const ChatRoom = () => {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useContext(AuthContext);
  const { socket } = useSocket();
  
  const [moderationEvent, setModerationEvent] = useState(null);
  const [activeHoldEnd, setActiveHoldEnd] = useState(user?.moderation?.holdUntil ? new Date(user.moderation.holdUntil) : null);
  const [now, setNow] = useState(Date.now());
  
  const [showOnlineSidebar, setShowOnlineSidebar] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hiddenMessages, setHiddenMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('users');
  const [showDrawer, setShowDrawer] = useState(false);
  const [profileCard, setProfileCard] = useState(null); // { user, x, y }
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [fullProfileUsername, setFullProfileUsername] = useState(null);
  const [activePrivateChatUser, setActivePrivateChatUser] = useState(null);
  const [isPrivateChatMinimized, setIsPrivateChatMinimized] = useState(false);
  const [privateChatHasUnread, setPrivateChatHasUnread] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showInboxDropdown, setShowInboxDropdown] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showWallet, setShowWallet] = useState(false);
  const [showSounds, setShowSounds] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showLeaderboards, setShowLeaderboards] = useState(false);
  const [hasSeenNews, setHasSeenNews] = useState(() => localStorage.getItem('hasSeenNews') === 'true');
  const messagesEndRef = useRef(null);
  const roomId = 'general';

  useEffect(() => {
    if (activePrivateChatUser) {
      setIsPrivateChatMinimized(false);
      setPrivateChatHasUnread(false);
    }
  }, [activePrivateChatUser]);

  useEffect(() => {
    // Fetch legacy message history
    axios.get(`http://localhost:3500/api/messages/${roomId}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(res => setMessages(res.data))
      .catch(console.error);

    const onConnect = () => {
      socket.emit('join-room', roomId);
    };
    socket.on('connect', onConnect);
    // Also emit initially in case it's already connected
    socket.emit('join-room', roomId);

    socket.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (msg.sender?._id !== user?._id) {
        if (user && msg.message.includes(`@${user.username}`)) {
          soundSystem.mentionAlert();
        } else {
          soundSystem.messagePing();
        }
      }
    });

    socket.on('chats-cleared', (msg) => {
      setMessages([msg]);
    });

    socket.on('user-typing', (username) => {
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
    });

    socket.on('user-stop-typing', () => {
      setTypingUsers([]);
    });

    socket.on('message-rejected', (data) => {
      alert(data.reason);
    });

    socket.on('system-message', (data) => {
      setMessages(prev => [...prev, {
        _id: 'sys_' + Date.now() + Math.random(),
        type: 'system',
        message: data.message,
        icon: data.icon,
        createdAt: new Date().toISOString()
      }]);
    });

    socket.on('moderation-event', (data) => {
      setModerationEvent(data);
      if (data.type === 'hold') {
        setActiveHoldEnd(data.until);
      } else if (data.type === 'suspend' || data.type === 'kick') {
        setActiveHoldEnd(null);
      }
    });

    socket.on('level-up', (data) => {
      setLevelUpData(data.level);
      updateUser({ level: data.level, xp: data.xp });
    });

    socket.on('activity-reward', (data) => {
      updateUser({ level: data.level, xp: data.xp, coins: data.coins });
      if (data.leveledUp) {
        setLevelUpData(data.level);
      }
    });

    return () => {
      socket.emit('leave-room', roomId);
      ['receive-message', 'chats-cleared', 'user-typing', 'user-stop-typing', 'message-rejected', 'system-message', 'level-up', 'activity-reward', 'moderation-event'].forEach(e => socket.off(e));
      socket.off('connect', onConnect);
    };
  }, [socket, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeHoldEnd) {
      const timer = setInterval(() => {
        const diff = new Date(activeHoldEnd) - new Date();
        if (diff <= 0) {
          setActiveHoldEnd(null);
          setModerationEvent(null);
        } else {
          setNow(Date.now());
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeHoldEnd]);

  const isHoldActive = activeHoldEnd && new Date(activeHoldEnd) > new Date(now);

  const fetchConvs = async () => {
    if (!token || user?.role === 'guest') return;
    try {
      const { data } = await axios.get('http://localhost:3500/api/inbox/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    fetchConvs();

    if (!socket) return;
    const handlePrivMsg = (msg) => {
      fetchConvs();
      if (msg && msg.sender !== user?._id && msg.senderId !== user?._id) {
        soundSystem.privateMessagePing();
      }
    };

    socket.on('private-message', handlePrivMsg);
    return () => {
      socket.off('private-message', handlePrivMsg);
    };
  }, [token, socket, user]);

  const handleMarkAllInboxRead = async () => {
    try {
      await axios.put('http://localhost:3500/api/inbox/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConvs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllInbox = async () => {
    if (!window.confirm('Are you sure you want to clear all conversations?')) return;
    try {
      await axios.delete('http://localhost:3500/api/inbox/clear-all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConvs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = (data) => {
    socket.emit('send-message', {
      roomId,
      message: data.message,
      mediaUrl: data.mediaUrl,
      gifUrl: data.gifUrl,
      voiceUrl: data.voiceUrl,
      mentions: data.mentions || []
    });
  };

  const handleHideMessage = (msgId) => {
    setHiddenMessages(prev => [...prev, msgId]);
  };

  const handleReportMessage = (msg) => {
    if (!token || user?.role === 'guest') return alert('Please login to report.');
    if (window.confirm(`Report message from ${msg.sender.username}?`)) {
      axios.post('http://localhost:3500/api/users/report', { targetId: msg.sender._id }, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => alert('Report submitted successfully.'))
        .catch(err => alert(err.response?.data?.message || 'Error reporting.'));
    }
  };

  const openProfile = (targetUser, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setProfileCard({ user: targetUser, x: rect.left, y: rect.bottom });
  };

  return (
    <div className="flex flex-col h-[100dvh] font-sans overflow-hidden relative" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      
      {/* HEADER BAR */}
      <header className="flex items-center justify-between px-4 h-14 z-10 border-b border-black/10 shrink-0" style={{ background: 'var(--bg-panel)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDrawer(true)} className="p-2 hover:opacity-80 rounded-lg transition relative" style={{ color: 'var(--text-main)' }}>
            ☰
            {!hasSeenNews && <span className="absolute top-1.5 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-panel)]"></span>}
          </button>
          <Logo size={32} showText={true} header={true} />
          <span className="text-[10px] border px-2 py-0.5 rounded-full font-bold ml-2 hidden sm:inline-block" style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)', backgroundColor: 'transparent' }}>
            Main Chatroom
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()} 
            title="Refresh Page" 
            className="p-2 hover:opacity-80 rounded-lg transition flex items-center justify-center text-sm"
            style={{ color: 'var(--text-main)' }}
          >
            <FaSyncAlt />
          </button>
          <NotificationBell />
          <div className="relative">
            <button 
              onClick={() => {
                if (user?.role === 'guest') {
                  alert('Guest users cannot access the private inbox.');
                  return;
                }
                setShowInboxDropdown(!showInboxDropdown);
              }} 
              title="Private Messenger" 
              className="p-2 hover:opacity-80 rounded-lg transition relative flex items-center justify-center"
              style={{ color: 'var(--text-main)' }}
            >
              📩
              {conversations.reduce((sum, conv) => sum + (conv.unreadCount?.[user?._id] || 0), 0) > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {conversations.reduce((sum, conv) => sum + (conv.unreadCount?.[user?._id] || 0), 0)}
                </span>
              )}
            </button>

            {showInboxDropdown && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-800"
                style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))' }}
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-extrabold text-slate-800 text-sm">Private</h3>
                  <div className="flex items-center gap-3 text-slate-500">
                    <button 
                      onClick={handleMarkAllInboxRead} 
                      className="hover:text-indigo-600 transition flex items-center justify-center cursor-pointer"
                      title="Mark all as read"
                    >
                      <FaCheckSquare size={16} />
                    </button>
                    <button 
                      onClick={handleClearAllInbox} 
                      className="hover:text-red-500 transition flex items-center justify-center cursor-pointer"
                      title="Delete all conversations"
                    >
                      <FaTrashAlt size={16} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-96 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center">
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-3">
                        <path 
                          d="M40 18C27.85 18 18 27.85 18 40C18 52.15 27.85 62 40 62C52.15 62 62 52.15 62 40C62 33.5 59.2 27.65 54.8 23.6C56 21 58 18 58 18C58 18 52 21 49.2 22.8C46.35 19.7 42.9 18 40 18Z" 
                          fill="#cbd5e1" 
                        />
                        <circle cx="33" cy="40" r="3.5" fill="white" />
                        <circle cx="47" cy="40" r="3.5" fill="white" />
                        <path d="M35 49C35 49 37 46 40 46C43 46 45 49 45 49" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <div className="text-xs text-slate-400 font-semibold">Your private chat list is empty</div>
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const otherUser = conv.participants.find(p => p._id !== user?._id);
                      const unread = conv.unreadCount?.[user?._id] || 0;
                      return (
                        <div 
                          key={conv._id} 
                          onClick={() => {
                            setActivePrivateChatUser(otherUser);
                            setShowInboxDropdown(false);
                          }}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={otherUser?.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} 
                              alt="avatar" 
                              className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-800 truncate">{otherUser?.username || 'User'}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[150px]">{conv.lastMessage || 'Start a private chat'}</div>
                            </div>
                          </div>
                          {unread > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {unread}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)} 
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-white cursor-pointer hover:opacity-90 transition flex items-center justify-center focus:outline-none"
            >
              {user?.profilePic ? (
                <img src={user.profilePic} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </button>
            
            {showUserMenu && (
              <UserMenuDropdown
                user={user}
                onClose={() => setShowUserMenu(false)}
                onEditProfile={() => setFullProfileUsername(user.username)}
                onOpenLevelInfo={() => setShowLevelInfo(true)}
                logout={logout}
                onOpenWallet={() => setShowWallet(true)}
                onOpenSounds={() => setShowSounds(true)}
                onOpenTheme={() => setShowTheme(true)}
              />
            )}
          </div>
        </div>
      </header>

      {/* LEFT DRAWER OVERLAY */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div onClick={() => setShowDrawer(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
          <div className="relative w-72 h-full bg-slate-900 border-r border-white/10 shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between mb-8">
                <Logo size={36} showText={true} />
                <button onClick={() => setShowDrawer(false)} className="text-slate-400 hover:text-white text-xl">
                  ×
                </button>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold border border-white/20">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{user?.username || 'Guest'}</div>
                  <div className="text-xs text-amber-400 font-bold">Level {user?.level || 1}</div>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { icon: '🏠', label: 'Main Room', action: () => navigate('/chat') },
                  { icon: '✉️', label: 'Private Inbox', action: () => {
                    if (user?.role === 'guest') {
                      alert('Guest users cannot access the private inbox.');
                    } else {
                      setShowInboxDropdown(true);
                    }
                  }},
                  { icon: '📰', label: 'News', hasDot: !hasSeenNews, action: () => { 
                    setShowNews(true);
                    setHasSeenNews(true);
                    localStorage.setItem('hasSeenNews', 'true');
                  }},
                  { icon: '🏅', label: 'Leaderboards', action: () => setShowLeaderboards(true) }
                ].map((item, idx) => (
                  <button key={idx} onClick={() => { item.action(); setShowDrawer(false); }} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white text-sm font-medium transition relative">
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.hasDot && <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={logout} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm transition">
              🚪 Logout Session
            </button>
          </div>
        </div>
      )}

      {/* CORE GRID */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CHAT MESSAGES PORT */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}>
          <div className="flex-1 overflow-y-auto space-y-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-sm font-medium">Main Room is quiet. Start the conversation!</div>
              </div>
            ) : (
              messages.filter(m => !hiddenMessages.includes(m._id)).map((msg, i, arr) => {
                const prevMsg = arr[i - 1];
                const isGrouped = prevMsg &&
                  prevMsg.sender?._id === msg.sender?._id &&
                  (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;

                return (
                  <MessageBubble
                    key={msg._id || i}
                    message={msg}
                    currentUser={user}
                    isGrouped={isGrouped}
                    onSelectUser={openProfile}
                    onHide={handleHideMessage}
                    onReport={handleReportMessage}
                  />
                );
              })
            )}

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-slate-500 text-xs px-4 py-2 bg-white border-b border-slate-100 animate-pulse">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                <span>{typingUsers.join(', ')} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORUM CONTAINER */}
          <footer className="p-4 border-t shrink-0 relative" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}>
            {isHoldActive && (
              <div className="mb-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 flex items-center justify-between shadow-lg">
                <span className="flex items-center gap-1.5">⏳ Chat on hold due to spam activity.</span>
                <span>Restricted for: <span className="font-mono text-sm text-white ml-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">{Math.max(0, Math.ceil((new Date(activeHoldEnd) - now) / 1000))}s</span></span>
              </div>
            )}
            <MessageInput onSend={handleSend} roomId={roomId} disabled={isHoldActive} />
          </footer>

          {/* BOTTOM NAVY BLUE BAR MATCHING USER SCREENSHOT */}
          <div 
            style={{ 
              background: 'var(--bg-panel)', 
              height: '46px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0 16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              zIndex: 40,
              flexShrink: 0
            }}
          >
            {/* Play button on far left */}
            <button 
              onClick={() => window.dispatchEvent(new Event('toggle-music-player'))}
              style={{
                background: 'var(--text-main)',
                color: 'var(--bg-app)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                fontSize: '0.75rem',
                paddingLeft: '2px'
              }}
              title="Play Music"
            >
              <FaPlay />
            </button>

             {/* Right side: minimized chat avatar and hamburger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Minimized Private Chat User Avatar */}
              {activePrivateChatUser && isPrivateChatMinimized && (
                <div 
                  onClick={() => setIsPrivateChatMinimized(false)}
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '50%', 
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s',
                    border: '2.5px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#10b981',
                    overflow: 'visible'
                  }}
                  title={`Chat with ${activePrivateChatUser.username}`}
                >
                  {activePrivateChatUser.profilePic ? (
                    <img 
                      src={activePrivateChatUser.profilePic} 
                      alt={activePrivateChatUser.username} 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '0.7rem' }}>
                      {activePrivateChatUser.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                  {/* RED DOT NOTIFICATION FOR UNREAD MESSAGE */}
                  {privateChatHasUnread && (
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '-3px', 
                        right: '-3px', 
                        width: '9px', 
                        height: '9px', 
                        background: '#ff3b30', 
                        borderRadius: '50%', 
                        border: '1.5px solid #ffffff',
                        boxShadow: '0 0 4px rgba(255, 59, 48, 0.6)'
                      }} 
                    />
                  )}
                </div>
              )}

              {/* Hamburger Menu Icon */}
              <button 
                onClick={() => setShowOnlineSidebar(!showOnlineSidebar)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-main)', 
                  fontSize: '1.4rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  padding: '4px'
                }}
                title="Toggle Online Users"
              >
                <FaBars />
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR PRESENCE (INLINE ON DESKTOP, OVERLAY ON MOBILE) */}
        {showOnlineSidebar && (
          <>
            {/* Mobile Overlay (Only on small screens: hidden on md) */}
            <div 
              onClick={() => setShowOnlineSidebar(false)} 
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 cursor-pointer" 
            />
            {/* Sidebar container: Inline on desktop (md), fixed overlay on mobile */}
            <div 
              className="fixed md:static right-0 top-0 bottom-0 z-40 md:z-auto w-72 md:w-80 flex flex-col shrink-0 bg-white border-l border-slate-200 h-full"
              style={{
                boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 12px'
              }}
            >
              <OnlineUsers 
                onSelectUser={(u, e) => openProfile(u, e)} 
                onClose={() => setShowOnlineSidebar(false)} 
                theme="light"
              />
            </div>
          </>
        )}
      </div>

      {/* Inline styles for slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* USER PROFILE MODAL */}
      {profileCard && (
        <UserProfileCard
          user={profileCard.user}
          position={{ x: profileCard.x, y: profileCard.y }}
          onClose={() => setProfileCard(null)}
          onPrivate={(u) => setActivePrivateChatUser(u)}
          onViewFullProfile={(username) => setFullProfileUsername(username)}
        />
      )}

      {fullProfileUsername && (
        <FullProfileModal
          username={fullProfileUsername}
          onClose={() => setFullProfileUsername(null)}
          onPrivate={(u) => setActivePrivateChatUser(u)}
        />
      )}

      {/* LEVEL INFO MODAL */}
      {showLevelInfo && (
        <LevelInfoModal
          user={user}
          onClose={() => setShowLevelInfo(false)}
        />
      )}

      {/* FLOATING PRIVATE CHAT WINDOW */}
      {activePrivateChatUser && (
        <PrivateChatWindow
          targetUser={activePrivateChatUser}
          onClose={() => {
            setActivePrivateChatUser(null);
            setIsPrivateChatMinimized(false);
            setPrivateChatHasUnread(false);
          }}
          isMinimized={isPrivateChatMinimized}
          setIsMinimized={setIsPrivateChatMinimized}
          setHasUnread={setPrivateChatHasUnread}
        />
      )}

      {/* LEVEL UP POPUP */}
      {levelUpData && (
        <LevelUpPopup
          newLevel={levelUpData}
          gender={user?.gender}
          onClose={() => setLevelUpData(null)}
        />
      )}

      {/* WALLET MODAL */}
      {showWallet && (
        <WalletModal
          user={user}
          token={token}
          updateUser={updateUser}
          onClose={() => setShowWallet(false)}
        />
      )}

      {/* NEW MODALS */}
      {showSounds && <SoundsModal onClose={() => setShowSounds(false)} />}
      {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}
      {showNews && <NewsModal onClose={() => setShowNews(false)} />}
      {showLeaderboards && <LeaderboardsModal onClose={() => setShowLeaderboards(false)} />}

      {/* MODERATION OVERLAY */}
      {moderationEvent && (
        <ModerationOverlay
          event={moderationEvent}
          onClose={() => {
            setModerationEvent(null);
            // If they were kicked, redirect back to home/lobby
            if (moderationEvent.type === 'kick') {
              navigate('/');
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatRoom;
