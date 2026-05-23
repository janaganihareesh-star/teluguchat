import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserBadge from './UserBadge';

const LevelUpPopup = ({ newLevel, badge, gender, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-8 rounded-3xl shadow-2xl text-center">
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl flex justify-center mb-4"
          >
            <UserBadge level={newLevel} gender={gender} role="user" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            Level Up!
          </h2>
          <p className="text-gray-300 text-lg mb-4">
            You have reached <span className="font-bold text-white">Level {newLevel}</span>
          </p>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 font-bold"
          >
            <span className="text-xl animate-bounce">🪙</span>
            <span>+50 Bonus Coins!</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LevelUpPopup;
