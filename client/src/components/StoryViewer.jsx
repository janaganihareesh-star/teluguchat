import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaTrashAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../services/api';

const STORY_DURATION = 5000; // 5 seconds per story

const StoryViewer = ({ 
  storyGroup, 
  currentUser, 
  token, 
  onClose, 
  onStoryDeleted,
  onNextGroup,
  onPrevGroup
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(STORY_DURATION);

  const stories = storyGroup.stories;
  const currentStory = stories[currentIndex];
  const isOwner = currentUser._id === storyGroup.user._id;

  const markAsViewed = async (storyId) => {
    try {
      await api.post(`/api/stories/${storyId}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error marking viewed:', err);
    }
  };

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPaused(false);
    remainingTimeRef.current = STORY_DURATION;
    if (stories.length > 0) {
      markAsViewed(stories[0]._id);
    }
  }, [storyGroup]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION;
      startTimeRef.current = Date.now();
      markAsViewed(stories[currentIndex + 1]._id);
    } else {
      if (onNextGroup) {
        onNextGroup();
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION;
      startTimeRef.current = Date.now();
    } else {
      if (onPrevGroup) {
        onPrevGroup();
      } else {
        setProgress(0);
        remainingTimeRef.current = STORY_DURATION;
        startTimeRef.current = Date.now();
      }
    }
  };

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = ((STORY_DURATION - remainingTimeRef.current + elapsed) / STORY_DURATION) * 100;
      
      if (newProgress >= 100) {
        clearInterval(timerRef.current);
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      remainingTimeRef.current -= (Date.now() - startTimeRef.current);
    };
  }, [currentIndex, isPaused, storyGroup]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this story?")) return;
    
    setIsPaused(true);
    try {
      await api.delete(`/api/stories/${currentStory._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStoryDeleted) {
        onStoryDeleted(currentStory._id);
      }
      if (stories.length <= 1) {
        onClose(); // last story deleted
      } else {
        // Just move to the next or previous
        if (currentIndex < stories.length - 1) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
      setIsPaused(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex flex-col bg-black/95 animate-in fade-in duration-200"
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onPointerLeave={() => setIsPaused(false)}
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 flex gap-1 px-2 z-50">
        {stories.map((story, idx) => (
          <div key={story._id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all ease-linear"
              style={{ 
                width: idx === currentIndex ? `${progress}%` : (idx < currentIndex ? '100%' : '0%'),
                transitionDuration: isPaused ? '0ms' : '50ms'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <img 
            src={storyGroup.user.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} 
            alt="user" 
            className="w-10 h-10 rounded-full border-2 border-white/20 object-cover" 
          />
          <span className="text-white font-bold text-sm drop-shadow-md">{storyGroup.user.username}</span>
          <span className="text-white/60 text-xs">{new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isOwner && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(); }} 
              className="text-white/80 hover:text-red-400 transition"
              title="Delete Story"
            >
              <FaTrashAlt size={18} />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="text-white hover:text-gray-300 transition"
          >
            <FaTimes size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-none">
        {currentStory.mediaUrl ? (
          currentStory.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
            <video 
              src={currentStory.mediaUrl} 
              className="max-w-full max-h-full object-contain"
              autoPlay 
              playsInline
              loop={isPaused}
              muted
            />
          ) : (
            <img 
              src={currentStory.mediaUrl} 
              alt="Story" 
              className="max-w-full max-h-full object-contain pointer-events-none select-none"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-600 to-purple-800">
             <h2 className="text-white text-3xl md:text-5xl font-bold leading-tight drop-shadow-lg">{currentStory.text}</h2>
          </div>
        )}

        {/* Navigation Tap Zones */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer flex items-center pl-4 opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        >
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm">
            <FaChevronLeft />
          </div>
        </div>
        
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        >
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm">
            <FaChevronRight />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
