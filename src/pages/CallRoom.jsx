import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTCSocket } from '../context/WebRTCContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { callSessionsAPI } from '../services/api';
import { PhoneOff, Mic, MicOff, Video, VideoOff, PhoneCall } from 'lucide-react';
import './CallRoom.css';

const CallRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { isConnected, joinCallRoom } = useWebRTCSocket();

  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [timer, setTimer] = useState(0);

  // WhatsApp-style: tap to swap local ↔ remote full-screen
  const [isSwapped, setIsSwapped] = useState(false);

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
    callMode,
    videoEnabled,
    micEnabled,
    changeCallMode
  } = useWebRTC(sessionId);

  const remoteAudioRef = useRef(null);

  const [waitingTimeout, setWaitingTimeout] = useState(false);
  const initializedRef = useRef(false);

  // ─── Callback Refs for Stream Binding & Playback ─────────────────────────
  // Using callback refs ensures that as soon as the DOM nodes mount,
  // we bind the streams and trigger browser playback to avoid blank/frozen frames.
  const setLocalVideo = useCallback((el) => {
    localVideoRef.current = el;
    if (el) {
      if (localStream) {
        if (el.srcObject !== localStream) {
          el.srcObject = localStream;
        }
        el.play().catch(err => console.warn('[CallRoom] Local video play error:', err));
      } else {
        el.srcObject = null;
      }
    }
  }, [localStream, localVideoRef]);

  const setRemoteVideo = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el) {
      if (remoteStream) {
        if (el.srcObject !== remoteStream) {
          el.srcObject = remoteStream;
        }
        el.play().catch(err => console.warn('[CallRoom] Remote video play error:', err));
      } else {
        el.srcObject = null;
      }
    }
  }, [remoteStream, remoteVideoRef]);

  const setRemoteAudio = useCallback((el) => {
    remoteAudioRef.current = el;
    if (el) {
      if (remoteStream) {
        if (el.srcObject !== remoteStream) {
          el.srcObject = remoteStream;
        }
        el.play().catch(err => console.warn('[CallRoom] Remote audio play error:', err));
      } else {
        el.srcObject = null;
      }
    }
  }, [remoteStream]);

  // ─── Screen swap ──────────────────────────────────────────────────────────
  // Swapping is only triggered when tapping the active PiP window.
  const handleLocalClick = () => {
    if (!isSwapped && callStatus === 'connected') {
      setIsSwapped(true);
    }
  };

  const handleRemoteClick = () => {
    if (isSwapped && callStatus === 'connected') {
      setIsSwapped(false);
    }
  };

  // ─── Fetch session details ────────────────────────────────────────────────
  // NOTE: callMode and videoEnabled are managed by useWebRTC hook — do NOT set them here.
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await callSessionsAPI.detail(sessionId);
        setSessionDetails(response.data);
      } catch (err) {
        console.error('[CallRoom] Failed to fetch session:', err);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // ─── Init: join room + start local stream when WS is ready ───────────────
  useEffect(() => {
    if (loadingSession || !isConnected || initializedRef.current) return;
    initializedRef.current = true;
    console.log('[CallRoom] WS ready – joining room and starting stream...');
    try {
      joinCallRoom(sessionId);
      startLocalStream(true); // always request video
    } catch (err) {
      console.error('[CallRoom] Initialization failed:', err);
      alert('Failed to initialize the call room. Please check your internet connection.');
    }
  }, [isConnected, loadingSession, sessionId, joinCallRoom, startLocalStream]);

  // ─── Backup Stream Binding Effects ───────────────────────────────────────
  // Runs if stream objects or status updates asynchronously after initial mount.
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, localVideoRef, callStatus]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
    if (remoteAudioRef.current && remoteStream) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, remoteVideoRef, callStatus]);

  // ─── Active Playback Resumers ────────────────────────────────────────────
  // Forces browsers to resume playback after toggling track.enabled state
  useEffect(() => {
    if (videoEnabled && localVideoRef.current) {
      localVideoRef.current.play().catch(err => {
        console.warn('[CallRoom] Error resuming local video:', err);
      });
    }
  }, [videoEnabled]);

  const showRemoteVideo =
    callStatus === 'connected' && callMode === 'video' && remoteVideoEnabled;

  useEffect(() => {
    if (showRemoteVideo && remoteVideoRef.current) {
      remoteVideoRef.current.play().catch(err => {
        console.warn('[CallRoom] Error resuming remote video:', err);
      });
    }
  }, [showRemoteVideo]);

  // ─── Call timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    let id;
    if (callStatus === 'connected') {
      id = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(id);
  }, [callStatus]);

  // ─── Waiting timeout (5 min) ──────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'connected') { setWaitingTimeout(false); return; }
    const t = setTimeout(() => setWaitingTimeout(true), 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [callStatus]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatTime = s => {
    const m  = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  /**
   * Switch between video and audio modes.
   * Uses track.enabled toggle so the WebRTC peer connection is NOT renegotiated —
   * the track stays in the connection (preserving signaling) but is muted/unmuted.
   */
  const handleSwitchMode = () => {
    if (callMode === 'video') {
      changeCallMode('audio');
    } else {
      changeCallMode('video');
    }
  };

  const getPartnerName = () => {
    if (!sessionDetails) return 'Healthcare Partner';
    if (isPatient) {
      const n = sessionDetails.consultant_name || 'Consultant';
      return n.startsWith('Dr.') ? n : `Dr. ${n}`;
    }
    return sessionDetails.patient_name || 'Patient';
  };

  const getPartnerInitials = () => {
    const name  = getPartnerName().replace(/^Dr\.\s+/i, '');
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  // ─── Disconnected screen ─────────────────────────────────────────────────
  if (callStatus === 'disconnected') {
    return (
      <div className="call-room disconnected-screen">
        <div className="disconnected-card">
          <h2>Call Ended</h2>
          <p>The call session has been terminated.</p>
          <button onClick={() => navigate(-1)} className="btn-dashboard">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Display flags ────────────────────────────────────────────────────────
  const showAudioUI =
    callStatus !== 'connected' ||
    (!isSwapped && (callMode === 'audio' || !remoteVideoEnabled));

  // Determine classes for swap states
  const remoteViewClassName = isSwapped
    ? `local-view ${!remoteVideoEnabled ? 'local-view-audio-mode' : ''}`
    : 'remote-view';

  const localViewClassName = isSwapped
    ? 'remote-view'
    : `local-view ${callMode === 'audio' || !videoEnabled ? 'local-view-audio-mode' : ''}`;

  return (
    <div className="call-room">
      <div className="call-room-backdrop" />

      {/* Hidden audio element dedicated to the remote stream to prevent cutouts */}
      <audio
        ref={setRemoteAudio}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      <div className="video-container">

        {/* ════════════════════════════════════════════════════════════════
            REMOTE VIDEO CONTAINER
            ─ Always mounted so remote audio track keeps playing.
            ─ Main (full-screen) when !isSwapped; PiP when isSwapped.
        ════════════════════════════════════════════════════════════════ */}
        <div
          className={remoteViewClassName}
          style={{
            zIndex:  isSwapped ? 10 : 2,
            cursor:  (callStatus === 'connected' && isSwapped) ? 'pointer' : 'default',
          }}
          onClick={handleRemoteClick}
          title={isSwapped ? 'Tap to switch views' : ''}
        >
          <video
            ref={setRemoteVideo}
            autoPlay
            playsInline
            className={isSwapped ? 'pip-video' : 'main-video'}
            style={{
              opacity:   showRemoteVideo ? 1 : 0,
              transform: 'none',           // never mirror remote stream
            }}
          />

          {/* Avatar overlay when remote video is hidden (camera off / audio mode) */}
          {!showRemoteVideo && callStatus === 'connected' && !showAudioUI && (
            <div className="remote-no-video-overlay">
              <div className="avatar-circle">
                <span>{getPartnerInitials()}</span>
              </div>
            </div>
          )}

          {/* Name badge always visible on remote stream during video call */}
          {showRemoteVideo && callStatus === 'connected' && !isSwapped && (
            <div className="remote-name-badge">
              <span>{getPartnerName()}</span>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            AUDIO / WAITING UI
            Shown on top of the main area when there is no video to display.
        ════════════════════════════════════════════════════════════════ */}
        {showAudioUI && (
          <div className="audio-call-ui" style={{ zIndex: 4 }}>
            <div className="avatar-wrapper">
              <div className="pulsing-halo ring-1" />
              <div className="pulsing-halo ring-2" />
              <div className="pulsing-halo ring-3" />
              <div className="avatar-circle">
                <span>{getPartnerInitials()}</span>
              </div>
            </div>
            <h2 className="partner-name">{getPartnerName()}</h2>
            <div className="call-status-subtitle">
              {callStatus !== 'connected' ? (
                <span className="connecting-text">
                  {isPatient
                    ? 'Connecting to consultant...'
                    : waitingTimeout
                      ? 'The other participant has not joined yet. Please stay on the line...'
                      : 'Waiting for participant to join...'}
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

        {/* ════════════════════════════════════════════════════════════════
            LOCAL VIDEO CONTAINER
            ─ Always mounted when connected so local stream stays bound.
            ─ PiP (small) when !isSwapped; main (full-screen) when isSwapped.
        ════════════════════════════════════════════════════════════════ */}
        {callStatus === 'connected' && (
          <div
            className={localViewClassName}
            style={{
              zIndex: isSwapped ? 2 : 10,
              cursor: (callStatus === 'connected' && !isSwapped) ? 'pointer' : 'default',
            }}
            onClick={handleLocalClick}
            title={!isSwapped ? 'Tap to switch views' : ''}
          >
            <video
              ref={setLocalVideo}
              autoPlay
              playsInline
              muted
              className={isSwapped ? 'main-video' : 'pip-video'}
              style={{
                opacity:   videoEnabled ? 1 : 0,
                transform: 'scaleX(-1)',  // always mirror local camera
              }}
            />

            {/* "Me" avatar when camera is off */}
            {!videoEnabled && (
              <div className="local-avatar-pip local-avatar-absolute">
                <span>Me</span>
              </div>
            )}

            {/* Always-visible local name label */}
            <div className="local-name-badge">Me</div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CALL DURATION TIMER (video mode only — top-center overlay)
        ════════════════════════════════════════════════════════════════ */}
        {callStatus === 'connected' && callMode === 'video' && (
          <div className="call-timer-overlay">{formatTime(timer)}</div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          FLOATING CONTROL DOCK
      ════════════════════════════════════════════════════════════════ */}
      <div className="call-controls-floating">
        {/* Mic toggle */}
        <button
          className={`control-btn ${!micEnabled ? 'muted' : ''}`}
          onClick={() => toggleMedia('audio')}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* Camera toggle */}
        <button
          className={`control-btn ${!videoEnabled ? 'muted' : ''}`}
          onClick={() => toggleMedia('video')}
          title={videoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        {/* Audio ↔ Video mode switcher */}
        <button
          className={`control-btn ${callMode === 'audio' ? 'active-audio' : ''}`}
          onClick={handleSwitchMode}
          title={callMode === 'video' ? 'Switch to Audio Call' : 'Switch to Video Call'}
        >
          {callMode === 'video' ? <PhoneCall size={22} /> : <Video size={22} />}
        </button>

        {/* End call */}
        <button
          className="control-btn end-call"
          onClick={endCall}
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallRoom;
