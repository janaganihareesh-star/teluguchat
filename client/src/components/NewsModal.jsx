import React, { useState } from 'react';
import { FaThumbsUp, FaThumbsDown, FaHeart, FaLaughSquint, FaComment } from 'react-icons/fa';

const NewsModal = ({ onClose }) => {
  const [commentInput, setCommentInput] = useState('');
  const [reactions, setReactions] = useState({ likes: 3, dislikes: 0, loves: 0, laughs: 0 });
  const [userReaction, setUserReaction] = useState(null); // 'likes' | 'dislikes' | 'loves' | 'laughs' | null
  const [comments, setComments] = useState([]);

  const handleReact = (type) => {
    setReactions(prev => {
      const nextReactions = { ...prev };
      
      if (userReaction === type) {
        // Toggle off if they clicked the same reaction again
        nextReactions[type] = Math.max(0, nextReactions[type] - 1);
        setUserReaction(null);
      } else {
        // Decrement previously selected reaction if it exists
        if (userReaction) {
          nextReactions[userReaction] = Math.max(0, nextReactions[userReaction] - 1);
        }
        // Increment new reaction
        nextReactions[type] = (nextReactions[type] || 0) + 1;
        setUserReaction(type);
      }
      
      return nextReactions;
    });
  };

  const handleCommentSubmit = () => {
    if (commentInput.trim()) {
      setComments([...comments, { text: commentInput.trim(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
      setCommentInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="absolute top-0 left-0 bottom-0 w-full max-w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInLeft 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8f9fa]">
          <h2 className="text-[1.1rem] font-bold text-[#1e293b]">News</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 focus:outline-none font-bold text-xl leading-none">
            ×
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="p-5">
            {/* Post Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                  <span className="text-xl">😎</span>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-[#ff3b30]">Admin</span>
                  <span className="text-xs text-gray-500 mt-1">13/05 19:17</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-700">•••</button>
            </div>

            {/* Post Body */}
            <div className="text-[0.95rem] text-[#334155] leading-relaxed whitespace-pre-wrap font-medium">
              {"📢 Welcome to TeluguChat\n\nHello everyone 👋\nWelcome to our community.\n\nWe want this platform to be fun, safe, respectful and enjoyable for everyone.\n\nPlease follow these simple rules:\n\n✅ Be respectful to others\n✅ Chat freely and make friends\n✅ Keep conversations clean and decent\n✅ Respect privacy\n✅ Use public rooms responsibly\n\nNot Allowed:\n\n❌ Spam or repeated messages\n❌ Harassment or abusive language\n❌ Adult or unsafe content\n❌ Scam links or misleading content\n❌ Fake accounts or disturbing behavior\n\nOur AI moderation system helps keep chats safe and healthy. Repeated violations may result in warnings, temporary holds, room removal, or account restrictions.\n\nIf someone makes you uncomfortable:\nUse Report → We review quickly.\n\nEnjoy chatting 💙\nStay kind. Stay real.\n\n— Admin Team"}
            </div>

            {/* Reactions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleReact('likes')} 
                  className={`flex items-center gap-1.5 transition ${userReaction === 'likes' ? 'text-blue-500 scale-105 font-extrabold' : 'text-gray-600 hover:text-blue-500'}`}
                >
                  <div className="bg-blue-500 text-white p-1 rounded-full text-[10px]"><FaThumbsUp /></div>
                  <span className="text-sm font-bold">{reactions.likes > 0 ? reactions.likes : ''}</span>
                </button>
                <button 
                  onClick={() => handleReact('dislikes')} 
                  className={`flex items-center gap-1.5 transition ${userReaction === 'dislikes' ? 'text-red-500 scale-105 font-extrabold' : 'text-gray-600 hover:text-red-500'}`}
                >
                  <div className="bg-red-500 text-white p-1 rounded-full text-[10px]"><FaThumbsDown /></div>
                  <span className="text-sm font-bold">{reactions.dislikes > 0 ? reactions.dislikes : ''}</span>
                </button>
                <button 
                  onClick={() => handleReact('loves')} 
                  className={`flex items-center gap-1.5 transition ${userReaction === 'loves' ? 'text-pink-500 scale-105 font-extrabold' : 'text-gray-600 hover:text-pink-500'}`}
                >
                  <div className="bg-pink-400 text-white p-1 rounded-full text-[10px]"><FaHeart /></div>
                  <span className="text-sm font-bold">{reactions.loves > 0 ? reactions.loves : ''}</span>
                </button>
                <button 
                  onClick={() => handleReact('laughs')} 
                  className={`flex items-center gap-1.5 transition ${userReaction === 'laughs' ? 'text-yellow-500 scale-105 font-extrabold' : 'text-gray-600 hover:text-yellow-500'}`}
                >
                  <div className="bg-yellow-400 text-white p-1 rounded-full text-[10px]"><FaLaughSquint /></div>
                  <span className="text-sm font-bold">{reactions.laughs > 0 ? reactions.laughs : ''}</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600 text-sm font-bold">
                {comments.length > 0 ? `${comments.length} ` : ''}<FaComment className="text-[#0f172a] text-lg" />
              </div>
            </div>

            {/* Comments List */}
            {comments.length > 0 && (
              <div className="mt-4 space-y-3">
                {comments.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    <div className="font-bold text-xs text-gray-500 mb-1">You • {c.time}</div>
                    {c.text}
                  </div>
                ))}
              </div>
            )}

            {/* Comment Input */}
            <div className="mt-4">
              <input 
                type="text" 
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Type your comment"
                className="w-full bg-[#f8f9fa] border border-[#e2e8f0] rounded-full px-5 py-3 text-sm focus:outline-none focus:border-indigo-400 transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCommentSubmit();
                  }
                }}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
