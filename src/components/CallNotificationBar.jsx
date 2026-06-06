import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTCSocket } from '../context/WebRTCContext';
import { Phone, PhoneOff, Video, Mic, Volume2 } from 'lucide-react';
import './CallNotificationBar.css';

export default function CallNotificationBar() {
  const { incomingCall, acceptCall, declineCall } = useWebRTCSocket();
  const navigate = useNavigate();

  // Play a soft ringtone or alert sound when incomingCall is present
  useEffect(() => {
    if (incomingCall) {
      // Audio cue for premium experience
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        
        // Ringing pattern
        setTimeout(() => {
          try { osc.stop(); } catch (e) {}
        }, 1200);
      } catch (e) {
        console.warn('Audio ringtone failed to start due to browser policy:', e);
      }
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const callerName = incomingCall.caller_name || incomingCall.patient_name || 'Healthcare Partner';
  const callerRole = incomingCall.caller_role || 'user';
  const callType = incomingCall.call_type || 'video';
  const sessionId = incomingCall.session_id;

  const handleAccept = () => {
    console.log('[CallBar] Accepting call session:', sessionId);
    acceptCall(sessionId);
    navigate(`/call/${sessionId}`);
  };

  const handleDecline = () => {
    console.log('[CallBar] Declining call session:', sessionId);
    declineCall(sessionId, 'user_declined');
  };

  return (
    <div className="call-notification-overlay">
      <div className="call-notification-bar animate-slideDown">
        <div className="call-bar-glass-highlight"></div>
        
        {/* Ringing Pulse Animation */}
        <div className="ringing-pulse-container">
          <div className="ringing-pulse-ring ring-1"></div>
          <div className="ringing-pulse-ring ring-2"></div>
          <div className="ringing-avatar-circle">
            {callType === 'audio' ? <Volume2 className="caller-type-icon" /> : <Video className="caller-type-icon" />}
          </div>
        </div>

        {/* Call Information */}
        <div className="call-info-section">
          <div className="call-role-badge">{callerRole.toUpperCase()}</div>
          <h3 className="caller-title-name">
            {callerRole === 'consultant' && !callerName.startsWith('Dr.') ? `Dr. ${callerName}` : callerName}
          </h3>
          <p className="call-type-subtitle">
            Incoming {callType === 'audio' ? 'Audio' : 'Video'} Consultation Call...
          </p>
        </div>

        {/* Interactive Action Buttons */}
        <div className="call-actions-section">
          <button 
            className="call-btn-premium accept-call-btn" 
            onClick={handleAccept}
            title="Accept Call"
          >
            <Phone size={18} fill="currentColor" />
            <span>Accept</span>
          </button>
          
          <button 
            className="call-btn-premium decline-call-btn" 
            onClick={handleDecline}
            title="Decline Call"
          >
            <PhoneOff size={18} />
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
}
