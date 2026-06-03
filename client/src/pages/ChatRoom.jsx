import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { FaPlay, FaBars, FaSyncAlt, FaCheckSquare, FaTrashAlt, FaCheckCircle } from 'react-icons/fa';
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
import ReportModal from '../components/ReportModal';
import { soundSystem } from '../utils/soundSystem';
import usePushNotification from '../hooks/usePushNotification';
import api from '../services/api';



const ChatRoom = () => {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useContext(AuthContext);
  const { socket, isConnected, reconnecting } = useSocket();
  const { sendNotification } = usePushNotification(user);
  
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

  // Reporting state
  const [reportMessageData, setReportMessageData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [hasSeenNews, setHasSeenNews] = useState(() => localStorage.getItem('hasSeenNews') === 'true');
  const messagesEndRef = useRef(null);
  const chatPortRef = useRef(null);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
  const roomId = 'general';

  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => {
      setViewportHeight(window.visualViewport.height);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleScroll = () => {
    if (!chatPortRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = chatPortRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isAtBottom) {
      setShowNewMessageBadge(false);
    }
  };

  useEffect(() => {
    const handleOpenProfile = () => {
      if (user) {
        setFullProfileUsername(user.username);
      }
    };
    window.addEventListener('open-my-profile', handleOpenProfile);
    return () => window.removeEventListener('open-my-profile', handleOpenProfile);
  }, [user]);

  useEffect(() => {
    if (activePrivateChatUser) {
      setIsPrivateChatMinimized(false);
      setPrivateChatHasUnread(false);
    }
  }, [activePrivateChatUser]);

  useEffect(() => {
    api.get(`/api/messages/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setMessages(res.data))
      .catch(console.error);

    const onConnect = () => {
      console.log('SOCKET CONNECTED:', socket.id);
      socket.emit('join-room', roomId);
    };

    socket.on('connect', onConnect);

    if (socket.connected) {
      socket.emit('join-room', roomId);
    }

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
      if (data.type === 'hold') setActiveHoldEnd(data.until);
      else if (data.type === 'suspend' || data.type === 'kick') setActiveHoldEnd(null);
    });

    socket.on('level-up', (data) => {
      setLevelUpData(data.level);
      updateUser({ level: data.level, xp: data.xp });
    });

    socket.on('activity-reward', (data) => {
      updateUser({ level: data.level, xp: data.xp, coins: data.coins });
      if (data.leveledUp) setLevelUpData(data.level);
    });

    socket.on('reaction-updated', (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('connect', onConnect);
      ['chats-cleared', 'user-typing', 'user-stop-typing', 'message-rejected',
       'system-message', 'level-up', 'activity-reward', 'moderation-event', 'reaction-updated']
        .forEach(e => socket.off(e));
    };
  }, [socket, token]);

  useEffect(() => {
    const handleReactMessage = (e) => {
      const { messageId, emoji } = e.detail;
      socket.emit('react-message', { messageId, emoji, roomId });
    };
    window.addEventListener('react-message', handleReactMessage);
    return () => window.removeEventListener('react-message', handleReactMessage);
  }, [socket]);
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      if (msg.sender?._id !== user?._id) {
        if (user && msg.message?.includes(`@${user.username}`)) {
          soundSystem.mentionAlert();
          sendNotification(
            `${msg.sender?.username} mentioned you`,
            msg.message,
            'mention'
          );
        } else {
          soundSystem.messagePing();
          if (document.hidden) {
            sendNotification(
              `${msg.sender?.username || 'Someone'}`,
              msg.message || 'Sent a message',
              'message'
            );
          }
        }
      }
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (!chatPortRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = chatPortRef.current;
    
    // Check if user was already near bottom (within 220px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 220;
    
    // Check if the last message was sent by the current user
    const lastMsg = messages[messages.length - 1];
    const isMyMessage = lastMsg && lastMsg.sender?._id === user?._id;
    
    if (isNearBottom || isMyMessage) {
      setTimeout(() => {
        if (chatPortRef.current) {
          chatPortRef.current.scrollTo({
            top: chatPortRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
      setShowNewMessageBadge(false);
    } else {
      // If we are scrolled up and a new message arrives, show the floaty badge!
      if (lastMsg && lastMsg.type !== 'system') {
        setShowNewMessageBadge(true);
      }
    }
  }, [messages, user]);

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
      const { data } = await api.get('/api/inbox/conversations', {
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
      await api.put('/api/inbox/read-all', {}, {
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
      await api.delete('/api/inbox/clear-all', {
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReportMessage = (msg) => {
    if (!token || user?.role === 'guest') return alert('Please login to report.');
    setReportMessageData(msg);
  };

  const submitReport = async (reason) => {
    try {
      if (reportMessageData) {
        await api.post(`/api/users/report-message/${reportMessageData._id}`, {
          reason,
          targetUserId: reportMessageData.sender._id,
          chatType: 'general'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Thank you for reporting");
        setReportMessageData(null);
      }
    } catch (err) {
      console.error('Error reporting message', err);
      showToast("Error submitting report");
    }
  };

  const openProfile = (targetUser, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setProfileCard({ user: targetUser, x: rect.left, y: rect.bottom });
  };


  return (
    <div className="flex flex-col font-sans overflow-hidden relative" style={{ height: `${viewportHeight}px`, backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      
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

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Online Users Toggle (Mobile only) */}
          <button 
            onClick={() => setShowOnlineSidebar(!showOnlineSidebar)}
            className="p-1 md:p-2 hover:opacity-80 rounded-lg transition flex md:hidden items-center justify-center text-base md:text-lg shrink-0"
            style={{ color: 'var(--text-main)' }}
            title="Toggle Online Users"
          >
            👥
          </button>
          <button 
            onClick={() => window.location.reload()} 
            title="Refresh Page" 
            className="p-1 md:p-2 hover:opacity-80 rounded-lg transition flex items-center justify-center text-xs md:text-sm shrink-0"
            style={{ color: 'var(--text-main)' }}
          >
            <FaSyncAlt />
          </button>
          <div className="shrink-0 scale-90 md:scale-100">
            <NotificationBell />
          </div>
          <div className="relative shrink-0">
            <button 
              onClick={() => {
                if (user?.role === 'guest') {
                  alert('Guest users cannot access the private inbox.');
                  return;
                }
                setShowInboxDropdown(!showInboxDropdown);
              }} 
              title="Private Messenger" 
              className="p-1 md:p-2 hover:opacity-80 rounded-lg transition relative flex items-center justify-center text-base md:text-lg shrink-0"
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
              <>
                {/* Backdrop to close when clicking outside */}
                <div 
                  onClick={() => setShowInboxDropdown(false)} 
                  className="fixed inset-0 z-40 bg-black/45 md:bg-transparent"
                />
                
                {/* Responsive Inbox Dialog */}
                <div 
                  className="fixed inset-x-4 top-20 mx-auto max-w-[340px] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-800"
                  style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15))' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/85 backdrop-blur-xs">
                    <h3 className="font-extrabold text-slate-800 text-sm">Private Chats</h3>
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
                      <div className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-3 text-2xl animate-bounce">
                          💬
                        </div>
                        <div className="text-xs text-slate-600 font-bold">No conversations yet</div>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">Tap on any user's profile to start a secure private chat!</div>
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
            </>
          )}
          </div>
          
          
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)} 
              className="w-7 h-7 md:w-9 h-9 rounded-full overflow-hidden border-2 border-white cursor-pointer hover:opacity-90 transition flex items-center justify-center focus:outline-none shrink-0"
            >
              {user?.profilePic ? (
                <img src={user.profilePic} alt="avatar" className="w-full h-full object-cover shrink-0" />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px] md:text-sm shrink-0">
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

      {(!isConnected || reconnecting) && (
        <div 
          style={{
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            textAlign: 'center',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            zIndex: 49,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          className="animate-pulse shrink-0"
        >
          <span>⏳</span>
          <span>Connecting to TeluguChat network... Please check your internet connection.</span>
        </div>
      )}

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
                  { icon: '🏅', label: 'Leaderboards', action: () => setShowLeaderboards(true) },
                  { icon: '🎵', label: 'Music Player', action: () => window.dispatchEvent(new Event('toggle-music-player')) }
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
        <div className="flex-1 flex flex-col overflow-hidden border-r relative" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}>
          <style>{`
            @keyframes pulseGlow {
              0% { box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4); }
              50% { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.7); transform: translate(-50%, -2px); }
              100% { box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4); }
            }
          `}</style>

          <div ref={chatPortRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-0">
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

          {/* Floating New Messages Badge */}
          {showNewMessageBadge && (
            <button
              onClick={() => {
                if (chatPortRef.current) {
                  chatPortRef.current.scrollTo({
                    top: chatPortRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
                setShowNewMessageBadge(false);
              }}
              style={{
                position: 'absolute',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '9999px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 40,
                transition: 'transform 0.2s',
                animation: 'pulseGlow 2s infinite',
              }}
            >
              <span>⬇️</span> New Messages
            </button>
          )}

          {/* INPUT FORUM CONTAINER */}
          <footer className="p-4 border-t shrink-0 relative" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
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
            className="flex items-center justify-between"
            style={{ 
              background: 'var(--bg-panel)', 
              height: '46px', 
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
      {showLeaderboards && <LeaderboardsModal onClose={() => setShowLeaderboards(false)} onSelectUser={(username) => setFullProfileUsername(username)} token={token} />}

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

      {/* REPORT MODAL */}
      <ReportModal 
        isOpen={!!reportMessageData} 
        onClose={() => setReportMessageData(null)}
        onSubmit={submitReport}
      />

      {/* SUCCESS TOAST */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white border border-slate-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-3 animate-in slide-in-from-top fade-in duration-300">
          <FaCheckCircle className="text-green-500 text-xl" />
          <span className="font-bold text-slate-800 text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
