import React, { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FaCheckCircle, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import useLazyLoad from '../hooks/useLazyLoad';

// Returns avatar background based on gender/role
const getAvatarStyle = (sender) => {
  if (sender.role === 'admin')   return { bg: '#ff3b30' };
  
  if (sender.gender === 'female') return { bg: '#db2777' };
  if (sender.gender === 'male')   return { bg: '#0284c7' };
  return { bg: '#64748b' };
};

// Returns username text color for light/dark theme readability
const getUsernameStyle = (sender) => {
  if (sender.role === 'admin') return { color: '#ef4444', fontWeight: '800' }; // Red
   // Amber
  if (sender.role === 'guest') return { color: 'var(--text-muted)', fontWeight: '600' };
  if (sender.gender === 'female') return { color: '#ec4899', fontWeight: '800' }; // Pink
  if (sender.gender === 'male')   return { color: '#3b82f6', fontWeight: '800' }; // Blue
  return { color: 'var(--text-main)', fontWeight: '700' };
};

// Verified tick — gender-colored, no tick for guests
const VerifiedTick = ({ sender }) => {
  const isRegistered = sender.role && sender.role !== 'guest';
  if (!isRegistered) return null;
  if (sender.role === 'admin') {
    return <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: 1 }} title="Admin">💫</span>;
  }
  const color = sender.gender === 'female' ? '#db2777' : '#0284c7';
  return <FaCheckCircle size={13} style={{ color, flexShrink: 0 }} title="Verified" />;
};

const MessageBubble = memo(({ message, currentUser, isGrouped, onSelectUser, onHide, onReport }) => {
  const [ref, isVisible] = useLazyLoad();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarStyle = getAvatarStyle(message.sender || {});
  const hasCustomPic = message.sender?.profilePic && !message.sender.profilePic.includes('cloudinary.com/demo');

  // Format time as DD/MM HH.MM to match screenshot (e.g. 20/05 09.58)
  const formatMsgTime = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd/MM HH.mm');
    } catch (e) {
      return '';
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const mentionedUser = part.substring(1);
        const isMe = currentUser && (currentUser.username === mentionedUser);
        // Highlight brightly for the mentioned user, standard blue for others
        const mentionStyle = isMe 
          ? { color: '#b45309', fontWeight: '900', background: '#fef3c7', padding: '0 4px', borderRadius: '4px', border: '1px solid #fde68a' } 
          : { color: '#0284c7', fontWeight: 'bold' };
        return (
          <span 
            key={idx} 
            style={mentionStyle}
            className="cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('mention-user', { detail: { username: mentionedUser } }));
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (message.type === 'system') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-black/5" style={{ background: 'transparent' }}>
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-xs shrink-0 shadow-sm border border-slate-800">
          <span style={{ fontSize: '14px' }}>{message.icon || '🤍'}</span>
        </div>
        <span className="text-slate-400 text-[0.85rem] font-bold" dangerouslySetInnerHTML={{ __html: message.message }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 16px',
        background: 'transparent',
        borderBottom: '1px solid var(--border-color)',
        alignItems: 'flex-start'
      }}
      ref={ref}
    >
      {/* Avatar */}
      {hasCustomPic ? (
        <img
          src={isVisible ? message.sender.profilePic : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
          alt="avatar"
          className="w-9 h-9 rounded-full object-cover shrink-0 cursor-pointer border"
          style={{ borderColor: avatarStyle.bg, opacity: isVisible ? 1 : 0.5 }}
          onClick={(e) => onSelectUser && onSelectUser(message.sender, e)}
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 select-none cursor-pointer"
          style={{ background: avatarStyle.bg }}
          onClick={(e) => onSelectUser && onSelectUser(message.sender, e)}
        >
          {message.sender.username?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      {/* Message Info Column */}
      <div 
        style={{ flex: 1, minWidth: 0, position: 'relative' }} 
        onClick={() => setShowMenu(true)}
        className="cursor-pointer"
      >
        {showMenu && (
          <div ref={menuRef} className="absolute z-50 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-56" style={{ top: '20px', left: '10%' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onHide && onHide(message._id); }} 
              className="flex items-center gap-4 w-full px-5 py-3 text-left hover:bg-slate-50 transition"
            >
              <FaEyeSlash className="text-[#0ea5e9] text-xl" />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-[0.95rem] text-slate-800">Hide</span>
                <span className="text-[0.75rem] text-slate-500">Hide from my screen</span>
              </div>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onReport && onReport(message); }} 
              className="flex items-center gap-4 w-full px-5 py-3 text-left hover:bg-slate-50 transition"
            >
              <FaExclamationCircle className="text-[#06b6d4] text-xl" />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-[0.95rem] text-slate-800">Report</span>
                <span className="text-[0.75rem] text-slate-500">Report this content</span>
              </div>
            </button>
          </div>
        )}
        {/* Name and Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={getUsernameStyle(message.sender)} 
              className="text-[0.9rem] leading-none cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('mention-user', { detail: { username: message.sender.username } }));
              }}
            >
              {message.sender.username}
            </span>
            <VerifiedTick sender={message.sender} />
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full text-slate-500 font-bold leading-none">
              Lv.{message.sender.level}
            </span>
          </div>

          {/* Time and options dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-[10px] text-slate-400 font-medium">
              {formatMsgTime(message.createdAt)}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }} title="Options">
              •••
            </button>
          </div>
        </div>

        {/* Message Text */}
        <p className="text-[0.88rem] whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--text-main)' }}>
          {renderMessageText(message.message)}
        </p>

        {/* Attachments */}
        {message.mediaUrl && isVisible && (
          <img src={message.mediaUrl} alt="attachment" className="mt-2 rounded-lg max-h-60 w-auto object-cover border" loading="lazy" />
        )}
        {message.gifUrl && isVisible && (
          <img src={message.gifUrl} alt="gif" className="mt-2 rounded-lg max-h-40 w-auto object-cover border" loading="lazy" />
        )}
        {message.voiceUrl && isVisible && (
          <audio src={message.voiceUrl} controls className="mt-2 h-10 w-48 rounded bg-slate-50" />
        )}
      </div>
    </motion.div>
  );
});

export default MessageBubble;
