import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import axios from 'axios';

const VoiceRecorder = ({ onVoiceRecorded, token }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isCancelled = useRef(false);
  const timerInterval = useRef(null);
  const audioStream = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  const startRecording = async (e) => {
    e.preventDefault();
    if (recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        if (isCancelled.current) {
          console.log('Recording cancelled, discarding chunks.');
          return;
        }
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        uploadAudio(audioBlob);
      };

      isCancelled.current = false;
      setDragOffset(0);
      setSeconds(0);
      navigator.vibrate?.(30);

      mediaRecorder.current.start();
      setRecording(true);

      timerInterval.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

      // Track touches for mobile swipe
      if (e.touches && e.touches[0]) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartX.current = e.clientX;
        touchStartY.current = e.clientY;
      }
    } catch (err) {
      console.error('Mic access denied', err);
    }
  };

  const handleDragMove = (clientX) => {
    if (!recording || touchStartX.current === null) return;
    const diffX = touchStartX.current - clientX;
    
    if (diffX > 0) {
      setDragOffset(Math.min(120, diffX));
      
      if (diffX >= 80 && !isCancelled.current) {
        triggerCancel();
      }
    }
  };

  const triggerCancel = () => {
    isCancelled.current = true;
    navigator.vibrate?.([15, 15]);
    stopRecording(true);
  };

  const stopRecording = (forcedCancel = false) => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      if (forcedCancel) {
        isCancelled.current = true;
      }
      mediaRecorder.current.stop();
      if (audioStream.current) {
        audioStream.current.getTracks().forEach((track) => track.stop());
      }
    }

    setRecording(false);
    setDragOffset(0);
    setSeconds(0);
    touchStartX.current = null;
    touchStartY.current = null;

    if (!isCancelled.current) {
      navigator.vibrate?.(25);
    }
  };

  const uploadAudio = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'voice.webm');
    try {
      const { data } = await axios.post('http://localhost:3500/api/upload/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      onVoiceRecorded(data.url);
    } catch (err) {
      console.error('Voice upload failed', err);
    }
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <button
        type="button"
        onMouseDown={startRecording}
        onMouseUp={() => stopRecording(false)}
        onTouchStart={startRecording}
        onTouchEnd={() => stopRecording(false)}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleDragMove(e.clientX);
        }}
        onTouchMove={(e) => {
          if (e.touches && e.touches[0]) handleDragMove(e.touches[0].clientX);
        }}
        className="p-2 transition relative flex items-center justify-center"
        style={{
          color: recording ? '#ef4444' : 'var(--text-muted, #64748b)',
          background: 'none',
          border: 'none',
          fontSize: '1.25rem',
          cursor: 'pointer',
          touchAction: 'none',
          zIndex: 60,
        }}
      >
        <FaMicrophone />
      </button>

      {/* Full-width Input Overlay */}
      {recording && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--bg-panel, #0f172a)',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 50px 0 20px',
            zIndex: 50,
            animation: 'fadeIn 0.15s ease-out',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.15)',
          }}
        >
          {/* Flashing Dot & Live Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                animation: 'pulse 1s infinite',
              }}
            />
            <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#ef4444', fontFamily: 'monospace' }}>
              {formatTime(seconds)}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main, rgba(255, 255, 255, 0.8))', marginLeft: '4px' }}>
              Recording...
            </span>
          </div>

          {/* Slide left cancellation text */}
          <div 
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted, rgba(255, 255, 255, 0.6))',
              fontWeight: '600',
              transform: `translateX(-${dragOffset}px)`,
              transition: 'transform 0.05s linear',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⬅ Cancel</span>
          </div>

          <style>{`
            @keyframes pulse {
              0% { opacity: 0.3; }
              50% { opacity: 1; }
              100% { opacity: 0.3; }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.98); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default VoiceRecorder;
