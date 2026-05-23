import React from 'react';
import { FaTimes } from 'react-icons/fa';

const LevelInfoModal = ({ user, onClose }) => {
  if (!user) return null;

  // Let's compute XP thresholds based on typical level ranges
  const level = user.level || 1;
  const currentXp = user.xp || 0;
  
  // Helper to get total XP needed for a level
  const getXpThresholdForLevel = (lvl) => (lvl * (lvl - 1) / 2) * 1000;
  
  const baseLevelXp = getXpThresholdForLevel(level);
  const nextLevelXp = getXpThresholdForLevel(level + 1);
  const progressXp = currentXp - baseLevelXp;
  const rangeXp = nextLevelXp - baseLevelXp;
  
  // Make sure progress values are safe
  const currentLevelProgress = Math.max(0, progressXp);
  const totalXpForNextLevel = rangeXp;
  const xpPercent = Math.min(100, Math.round((currentLevelProgress / totalXpForNextLevel) * 100)) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background close trigger */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="bg-white text-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative z-10 font-sans select-none animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 hover:bg-slate-100 rounded-full transition cursor-pointer text-slate-400 hover:text-slate-600"
        >
          <FaTimes size={16} />
        </button>

        {/* Modal Title */}
        <h2 className="text-xl font-black text-slate-800 tracking-wide mb-5">
          Level {level}
        </h2>

        {/* Progress Bar Container */}
        <div className="mb-6">
          <div className="w-full h-8 bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden relative shadow-inner">
            <div 
              style={{ width: `${xpPercent}%` }}
              className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all duration-500 flex items-center justify-center text-xs font-black text-white"
            >
              {xpPercent > 10 ? `${xpPercent}%` : ''}
            </div>
            {xpPercent <= 10 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-600">
                {xpPercent}%
              </div>
            )}
          </div>
          
          <div className="text-xs text-slate-500 font-bold mt-2 ml-1">
            {currentLevelProgress} / {totalXpForNextLevel} XP
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 my-4" />

        {/* Details Grid Table */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-extrabold text-slate-500">Weekly XP</span>
            <span className="font-extrabold text-slate-800">{Math.round(currentXp * 0.1)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm border-t border-slate-50/50 pt-3">
            <span className="font-extrabold text-slate-500">Monthly XP</span>
            <span className="font-extrabold text-slate-800">{currentXp}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm border-t border-slate-50/50 pt-3">
            <span className="font-extrabold text-slate-500">Total XP</span>
            <span className="font-extrabold text-slate-800">{currentXp}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LevelInfoModal;
