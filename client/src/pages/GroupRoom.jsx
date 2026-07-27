import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FaArrowLeft, FaUsers, FaCopy, FaVideo, FaLock, FaUnlock, FaPalette } from 'react-icons/fa';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import GroupCallModal from '../components/GroupCallModal';
import ThemeModal from '../components/ThemeModal';
import api from '../services/api';
import { encryptSymmetric, decryptSymmetric } from '../services/crypto';

const GroupRoom = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, token } = useContext(AuthContext);
  const { socket } = useSocket();
  
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isE2EEEnabled, setIsE2EEEnabled] = useState(false);
  const [groupKey, setGroupKey] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('theme-dark');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch group details
    const fetchGroup = async () => {
      try {
        const { data } = await api.get('/api/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentGroup = data.find(g => g._id === groupId);
        if (currentGroup) {
          setGroup(currentGroup);
          setCurrentTheme(currentGroup.theme || 'theme-dark');
          const mockKey = btoa(currentGroup._id.padEnd(32, '0').slice(0, 32));
          setGroupKey(mockKey);
        } else {
          alert("Group not found or you are not a member.");
          navigate('/chat');
        }
      } catch (err) {
        console.error('Error fetching group:', err);
      }
    };
    if (token) fetchGroup();
  }, [groupId, token, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!group || !token || !socket) return;
    
    // Join socket room
    socket.emit('join-group', group._id);
    
    // Fetch old messages
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/api/groups/${group._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const decryptedMsgs = await Promise.all(data.map(async (msg) => {
          if (msg.message && msg.message.includes(':')) {
            try {
              const decryptedText = await decryptSymmetric(msg.message, groupKey || btoa(group._id.padEnd(32, '0').slice(0, 32)));
              return { ...msg, message: decryptedText, isEncrypted: true };
            } catch (e) { return msg; }
          }
          return msg;
        }));
        
        setMessages(decryptedMsgs);
      } catch (err) {
        console.error('Error fetching group msgs:', err);
      }
      setLoading(false);
    };
    
    if (groupKey) {
      fetchMessages();
    }
    
    // Socket listeners
    const handleGroupMsg = async (msg) => {
      let finalMsg = { ...msg };
      if (finalMsg.message && finalMsg.message.includes(':')) {
        try {
          const decryptedText = await decryptSymmetric(finalMsg.message, groupKey || btoa(group._id.padEnd(32, '0').slice(0, 32)));
          finalMsg = { ...finalMsg, message: decryptedText, isEncrypted: true };
        } catch (e) { console.error('Decryption failed on receive', e); }
      }
      
      setMessages(prev => {
        if (prev.some(m => m._id === finalMsg._id)) return prev;
        return [...prev, finalMsg];
      });
    };
    
    socket.on('group-message', handleGroupMsg);
    
    // Group Call Listener
    const handleGroupCallStarted = (payload) => {
      if (payload.groupId === group._id && payload.adminId !== currentUser._id) {
        if (window.confirm(`${group.name} Admin started a group video call. Join?`)) {
          setShowCallModal(true);
        }
      }
    };
    socket.on('group-call-started', handleGroupCallStarted);
    
    const handleThemeUpdated = ({ groupId: gId, theme }) => {
      if (gId === group._id) {
        setCurrentTheme(theme);
      }
    };
    socket.on('group-theme-updated', handleThemeUpdated);
    
    return () => {
      socket.emit('leave-group', group._id);
      socket.off('group-message', handleGroupMsg);
      socket.off('group-call-started', handleGroupCallStarted);
      socket.off('group-theme-updated', handleThemeUpdated);
    };
  }, [group, token, socket]);

  useEffect(() => {
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
      }
    };

    const handleStarMessage = async (e) => {
      const { messageId } = e.detail;
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
    };

    window.addEventListener('translate-message', handleTranslateMessage);
    window.addEventListener('star-message', handleStarMessage);
    
    return () => {
      window.removeEventListener('translate-message', handleTranslateMessage);
      window.removeEventListener('star-message', handleStarMessage);
    };
  }, [token, currentUser]);

  const handleSend = async (payload) => {
    if (!socket || !group) return;
    
    let textToSend = payload.message;
    if (isE2EEEnabled && textToSend && groupKey) {
      textToSend = await encryptSymmetric(textToSend, groupKey);
    }
    
    socket.emit('group-message', {
      groupId: group._id,
      message: textToSend,
      mediaUrl: payload.mediaUrl,
      voiceUrl: payload.voiceUrl,
      gifUrl: payload.gifUrl,
      mentions: payload.mentions || [],
      replyTo: payload.replyTo,
      location: payload.location,
      contact: payload.contact,
      poll: payload.poll,
      scheduledFor: payload.scheduledFor,
      isViewOnce: payload.isViewOnce
    });
  };

  const handleStartCall = () => {
    setShowCallModal(true);
  };

  const handleUpdateTheme = async (themeId) => {
    try {
      await api.put(`/api/groups/${group._id}/theme`, { theme: themeId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      socket.emit('update-group-theme', { groupId: group._id, theme: themeId });
      setCurrentTheme(themeId);
      setShowThemeModal(false);
    } catch (err) {
      console.error('Error updating theme', err);
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading Group...
      </div>
    );
  }

  const isAdmin = currentUser._id === (group.admin?._id || group.admin);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden shadow-2xl ${currentTheme}`} style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      {/* Header */}
      <div className="p-3 md:p-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/chat')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-black/10"
            style={{ color: 'var(--text-main)' }}
          >
            <FaArrowLeft />
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-xl shadow-md border border-indigo-500 shrink-0">
            {group.icon || '👥'}
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight flex items-center gap-2">
              {group.name}
            </h3>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <FaUsers /> {group.members?.length || 1} members
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(group.inviteCode);
              alert('Invite code copied: ' + group.inviteCode);
            }} 
            className="w-8 h-8 rounded-full flex items-center justify-center transition"
            style={{ background: 'var(--border-color)', color: 'var(--text-main)' }}
            title="Copy Invite Code"
          >
            <FaCopy />
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => setShowThemeModal(true)} 
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ background: 'var(--border-color)', color: 'var(--text-main)' }}
              title="Change Group Theme"
            >
              <FaPalette />
            </button>
          )}
          
          <button 
            onClick={() => setIsE2EEEnabled(!isE2EEEnabled)} 
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isE2EEEnabled ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : ''}`}
            style={!isE2EEEnabled ? { background: 'var(--border-color)', color: 'var(--text-main)' } : {}}
            title="Toggle End-to-End Encryption"
          >
            {isE2EEEnabled ? <FaLock /> : <FaUnlock />}
          </button>
          
          {isAdmin && (
            <button 
              onClick={handleStartCall} 
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ background: 'var(--border-color)', color: 'var(--accent)' }}
              title="Join / Start Call"
            >
              <FaVideo />
            </button>
          )}
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-4" style={{ backgroundImage: 'var(--bg-pattern-desktop)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--bg-app)' }}>
        {loading ? (
          <div className="flex justify-center items-center h-full opacity-60">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full opacity-60 gap-2">
            <span className="text-4xl">👋</span>
            <p>Welcome to {group.name}! Say hi.</p>
          </div>
        ) : (
          messages.map((msg, i, arr) => {
            const prevMsg = arr[i - 1];
            const isGrouped = prevMsg && prevMsg.sender?._id === msg.sender?._id;
            return (
              <MessageBubble 
                key={msg._id || i}
                message={msg}
                currentUser={currentUser}
                isGrouped={isGrouped}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 md:p-4 border-t" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
        <MessageInput onSend={handleSend} isGroup={true} isE2EE={isE2EEEnabled} />
      </div>
      
      {showCallModal && (
        <GroupCallModal 
          groupId={group._id} 
          currentUser={currentUser} 
          onClose={() => setShowCallModal(false)}
        />
      )}

      {showThemeModal && (
        <ThemeModal 
          onClose={() => setShowThemeModal(false)}
          currentTheme={currentTheme}
          onSelectTheme={handleUpdateTheme}
        />
      )}
    </div>
  );
};

export default GroupRoom;
