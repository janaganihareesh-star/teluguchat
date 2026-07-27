import React, { useState, useEffect, useRef, useContext, Suspense, lazy } from 'react';
import { FaPaperPlane, FaSmile, FaGhost, FaMusic, FaImage } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import FileUpload from './FileUpload';
import VoiceRecorder from './VoiceRecorder';

const EmojiPickerCmp = lazy(() => import('./EmojiPicker'));
const StickerPicker = lazy(() => import('./StickerPicker'));

const MessageInput = ({ onSend, roomId, disabled }) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentions, setMentions] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [localBlockWarning, setLocalBlockWarning] = useState('');
  
  const LOCAL_BANNED_WORDS = ['idiot', 'stupid', 'bastard', 'bitch', 'asshole', 'fuck', 'dengu', 'lanja', 'munda', 'kodaka'];
  
  const { user, token } = useContext(AuthContext);
  const { socket, onlineUsers } = useSocket();
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleMentionEvent = (e) => {
      if (disabled) return;
      const targetUsername = e.detail?.username;
      if (!targetUsername) return;
      
      setText((prev) => {
        const space = prev ? (prev.endsWith(' ') ? '' : ' ') : '';
        return prev + space + '@' + targetUsername + ' ';
      });
      
      setMentions((prev) => {
        if (!prev.includes(targetUsername)) {
          return [...prev, targetUsername];
        }
        return prev;
      });
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    };
    
    const handleReplyEvent = (e) => {
      if (disabled) return;
      const targetMessage = e.detail?.message;
      if (targetMessage) {
        setReplyToMessage(targetMessage);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    };
    
    window.addEventListener('mention-user', handleMentionEvent);
    window.addEventListener('reply-message', handleReplyEvent);
    return () => {
      window.removeEventListener('mention-user', handleMentionEvent);
      window.removeEventListener('reply-message', handleReplyEvent);
    };
  }, [disabled]);

  const handleTyping = (e) => {
    if (disabled) return;
    const val = e.target.value;
    setText(val);
    
    // Mention Logic
    const lastWord = val.split(' ').pop();
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentions(false);
    }

    // Typing indicator logic
    socket.emit('typing', { roomId, username: user.username });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', roomId);
    }, 2000);
  };

  const handleMentionSelect = (username) => {
    if (disabled) return;
    const words = text.split(' ');
    words.pop();
    setText(words.join(' ') + ' @' + username + ' ');
    setShowMentions(false);
    inputRef.current?.focus();
    
    if (!mentions.includes(username)) {
      setMentions([...mentions, username]);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (disabled || !text.trim()) return;
    
    // On-Device Local Blocking (Phase 1)
    const lowerText = text.toLowerCase();
    const hasBannedWord = LOCAL_BANNED_WORDS.some(word => lowerText.includes(word));
    if (hasBannedWord) {
      setLocalBlockWarning('⚠ Message blocked locally: Community guidelines violation.');
      setTimeout(() => setLocalBlockWarning(''), 4000);
      
      // Add shake animation class to input wrapper (optional)
      const inputEl = document.getElementById('message-input-container');
      if (inputEl) {
        inputEl.classList.add('animate-shake');
        setTimeout(() => inputEl.classList.remove('animate-shake'), 500);
      }
      return;
    }
    
    setLocalBlockWarning('');
    
    onSend({ 
      message: text.trim(), 
      mentions,
      replyTo: replyToMessage ? {
        messageId: replyToMessage._id,
        username: replyToMessage.sender?.username || 'User',
        text: replyToMessage.message || ''
      } : null,
      isViewOnce
    });
    setText('');
    setMentions([]);
    setReplyToMessage(null);
    setIsViewOnce(false);
    socket.emit('stop-typing', roomId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleEmoji = (emoji) => {
    if (disabled) return;
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const buildReplyPayload = () => {
    return replyToMessage ? {
      messageId: replyToMessage._id,
      username: replyToMessage.sender?.username || 'User',
      text: replyToMessage.message || ''
    } : null;
  };

  const handleSticker = (path) => {
    if (disabled) return;
    onSend({ message: text.trim(), gifUrl: path, mentions, replyTo: buildReplyPayload() });
    setShowSticker(false);
    setText('');
    setMentions([]);
    setReplyToMessage(null);
  };

  const handleFile = (url) => {
    if (disabled) return;
    onSend({ message: text.trim(), mediaUrl: url, mentions, replyTo: buildReplyPayload(), isViewOnce });
    setText('');
    setMentions([]);
    setReplyToMessage(null);
    setIsViewOnce(false);
  };

  const handleVoice = (url) => {
    if (disabled) return;
    onSend({ message: text.trim(), voiceUrl: url, mentions, replyTo: buildReplyPayload(), isViewOnce });
    setText('');
    setMentions([]);
    setReplyToMessage(null);
    setIsViewOnce(false);
  };

  const handleLocation = () => {
    if (disabled) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        onSend({
          message: text.trim(),
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          mentions,
          replyTo: buildReplyPayload()
        });
        setText('');
        setMentions([]);
        setReplyToMessage(null);
        setShowActionMenu(false);
      }, (err) => {
        alert("Could not get location. Please allow location access.");
      });
    }
  };

  const handleContactShare = () => {
    if (disabled) return;
    const name = prompt("Enter contact name:");
    const phone = prompt("Enter contact phone number:");
    if (name && phone) {
      onSend({
        message: text.trim(),
        contact: { name, phone },
        mentions,
        replyTo: buildReplyPayload()
      });
      setText('');
      setMentions([]);
      setReplyToMessage(null);
    }
    setShowActionMenu(false);
  };

  const handlePollCreate = () => {
    if (disabled) return;
    const validOptions = pollOptions.filter(o => o.trim() !== '').map(o => ({ text: o.trim(), votes: [] }));
    if (pollQuestion.trim() && validOptions.length >= 2) {
      onSend({
        message: text.trim(),
        poll: { question: pollQuestion.trim(), options: validOptions },
        mentions,
        replyTo: buildReplyPayload()
      });
      setText('');
      setMentions([]);
      setReplyToMessage(null);
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } else {
      alert("Please enter a question and at least 2 options.");
    }
  };

  const handleScheduledSend = (e) => {
    e?.preventDefault();
    if (disabled || !text.trim() || !scheduledDate) return;
    
    onSend({ 
      message: text.trim(), 
      mentions,
      replyTo: replyToMessage ? {
        messageId: replyToMessage._id,
        username: replyToMessage.sender?.username || 'User',
        text: replyToMessage.message || ''
      } : null,
      scheduledFor: new Date(scheduledDate)
    });
    setText('');
    setMentions([]);
    setReplyToMessage(null);
    setScheduledDate('');
  };

  const filteredUsers = onlineUsers.filter(u => u._id !== user._id && u.username && u.username.toLowerCase().includes(mentionQuery.toLowerCase()));

  return (
    <div className="relative">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Reply Preview Card */}
      {replyToMessage && (
        <div 
          style={{
            background: 'var(--bg-panel, rgba(30, 41, 59, 0.98))',
            backdropFilter: 'blur(10px)',
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            position: 'absolute',
            bottom: '100%',
            left: '4px',
            right: '4px',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 10,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-color, #6366f1)', fontWeight: '800', marginBottom: '2px' }}>
              Replying to @{replyToMessage.sender?.username}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-main, #cbd5e1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
              {replyToMessage.message || 'Media attachment'}
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setReplyToMessage(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Mention Popup */}
      {showMentions && filteredUsers.length > 0 && !disabled && (
        <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-xl border border-slate-200 w-48 z-50">
          {filteredUsers.map((u, idx) => (
            <div 
              key={u._id || idx} 
              onClick={() => handleMentionSelect(u.username)}
              className="p-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700 border-b last:border-0 border-slate-100"
            >
              @{u.username}
            </div>
          ))}
        </div>
      )}

      {/* Pickers */}
      <Suspense fallback={null}>
        {showEmoji && !disabled && <EmojiPickerCmp onEmojiSelect={handleEmoji} />}
        {showSticker && !disabled && <StickerPicker onStickerSelect={handleSticker} />}
      </Suspense>

      <form onSubmit={handleSend} className="flex items-center gap-2 w-full bg-transparent">
          {/* Local Block Warning */}
          {localBlockWarning && (
            <div className="absolute -top-10 left-0 w-full bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 z-50">
              <div className="flex items-center gap-2">
                <span>🛡️</span>
                {localBlockWarning}
              </div>
            </div>
          )}

        {/* Action Menu Toggle */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowActionMenu(!showActionMenu)}
            disabled={disabled}
            className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition cursor-pointer"
            title="More Actions"
          >
            ➕
          </button>
          
          {showActionMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-800 border border-slate-700 shadow-xl rounded-xl p-2 z-50">
              <button onClick={handleLocation} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg flex items-center gap-2">
                📍 Share Location
              </button>
              <button onClick={handleContactShare} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg flex items-center gap-2">
                📇 Share Contact
              </button>
              <button onClick={() => { setShowActionMenu(false); setShowPollModal(true); }} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg flex items-center gap-2">
                📊 Create Poll
              </button>
              <div className="px-3 py-2 border-t border-slate-700 mt-1">
                <div className="text-xs text-slate-400 mb-1">Schedule Message</div>
                <input 
                  type="datetime-local" 
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* File Upload */}
        {user?.role !== 'guest' && (
          <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
            <FileUpload onFileSelected={handleFile} token={token} />
          </div>
        )}

        {/* Emoji Button */}
        <button 
          type="button" 
          disabled={disabled}
          onClick={() => { setShowEmoji(!showEmoji); setShowSticker(false); }} 
          className="text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:hover:text-slate-500 transition text-xl p-1 bg-transparent border-none cursor-pointer flex items-center justify-center"
          title="Emoji"
        >
          <FaSmile />
        </button>

        {/* Sticker Picker Toggle */}
        <button 
          type="button" 
          disabled={disabled}
          onClick={() => { setShowSticker(!showSticker); setShowEmoji(false); }} 
          className="text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:hover:text-slate-500 transition text-xl p-1 bg-transparent border-none cursor-pointer flex items-center justify-center"
          title="Stickers"
        >
          <FaImage />
        </button>

        {/* View Once Toggle */}
        <button 
          type="button" 
          disabled={disabled}
          onClick={() => setIsViewOnce(!isViewOnce)} 
          className={`transition text-xl p-1 bg-transparent border-none cursor-pointer flex items-center justify-center ${isViewOnce ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:hover:text-slate-500'}`}
          title="View Once"
        >
          <FaGhost />
        </button>

        {/* Rounded Input Bar */}
        <div 
          id="message-input-container"
          className={`flex-1 flex items-center gap-2 rounded-full px-4 py-1.5 transition relative ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)', border: '1px solid var(--border-color)' }}
        >
          <input
            type="text"
            ref={inputRef}
            disabled={disabled || user?.role === 'guest'}
            placeholder={disabled ? "Chat on hold..." : (user?.role === 'guest' ? "Guests cannot post..." : "Type here...")}
            className="flex-1 bg-transparent !bg-transparent border-0 !border-transparent focus:border-transparent focus:ring-0 focus:outline-none !outline-none text-sm disabled:cursor-not-allowed w-full shadow-none"
            style={{ color: 'var(--text-main)', boxShadow: 'none' }}
            value={text}
            onChange={handleTyping}
          />
          
          {/* Voice Recorder */}
          {user?.role !== 'guest' ? (
            <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
              <VoiceRecorder onVoiceRecorded={handleVoice} token={token} />
            </div>
          ) : (
            <button type="button" disabled style={{ opacity: 0.4, cursor: 'not-allowed', background: 'none', border: 'none', color: '#94a3b8' }}>
              🎙️
            </button>
          )}
        </div>

        {scheduledDate ? (
          <button 
            type="button"
            onClick={handleScheduledSend}
            disabled={disabled || !text.trim()} 
            className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md shadow-green-500/20 disabled:opacity-50 flex-shrink-0 cursor-pointer"
            title="Schedule Message"
          >
            ⏰
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={disabled || (!text.trim() && !replyToMessage)} 
            className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none flex-shrink-0 cursor-pointer"
            title="Send Message"
          >
            <FaPaperPlane className="relative ml-[-2px] mt-[1px]" />
          </button>
        )}
      </form>

      {/* Poll Creation Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <h3 className="text-white font-bold text-lg mb-4">Create Poll</h3>
            <input 
              type="text" 
              placeholder="Ask a question..."
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-indigo-500"
            />
            <div className="space-y-3 mb-4">
              {pollOptions.map((opt, idx) => (
                <input 
                  key={idx}
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500"
                />
              ))}
              {pollOptions.length < 4 && (
                <button 
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-indigo-400 text-sm font-semibold hover:text-indigo-300"
                >
                  + Add Option
                </button>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPollModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handlePollCreate} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-bold">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
