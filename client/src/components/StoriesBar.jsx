import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaPlus } from 'react-icons/fa';
import StoryViewer from './StoryViewer';

const StoriesBar = () => {
  const { user: currentUser, token } = useContext(AuthContext);
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchStories = async () => {
    try {
      const res = await api.get('/api/stories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupedStories(res.data);
    } catch (err) {
      console.error('Error fetching stories:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStories();
    }
    const interval = setInterval(fetchStories, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [token]);

  const handleUploadClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const uploadRes = await api.post('/api/upload', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        await api.post('/api/stories', {
          mediaUrl: uploadRes.data.url
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        fetchStories();
      } catch (err) {
        console.error('Error uploading story:', err);
      } finally {
        setIsUploading(false);
      }
    };
    fileInput.click();
  };

  const handleViewStory = (index) => {
    setActiveStoryGroupIndex(index);
  };

  const handleNextGroup = () => {
    if (activeStoryGroupIndex !== null && activeStoryGroupIndex < groupedStories.length - 1) {
      setActiveStoryGroupIndex(activeStoryGroupIndex + 1);
    } else {
      setActiveStoryGroupIndex(null);
    }
  };

  const handlePrevGroup = () => {
    if (activeStoryGroupIndex !== null && activeStoryGroupIndex > 0) {
      setActiveStoryGroupIndex(activeStoryGroupIndex - 1);
    } else {
      setActiveStoryGroupIndex(null);
    }
  };

  const handleStoryDeleted = (deletedStoryId) => {
    fetchStories();
  };

  return (
    <div style={{ display: 'flex', gap: '15px', padding: '10px 16px', overflowX: 'auto', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', scrollbarWidth: 'none' }}>
      {/* Upload Button */}
      <div 
        onClick={handleUploadClick}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isUploading ? 0.5 : 1, minWidth: '60px' }}
      >
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px dashed var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
          <FaPlus style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>Add Story</span>
      </div>

      {/* Story Bubbles */}
      {groupedStories.map((group, index) => {
        // Check if all stories in this group are seen by the current user
        const allSeen = group.stories.every(story => story.viewers.includes(currentUser?._id));
        
        return (
          <div 
            key={group.user._id} 
            onClick={() => handleViewStory(index)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '60px' }}
          >
            <div 
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                padding: '2px', 
                background: allSeen ? '#64748b' : 'linear-gradient(45deg, #f59e0b, #e11d48)', 
                marginBottom: '5px' 
              }}
            >
              <img 
                src={group.user.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} 
                alt="story user" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-panel)' }} 
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: allSeen ? 'var(--text-muted)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' }}>
              {group.user.username === currentUser?.username ? 'Your Story' : group.user.username}
            </span>
          </div>
        );
      })}

      {/* Advanced Story Viewer */}
      {activeStoryGroupIndex !== null && (
        <StoryViewer 
          storyGroup={groupedStories[activeStoryGroupIndex]}
          currentUser={currentUser}
          token={token}
          onClose={() => setActiveStoryGroupIndex(null)}
          onStoryDeleted={handleStoryDeleted}
          onNextGroup={handleNextGroup}
          onPrevGroup={handlePrevGroup}
        />
      )}
    </div>
  );
};

export default StoriesBar;
