import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../context/SocketContext';
import { FaPhoneSlash, FaMicrophoneSlash, FaVideoSlash, FaMicrophone, FaVideo, FaUserCheck } from 'react-icons/fa';

const GroupCallModal = ({ group, currentUser, onEndCall }) => {
  const { socket } = useSocket();
  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  
  const myVideo = useRef();
  const peersRef = useRef([]);
  const isAdmin = group.admin?._id === currentUser._id || group.admin === currentUser._id;

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }

        if (isAdmin) {
          socket.emit('start-group-call', group._id);
        } else {
          socket.emit('request-join-group-call', { groupId: group._id, user: currentUser });
        }
      });

    socket.on('user-requested-join', (user) => {
      if (isAdmin) {
        setIncomingRequests(prev => [...prev, user]);
      }
    });

    socket.on('join-request-accepted', (adminId) => {
      const peer = createPeer(adminId, socket.id, stream);
      peersRef.current.push({ peerID: adminId, peer });
      setPeers(prev => [...prev, peer]);
    });

    socket.on('receiving-returned-signal', payload => {
      const item = peersRef.current.find(p => p.peerID === payload.id);
      if (item && item.peer) {
        item.peer.signal(payload.signal);
      }
    });

    socket.on('user-joined-call', payload => {
      const peer = addPeer(payload.signal, payload.callerID, stream);
      peersRef.current.push({ peerID: payload.callerID, peer });
      setPeers(prev => [...prev, peer]);
    });

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      peersRef.current.forEach(p => p.peer.destroy());
      socket.emit('leave-group-call', group._id);
      socket.off('user-requested-join');
      socket.off('join-request-accepted');
      socket.off('receiving-returned-signal');
      socket.off('user-joined-call');
    };
  }, []);

  const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', signal => {
      socket.emit('sending-signal', { userToSignal, callerID, signal });
    });
    return peer;
  };

  const addPeer = (incomingSignal, callerID, stream) => {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', signal => {
      socket.emit('returning-signal', { signal, callerID });
    });
    peer.signal(incomingSignal);
    return peer;
  };

  const acceptRequest = (userId) => {
    socket.emit('accept-join-request', { groupId: group._id, userId });
    setIncomingRequests(prev => prev.filter(u => u._id !== userId));
  };

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

  const leaveCall = () => {
    onEndCall();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', flexDirection: 'column', color: 'white', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>{group.name} - Group Call</h2>
      {isAdmin && <p style={{ textAlign: 'center', color: '#4ade80' }}>You are the Admin. Managing calls.</p>}
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', flex: 1, alignContent: 'center', overflowY: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <video playsInline muted ref={myVideo} autoPlay style={{ width: '250px', borderRadius: '15px', background: '#333', border: '2px solid #6366f1' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>You</div>
        </div>
        
        {peers.map((peer, index) => {
          return <Video key={index} peer={peer} />;
        })}
      </div>

      {isAdmin && incomingRequests.length > 0 && (
        <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px', backdropFilter: 'blur(10px)' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Join Requests</h4>
          {incomingRequests.map(u => (
            <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span>{u.username}</span>
              <button onClick={() => acceptRequest(u._id)} style={{ padding: '5px 10px', background: '#4CAF50', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}><FaUserCheck /></button>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <button onClick={toggleMute} style={{ padding: '15px', borderRadius: '50%', background: isMuted ? '#f44336' : '#555', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <button onClick={toggleVideo} style={{ padding: '15px', borderRadius: '50%', background: isVideoOff ? '#f44336' : '#555', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
        </button>
        <button onClick={leaveCall} style={{ padding: '15px', borderRadius: '50%', background: '#f44336', border: 'none', color: 'white', cursor: 'pointer' }}>
          <FaPhoneSlash />
        </button>
      </div>
    </div>
  );
};

const Video = ({ peer }) => {
  const ref = useRef();
  useEffect(() => {
    peer.on('stream', stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);
  return <video playsInline autoPlay ref={ref} style={{ width: '250px', borderRadius: '15px', background: '#333' }} />;
};

export default GroupCallModal;
