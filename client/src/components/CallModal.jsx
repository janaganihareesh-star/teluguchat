import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { FaPhoneSlash, FaPhoneAlt } from 'react-icons/fa';
import { soundSystem } from '../utils/soundSystem';

const CallModal = ({ socket, currentUser, activeConv, callData, onEndCall }) => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    // Determine if we are initiating or receiving
    if (!callData) {
      // Initiating Call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;

        const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });

        peer.on('signal', (data) => {
          socket.emit('call-user', {
            userToCall: activeConv.participants.find(p => p._id !== currentUser._id)._id,
            signalData: data,
            from: currentUser._id,
            name: currentUser.username
          });
        });

        peer.on('stream', (currentStream) => {
          if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        socket.on('call-accepted', (signal) => {
          setCallAccepted(true);
          peer.signal(signal);
          soundSystem.callRing();
        });

        connectionRef.current = peer;
      }).catch(err => console.error(err));
    } else {
      // Receiving Call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;
        soundSystem.callRing();
      }).catch(err => console.error(err));
    }

    socket.on('call-ended', () => {
       setCallEnded(true);
       if (connectionRef.current) connectionRef.current.destroy();
       onEndCall();
    });

    return () => {
      socket.off('call-accepted');
      socket.off('call-ended');
    };
  }, [socket, currentUser, activeConv, callData, onEndCall]);

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('answer-call', { signal: data, to: callData.from });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) userVideo.current.srcObject = currentStream;
    });

    peer.signal(callData.signal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.destroy();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.emit('end-call', { 
      to: callData ? callData.from : activeConv.participants.find(p => p._id !== currentUser._id)._id 
    });
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {callData && !callAccepted ? `${callData.name} is calling...` : 'Video Call'}
        </h2>
        
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-6">
          <div className="relative bg-black rounded-lg overflow-hidden border border-gray-600 aspect-video md:w-1/2">
            {stream && (
              <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">You</div>
          </div>
          
          {callAccepted && !callEnded && (
            <div className="relative bg-black rounded-lg overflow-hidden border border-gray-600 aspect-video md:w-1/2">
              <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                {callData?.name || activeConv.participants.find(p => p._id !== currentUser._id).username}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-6">
          {callData && !callAccepted ? (
            <button onClick={answerCall} className="p-4 bg-green-500 hover:bg-green-600 rounded-full text-white transition shadow-[0_0_15px_rgba(34,197,94,0.5)]">
              <FaPhoneAlt size={24} />
            </button>
          ) : null}
          <button onClick={leaveCall} className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <FaPhoneSlash size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
