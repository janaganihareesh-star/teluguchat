import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaVolumeMute, FaVolumeUp, FaMusic, FaMinus } from 'react-icons/fa';
import axios from 'axios';

const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef(null);

  // Fetch playlist from the backend
  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const { data } = await axios.get('http://localhost:3500/api/music');
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
      display: isMinimized ? 'none' : 'block'
    }}>
      {/* Hidden Native Audio Element */}
      {track.url && (
        <audio
          ref={audioRef}
          src={`http://localhost:3500${track.url}`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={() => {
            console.log('Error playing audio, skipping to next');
            if(playlist.length > 1) handleNext();
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <FaMusic style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>Telugu FM</span>
          </div>
          <button onClick={() => setIsMinimized(true)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
            <FaMinus size={10} />
          </button>
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
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
