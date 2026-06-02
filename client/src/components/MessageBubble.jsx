import React, { memo, useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FaCheckCircle, FaEyeSlash, FaExclamationCircle, FaSmile } from 'react-icons/fa';
import useLazyLoad from '../hooks/useLazyLoad';
import ImageLightbox from './ImageLightbox';

const EmojiPicker = lazy(() => import('./EmojiPicker'));

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
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [reactions, setReactions] = useState(message.reactions || []);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const menuRef = useRef(null);

  // Swipe gesture state
  const [translateX, setTranslateX] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [swipeStartY, setSwipeStartY] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // Long press refs
  const longPressTimer = useRef(null);
  const isLongPressed = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setSwipeStartX(e.touches[0].clientX);
      setSwipeStartY(e.touches[0].clientY);
      isLongPressed.current = false;
      
      longPressTimer.current = setTimeout(() => {
        isLongPressed.current = true;
        navigator.vibrate?.(40);
        setShowActionSheet(true);
      }, 600);
    }
  };

  const handleTouchMove = (e) => {
    if (swipeStartX === null || swipeStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - swipeStartX;
    const diffY = currentY - swipeStartY;
    
    // Cancel gestures if dragging vertically
    if (Math.abs(diffY) > Math.abs(diffX) || Math.abs(diffY) > 10) {
      clearTimeout(longPressTimer.current);
      setTranslateX(0);
      setIsSwiping(false);
      return;
    }

    // Horizontal swipe trigger
    if (Math.abs(diffX) > 10) {
      clearTimeout(longPressTimer.current);
      setIsSwiping(true);
      
      let val = diffX;
      // resistance boundaries
      if (diffX > 85) val = 85 + (diffX - 85) * 0.2;
      else if (diffX < -85) val = -85 + (diffX + 85) * 0.2;
      
      setTranslateX(val);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    setSwipeStartX(null);
    setSwipeStartY(null);
    setIsSwiping(false);

    if (translateX >= 60) {
      navigator.vibrate?.(30);
      window.dispatchEvent(new CustomEvent('reply-message', { detail: { message } }));
    } else if (translateX <= -60) {
      navigator.vibrate?.(30);
      if (onSelectUser) {
        onSelectUser(message.sender, { currentTarget: document.body });
      }
    }
    setTranslateX(0);
  };

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
    if (!text) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const mentionedName = part.slice(1);
        const isMe = currentUser?.username?.toLowerCase() === mentionedName?.toLowerCase();
        return (
          <span
            key={index}
            style={{
              backgroundColor: isMe ? '#4f46e5' : '#6366f1',
              color: 'white',
              borderRadius: '4px',
              padding: '1px 6px',
              fontWeight: 'bold',
              fontSize: '0.9em'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleReaction = (emoji) => {
    setShowReactionPicker(false);
    window.dispatchEvent(new CustomEvent('react-message', { 
      detail: { messageId: message._id, emoji } 
    }));
    
    setReactions(prev => {
      const exists = prev.find(r => r.emoji === emoji && r.userId === currentUser?._id);
      if (exists) {
        return prev.filter(r => !(r.emoji === emoji && r.userId === currentUser?._id));
      }
      return [...prev, { userId: currentUser?._id, emoji }];
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px 16px',
          background: 'transparent',
          borderBottom: '1px solid var(--border-color)',
          alignItems: 'flex-start',
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'pan-y',
          position: 'relative',
        }}
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicators visible in background */}
        {translateX > 15 && (
          <div style={{ position: 'absolute', left: '-50px', top: '50%', transform: 'translateY(-50%)', opacity: Math.min(1, translateX / 60), transition: 'opacity 0.1s' }}>
            <span style={{ fontSize: '1.4rem' }}>💬</span>
          </div>
        )}
        {translateX < -15 && (
          <div style={{ position: 'absolute', right: '-50px', top: '50%', transform: 'translateY(-50%)', opacity: Math.min(1, Math.abs(translateX) / 60), transition: 'opacity 0.1s' }}>
            <span style={{ fontSize: '1.4rem' }}>👤</span>
          </div>
        )}

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
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowReactionPicker(!showReactionPicker); }} 
                className="flex items-center gap-4 w-full px-5 py-3 text-left hover:bg-slate-50 transition border-t border-slate-100"
              >
                <FaSmile className="text-[#f59e0b] text-xl" />
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-[0.95rem] text-slate-800">React</span>
                  <span className="text-[0.75rem] text-slate-500">Add an emoji reaction</span>
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

          {/* Nesting Reply Preview Box */}
          {message.replyTo && message.replyTo.username && (
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderLeft: '3px solid var(--accent-color, #6366f1)',
                padding: '6px 12px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                opacity: 0.9,
                borderTopRightRadius: '8px',
                borderBottomRightRadius: '8px',
              }}
            >
              <span style={{ fontWeight: 'bold', color: 'var(--accent-color, #6366f1)' }}>
                @{message.replyTo.username}
              </span>
              <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.replyTo.text}
              </span>
            </div>
          )}

          <p className="text-[0.88rem] whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {renderMessageText(message.message)}
          </p>
{reactions.length > 0 && (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
    {Object.entries(
      reactions.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
      }, {})
    ).map(([emoji, count]) => (
      <button
        key={emoji}
        onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
        style={{
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px',
          padding: '2px 8px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: 'var(--text-main)'
        }}
      >
        {emoji} <span style={{ fontSize: '0.75rem' }}>{count}</span>
      </button>
    ))}
  </div>
)}

