import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaUserSecret, FaTimes } from 'react-icons/fa';

const BlindChat = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [status, setStatus] = useState('idle'); // idle, waiting, matched
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('blind-match-waiting', () => {
      setStatus('waiting');
    });

    socket.on('blind-match-found', (data) => {
      setStatus('matched');
      setRoomId(data.roomId);
      setMessages([]);
      setTimeLeft(300);
    });

    socket.on('blind-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('blind-match-ended', (data) => {
      setStatus('idle');
      setRoomId(null);
      let alertMsg = 'Chat ended.';
      if (data.reason === 'timeout') alertMsg = 'Time is up!';
      if (data.reason === 'partner_left') alertMsg = 'Stranger disconnected.';
      alert(alertMsg);
    });

    return () => {
      socket.off('blind-match-waiting');
      socket.off('blind-match-found');
      socket.off('blind-message');
      socket.off('blind-match-ended');
      if (status === 'matched' || status === 'waiting') {
        socket.emit('leave-blind-chat');
      }
    };
  }, [socket, user, status]);

  useEffect(() => {
    let timer;
    if (status === 'matched' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const joinQueue = () => {
    socket.emit('join-blind-chat');
  };

  const leaveQueue = () => {
    socket.emit('leave-blind-chat');
    setStatus('idle');
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !roomId) return;
    
    socket.emit('blind-message', { roomId, message: input });
    setMessages(prev => [...prev, { sender: 'You', message: input }]);
    setInput('');
  };

  if (!user) return <div className="p-8 text-center text-white">Please log in to use Blind Chat.</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans">
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-3">
          <FaUserSecret className="text-3xl text-purple-500" />
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Blind Chat Hour
            </h1>
            <p className="text-xs text-gray-400">Anonymous matchmaking</p>
          </div>
        </div>
        <button onClick={() => { leaveQueue(); navigate('/'); }} className="text-gray-400 hover:text-white transition">
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black/80 pointer-events-none" />
        
        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 relative">
            <div className="w-24 h-24 rounded-full bg-purple-600/20 flex items-center justify-center mb-6 animate-pulse">
              <FaUserSecret className="text-5xl text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Meet a Stranger</h2>
            <p className="text-gray-400 max-w-md mb-8">
              You will be paired with a random user. Your identities are hidden. 
              You have exactly 5 minutes to talk. Be polite!
            </p>
            <button 
              onClick={joinQueue}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              Start Matching
            </button>
          </div>
        )}

        {status === 'waiting' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 relative">
            <div className="w-16 h-16 border-4 border-t-purple-500 border-r-pink-500 border-b-transparent border-l-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-xl font-bold mb-2">Searching for a partner...</h2>
            <p className="text-gray-400 mb-8">This might take a few moments.</p>
            <button 
              onClick={leaveQueue}
              className="px-6 py-2 bg-gray-800 rounded-full font-semibold hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {status === 'matched' && (
          <div className="flex-1 flex flex-col h-full z-10">
            <div className="bg-purple-900/30 py-2 px-4 text-center text-sm font-semibold border-b border-purple-800/50 backdrop-blur-sm shadow-md">
              <span className="text-gray-300">Time remaining: </span>
              <span className={`font-mono ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-center my-4">
                <span className="bg-gray-800/80 px-4 py-1.5 rounded-full text-xs text-gray-400 font-medium">
                  You are now chatting with a stranger. Say Hi! 👋
                </span>
              </div>
              
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                    msg.sender === 'You' 
                      ? 'bg-purple-600 rounded-br-none text-white' 
                      : 'bg-gray-800 rounded-bl-none text-gray-100'
                  }`}>
                    <div className="text-[10px] opacity-60 mb-1 font-semibold tracking-wider">
                      {msg.sender.toUpperCase()}
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-gray-900/80 backdrop-blur-md border-t border-gray-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <FaPaperPlane size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlindChat;
