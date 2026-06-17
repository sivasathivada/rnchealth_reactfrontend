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
  const [callMode, setCallMode] = useState('video'); // 'video' | 'audio'
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
  } = useWebRTC(sessionId);

  const [micEnabled, setMicEnabled]     = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [waitingTimeout, setWaitingTimeout] = useState(false);
  const initializedRef = useRef(false);

  // ─── Screen swap ──────────────────────────────────────────────────────────
  const handleToggleSwap = useCallback(() => {
    if (callStatus === 'connected') setIsSwapped(prev => !prev);
  }, [callStatus]);

  // ─── Fetch session details ────────────────────────────────────────────────
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await callSessionsAPI.detail(sessionId);
        setSessionDetails(response.data);
        // Always start in video mode
        setCallMode('video');
        setVideoEnabled(true);
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

  // ─── Bind local stream to <video> element ────────────────────────────────
  // Both video elements are ALWAYS mounted, so refs are always valid.
  // Re-run whenever the stream arrives or call state changes.
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef, callStatus]);

  // ─── Bind remote stream to <video> element ───────────────────────────────
  // Keeping the <video> always mounted means audio NEVER cuts out.
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef, callStatus]);

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
      // → Audio mode: disable video track
      setCallMode('audio');
      if (videoEnabled) {
        toggleMedia('video');
        setVideoEnabled(false);
      }
    } else {
      // → Video mode: re-enable video track
      setCallMode('video');
      if (!videoEnabled) {
        toggleMedia('video');
        setVideoEnabled(true);
      }
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
  // Show remote video when: connected, video mode, and remote hasn't disabled camera
  const showRemoteVideo =
    callStatus === 'connected' && callMode === 'video' && remoteVideoEnabled;

  // Show the audio/waiting UI over the main area when:
  // • Not yet connected, OR
  // • Connected but in audio mode (and not swapped to local full-screen)
  // • Connected but remote video is off (and not swapped)
  const showAudioUI =
    callStatus !== 'connected' ||
    (!isSwapped && (callMode === 'audio' || !remoteVideoEnabled));

  return (
    <div className="call-room">
      <div className="call-room-backdrop" />

      <div className="video-container">

        {/* ════════════════════════════════════════════════════════════════
            REMOTE VIDEO CONTAINER
            ─ Always mounted even in audio mode so the remote audio track
              keeps playing. Visual display is controlled by opacity so
              the <video> element stays in the DOM at all times.
            ─ Main (full-screen) when !isSwapped; PiP when isSwapped.
        ════════════════════════════════════════════════════════════════ */}
        <div
          className={isSwapped ? 'local-view' : 'remote-view'}
          style={{
            zIndex:  isSwapped ? 10 : 2,
            cursor:  callStatus === 'connected' ? 'pointer' : 'default',
          }}
          onClick={handleToggleSwap}
          title={callStatus === 'connected' ? 'Tap to switch views' : ''}
        >
          {/* ⚠️ Keep in DOM always — removing this kills remote audio */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={isSwapped ? 'pip-video' : 'main-video'}
            style={{
              opacity:   showRemoteVideo ? 1 : 0,
              transform: 'none',           // never mirror remote stream
            }}
          />

          {/* Avatar overlay when remote video is hidden */}
          {!showRemoteVideo && callStatus === 'connected' && !isSwapped && (
            <div className="remote-no-video-overlay">
              <div className="avatar-circle">
                <span>{getPartnerInitials()}</span>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            AUDIO / WAITING UI
            Shown on top of the main area whenever there's no video to
            display (audio mode, remote camera off, or still connecting).
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
            ─ Always mounted when connected so the localVideoRef is always
              valid and srcObject never needs to be re-bound from scratch.
            ─ PiP (small) when !isSwapped; main (full-screen) when isSwapped.
            ─ Camera opacity toggled rather than unmounting the element.
        ════════════════════════════════════════════════════════════════ */}
        {callStatus === 'connected' && (
          <div
            className={
              isSwapped
                ? 'remote-view'
                : `local-view ${!videoEnabled ? 'local-view-audio-mode' : ''}`
            }
            style={{
              zIndex: isSwapped ? 2 : 10,
              cursor: 'pointer',
            }}
            onClick={handleToggleSwap}
            title="Tap to switch views"
          >
            {/* Always mounted – opacity controls visibility */}
            <video
              ref={localVideoRef}
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
          onClick={() => { toggleMedia('audio'); setMicEnabled(m => !m); }}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* Camera toggle */}
        <button
          className={`control-btn ${!videoEnabled ? 'muted' : ''}`}
          onClick={() => { toggleMedia('video'); setVideoEnabled(v => !v); }}
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
