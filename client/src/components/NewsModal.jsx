import React, { useState, useEffect } from 'react';
import { FaThumbsUp, FaThumbsDown, FaHeart, FaLaughSquint, FaComment, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

const NewsModal = ({ onClose }) => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reaction mapping per post
  const [reactions, setReactions] = useState({});
  const [userReactions, setUserReactions] = useState({});

  // Replies state
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        // BaseURL inference (assumes proxy or standard env)
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500/api';
        const res = await axios.get(`${baseUrl}/news`, config);
        setNewsItems(res.data);
        
        // Initialize reactions for fetched items
        const initReactions = {};
        res.data.forEach(item => {
          initReactions[item._id] = { likes: Math.floor(Math.random() * 10) + 1, dislikes: 0, loves: Math.floor(Math.random() * 5), laughs: 0 };
        });
        setReactions(initReactions);
      } catch (err) {
        console.error("Failed to fetch news", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const handleReact = (postId, type) => {
    setReactions(prev => {
      const nextReactions = { ...prev };
      const currentItemReactions = { ...nextReactions[postId] };
      const currentUserReact = userReactions[postId];

      if (currentUserReact === type) {
        currentItemReactions[type] = Math.max(0, currentItemReactions[type] - 1);
        setUserReactions({ ...userReactions, [postId]: null });
      } else {
        if (currentUserReact) {
          currentItemReactions[currentUserReact] = Math.max(0, currentItemReactions[currentUserReact] - 1);
        }
        currentItemReactions[type] = (currentItemReactions[type] || 0) + 1;
        setUserReactions({ ...userReactions, [postId]: type });
      }
      
      nextReactions[postId] = currentItemReactions;
      return nextReactions;
    });
  };

  const toggleReplies = (postId) => {
    setExpandedReplies(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReplyChange = (postId, text) => {
    setReplyTexts(prev => ({ ...prev, [postId]: text }));
  };

  const handleReplySubmit = async (postId) => {
    const text = replyTexts[postId];
    if (!text || text.trim() === '') return;
    
    setSendingReply(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500/api';
      const res = await axios.post(
        `${baseUrl}/news/${postId}/reply`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the specific news item with the newly returned one (which has populated replies)
      setNewsItems(prev => prev.map(item => item._id === postId ? res.data : item));
      setReplyTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to post reply', err);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="absolute top-0 left-0 bottom-0 w-full max-w-[420px] bg-[#fdfdfd] shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-[1.1rem] font-bold text-gray-900 flex items-center gap-2">
              Community News <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </h2>
            <span className="text-xs text-gray-500">Official Announcements</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors focus:outline-none font-bold text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            ×
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto flex-1 scroll-smooth bg-gray-50/50">
          <div className="p-4 space-y-6">
            
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <FaSpinner className="animate-spin text-indigo-500 text-2xl" />
              </div>
            ) : newsItems.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-medium">
                No news available today. Check back later!
              </div>
            ) : (
              newsItems.map((news, index) => {
                const postReactions = reactions[news._id] || { likes: 0, dislikes: 0, loves: 0, laughs: 0 };
                const userReact = userReactions[news._id];
                const isPinned = index === 0;

                return (
                  <div key={news._id} className={`relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 overflow-hidden ${isPinned ? 'ring-2 ring-indigo-50 shadow-md' : ''}`}>
                    {isPinned && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm tracking-wide uppercase">
                        Today's Announcement
                      </div>
                    )}
                    
                    {/* Post Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm text-lg ${news.type === 'festival' ? 'bg-gradient-to-tr from-yellow-300 to-orange-400' : 'bg-gradient-to-tr from-blue-100 to-indigo-100'}`}>
                          {news.type === 'festival' ? '🎉' : '📰'}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900">{news.authorName || 'Admin'}</span>
                            <FaCheckCircle className="text-blue-500 text-[12px]" title="Verified Admin" />
                          </div>
                          <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                            {new Date(news.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Post Body */}
                    <h3 className="font-bold text-gray-800 text-lg mb-2">{news.title}</h3>
                    <div 
                      className="text-[0.95rem] text-gray-600 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: news.content }}
                    />

                    {/* Reactions */}
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleReact(news._id, 'likes')} className={`flex items-center gap-1.5 transition ${userReact === 'likes' ? 'text-blue-500 scale-105 font-bold' : 'text-gray-500 hover:text-blue-500'}`}>
                          <div className="bg-blue-50 text-blue-500 p-1.5 rounded-full text-[11px]"><FaThumbsUp /></div>
                          <span className="text-xs font-bold">{postReactions.likes > 0 ? postReactions.likes : ''}</span>
                        </button>
                        <button onClick={() => handleReact(news._id, 'loves')} className={`flex items-center gap-1.5 transition ${userReact === 'loves' ? 'text-pink-500 scale-105 font-bold' : 'text-gray-500 hover:text-pink-500'}`}>
                          <div className="bg-pink-50 text-pink-500 p-1.5 rounded-full text-[11px]"><FaHeart /></div>
                          <span className="text-xs font-bold">{postReactions.loves > 0 ? postReactions.loves : ''}</span>
                        </button>
                        <button onClick={() => handleReact(news._id, 'laughs')} className={`flex items-center gap-1.5 transition ${userReact === 'laughs' ? 'text-yellow-500 scale-105 font-bold' : 'text-gray-500 hover:text-yellow-500'}`}>
                          <div className="bg-yellow-50 text-yellow-500 p-1.5 rounded-full text-[11px]"><FaLaughSquint /></div>
                          <span className="text-xs font-bold">{postReactions.laughs > 0 ? postReactions.laughs : ''}</span>
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => toggleReplies(news._id)}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs font-bold transition"
                      >
                        <FaComment className="text-sm" /> 
                        Reply {news.replies?.length > 0 && `(${news.replies.length})`}
                      </button>
                    </div>

                    {/* Replies Section */}
                    {expandedReplies[news._id] && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {/* Existing Replies List */}
                        <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {!news.replies || news.replies.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center italic">No replies yet. Be the first to reply!</p>
                          ) : (
                            news.replies.map((reply, i) => (
                              <div key={i} className="flex gap-2">
                                <img 
                                  src={reply.user?.profilePic || `https://api.dicebear.com/6.x/avataaars/svg?seed=${reply.user?.username || 'user'}`} 
                                  alt="avatar" 
                                  className="w-7 h-7 rounded-full bg-gray-100 object-cover"
                                />
                                <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-3 text-[0.85rem]">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-800">{reply.user?.username || 'User'}</span>
                                    <span className="text-[10px] text-gray-400">
                                      {new Date(reply.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-600 leading-snug break-words whitespace-pre-wrap">{reply.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Reply Input */}
                        <div className="flex items-end gap-2 relative">
                          <textarea 
                            value={replyTexts[news._id] || ''}
                            onChange={(e) => handleReplyChange(news._id, e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                            rows={1}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReplySubmit(news._id);
                              }
                            }}
                          />
                          <button 
                            onClick={() => handleReplySubmit(news._id)}
                            disabled={sendingReply || !replyTexts[news._id]?.trim()}
                            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-full p-2 w-9 h-9 flex items-center justify-center transition shadow-sm shrink-0"
                          >
                            {sendingReply ? <FaSpinner className="animate-spin text-xs" /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
