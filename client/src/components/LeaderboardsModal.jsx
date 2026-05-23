import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LeaderboardsModal = ({ onClose, onSelectUser, token }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const options = [
    { type: 'xp', icon: 'XP', label: 'Top XP', bg: '#6096B4', text: '#fff', fontSize: '12px', metricIcon: 'XP' },
    { type: 'level', icon: '⭐', label: 'Top level', bg: '#F9A826', text: '#fff', fontSize: '18px', metricIcon: '⭐' },
    { type: 'coins', icon: '🪙', label: 'Top coins', bg: '#FFCA28', text: '#fff', fontSize: '18px', metricIcon: '🪙' },
    { type: 'gifts', icon: '🎁', label: 'Top gifts', bg: '#E040FB', text: '#fff', fontSize: '18px', metricIcon: '🎁' },
    { type: 'likes', icon: '👍', label: 'Top likes', bg: '#7CB342', text: '#fff', fontSize: '18px', metricIcon: '👍' },
  ];

  const currentOption = options.find(o => o.type === selectedType);

  useEffect(() => {
    if (!selectedType) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`http://localhost:3500/api/users/leaderboard?type=${selectedType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedType, token]);

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getScoreValue = (user, type) => {
    if (type === 'gifts') return user.totalGifts || 0;
    return user[type] || 0;
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/50" onClick={onClose}>
      <div 
        className="absolute top-0 left-0 bottom-0 w-full max-w-[320px] bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInLeft 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-[#f8f9fa]">
          <div className="flex items-center">
            {selectedType ? (
              <button 
                onClick={() => setSelectedType(null)} 
                className="mr-3 text-gray-500 hover:text-gray-800 focus:outline-none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button 
                onClick={onClose} 
                className="mr-3 text-gray-500 hover:text-gray-800 focus:outline-none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <h2 className="text-[1.1rem] font-bold text-gray-800">
              {selectedType ? currentOption?.label : 'Leaderboards'}
            </h2>
          </div>
          {selectedType && (
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-800 font-bold text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedType ? (
            /* Options List */
            <div className="flex flex-col py-2">
              {options.map((opt, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setSelectedType(opt.type)}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                    style={{ backgroundColor: opt.bg, color: opt.text, fontSize: opt.fontSize }}
                  >
                    {opt.icon}
                  </div>
                  <span className="text-[1rem] text-gray-700 font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Leaderboard Detail List */
            <div className="flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500">Loading rankings...</span>
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-red-500 text-sm">{error}</div>
              ) : users.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">No rankings available.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {users.map((item, index) => {
                    const rank = index + 1;
                    const score = getScoreValue(item, selectedType);
                    return (
                      <div 
                        key={item._id || index}
                        onClick={() => {
                          if (onSelectUser) {
                            onSelectUser(item.username);
                          }
                        }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank */}
                          <div className="w-8 flex items-center justify-center font-bold text-gray-600">
                            {getRankBadge(rank)}
                          </div>
                          
                          {/* Avatar */}
                          <img 
                            src={item.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} 
                            alt={item.username} 
                            className="w-10 h-10 rounded-full object-cover border border-gray-100 flex-shrink-0"
                          />
                          
                          {/* Username */}
                          <span className="font-semibold text-gray-800 text-[0.95rem] truncate max-w-[120px]">
                            {item.username}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-lg text-sm">
                          <span>{score}</span>
                          <span>{currentOption?.metricIcon}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsModal;
