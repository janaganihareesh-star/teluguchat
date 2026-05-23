import React, { useState, useRef } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import axios from 'axios';

const VoiceRecorder = ({ onVoiceRecorded, token }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        uploadAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Mic access denied', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
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

  return (
    <button
      type="button"
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      className={`p-2 transition ${recording ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-slate-700'}`}
    >
      {recording ? <FaStop /> : <FaMicrophone />}
    </button>
  );
};

export default VoiceRecorder;
