import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTCSocket } from '../context/WebRTCContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { callSessionsAPI } from '../services/api';
import { PhoneOff, Mic, MicOff, Video, VideoOff, PhoneCall, Volume2, Phone } from 'lucide-react';
import './CallRoom.css';

const CallRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isConnected, joinCallRoom } = useWebRTCSocket();
  
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [callMode, setCallMode] = useState('video'); // 'video' | 'audio'
  const [timer, setTimer] = useState(0);

  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    startLocalStream,
    toggleMedia,
    endCall,
    callStatus,
    isPatient,
    remoteVideoEnabled,
    remoteMicEnabled
  } = useWebRTC(sessionId);

  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [waitingTimeout, setWaitingTimeout] = useState(false);

  const initializedRef = useRef(false);

  // Fetch session details on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await callSessionsAPI.detail(sessionId);
        setSessionDetails(response.data);
        const type = response.data.call_type || 'video';
        setCallMode(type);
        setVideoEnabled(type === 'video');
      } catch (err) {
        console.error('[CallRoom] Error fetching call details:', err);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Join call room and start local media once WS is connected and session details are loaded
  useEffect(() => {
    if (loadingSession) return;
    
    if (!isConnected) {
      console.warn('WebSocket not connected, waiting...');
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log('WS Connected, joining room and initiating local stream...');
    try {
      joinCallRoom(sessionId);
      // Always connect default video call only
      const initialVideo = true;
      startLocalStream(initialVideo);
    } catch (err) {
      console.error('Failed to initialize call:', err);
      alert('Failed to initialize call room. Please check your internet connection.');
    }
  }, [isConnected, sessionId, joinCallRoom, startLocalStream, loadingSession, sessionDetails]);

  // Bind local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // Bind remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  // Active call timer
  useEffect(() => {
    let intervalId;
    if (callStatus === 'connected') {
      intervalId = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [callStatus]);

  // Waiting timeout timer (5 minutes)
  useEffect(() => {
    if (callStatus === 'connected') {
      setWaitingTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      setWaitingTimeout(true);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [callStatus]);

  // Format call duration
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Switch between Video Call and Audio Call layouts dynamically
  const handleSwitchMode = () => {
    if (callMode === 'video') {
      // Switch to Audio Call: turn off camera, notify remote
      setCallMode('audio');
      if (videoEnabled) {
        toggleMedia('video');
        setVideoEnabled(false);
      }
    } else {
      // Switch to Video Call: turn on camera, notify remote
      setCallMode('video');
      if (!videoEnabled) {
        toggleMedia('video');
        setVideoEnabled(true);
      }
    }
  };

  // Get partner's display name
  const getPartnerName = () => {
    if (!sessionDetails) return 'Healthcare Partner';
    if (isPatient) {
      const name = sessionDetails.consultant_name || 'Consultant';
      return name.startsWith('Dr.') ? name : `Dr. ${name}`;
    } else {
      return sessionDetails.patient_name || 'Patient';
    }
  };

  // Get partner's initials for the Avatar
  const getPartnerInitials = () => {
    const name = getPartnerName();
    const cleanName = name.replace(/^Dr\.\s+/i, '');
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  if (callStatus === 'disconnected') {
    return (
      <div className="call-room disconnected-screen">
        <div className="disconnected-card">
          <h2>Call Ended</h2>
          <p>The call session has been terminated.</p>
          <button onClick={() => navigate(-1)} className="btn-dashboard">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const showRemoteVideo = callMode === 'video' && remoteVideoEnabled && callStatus === 'connected';

  return (
    <div className="call-room">
      {/* Sleek Blue-Gray Gradient Backdrop */}
      <div className="call-room-backdrop"></div>

      {/* Main Calling Content Area */}
      <div className="video-container">
        {showRemoteVideo ? (
          // Full Screen Remote Video
          <div className="remote-view">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="main-video"
            />
          </div>
        ) : (
          // Skype/WhatsApp styled Audio Avatar UI
          <div className="audio-call-ui">
            <div className="avatar-wrapper">
              <div className="pulsing-halo ring-1"></div>
              <div className="pulsing-halo ring-2"></div>
              <div className="pulsing-halo ring-3"></div>
              <div className="avatar-circle">
                <span>{getPartnerInitials()}</span>
              </div>
            </div>
            <h2 className="partner-name">{getPartnerName()}</h2>
            <div className="call-status-subtitle">
              {callStatus !== 'connected' ? (
                <span className="connecting-text">
                  {isPatient 
                    ? "Connecting to consultant..." 
                    : (waitingTimeout 
                        ? "The other participant has not joined yet. Please stay on the line..." 
                        : "Waiting for participant to join...")}
                </span>
              ) : (
                <span>Voice Call • Connected</span>
              )}
            </div>
            {callStatus === 'connected' && (
              <div className="call-duration-timer">{formatTime(timer)}</div>
            )}
          </div>
        )}

        {/* Small floating local video Picture-in-Picture */}
        {callStatus === 'connected' && (
          <div className={`local-view ${callMode === 'audio' || !videoEnabled ? 'local-view-audio-mode' : ''}`}>
            {videoEnabled ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="pip-video" />
            ) : (
              <div className="local-avatar-pip">
                <span>Me</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating control action buttons */}
      <div className="call-controls-floating">
        {/* Toggle Mic */}
        <button 
          className={`control-btn ${!micEnabled ? 'muted' : ''}`}
          onClick={() => { toggleMedia('audio'); setMicEnabled(!micEnabled); }}
          title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* Toggle Camera (Always available so user can turn on/off) */}
        <button 
          className={`control-btn ${!videoEnabled ? 'muted' : ''}`}
          onClick={() => { toggleMedia('video'); setVideoEnabled(!videoEnabled); }}
          title={videoEnabled ? "Turn Camera Off" : "Turn Camera On"}
        >
          {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        {/* Dynamic Mode Switcher (Upgrade/Downgrade between Video & Audio layout) */}
        <button 
          className={`control-btn ${callMode === 'audio' ? 'active-audio' : ''}`}
          onClick={handleSwitchMode}
          title={callMode === 'video' ? "Switch to Audio Call" : "Switch to Video Call"}
        >
          {callMode === 'video' ? <PhoneCall size={22} /> : <Video size={22} />}
        </button>

        {/* End Call */}
        <button 
          className="control-btn end-call"
          onClick={() => { endCall(); }}
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallRoom;
