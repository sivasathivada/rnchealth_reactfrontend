import { useEffect, useState, useRef } from 'react';
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
    localStream,
    remoteStream,
    startLocalStream,
    toggleMedia,
    endCall,
    callStatus,
    isPatient
  } = useWebRTC(sessionId);

  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [waitingTimeout, setWaitingTimeout] = useState(false);

  // Guard: only initialise the room once per mount (prevents re-run when
  // remoteStream, joinCallRoom, or startLocalStream references change).
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      console.warn('WebSocket not connected, waiting...');
      return;
    }

    // Already set up — do NOT run again (avoids the reconnect loop caused
    // by remoteStream being a dependency in the old implementation).
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log('WS Connected, joining room and initiating local stream...');
    try {
      joinCallRoom(sessionId);
      startLocalStream(true);
    } catch (err) {
      console.error('Failed to initialize call:', err);
      alert('Failed to initialize call room. Please check your internet connection.');
    }
  }, [isConnected, sessionId, joinCallRoom, startLocalStream]);

  // Bind local stream to video element when stream is available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream to video element when stream is available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Separate effect: show "still waiting" message after 5 minutes with no connection.
  // This is intentionally isolated from the setup effect so it never triggers a re-join.
  useEffect(() => {
    if (callStatus === 'connected') {
      setWaitingTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      setWaitingTimeout(true);
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearTimeout(timer);
  }, [callStatus]);

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
             className={`main-video ${callStatus !== 'connected' ? 'hidden' : ''}`}
          />
          {callStatus !== 'connected' && (
             <div className="waiting-overlay">
               <div className="loader-pulse"></div>
               <p>
                 {isPatient 
                   ? "Connecting to consultant..." 
                   : (waitingTimeout 
                       ? "The other participant has not joined yet. Please stay on the line..." 
                       : "Waiting for the other participant to join...")}
               </p>
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
