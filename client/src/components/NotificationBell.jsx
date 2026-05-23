import React, { useEffect, useState, useContext } from 'react';
import { FaBell } from 'react-icons/fa';
import { NotificationContext } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { soundSystem } from '../utils/soundSystem';

const NotificationBell = () => {
  const { notifications, totalUnread, addNotification, markRead, setNotifications } = useContext(NotificationContext);
  const { token } = useContext(AuthContext);
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await axios.get('http://localhost:3500/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(data);
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchNotifications();

    socket.on('new-notification', (notif) => {
      addNotification(notif);
      soundSystem.notificationAlert();
    });

    return () => socket.off('new-notification');
  }, [token, socket, addNotification, setNotifications]);

  const handleNotificationClick = async (notif) => {
    if (notif.type === 'friend_request' && !notif.isRead) {
      return;
    }

    try {
      await axios.put(`http://localhost:3500/api/notifications/${notif._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      markRead(notif._id);
      setIsOpen(false);
      if (notif.link) navigate(notif.link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptFriend = async (e, notif) => {
    e.stopPropagation();
    try {
      await axios.post(`http://localhost:3500/api/users/friend-request/${notif._id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      markRead(notif._id);
      setNotifications(prev => 
        prev.map(n => n._id === notif._id 
          ? { ...n, isRead: true, message: `Accepted friend request from ${notif.sender?.username || 'user'}` } 
          : n
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error accepting friend request');
    }
  };

  const handleDeclineFriend = async (e, notif) => {
    e.stopPropagation();
    try {
      await axios.post(`http://localhost:3500/api/users/friend-request/${notif._id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      markRead(notif._id);
      setNotifications(prev => 
        prev.map(n => n._id === notif._id 
          ? { ...n, isRead: true, message: `Declined friend request from ${notif.sender?.username || 'user'}` } 
          : n
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error declining friend request');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put('http://localhost:3500/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 relative text-white hover:text-white/80 transition flex items-center justify-center">
        <FaBell size={20} />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
            {totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-800">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-extrabold text-slate-800 text-sm">Notifications</h3>
            {totalUnread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm font-medium">No notifications yet.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex flex-col gap-2 cursor-pointer hover:bg-slate-50 transition border-b border-slate-100 ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <img src={notif.sender?.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-semibold leading-snug">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Just now</span>
                    </div>
                    {!notif.isRead && notif.type !== 'friend_request' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full mt-1.5 flex-shrink-0"></div>}
                  </div>
                  
                  {notif.type === 'friend_request' && !notif.isRead && (
                    <div className="flex gap-2 justify-end w-full pl-12 mt-1">
                      <button 
                        onClick={(e) => handleAcceptFriend(e, notif)}
                        className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white font-extrabold rounded-lg text-xs transition cursor-pointer"
                      >
                        Accept ✅
                      </button>
                      <button 
                        onClick={(e) => handleDeclineFriend(e, notif)}
                        className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-lg text-xs transition cursor-pointer"
                      >
                        Decline ❌
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
