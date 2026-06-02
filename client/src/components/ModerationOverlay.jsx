import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function ModerationOverlay({ event, onClose }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const { token } = useContext(AuthContext);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [appealError, setAppealError] = useState('');

  const [appealResult, setAppealResult] = useState('');
  const [appealApproved, setAppealApproved] = useState(false);

  const handleAppeal = async () => {
    try {
      const res = await axios.post('http://localhost:3500/api/users/appeal', {
        type: event.type,
        reason: 'Requesting review of moderation action.'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppealSubmitted(true);
      setAppealError('');
      setAppealResult(res.data.message);
      setAppealApproved(res.data.approved);
      if (res.data.approved) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setAppealError(err.response?.data?.message || 'Failed to submit appeal.');
    }
  };

  useEffect(() => {
    if (!event) return;

    // Calculate time left if there is an expiration time ('until')
    if (event.until) {
      const calculateTimeLeft = () => {
        const diff = new Date(event.until) - new Date();
        if (diff <= 0) {
          setTimeLeft(null);
          if (onClose) onClose();
        } else {
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        }
      };

      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timer);
    } else {
      // Auto close warnings and media blocks after 5 seconds
      if (event.type === 'warn' || event.type === 'block_image' || event.type === 'block_voice' || event.type === 'ignore') {
        const timer = setTimeout(() => {
          if (onClose) onClose();
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [event, onClose]);

  if (!event) return null;

  // Determine styles and titles based on moderation action type
  let title = 'System Notification';
  let badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  let gradient = 'from-amber-500/20 via-orange-500/10 to-transparent';
  let shadowColor = 'rgba(245, 158, 11, 0.4)';
  let icon = '⚠';

  if (event.type === 'hold') {
    title = 'Chat Access On Hold';
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    gradient = 'from-blue-600/20 via-indigo-600/10 to-transparent';
    shadowColor = 'rgba(59, 130, 246, 0.4)';
    icon = '⏳';
  } else if (event.type === 'kick') {
    title = 'Removed From Room';
    badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
    gradient = 'from-red-600/20 via-pink-600/10 to-transparent';
    shadowColor = 'rgba(239, 68, 68, 0.4)';
    icon = '🚫';
  } else if (event.type === 'suspend') {
    title = 'Account Suspended';
    badgeColor = 'bg-red-700/20 text-red-400 border-red-700/30';
    gradient = 'from-red-700/35 via-rose-900/15 to-transparent';
    shadowColor = 'rgba(220, 38, 38, 0.5)';
    icon = '🚫';
  } else if (event.type === 'block_image' || event.type === 'block_voice') {
    title = 'Content Blocked';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    gradient = 'from-rose-600/20 via-red-600/10 to-transparent';
    shadowColor = 'rgba(244, 63, 94, 0.4)';
    icon = '❌';
  } else if (event.type === 'ignore') {
    title = 'Visibility Limited';
    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    gradient = 'from-purple-600/20 via-indigo-900/10 to-transparent';
    shadowColor = 'rgba(168, 85, 247, 0.4)';
    icon = '⚠';
  }

  const isModalStyle = event.type === 'kick' || event.type === 'suspend';

  return (
    <AnimatePresence>
      <div 
        className={`fixed z-50 flex items-center justify-center p-4 transition-colors ${
          isModalStyle ? 'inset-0 bg-slate-950/80 backdrop-blur-md' : 'top-6 right-6 left-6 md:left-auto md:w-[420px]'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: isModalStyle ? 20 : -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: isModalStyle ? 20 : -10 }}
          className="w-full relative overflow-hidden bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl"
          style={{ boxShadow: `0 20px 40px -10px ${shadowColor}, 0 0 0 1px rgba(255,255,255,0.05)` }}
        >
          {/* Top aesthetic glow line */}
          <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${badgeColor.includes('red') ? 'from-red-500 to-rose-600' : badgeColor.includes('blue') ? 'from-blue-400 to-indigo-500' : badgeColor.includes('purple') ? 'from-purple-400 to-indigo-500' : 'from-amber-400 to-orange-500'}`} />
          
          <div className={`absolute inset-0 bg-gradient-to-b ${gradient} pointer-events-none opacity-40`} />

          <div className="relative flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${badgeColor} border`}>
              {icon}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-extrabold text-white text-base tracking-wide uppercase">{title}</h4>
                {!isModalStyle && (
                  <button 
                    onClick={onClose} 
                    className="text-slate-400 hover:text-white text-lg font-bold leading-none cursor-pointer p-1"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-4 font-medium">
                {event.message}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                {timeLeft && (
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span className="animate-pulse">⏳</span>
                    Time Remaining: <span className="text-white font-mono text-sm">{timeLeft}</span>
                  </div>
                )}
                
                {isModalStyle && (
                  <button
                    onClick={() => {
                      if (event.type === 'suspend') {
                        window.location.href = '/';
                      } else {
                        onClose();
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-lg transition duration-200"
                  >
                    {event.type === 'suspend' ? 'Exit Application' : 'Return to Lobby'}
                  </button>
                )}

                {(event.type === 'hold' || event.type === 'kick' || event.type === 'suspend') && (
                  <div className="mt-2 w-full">
                    {appealSubmitted ? (
                      <p className={`text-xs font-bold ${appealApproved ? 'text-green-400' : 'text-red-400'}`}>
                        {appealResult}
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={handleAppeal}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg transition duration-200"
                        >
                          📩 Request Review
                        </button>
                        {appealError && (
                          <p className="text-red-400 text-xs mt-1">{appealError}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
