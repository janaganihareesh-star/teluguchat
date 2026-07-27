import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FaPlus, FaUsers } from 'react-icons/fa';
import CreateGroupModal from './CreateGroupModal';

const GroupsList = ({ isLight }) => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const { data } = await api.get('/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [token]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <h3 className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>My Groups</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white px-2 py-1.5 rounded-lg hover:bg-indigo-700 transition"
        >
          <FaPlus /> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center text-sm text-slate-500 py-4">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-4 flex flex-col items-center gap-2">
            <FaUsers className="text-3xl opacity-50" />
            <p>You aren't in any groups yet.</p>
          </div>
        ) : (
          groups.map(group => (
            <div 
              key={group._id}
              onClick={() => navigate(`/group/${group._id}`)}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition ${
                isLight 
                  ? 'hover:bg-slate-50 bg-white border border-slate-100 shadow-sm' 
                  : 'hover:bg-slate-800/80 bg-slate-900/60 border border-white/5 shadow-md'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-xl shrink-0">
                {group.icon || '👥'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className={`font-bold text-sm truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {group.name}
                </div>
                <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                  <FaUsers /> {group.members?.length || 0} members
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal 
          token={token} 
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={(newGroup) => {
            setShowCreateModal(false);
            fetchGroups();
            navigate(`/group/${newGroup._id}`);
          }}
        />
      )}
    </div>
  );
};

export default GroupsList;
