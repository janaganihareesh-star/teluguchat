import React, { useState } from 'react';
import api from '../services/api';
import { FaTimes, FaUsers, FaInfoCircle, FaLink } from 'react-icons/fa';

const CreateGroupModal = ({ token, onClose, onGroupCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('👥');
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/groups', { name, description, icon }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onGroupCreated(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating group');
    }
    setLoading(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/api/groups/join/${joinCode}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onGroupCreated(data); // Using same callback to refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Error joining group');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FaUsers className="text-indigo-600" /> Groups
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <h3 className="font-bold text-slate-700 mb-2 border-b pb-1">Create New Group</h3>
          <form onSubmit={handleCreate} className="mb-6">
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Icon (Emoji)</label>
              <input type="text" maxLength="2" value={icon} onChange={e => setIcon(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows="2"></textarea>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition disabled:bg-slate-400">
              Create Group
            </button>
          </form>

          <h3 className="font-bold text-slate-700 mb-2 border-b pb-1 flex items-center gap-2"><FaLink className="text-sm" /> Join Existing Group</h3>
          <form onSubmit={handleJoin}>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invite Code</label>
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. A1B2C3" className="w-full px-3 py-2 border rounded-lg font-mono uppercase" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition disabled:bg-slate-400">
              Join Group
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