{showReactionPicker && (
  <div style={{ marginTop: '8px', zIndex: 50, position: 'relative', width: 'max-content' }}>
    <Suspense fallback={<div className="text-xs text-slate-400 p-2 border rounded-lg bg-slate-50">Loading emojis...</div>}>
      <EmojiPicker onEmojiSelect={handleReaction} className="bg-white rounded-lg shadow-xl z-50 border border-slate-200" />
    </Suspense>
    <button 
      onClick={(e) => { e.stopPropagation(); setShowReactionPicker(false); }}
      className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md z-[60]"
    >
      ✕
    </button>
  </div>
)}

          {/* Attachments (clickable for lightbox zoom) */}
          {message.mediaUrl && isVisible && (
            <img 
              src={message.mediaUrl} 
              alt="attachment" 
              className="mt-2 rounded-lg max-h-60 w-auto object-cover border cursor-zoom-in" 
              loading="lazy" 
              onClick={(e) => {
                e.stopPropagation();
                setLightboxSrc(message.mediaUrl);
                setShowLightbox(true);
              }}
            />
          )}
          {message.gifUrl && isVisible && (
            <img 
              src={message.gifUrl} 
              alt="gif" 
              className="mt-2 rounded-lg max-h-40 w-auto object-cover border cursor-zoom-in" 
              loading="lazy" 
              onClick={(e) => {
                e.stopPropagation();
                setLightboxSrc(message.gifUrl);
                setShowLightbox(true);
              }}
            />
          )}
          {message.voiceUrl && isVisible && (
            <audio src={message.voiceUrl} controls className="mt-2 h-10 w-48 rounded bg-slate-50" />
          )}
        </div>
      </motion.div>

      {/* Fullscreen Lightbox Modal */}
      {showLightbox && (
        <ImageLightbox src={lightboxSrc} onClose={() => setShowLightbox(false)} />
      )}

      {/* Sleek Bottom Action Sheet for Mobile */}
      {showActionSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div 
            onClick={() => setShowActionSheet(false)} 
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} 
          />
          <div 
            style={{
              position: 'relative',
              backgroundColor: 'var(--bg-panel, #0f172a)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              zIndex: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ width: '40px', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', alignSelf: 'center', marginBottom: '8px' }} />
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Message Options
            </h4>

            <button 
              onClick={() => {
                setShowActionSheet(false);
                window.dispatchEvent(new CustomEvent('reply-message', { detail: { message } }));
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              💬 Reply
            </button>

            <button 
              onClick={() => {
                setShowActionSheet(false);
                navigator.clipboard.writeText(message.message || '');
                navigator.vibrate?.(20);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              📋 Copy Message
            </button>

            <button 
              onClick={() => {
                setShowActionSheet(false);
                onHide && onHide(message._id);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              🙈 Hide Message
            </button>

            <button 
              onClick={() => {
                setShowActionSheet(false);
                onReport && onReport(message);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              ⚠️ Report Message
            </button>

            <button 
              onClick={() => setShowActionSheet(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '4px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
});

export default MessageBubble;
