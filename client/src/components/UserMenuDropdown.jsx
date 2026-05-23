import React, { useState, useEffect } from 'react';
import { FaCog, FaLayerGroup, FaWallet, FaSignOutAlt, FaChevronRight, FaChevronLeft, FaVolumeUp, FaVolumeMute, FaPalette, FaCheckCircle, FaCrown, FaUser } from 'react-icons/fa';
import { soundSystem } from '../utils/soundSystem';

const UserMenuDropdown = ({ user, onClose, onEditProfile, onOpenLevelInfo, logout, onOpenWallet, onOpenSounds, onOpenTheme }) => {
  const [view, setView] = useState('main'); // 'main' | 'settings'
  const [soundEnabled, setSoundEnabled] = useState(soundSystem.enabled);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundSystem.enabled = nextState;
    localStorage.setItem('soundEnabled', nextState ? 'true' : 'false');
    if (nextState) {
      soundSystem.init();
      soundSystem.messagePing();
    }
  };

  // Preset themes to choose from
  const themes = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Sky', value: '#0ea5e9' }
  ];

  const handleSelectTheme = (color) => {
    localStorage.setItem('chatThemeColor', color);
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <>
      {/* Background click listener to close dropdown */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      <div className="absolute right-0 top-14 w-80 bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl z-50 overflow-hidden font-sans select-none animate-in fade-in slide-in-from-top-3 duration-200">
        {view === 'main' ? (
          <div>
            {/* Header User Profile Info Card */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={user.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'}
                    alt="profile"
                    className="w-14 h-14 rounded-full object-cover border border-slate-100"
                  />
                  <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs bg-sky-100 text-sky-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FaUser size={8} /> {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-wide mt-0.5 leading-snug">{user.username}</h3>
                  <button 
                    onClick={() => { onEditProfile(); onClose(); }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 mt-1 cursor-pointer transition block"
                  >
                    Edit profile
                  </button>
                </div>
              </div>
              <FaCheckCircle className="text-green-500 text-2xl" />
            </div>

            {/* List Menu Options */}
            <div className="py-2.5">
              {/* Chat Options */}
              <button
                onClick={() => setView('settings')}
                className="w-full px-5 py-3.5 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-slate-600">
                  <FaCog className="text-sky-500 text-lg" />
                  <span className="text-sm font-semibold text-slate-700">Chat options</span>
                </div>
                <FaChevronRight className="text-slate-400 text-sm" />
              </button>

              {/* Level Info */}
              <button
                onClick={() => { onOpenLevelInfo(); onClose(); }}
                className="w-full px-5 py-3.5 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-slate-600">
                  <FaLayerGroup className="text-sky-500 text-lg" />
                  <span className="text-sm font-semibold text-slate-700">Level info</span>
                </div>
              </button>

              {/* Wallet */}
              <button
                onClick={() => { onOpenWallet(); onClose(); }}
                className="w-full px-5 py-3.5 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer text-left font-sans"
              >
                <div className="flex items-center gap-4 text-slate-600">
                  <FaWallet className="text-sky-500 text-lg" />
                  <span className="text-sm font-semibold text-slate-700">Wallet</span>
                </div>
                <span className="text-xs bg-yellow-100 border border-yellow-200 text-yellow-700 font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shrink-0 select-none">
                  💰 {user.coins || 0} Coins
                </span>
              </button>

              <div className="border-t border-slate-100 my-2" />

              {/* Logout Button */}
              <button
                onClick={() => { logout(); onClose(); }}
                className="w-full px-5 py-3.5 hover:bg-slate-50 flex items-center gap-4 text-left transition cursor-pointer"
              >
                <FaSignOutAlt className="text-red-500 text-lg" />
                <span className="text-sm font-bold text-red-500">Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Sub-menu Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-4">
              <button 
                onClick={() => setView('main')}
                className="p-1.5 hover:bg-slate-100 rounded-full transition cursor-pointer text-slate-500"
              >
                <FaChevronLeft size={14} />
              </button>
              <h3 className="font-extrabold text-slate-800 text-base">Settings</h3>
            </div>

            {/* Sub-menu Content */}
            <div className="p-3 space-y-1">
              {/* Sounds Settings Button */}
              <button
                onClick={() => { onClose(); if(onOpenSounds) onOpenSounds(); }}
                className="w-full flex items-center justify-between hover:bg-slate-50 px-4 py-3 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FaVolumeUp className="text-sky-500 text-lg" />
                  <span className="text-sm font-semibold text-slate-700">Sounds</span>
                </div>
                <FaChevronRight className="text-slate-400 text-sm" />
              </button>

              {/* Theme Settings Button */}
              <button
                onClick={() => { onClose(); if(onOpenTheme) onOpenTheme(); }}
                className="w-full flex items-center justify-between hover:bg-slate-50 px-4 py-3 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FaPalette className="text-sky-500 text-lg" />
                  <span className="text-sm font-semibold text-slate-700">Theme</span>
                </div>
                <FaChevronRight className="text-slate-400 text-sm" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserMenuDropdown;
