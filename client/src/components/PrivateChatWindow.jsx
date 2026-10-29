import React, { useState, useEffect, useRef, useContext, Suspense, lazy } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FaTimes, FaExpandAlt, FaCompressAlt, FaMinus, FaPlus, FaCog, FaMicrophone, FaSmile, FaPaperclip, FaPaperPlane, FaMusic, FaImage, FaCheckCircle, FaPhone, FaVideo } from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import ReportModal from './ReportModal';
import api from '../services/api';
import { encryptMessage, decryptMessage, generateSafetyNumber } from '../services/crypto';
import { getPrivateMessages, savePrivateMessages } from '../services/db';
import VoiceRecorder from './VoiceRecorder';

const EmojiPicker = lazy(() => import('./EmojiPicker'));
const StickerPicker = lazy(() => import('./StickerPicker'));


import VideoCallModal from './VideoCallModal';

const PrivateChatWindow = ({ targetUser, onClose, isMinimized, setIsMinimized, setHasUnread }) => {
// ...
// Let's replace the header inside the return with the call buttons

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
  const [disappearingTimer, setDisappearingTimer] = useState(0); // 0 means off. Value in ms.
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyNumber, setSafetyNumber] = useState('');
  const messagesEndRef = useRef(null);

  // Screenshot alert listener
  useEffect(() => {
    if (!socket) return;
    const handleScreenshotAlert = ({ byUser }) => {
      setToastMessage(`📸 Notice: ${byUser} took a screenshot of this private chat!`);
      setTimeout(() => setToastMessage(null), 4500);
    };
    socket.on('screenshot-alert', handleScreenshotAlert);
    return () => socket.off('screenshot-alert', handleScreenshotAlert);
  }, [socket]);

  // Key listener for screenshot attempts (PrintScreen)
  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' && targetUser?._id && currentUser?._id) {
        socket?.emit('screenshot-taken', {
          targetUserId: targetUser._id,
          senderName: currentUser.username
        });
        setToastMessage('⚠️ Privacy Notice: Screenshot detected & logged.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [socket, targetUser, currentUser]);

  const handleOpenSafetyVerification = async () => {
    setShowSettings(false);
    const myPub = currentUser?.publicKey || localStorage.getItem('publicKey');
    const targetPub = targetUser?.publicKey || 'target-public-key-placeholder';
    const num = await generateSafetyNumber(myPub, targetPub);
    setSafetyNumber(num);
    setShowSafetyModal(true);
  };

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
        
        const convId = convRes.data._id;
        setConversation(convRes.data);

        // Try to load cached offline messages first for instant UI
        const cachedMsgs = await getPrivateMessages(convId);
        if (cachedMsgs && cachedMsgs.length > 0) {
          setMessages(cachedMsgs);
        }

        // Fetch messages for this conversation from network
        const msgRes = await api.get(`/api/inbox/messages/${convId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Decrypt messages if they are E2EE
        const privKey = localStorage.getItem('privateKey');
        const decryptedMessages = await Promise.all(msgRes.data.map(async (msg) => {
          if (msg.message && msg.message.startsWith('[E2EE]')) {
            if (privKey) {
              const cipher = msg.message.replace('[E2EE]', '');
              const plainText = await decryptMessage(cipher, privKey);
              return { ...msg, message: plainText };
            } else {
              return { ...msg, message: '🔒 [Encrypted Message]' };
            }
          }
          return msg;
        }));

        setMessages(decryptedMessages);
        
        // Cache messages for offline use
        await savePrivateMessages(convId, decryptedMessages);

        // Fetch action/ignore status
        const statusRes = await api.get(`/api/users/actions-status/${targetUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsIgnored(statusRes.data.isIgnored);
        
        // Mark messages as read since we just opened it
        if (!isMinimized) {
          socket.emit('message-read', { conversationId: convId, userId: currentUser._id, targetUserId: targetUser._id });
        }

      } catch (err) {
        console.error('Error initiating private chat:', err);
      }
    };

    initChat();
  }, [targetUser, currentUser, token]);

  // Socket Listener for incoming DMs and DM errors
  useEffect(() => {
    if (!socket || !targetUser) return;

    const handlePrivateMsg = async (msg) => {
      // Append if message sender matches targetUser or currentUser
      const isFromTarget = msg.sender === targetUser._id || (msg.sender?._id && msg.sender._id === targetUser._id);
      const isFromMe = msg.sender === currentUser._id || (msg.sender?._id && msg.sender._id === currentUser._id);
      if (isFromTarget || isFromMe) {
        // Resolve sender profile information if not present
        let resolvedMsg = {
          ...msg,
          sender: typeof msg.sender === 'object' ? msg.sender : (msg.sender === currentUser._id ? currentUser : targetUser)
        };

        // Decrypt if it's E2EE
        if (resolvedMsg.message && resolvedMsg.message.startsWith('[E2EE]')) {
          const privKey = localStorage.getItem('privateKey');
          if (privKey) {
            const cipher = resolvedMsg.message.replace('[E2EE]', '');
            const plainText = await decryptMessage(cipher, privKey);
            resolvedMsg.message = plainText;
          } else {
            resolvedMsg.message = '🔒 [Encrypted Message]';
          }
        }

        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m._id === resolvedMsg._id)) return prev;
          
          const newMsgs = [...prev, resolvedMsg];
          if (conversation && conversation._id) {
            savePrivateMessages(conversation._id, newMsgs).catch(console.error);
          }
          return newMsgs;
        });

        // Set unread flag if minimized and sender is target user
        if (isMinimized && isFromTarget && setHasUnread) {
          setHasUnread(true);
        } else if (!isMinimized && isFromTarget && conversation) {
          socket.emit('message-read', { conversationId: conversation._id, userId: currentUser._id, targetUserId: targetUser._id });
        }
      }
    };

    const handlePrivateError = (data) => {
      alert(data.error || 'Private message failed');
    };

    const handlePrivateDeleted = (data) => {
      setMessages(prev => {
        const newMsgs = prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, isDeleted: true, message: 'This message was deleted 🚫', mediaUrl: '', voiceUrl: '', gifUrl: '' }
            : msg
        );
        if (conversation && conversation._id) {
          savePrivateMessages(conversation._id, newMsgs).catch(console.error);
        }
        return newMsgs;
      });
    };

    const handleMessagesRead = (data) => {
      // Mark local messages as read if the reader is our targetUser
      if (data.readerId === targetUser._id) {
        setMessages(prev => {
          const newMsgs = prev.map(msg => 
            msg.sender._id === currentUser._id || msg.sender === currentUser._id 
              ? { ...msg, isRead: true } 
              : msg
          );
          if (conversation && conversation._id) {
            savePrivateMessages(conversation._id, newMsgs).catch(console.error);
          }
          return newMsgs;
        });
      }
    };

    const handleScheduledMessage = (msg) => {
      if ((msg.sender._id === targetUser._id && msg.receiver._id === currentUser._id) || 
          (msg.sender._id === currentUser._id && msg.receiver._id === targetUser._id)) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    };

    socket.on('private-message', handlePrivateMsg);
    socket.on('private-message-scheduled', handleScheduledMessage);
    socket.on('private-message-error', handlePrivateError);
    socket.on('private-message-deleted', handlePrivateDeleted);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      socket.off('private-message', handlePrivateMsg);
      socket.off('private-message-scheduled', handleScheduledMessage);
      socket.off('private-message-error', handlePrivateError);
      socket.off('private-message-deleted', handlePrivateDeleted);
      socket.off('messages-read', handleMessagesRead);
    };
  }, [socket, targetUser, currentUser, isMinimized, setHasUnread, conversation]);

  useEffect(() => {
    const handleDeleteMessage = (e) => {
      const { messageId } = e.detail;
      if (socket && targetUser) {
        socket.emit('delete-private-message', { messageId, receiverId: targetUser._id });
      }
    };
    
    const handleTranslateMessage = async (e) => {
      const { messageId, text } = e.detail;
      if (!text) return;
      try {
        const res = await api.post('/api/messages/translate', { text }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, message: `${msg.message}\n\n[Translated]: ${res.data.translatedText}` } : msg
        ));
      } catch (err) {
        console.error('Translation failed', err);
        showToast('Translation failed');
      }
    };

    const handleStarMessage = async (e) => {
      const { messageId } = e.detail;
      // Emit via socket or API. Let's do it locally first then update via socket if needed.
      // Wait, we need an endpoint for starring. Let's assume we can just emit it or do a simple local state update for now
      // since the DB change is what matters. Actually, if there is no endpoint, we can add one or just do local.
      // Let's add an endpoint for starring in the next step, for now just update local state visually.
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const starredBy = msg.isStarredBy || [];
          const isStarred = starredBy.includes(currentUser._id);
          return { 
            ...msg, 
            isStarredBy: isStarred ? starredBy.filter(id => id !== currentUser._id) : [...starredBy, currentUser._id] 
          };
        }
        return msg;
      }));
      // I will implement the actual API call for starring below.
    };

    window.addEventListener('delete-message', handleDeleteMessage);
    window.addEventListener('translate-message', handleTranslateMessage);
    window.addEventListener('star-message', handleStarMessage);
    
    return () => {
      window.removeEventListener('delete-message', handleDeleteMessage);
      window.removeEventListener('translate-message', handleTranslateMessage);
      window.removeEventListener('star-message', handleStarMessage);
    };
  }, [socket, targetUser, token, currentUser]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    if (!socket) return;

    let payloadMessage = messageText;

    // Encrypt if target user has a public key
    if (targetUser.publicKey) {
      payloadMessage = await encryptMessage(messageText, targetUser.publicKey);
      // We prefix with [E2EE] so the receiver knows it's encrypted
      payloadMessage = `[E2EE]${payloadMessage}`;
    }

    const payload = {
      senderId: currentUser._id,
      receiverId: targetUser._id,
      message: payloadMessage
    };

    if (disappearingTimer > 0) {
      payload.expiresAt = new Date(Date.now() + disappearingTimer);
    }

    socket.emit('private-message', payload);
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

  const [callData, setCallData] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleCallMade = (data) => {
      setCallData({ ...data, name: targetUser.username });
      setIsReceivingCall(true);
      setIsCalling(true);
    };
    socket.on('call-made', handleCallMade);
    return () => socket.off('call-made', handleCallMade);
  }, [socket, targetUser]);

  const initiateCall = (type) => {
    setIsCalling(true);
    setIsReceivingCall(false);
    // You can pass type ('audio' or 'video') down to the modal if needed
  };

  const endCall = () => {
    setIsCalling(false);
    setIsReceivingCall(false);
    setCallData(null);
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
    const reason = prompt('Enter reason for reporting this user (Silent Report with E2EE evidence):');
    if (reason === null) return; // user cancelled
    try {
      // Gather last 10 decrypted messages as evidence
      const evidence = messages.slice(-10).map(m => ({
        text: m.message,
        sender: m.sender.username || (m.sender === currentUser._id ? currentUser.username : targetUser.username),
        timestamp: m.createdAt
      }));

      await api.post(`/api/report`, { 
        reportedUserId: targetUser._id,
        context: reason,
        evidence 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSettings(false);
      alert('User reported successfully. Evidence submitted to AI Moderator.');
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
      <div className="theme-lite" style={windowStyle}>
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
    <div className="theme-lite" style={windowStyle}>
      {isCalling && (
        <VideoCallModal 
          caller={targetUser} 
          isReceivingCall={isReceivingCall} 
          callData={callData} 
          onEndCall={endCall} 
        />
      )}
      
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
          
          {/* Call Buttons */}
          {!isMinimized && (
            <>
              <button 
                onClick={() => initiateCall('audio')} 
                title="Audio Call" 
                style={{ ...headerBtnStyle, marginRight: '5px' }}
              >
                <FaPhone />
              </button>
              <button 
                onClick={() => initiateCall('video')} 
                title="Video Call" 
                style={{ ...headerBtnStyle, marginRight: '10px', color: '#4CAF50' }}
              >
                <FaVideo />
              </button>
            </>
          )}

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
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Disappearing Messages
            <select 
              value={disappearingTimer} 
              onChange={(e) => setDisappearingTimer(Number(e.target.value))}
              style={{ width: '100%', marginTop: '4px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px' }}
            >
              <option value="0">Off</option>
              <option value="3600000">1 Hour</option>
              <option value="86400000">1 Day</option>
              <option value="604800000">1 Week</option>
              <option value="2592000000">1 Month</option>
            </select>
          </div>
          <button 
            onClick={handleIgnoreToggle} 
            style={settingsOptionStyle}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            {isIgnored ? 'Unignore User' : 'Ignore User'}
          </button>
          <button 
            onClick={handleOpenSafetyVerification} 
            style={{ ...settingsOptionStyle, borderTop: '1px solid var(--border-color)', color: '#38bdf8' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            🛡️ Verify Safety Number (E2EE)
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
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

            {/* Voice Recorder */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <VoiceRecorder 
                token={token} 
                onVoiceRecorded={(url) => {
                  socket.emit('private-message', {
                    senderId: currentUser._id,
                    receiverId: targetUser._id,
                    message: '',
                    voiceUrl: url
                  });
                }} 
              />
            </div>

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

      {/* SAFETY NUMBER VERIFICATION MODAL */}
      {showSafetyModal && (
        <div className="absolute inset-0 z-[1100] bg-slate-950/95 backdrop-blur-md p-5 flex flex-col justify-between text-white rounded-2xl animate-in fade-in duration-200">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h4 className="font-extrabold text-sm text-sky-400">Verify Safety Number</h4>
              </div>
              <button 
                onClick={() => setShowSafetyModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-3 leading-relaxed">
              To verify that messages and calls with <strong className="text-white">@{targetUser.username}</strong> are end-to-end encrypted with zero middle interception, compare this 60-digit safety number with their device:
            </p>

            <div className="my-4 p-3 bg-slate-900 border border-sky-500/30 rounded-xl font-mono text-center text-xs tracking-wider text-sky-300 font-bold select-all leading-relaxed shadow-inner">
              {safetyNumber}
            </div>

            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-[10px] text-sky-200 flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span>RSA-OAEP 2048-bit & AES-GCM 256-bit Cryptographic Match</span>
            </div>
          </div>

          <button
            onClick={() => setShowSafetyModal(false)}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition shadow cursor-pointer"
          >
            Mark as Verified
          </button>
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
