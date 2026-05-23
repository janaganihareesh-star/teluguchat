import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FaEye, FaTimes, FaCamera, FaStar, FaThumbsUp, FaAddressCard, FaHeart, FaEnvelope, FaKey, FaGift, FaUserFriends, FaBan, FaCog, FaLock, FaGlobe, FaSignOutAlt, FaTrash } from 'react-icons/fa';

const AccountSettingsModal = ({ onClose, profile }) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('account');

  // We use profile data if passed, otherwise fallback to currentUser
  const displayUser = profile || user;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-md rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER AREA - BLUE */}
        <div className="bg-[#244273] px-5 py-5 relative flex flex-col items-center">
          
          {/* Top Icons Row */}
          <div className="w-full flex justify-between items-start mb-2">
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition rounded-full px-2.5 py-1 cursor-pointer">
                <FaStar className="text-yellow-400" size={14} />
                <span className="text-white text-xs font-bold">{displayUser?.level || 8}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition rounded-full px-2.5 py-1 cursor-pointer">
                <FaThumbsUp className="text-cyan-400" size={14} />
                <span className="text-white text-xs font-bold">{displayUser?.likes || 0}</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button className="text-white hover:text-slate-200 transition">
                <FaEye size={20} />
              </button>
              <button onClick={onClose} className="text-white hover:text-slate-200 transition">
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          {/* Avatar Section */}
          <div className="relative mt-2 mb-3 group cursor-pointer">
            <img 
              src={displayUser?.profilePic || `https://ui-avatars.com/api/?name=${displayUser?.username}&background=0284c7&color=fff&size=128`} 
              alt="avatar" 
              className="w-24 h-24 rounded-full border-2 border-white object-cover shadow-lg"
            />
            {/* Camera Overlay */}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <FaTimes className="text-white" size={12} />
               <FaCamera className="text-white" size={16} />
            </div>
          </div>

          {/* User Info */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                <FaTimes className="text-white" size={8} /> {/* Actually verified tick, using star/tick equivalent */}
              </div>
              <span className="text-white font-bold text-sm">User</span>
            </div>
            <h2 className="text-white text-2xl font-extrabold tracking-wide">
              {displayUser?.username || 'Anonymous'}
            </h2>
          </div>
        </div>

        {/* TABS ROW */}
        <div className="bg-[#f2f2f2] px-6 py-4 flex justify-center border-b border-gray-200">
          <div className="flex gap-2 bg-[#e6e6e6] p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('account')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'account' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Account
            </button>
            <button 
              onClick={() => setActiveTab('more')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'more' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              More
            </button>
          </div>
        </div>

        {/* CONTENT LIST */}
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa]">
          
          {activeTab === 'account' && (
            <div className="flex flex-col py-2">
              <button className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0">
                <FaAddressCard size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Edit info</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0">
                <FaHeart size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Edit relationship</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0">
                <FaEnvelope size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Edit email</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0">
                <FaKey size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Change password</span>
              </button>
            </div>
          )}

          {activeTab === 'more' && (
            <div className="flex flex-col py-2">
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaGift size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Gifts</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaUserFriends size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Manage friends</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaBan size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Manage ignores</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaCog size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Preferences</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaLock size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Privacy settings</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaGlobe size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Language/Location</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5">
                <FaSignOutAlt size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Logout options</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700">
                <FaTrash size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Delete account</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AccountSettingsModal;
