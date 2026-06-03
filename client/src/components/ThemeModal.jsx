import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaBars, FaEnvelope, FaBell } from 'react-icons/fa';

const ThemeModal = ({ onClose }) => {
  const { theme, changeTheme } = useTheme();

  const themeOptions = [
    { id: 'theme-cody', label: 'Cody', headerBg: '#18181b', bodyBg: '#27272a', text: '#fafafa', accent: '#0ea5e9', toggleBg: '#52525b' },
    { id: 'theme-dark', label: 'Dark', headerBg: '#0f172a', bodyBg: '#1e293b', text: '#f8fafc', accent: '#0ea5e9', toggleBg: '#475569' },
    { id: 'theme-lite', label: 'Lite', headerBg: '#1e293b', bodyBg: '#ffffff', text: '#0f172a', accent: '#000000', toggleBg: '#0ea5e9' },
    { id: 'theme-love', label: 'Love', headerBg: '#be185d', bodyBg: '#fbcfe8', text: '#831843', accent: '#ec4899', toggleBg: '#f472b6' },
    { id: 'theme-friendship', label: 'Friendship', headerBg: '#b45309', bodyBg: '#fef3c7', text: '#78350f', accent: '#f59e0b', toggleBg: '#fbbf24' },
    { id: 'theme-happy', label: 'Happy', headerBg: '#15803d', bodyBg: '#bbf7d0', text: '#14532d', accent: '#22c55e', toggleBg: '#4ade80' },
    { id: 'theme-sad', label: 'Sad', headerBg: '#334155', bodyBg: '#e2e8f0', text: '#1e293b', accent: '#64748b', toggleBg: '#94a3b8' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl p-3 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 font-bold text-2xl leading-none cursor-pointer z-10"
        >
          ✕
        </button>
 
        <h2 className="text-xl font-extrabold text-slate-800 mb-6 text-center">Select Theme</h2>
 
        <div className="flex flex-wrap gap-4 sm:gap-5 justify-center">
          {themeOptions.map((t) => (
            <div 
              key={t.id} 
              onClick={() => changeTheme(t.id)}
              className={`w-[225px] sm:w-[260px] rounded-[18px] overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] border-4 ${theme === t.id ? 'border-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.3)]' : 'border-transparent shadow-md'}`}
              style={{ background: t.bodyBg }}
            >
              {/* Card Header */}
              <div 
                className="flex items-center justify-between px-4 py-3 text-white" 
                style={{ background: t.headerBg }}
              >
                <div className="flex items-center gap-2">
                  <FaBars size={14} />
                  <span className="font-bold text-base tracking-wide">{t.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaEnvelope size={14} />
                  <FaBell size={14} />
                </div>
              </div>
              
              {/* Card Body (Messages) */}
              <div className="p-4 space-y-3">
                {[
                  'Lorem ipsum',
                  'Excepteur sint proident, sunt in',
                  'exercitation ullamco laboris',
                  'Theme by Boomcoding'
                ].map((msg, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <img 
                      src="https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png" 
                      alt="avatar" 
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div style={{ color: t.text }} className="min-w-0">
                      <div className="text-[11px] font-bold leading-tight">Anonymous</div>
                      <div className="text-[11px] leading-snug truncate whitespace-normal">{msg}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Toggles Preview */}
              <div className="px-4 pb-4 flex justify-end gap-1.5 mt-2">
                <div className="w-10 h-6 rounded flex items-center justify-start px-1" style={{ background: t.accent }}>
                   <div className="w-4 h-4 rounded bg-white"></div>
                </div>
                <div className="w-10 h-6 rounded flex items-center justify-end px-1" style={{ background: t.toggleBg }}>
                   <div className="w-4 h-4 rounded bg-white"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;
