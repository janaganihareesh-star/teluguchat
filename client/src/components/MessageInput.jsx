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
    
    window.addEventListener('mention-user', handleMentionEvent);
    return () => {
      window.removeEventListener('mention-user', handleMentionEvent);
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
    
    onSend({ message: text.trim(), mentions });
    setText('');
    setMentions([]);
    socket.emit('stop-typing', roomId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleEmoji = (emoji) => {
    if (disabled) return;
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleSticker = (path) => {
    if (disabled) return;
    onSend({ message: '', gifUrl: path, mentions: [] });
    setShowSticker(false);
  };

  const handleFile = (url) => {
    if (disabled) return;
    onSend({ message: '', mediaUrl: url, mentions: [] });
  };

  const handleVoice = (url) => {
    if (disabled) return;
    onSend({ message: '', voiceUrl: url, mentions: [] });
  };

  const filteredUsers = onlineUsers.filter(u => u._id !== user._id && u.username && u.username.toLowerCase().includes(mentionQuery.toLowerCase()));

  return (
    <div className="relative">
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
        {/* Plus Button / File Upload */}
        {user?.role !== 'guest' ? (
          <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
            <FileUpload onFileSelected={handleFile} token={token} />
          </div>
        ) : (
          <button type="button" disabled style={{ opacity: 0.4, cursor: 'not-allowed', background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem' }}>
            ➕
          </button>
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

        {/* Rounded Light Grey Input Bar */}
        <div className={`flex-1 flex items-center gap-2 bg-slate-100 border border-slate-200/80 rounded-full px-4 py-1.5 focus-within:border-slate-300 transition ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <input
            type="text"
            ref={inputRef}
            disabled={disabled || user?.role === 'guest'}
            placeholder={disabled ? "Chat on hold..." : (user?.role === 'guest' ? "Guests cannot post..." : "Type here...")}
            className="flex-1 bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 text-sm disabled:cursor-not-allowed"
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

          {/* Send Button */}
          <button 
            type="submit" 
            disabled={disabled || !text.trim()} 
            className="text-indigo-600 disabled:text-slate-400 hover:text-indigo-800 transition text-lg bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
