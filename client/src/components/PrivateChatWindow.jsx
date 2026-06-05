import React, { useState, useEffect, useRef, useContext, Suspense, lazy } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FaTimes, FaExpandAlt, FaCompressAlt, FaMinus, FaPlus, FaCog, FaMicrophone, FaSmile, FaPaperclip, FaPaperPlane, FaMusic, FaImage, FaCheckCircle } from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import ReportModal from './ReportModal';
import api from '../services/api';

const EmojiPicker = lazy(() => import('./EmojiPicker'));
const StickerPicker = lazy(() => import('./StickerPicker'));


const PrivateChatWindow = ({ targetUser, onClose, isMinimized, setIsMinimized, setHasUnread }) => {
  const { user: currentUser, token } = useContext(AuthContext);
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isIgnored, setIsIgnored] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [hiddenMessages, setHiddenMessages] = useState([]);
  const [reportMessageData, setReportMessageData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isMinimized]);

  // Load / Create Conversation & Messages
  useEffect(() => {
    if (!targetUser || !currentUser || currentUser.role === 'guest') return;

    const initChat = async () => {
      try {
        // Get or Create conversation
        const convRes = await api.post('/api/inbox/conversations', {
          userId: targetUser._id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversation(convRes.data);

        // Fetch messages for this conversation
        const msgRes = await api.get(`/api/inbox/messages/${convRes.data._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(msgRes.data);

        // Fetch action/ignore status
        const statusRes = await api.get(`/api/users/actions-status/${targetUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsIgnored(statusRes.data.isIgnored);

      } catch (err) {
        console.error('Error initiating private chat:', err);
      }
    };

    initChat();
  }, [targetUser, currentUser, token]);

  // Socket Listener for incoming DMs and DM errors
  useEffect(() => {
    if (!socket || !targetUser) return;

    const handlePrivateMsg = (msg) => {
      // Append if message sender matches targetUser or currentUser
      const isFromTarget = msg.sender === targetUser._id || (msg.sender?._id && msg.sender._id === targetUser._id);
      const isFromMe = msg.sender === currentUser._id || (msg.sender?._id && msg.sender._id === currentUser._id);
      if (isFromTarget || isFromMe) {
        // Resolve sender profile information if not present
        const resolvedMsg = {
          ...msg,
          sender: typeof msg.sender === 'object' ? msg.sender : (msg.sender === currentUser._id ? currentUser : targetUser)
        };
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m._id === resolvedMsg._id)) return prev;
          return [...prev, resolvedMsg];
        });

        // Set unread flag if minimized and sender is target user
        if (isMinimized && isFromTarget && setHasUnread) {
          setHasUnread(true);
        }
      }
    };

    const handlePrivateError = (data) => {
      alert(data.error || 'Private message failed');
    };

    socket.on('private-message', handlePrivateMsg);
    socket.on('private-message-error', handlePrivateError);

    return () => {
      socket.off('private-message', handlePrivateMsg);
      socket.off('private-message-error', handlePrivateError);
    };
  }, [socket, targetUser, currentUser, isMinimized, setHasUnread]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    if (!socket) return;

    socket.emit('private-message', {
      senderId: currentUser._id,
      receiverId: targetUser._id,
      message: messageText
    });
    setMessageText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleSticker = (path) => {
    if (!socket) return;
    socket.emit('private-message', {
      senderId: currentUser._id,
      receiverId: targetUser._id,
      message: '',
      gifUrl: path
    });
    setShowStickerPicker(false);
  };

  const handleIgnoreToggle = async () => {
    try {
      const endpoint = isIgnored ? 'unignore' : 'ignore';
      await api.post(`/api/users/${endpoint}/${targetUser._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsIgnored(!isIgnored);
      setShowSettings(false);
      alert(`User ${isIgnored ? 'unignored' : 'ignored'} successfully!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error executing action');
    }
  };

  const handleReportUser = async () => {
    const reason = prompt('Enter reason for reporting this user:');
    if (reason === null) return; // user cancelled
    try {
      await api.post(`/api/users/report/${targetUser._id}`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSettings(false);
      alert('User reported successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error executing action');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleHideMessage = (msgId) => {
    setHiddenMessages(prev => [...prev, msgId]);
  };

  const handleReportMessage = (msg) => {
    if (!token || currentUser?.role === 'guest') return alert('Please login to report.');
    setReportMessageData(msg);
  };

  const submitReport = async (reason) => {
    try {
      if (reportMessageData) {
        await api.post(`/api/users/report-message/${reportMessageData._id}`, {
          reason,
          targetUserId: reportMessageData.sender._id || reportMessageData.sender,
          chatType: 'private'
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

  // If currentUser is guest, show guest lock view
  const isGuest = currentUser?.role === 'guest';

  // Sizing styles
  const windowStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: isMaximized ? 'calc(100% - 40px)' : 'min(310px, calc(100vw - 32px))',
    height: isMaximized ? 'calc(100% - 80px)' : '420px',
    maxHeight: isMaximized ? '90vh' : '420px',
    background: 'var(--bg-panel)',
    borderRadius: '16px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
    zIndex: 950,
    display: isMinimized ? 'none' : 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
  };

  const headerStyle = {
    background: 'var(--accent)',
    height: '50px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff',
    cursor: isMinimized ? 'pointer' : 'default',
    flexShrink: 0,
  };

  const avatarStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    marginRight: '10px',
    objectFit: 'cover',
    border: '2px solid #fff',
  };

  const headerBtnStyle = {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.9rem',
    marginLeft: '12px',
    cursor: 'pointer',
    opacity: 0.85,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    outline: 'none',
  };

  const settingsDropdownStyle = {
    position: 'absolute',
    top: '44px',
    right: '48px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    zIndex: 960,
    overflow: 'hidden',
    width: '130px',
  };

  const settingsOptionStyle = {
    width: '100%',
    padding: '10px 14px',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: 'var(--text-main)',
    outline: 'none',
  };

  if (isGuest) {
    return (
      <div style={windowStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Private Chat</span>
          </div>
          <button onClick={onClose} style={headerBtnStyle}><FaTimes /></button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: 'var(--bg-app)' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔒</span>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>Private Inbox Locked</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
            Guests cannot access private chat. Please register to unlock direct messaging!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={windowStyle}>
      {/* HEADER BAR */}
      <div style={headerStyle} onClick={() => isMinimized && setIsMinimized(false)}>
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <img 
            src={targetUser.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} 
            alt="avatar" 
            style={avatarStyle} 
          />
          <span style={{ fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
            {targetUser.username.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {/* Maximize Toggle */}
          {!isMinimized && (
            <button 
              onClick={() => setIsMaximized(!isMaximized)} 
              title={isMaximized ? 'Restore' : 'Maximize'} 
              style={headerBtnStyle}
            >
              {isMaximized ? <FaCompressAlt /> : <FaExpandAlt />}
            </button>
          )}

          {/* Minimize Toggle */}
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            title={isMinimized ? 'Restore' : 'Minimize'} 
            style={headerBtnStyle}
          >
            {isMinimized ? <FaPlus /> : <FaMinus />}
          </button>

          {/* Settings */}
          {!isMinimized && (
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              title="Settings" 
              style={headerBtnStyle}
            >
              <FaCog />
            </button>
          )}

          {/* Close */}
          <button onClick={onClose} title="Close" style={headerBtnStyle}><FaTimes /></button>
        </div>
      </div>

      {/* SETTINGS DROPDOWN */}
      {showSettings && !isMinimized && (
        <div style={settingsDropdownStyle}>
          <button 
            onClick={handleIgnoreToggle} 
            style={settingsOptionStyle}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            {isIgnored ? 'Unignore User' : 'Ignore User'}
          </button>
          <button 
            onClick={handleReportUser} 
            style={{ ...settingsOptionStyle, borderTop: '1px solid var(--border-color)', color: '#ff3b30' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            Report User
          </button>
        </div>
      )}

      {/* CHAT BODY */}
      {!isMinimized && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-pattern)', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '2rem', marginBottom: '6px' }}>💬</span>
                <span>No messages yet. Say hello!</span>
              </div>
            ) : (
              messages.filter(m => !hiddenMessages.includes(m._id)).map((msg, i, arr) => {
                const prevMsg = arr[i - 1];
                const isGrouped = prevMsg &&
                  prevMsg.sender?._id === msg.sender?._id &&
                  (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 2 * 60 * 1000;

                return (
                  <MessageBubble 
                    key={msg._id || i} 
                    message={msg} 
                    currentUser={currentUser} 
                    isGrouped={isGrouped} 
                    onHide={handleHideMessage}
                    onReport={handleReportMessage}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CHAT FOOTER INPUT */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', flexShrink: 0 }}>
            {/* Attachment Button */}
            <label style={{ ...footerBtnStyle, cursor: 'pointer' }} title="Add attachment">
              <FaPaperclip />
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await api.post('/api/upload', formData, {
                      headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                      }
                    });
                    socket.emit('private-message', {
                      senderId: currentUser._id,
                      receiverId: targetUser._id,
                      message: '',
                      mediaUrl: res.data.url
                    });
                  } catch (err) {
                    console.error('Upload failed:', err);
                  }
                }}
              />
            </label>


            {/* Emoji Trigger */}
            <button style={footerBtnStyle} title="Insert Emoji" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}><FaSmile /></button>

            {/* Sticker Trigger */}
            <button 
              type="button" 
              onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }} 
              style={footerBtnStyle} 
              title="Insert Sticker"
            >
              <FaImage />
            </button>

            {/* Input field */}
            <input 
              type="text" 
              value={messageText} 
              onChange={e => setMessageText(e.target.value)} 
              onKeyPress={handleKeyPress}
              placeholder="Type here..." 
              style={inputStyle} 
            />

            {/* Microphone */}
            <button style={footerBtnStyle} title="Voice Note"><FaMicrophone /></button>

            {/* Send Button */}
            <button onClick={handleSend} style={sendBtnStyle} title="Send Message"><FaPaperPlane /></button>

            {/* Emoji Picker Popup Overlay */}
            {showEmojiPicker && (
              <div style={emojiPickerContainerStyle}>
                <Suspense fallback={null}>
                  <EmojiPicker onEmojiSelect={(emoji) => {
                    setMessageText(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }} />
                </Suspense>
              </div>
            )}

            {/* Sticker Picker Popup Overlay */}
            {showStickerPicker && (
              <Suspense fallback={null}>
                <StickerPicker onStickerSelect={handleSticker} />
              </Suspense>
            )}
          </div>
        </>
      )}

      {/* REPORT MODAL */}
      <ReportModal 
        isOpen={!!reportMessageData} 
        onClose={() => setReportMessageData(null)}
        onSubmit={submitReport}
      />

      {/* SUCCESS TOAST */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[200] bg-white border border-slate-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 animate-in slide-in-from-top fade-in duration-300 w-max max-w-[90%]">
          <FaCheckCircle className="text-green-500 text-lg shrink-0" />
          <span className="font-bold text-slate-800 text-xs">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

const footerBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  transition: 'color 0.2s',
};

const sendBtnStyle = {
  background: 'var(--accent)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.8rem',
  outline: 'none',
  flexShrink: 0,
  transition: 'transform 0.1s',
};

const inputStyle = {
  flex: 1,
  background: 'var(--bg-app)',
  border: '1px solid var(--border-color)',
  borderRadius: '20px',
  padding: '8px 16px',
  fontSize: '0.85rem',
  color: 'var(--text-main)',
  outline: 'none',
};

const emojiPickerContainerStyle = {
  position: 'absolute',
  bottom: '50px',
  left: '10px',
  zIndex: 1000,
  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
  borderRadius: '12px',
  overflow: 'hidden',
};

export default PrivateChatWindow;
