import React, { useState } from 'react';
import { soundSystem } from '../utils/soundSystem';

const SoundsModal = ({ onClose }) => {
  const [settings, setSettings] = useState(soundSystem.settings);

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    soundSystem.saveSettings(newSettings);
    
    // Play test sound if toggled ON
    if (newSettings[key]) {
      switch (key) {
        case 'chat': soundSystem.messagePing(); break;
        case 'private': soundSystem.privateMessagePing(); break;
        case 'notifications': soundSystem.notificationAlert(); break;
        case 'username': soundSystem.mentionAlert(); break;
        case 'call': soundSystem.callRing(); break;
        default: break;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[320px] sm:max-w-sm p-4 sm:p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 font-bold text-xl leading-none cursor-pointer"
        >
          ✕
        </button>
        
        <h2 className="text-xl font-extrabold text-slate-800 mb-4 sm:mb-6 font-sans">Sounds</h2>
        
        <div className="space-y-2">
          {[
            { id: 'chat', label: 'Chat sounds' },
            { id: 'private', label: 'Private sounds' },
            { id: 'notifications', label: 'Notification sounds' },
            { id: 'username', label: 'Username sounds' },
            { id: 'call', label: 'Call sounds' }
          ].map(item => (
            <div key={item.id} className="flex items-center justify-between bg-[#f1f5f9] px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl font-sans">
              <span className="text-[14px] sm:text-[15px] font-semibold text-slate-700">{item.label}</span>
              <button 
                onClick={() => handleToggle(item.id)}
                className={`w-[46px] h-[26px] rounded-full p-1 transition-colors duration-200 cursor-pointer ${settings[item.id] ? 'bg-sky-500 flex justify-end' : 'bg-slate-300 flex justify-start'}`}
              >
                <span className="w-[18px] h-[18px] bg-white rounded-full shadow-md block" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SoundsModal;
