import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const InboxPage = () => {
  const { user, token } = useContext(AuthContext);
  const { socket } = useSocket();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const { data } = await api.get(`/api/inbox/messages/${conv._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(data);
      socket.emit('message-read', { conversationId: conv._id, userId: user._id });
    } catch (err) {
      console.error('Error opening conversation:', err);
    }
  };

  const [pullStartY, setPullStartY] = useState(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConvs = async () => {
    if (user?.role === 'guest') return null;
    try {
      const { data } = await api.get('/api/inbox/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(data);
      return data;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return null;
    }
  };

  const handleTouchStart = (e) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (pullStartY === null || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY;
    if (diff > 0) {
      const offset = Math.min(80, diff * 0.45);
      setPullOffset(offset);
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullStartY === null) return;
    setPullStartY(null);
    if (pullOffset >= 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullOffset(40);
      try {
        navigator.vibrate?.(30);
        await fetchConvs();
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullOffset(0);
        }, 600);
      }
    } else {
      setPullOffset(0);
    }
  };

  useEffect(() => {
    if (user?.role === 'guest') return;

    fetchConvs().then((data) => {
      if (!data) return;
      const selectUser = location.state?.selectUser;
      if (selectUser) {
        api.post('/api/inbox/conversations', {
          userId: selectUser._id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          const existing = data.find(c => c._id === res.data._id);
          if (existing) {
            openConversation(existing);
          } else {
            const newConv = {
              ...res.data,
              participants: [user, selectUser]
            };
            setConversations(prev => [newConv, ...prev]);
            openConversation(newConv);
          }
        }).catch(console.error);
      }
    });

    socket.on('private-message', (msg) => {
      if (activeConv && (msg.sender === activeConv._id || msg.sender._id === activeConv._id || msg.sender === user._id)) {
        setMessages(prev => [...prev, msg]);
      } else {
        fetchConvs();
      }
    });

    return () => socket.off('private-message');
  }, [token, activeConv, socket, user?._id, location.state]);

  const handleSend = (data) => {
    const receiverId = activeConv.participants.find(p => p._id !== user._id)._id;
    socket.emit('private-message', {
      senderId: user._id,
      receiverId,
      message: data.message,
      mediaUrl: data.mediaUrl,
      gifUrl: data.gifUrl,
      voiceUrl: data.voiceUrl
    });
  };

  if (user?.role === 'guest') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-900 text-white p-6 text-center">
        <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>🔒</div>
        <h2 className="text-3xl font-extrabold mb-2 text-yellow-500">Private Inbox Locked</h2>
        <p className="text-gray-400 max-w-sm mb-8">
          Guest users cannot access the private inbox or send direct messages. Please create an account to start secure private chats!
        </p>
        <button onClick={() => {
          window.location.href = '/register';
        }} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-950 font-bold px-8 py-3 rounded-full shadow-lg hover:from-yellow-400 hover:to-orange-400 transition" style={{ border: 'none', cursor: 'pointer' }}>
          Create Account Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-gray-900 text-white">
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full md:w-1/3 border-r border-gray-700 p-4 overflow-y-auto relative"
      >
        {/* Pull to Refresh Indicator */}
        <div 
          style={{
            height: `${pullOffset}px`,
            opacity: pullOffset > 0 ? 1 : 0,
            transition: pullStartY === null ? 'height 0.2s, opacity 0.2s' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            marginBottom: pullOffset > 0 ? '12px' : '0'
          }}
        >
          <span className={isRefreshing ? 'animate-spin inline-block' : ''} style={{ fontSize: '1rem', color: '#cbd5e1', fontWeight: 'bold' }}>
            {isRefreshing ? '🔄 Refreshing...' : '👇 Pull to refresh'}
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-4">Inbox</h2>
        {conversations.map(conv => {
          const otherUser = conv.participants.find(p => p._id !== user._id);
          const unread = conv.unreadCount?.[user._id] || 0;
          return (
            <div key={conv._id} onClick={() => openConversation(conv)} className="p-3 bg-gray-800 rounded-lg mb-2 cursor-pointer hover:bg-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src={otherUser?.profilePic || 'https://via.placeholder.com/150'} alt="avatar" className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-bold">{otherUser?.username}</div>
                  <div className="text-sm text-gray-400 truncate w-32">{conv.lastMessage}</div>
                </div>
              </div>
              {unread > 0 && <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unread}</div>}
            </div>
          )
        })}
      </div>
      
      <div className="w-2/3 flex flex-col">
        {activeConv ? (
          <>
            <header className="p-4 border-b border-gray-700 bg-gray-800">
               <h3 className="text-lg font-bold">Chat with {activeConv.participants.find(p => p._id !== user._id)?.username}</h3>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                 <MessageBubble key={idx} message={msg} currentUser={user} />
              ))}
            </main>
            <footer className="p-4 bg-gray-800">
               <MessageInput onSend={handleSend} roomId={activeConv._id} />
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
             Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
