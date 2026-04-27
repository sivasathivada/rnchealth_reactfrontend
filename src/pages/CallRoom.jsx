import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTCSocket } from '../context/WebRTCContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import './CallRoom.css';

const CallRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isConnected, joinCallRoom } = useWebRTCSocket();
  const {
    localVideoRef,
    remoteVideoRef,
    remoteStream,
    startLocalStream,
    toggleMedia,
    endCall,
    callStatus
  } = useWebRTC(sessionId);

  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [waitingTimeout, setWaitingTimeout] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      console.warn('WebSocket not connected, waiting...');
      return;
    }
    
    console.log('WS Connected, joining room and initiating local stream...');
    try {
      joinCallRoom(sessionId);
      startLocalStream(true);
    } catch (err) {
      console.error('Failed to initialize call:', err);
      alert('Failed to initialize call room. Please check your internet connection.');
    }
    
    const timer = setTimeout(() => {
      if (!remoteStream) {
        setWaitingTimeout(true);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearTimeout(timer);
  }, [isConnected, sessionId, joinCallRoom, startLocalStream, remoteStream]);

  if (callStatus === 'disconnected') {
    return (
      <div className="call-room disconnected-screen">
        <h2>Call Ended</h2>
        <p>The call session has been terminated.</p>
        <button onClick={() => navigate(-1)} className="btn-dashboard">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="call-room">
      <div className="video-container">
        {/* Remote Video is Main Focus */}
        <div className="remote-view">
          <video 
             ref={remoteVideoRef} 
             autoPlay 
             playsInline 
             className={`main-video ${!remoteStream ? 'hidden' : ''}`}
          />
          {!remoteStream && (
             <div className="waiting-overlay">
               <div className="loader-pulse"></div>
               <p>{waitingTimeout ? "consumer is not joined yet wait ...." : "Waiting for consumer to join..."}</p>
             </div>
          )}
        </div>

        {/* Local Video Picture-in-Picture */}
        <div className="local-view">
          <video ref={localVideoRef} autoPlay playsInline muted className="pip-video" />
        </div>
      </div>

      <div className="call-controls">
        <button 
          className={`control-btn ${!micEnabled ? 'muted' : ''}`}
          onClick={() => { toggleMedia('audio'); setMicEnabled(!micEnabled); }}
        >
          {micEnabled ? <Mic /> : <MicOff />}
        </button>
        
        <button 
          className="control-btn end-call"
          onClick={() => { endCall(); }}
        >
          <PhoneOff />
        </button>

        <button 
          className={`control-btn ${!videoEnabled ? 'muted' : ''}`}
          onClick={() => { toggleMedia('video'); setVideoEnabled(!videoEnabled); }}
        >
          {videoEnabled ? <Video /> : <VideoOff />}
        </button>
      </div>
    </div>
  );
};

export default CallRoom;
