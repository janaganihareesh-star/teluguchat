import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaVolumeMute, FaVolumeUp, FaMusic, FaMinus } from 'react-icons/fa';
import axios from 'axios';
import api from '../services/api';
import { motion } from 'framer-motion';

const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffsetStart = useRef({ x: 0, y: 0 });
  const audioRef = useRef(null);

  // Vanilla Drag Listeners
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragStart.current.x;
      const deltaY = clientY - dragStart.current.y;
      
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Bounding constraints so bubble stays on screen
      const newX = Math.max(-w + 76, Math.min(20, dragOffsetStart.current.x + deltaX));
      const newY = Math.max(-h + 146, Math.min(90, dragOffsetStart.current.y + deltaY));
      
      setBubblePos({ x: newX, y: newY });
    };

    const onEnd = (e) => {
      setIsDragging(false);
      
      let endX, endY;
      if (e.changedTouches && e.changedTouches.length > 0) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
      } else {
        endX = e.clientX;
        endY = e.clientY;
      }
      
      const startX = dragStart.current.x;
      const startY = dragStart.current.y;
      const distance = Math.sqrt(Math.pow((endX || startX) - startX, 2) + Math.pow((endY || startY) - startY, 2));
      
      // If movement is very small, it's a tap/click -> maximize player
      if (distance < 6) {
        setIsMinimized(false);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  // Fetch playlist from the backend
  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const { data } = await api.get('/api/music');
        if (data && data.length > 0) {
          setPlaylist(data);
        } else {
          setPlaylist([{ title: 'No Music Found', url: '' }]);
        }
      } catch (error) {
        console.error('Failed to fetch music playlist', error);
        setPlaylist([{ title: 'Error Loading Music', url: '' }]);
      }
    };
    fetchMusic();
  }, []);

  // Listen for global custom event to toggle/show MusicPlayer
  useEffect(() => {
    const handleToggle = () => {
      setIsMinimized(prev => !prev);
    };
    window.addEventListener('toggle-music-player', handleToggle);
    return () => window.removeEventListener('toggle-music-player', handleToggle);
  }, []);

  const track = playlist[currentTrackIdx] || { title: 'Loading...', url: '' };

  useEffect(() => {
    if (track && track.url) {
      const source = track.url.startsWith('http') ? 'External' : 'Local';
      console.log(`[MusicPlayer] Selected Track: "${track.title}"`);
      console.log(`[MusicPlayer] URL: ${track.url}`);
      console.log(`[MusicPlayer] Source: ${source}`);
    }
  }, [track.url]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Autoplay blocked', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIdx, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleEnded = () => {
    handleNext();
  };

  const handlePlayPause = () => {
    if (playlist.length === 0 || !track.url) return;
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    setCurrentTrackIdx((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    setCurrentTrackIdx((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleStart = (e) => {
    // Only drag with left mouse click or touch
    if (e.button !== undefined && e.button !== 0) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragStart.current = { x: clientX, y: clientY };
    dragOffsetStart.current = { ...bubblePos };
    setIsDragging(true);
  };

  if (isMinimized) {
    return (
      <div 
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          fontFamily: 'sans-serif',
          touchAction: 'none',
          transform: `translate3d(${bubblePos.x}px, ${bubblePos.y}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)', // Snappy spring-like release!
        }}
        title={`Now Playing: ${track.title}`}
        className="active:scale-95 group"
      >
        {/* Hidden Native Audio Element (keeps playing in background) */}
        {track.url && (
          <audio
            ref={audioRef}
            src={track.url.startsWith('http') ? track.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3500'}${track.url}`}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={(e) => {
              console.error(`[MusicPlayer] Error playing audio for: ${track.title}`, e);
              if (playlist.length > 1) handleNext();
            }}
          />
        )}

        <div 
          className="transition-transform duration-200 group-hover:scale-110"
          style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        >
          {/* Rotating Vinyl Record/CD Icon */}
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            style={{
              width: '32px',
              height: '32px',
              animation: isPlaying ? 'spin 3s linear infinite' : 'none',
              transition: 'transform 0.5s ease',
            }}
          >
            <circle cx="12" cy="12" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="7" fill="#0f172a" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx="12" cy="12" r="4" fill="#334155" />
            <circle cx="12" cy="12" r="1.5" fill="#f59e0b" />
          </svg>
          {/* Tiny floating music note when playing */}
          {isPlaying && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              fontSize: '0.75rem',
              animation: 'pulse 1.5s infinite',
              color: '#f59e0b',
            }}>
              🎵
            </span>
          )}
        </div>

        {/* Floating Animated Equalizer overlay when playing */}
        {isPlaying && (
          <div style={{
            position: 'absolute',
            bottom: '6px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            height: '10px',
            pointerEvents: 'none'
          }}>
            <div style={{ width: '2.5px', height: '100%', background: '#f59e0b', borderRadius: '1px', animation: 'eq-bounce 0.8s ease-in-out infinite alternate' }} />
            <div style={{ width: '2.5px', height: '100%', background: '#f59e0b', borderRadius: '1px', animation: 'eq-bounce 0.5s ease-in-out infinite alternate', animationDelay: '0.15s' }} />
            <div style={{ width: '2.5px', height: '100%', background: '#f59e0b', borderRadius: '1px', animation: 'eq-bounce 0.7s ease-in-out infinite alternate', animationDelay: '0.3s' }} />
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes eq-bounce {
            0% { height: 3px; }
            100% { height: 10px; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      right: '20px',
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '20px',
      width: '300px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      color: '#fff',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: 'sans-serif',
      overflow: 'hidden',
    }}>
      {/* Hidden Native Audio Element */}
      {track.url && (
        <audio
          ref={audioRef}
          src={track.url.startsWith('http') ? track.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3500'}${track.url}`}
          onTimeUpdate={handleTimeUpdate}
          onCanPlay={() => console.log(`[MusicPlayer] Audio loaded successfully: ${track.title}`)}
          onEnded={handleEnded}
          onError={(e) => {
            console.error(`[MusicPlayer] Error playing audio for: ${track.title}`, e);
            console.log('[MusicPlayer] Skipping to next track automatically due to error');
            if (playlist.length > 1) handleNext();
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <FaMusic style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>Telugu FM</span>
            
            {/* Small Equalizer in Header when playing */}
            {isPlaying && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5px', height: '8px', marginLeft: '6px' }}>
                <div style={{ width: '1.5px', height: '100%', background: '#f59e0b', borderRadius: '1px', animation: 'eq-bounce 0.8s ease-in-out infinite alternate' }} />
                <div style={{ width: '1.5px', height: '100%', background: '#f59e0b', borderRadius: '1px', animation: 'eq-bounce 0.5s ease-in-out infinite alternate', animationDelay: '0.15s' }} />
                <div style={{ width: '1.5px', height: '100%', background: '#f59e0b', borderRadius: '1px', animation: 'eq-bounce 0.7s ease-in-out infinite alternate', animationDelay: '0.3s' }} />
              </div>
            )}
          </div>
          <button onClick={() => setIsMinimized(true)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
            <FaMinus size={10} />
          </button>
        </div>

        {/* Rotating Vinyl Record Artwork in full view */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 16px 0' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #334155 0%, #0f172a 70%, #1e293b 100%)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            animation: isPlaying ? 'spin 8s linear infinite' : 'none'
          }}>
            {/* Vinyl grooves */}
            <div style={{ position: 'absolute', width: '60px', height: '60px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }} />
            
            {/* Center yellow label */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)'
            }}>
              <FaMusic size={9} style={{ color: '#0f172a' }} />
            </div>
            
            {/* Hole */}
            <div style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.95)'
            }} />
          </div>
        </div>

        {/* Track Info */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>{track.title}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.length > 0 ? `${currentTrackIdx + 1} of ${playlist.length}` : 'Local Playlist'}</div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#f59e0b', borderRadius: '2px', transition: 'width 0.1s linear' }} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
          <button onClick={handlePrev} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>
            <FaStepBackward />
          </button>
          <button onClick={handlePlayPause} style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#111827', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
          }}>
            {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: '2px' }} />}
          </button>
          <button onClick={handleNext} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>
            <FaStepForward />
          </button>
          <button onClick={handleMuteToggle} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        </div>
      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes eq-bounce {
          0% { height: 2px; }
          100% { height: 8px; }
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
