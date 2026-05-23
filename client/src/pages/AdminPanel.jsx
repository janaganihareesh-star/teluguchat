import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FaBan, FaMicrophoneSlash, FaCrown, FaUsers, FaChartBar, FaLock, FaVolumeMute } from 'react-icons/fa';

const AdminPanel = () => {
  const { token } = useContext(AuthContext);
  const { onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [moderationLogs, setModerationLogs] = useState([
    { action: 'Spam Guard Active', target: 'System', time: 'Just now' },
    { action: 'Filter loaded', target: 'AI Bot', time: '10 mins ago' }
  ]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get('http://localhost:3500/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, [token]);

  const handleAction = async (action, userId, username, body = {}) => {
    try {
      await axios.post(`http://localhost:3500/api/admin/${action}/${userId}`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Action ${action} successful on ${username}`);
      setModerationLogs(prev => [
        { action: `User ${action.toUpperCase()}`, target: username, time: 'Just now' },
        ...prev
      ]);
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const activeRoomsCount = 3; // Main, Games, General
  const bansCount = users.filter(u => u.isBanned).length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans relative">
      <div className="absolute inset-0 bg-red-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
            👮 Live Moderation Shield
          </h1>
          <p className="text-xs text-slate-400 mt-1">Realtime Security, Spam Alerts & Community Control Panel</p>
        </div>
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider animate-pulse">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
          Shield Active
        </div>
      </header>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Online Users', value: onlineUsers.length, icon: <FaUsers />, color: 'text-indigo-400' },
          { label: 'Active Channels', value: activeRoomsCount, icon: <FaChartBar />, color: 'text-emerald-400' },
          { label: 'Banned Accounts', value: bansCount, icon: <FaLock />, color: 'text-red-400' },
          { label: 'Spam Detections', value: '0', icon: <FaVolumeMute />, color: 'text-amber-400' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</span>
              <span className={`text-xl ${stat.color}`}>{stat.icon}</span>
            </div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Management Table */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">User Directory</h3>
            <span className="text-xs text-slate-400 font-semibold">{users.length} members loaded</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="p-4 font-bold">User</th>
                  <th className="p-4 font-bold">Role</th>
                  <th className="p-4 font-bold">Level</th>
                  <th className="p-4 font-bold text-center">Security Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-white/5 transition">
                    <td className="p-4 flex items-center gap-3">
                      <img src={user.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                      <span className="font-semibold text-white">{user.username}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border
                        ${user.role === 'admin' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                          
                          'bg-slate-500/10 border-slate-500/30 text-slate-300'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-400">Lv.{user.level}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleAction('mute', user._id, user.username, { minutes: 30 })} className="p-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20 rounded-xl transition text-xs" title="Mute for 30 mins">
                          <FaMicrophoneSlash />
                        </button>
                        <button onClick={() => handleAction('ban', user._id, user.username, { reason: 'Policy Violation' })} className="p-2.5 bg-red-500/10 hover:bg-red-500 text-white border border-red-500/20 rounded-xl transition text-xs" title="Ban Account">
                          <FaBan />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Moderation Log Widget */}
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider mb-4">Live Moderation Logs</h3>
            <div className="space-y-3">
              {moderationLogs.map((log, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-3.5 rounded-xl text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-amber-400 uppercase tracking-wider">{log.action}</span>
                    <span className="text-slate-500 text-[10px]">{log.time}</span>
                  </div>
                  <div className="text-slate-300">Target: <strong className="text-white">{log.target}</strong></div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] text-red-400 text-center uppercase tracking-wider font-bold">
            ⚡ AI Content Moderation System Online
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
