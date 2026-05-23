import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWallet, FaTimes, FaCommentDots, FaClock } from 'react-icons/fa';

const WalletModal = ({ user, onClose }) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} 
          className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-white flex flex-col z-10 font-sans"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl">
                <FaWallet size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-wide leading-none">Coin Wallet</h2>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Your balance & rewards</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800/60 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <div className="p-6">
            {/* Current Balance */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800/80 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-yellow-500/5" />
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider relative z-10">Current Balance</div>
              <div className="text-5xl font-black mt-2 text-white flex items-center gap-3 relative z-10">
                <span>{user?.coins || 0}</span>
                <span className="text-yellow-500 text-4xl drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]">🪙</span>
              </div>
            </div>

            {/* How to Earn Rules */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">How to earn coins</h3>
              <div className="space-y-3">
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center gap-4 hover:border-sky-500/30 transition-colors">
                  <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center shrink-0">
                    <FaCommentDots size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Chat & Interact</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Earn <span className="text-yellow-500 font-bold">1 Coin</span> for every 10 messages you send.</p>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                    <FaClock size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Stay Active</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Earn <span className="text-yellow-500 font-bold">1 Coin</span> for every 30 minutes online.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WalletModal;
