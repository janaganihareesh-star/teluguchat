import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../context/SocketContext';
import { FaPhoneSlash, FaMicrophoneSlash, FaVideoSlash, FaMicrophone, FaVideo } from 'react-icons/fa';

const VideoCallModal = ({ caller, isReceivingCall, callData, onEndCall }) => {
  const { socket } = useSocket();
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
    };
  }, []);

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('answer-call', { signal: data, to: callData.from });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(callData.signal);
    connectionRef.current = peer;
  };

  const callUser = (idToCall) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('call-user', { userToCall: idToCall, signalData: data, from: socket.id });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    socket.on('call-accepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  // If initiating call immediately
  useEffect(() => {
    if (caller && !isReceivingCall && stream) {
      callUser(caller._id); // Assume caller has socket setup in backend mapped to _id
    }
  }, [caller, isReceivingCall, stream]);

  const leaveCall = () => {
    socket.emit('end-call', { to: callData?.from || caller?._id });
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    onEndCall();
  };

  useEffect(() => {
    socket.on('call-ended', leaveCall);
    return () => socket.off('call-ended', leaveCall);
  }, [socket]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
      setIsMuted(!stream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
      setIsVideoOff(!stream.getVideoTracks()[0].enabled);
    }
  };

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
        const screenTrack = screenStream.getTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        
        if (connectionRef.current) {
          connectionRef.current.replaceTrack(videoTrack, screenTrack, stream);
        }
        
        if (myVideo.current) {
          myVideo.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen sharing failed", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        const videoTrack = currentStream.getVideoTracks()[0];
        const screenTrack = myVideo.current.srcObject.getTracks()[0];
        
        if (connectionRef.current) {
          connectionRef.current.replaceTrack(screenTrack, videoTrack, stream);
        }
        
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
        setStream(currentStream);
        setIsScreenSharing(false);
      });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <h2>Video Call</h2>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px', borderRadius: '10px', background: '#333' }} />
        {callAccepted && (
          <video playsInline ref={userVideo} autoPlay style={{ width: '300px', borderRadius: '10px', background: '#333' }} />
        )}
      </div>

      {!callAccepted && isReceivingCall && (
        <div style={{ marginTop: '20px' }}>
          <p>Incoming call from {callData.name}...</p>
          <button onClick={answerCall} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', borderRadius: '5px', border: 'none', marginRight: '10px', cursor: 'pointer' }}>Answer</button>
          <button onClick={leaveCall} style={{ padding: '10px 20px', background: '#f44336', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Reject</button>
        </div>
      )}

      <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
        <button onClick={toggleMute} style={{ padding: '15px', borderRadius: '50%', background: isMuted ? '#f44336' : '#555', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <button onClick={toggleVideo} style={{ padding: '15px', borderRadius: '50%', background: isVideoOff ? '#f44336' : '#555', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
        </button>
        <button onClick={toggleScreenShare} style={{ padding: '15px', borderRadius: '50%', background: isScreenSharing ? '#4CAF50' : '#555', border: 'none', color: 'white', cursor: 'pointer' }}>
          💻
        </button>
        <button onClick={leaveCall} style={{ padding: '15px', borderRadius: '50%', background: '#f44336', border: 'none', color: 'white', cursor: 'pointer' }}>
          <FaPhoneSlash />
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;
