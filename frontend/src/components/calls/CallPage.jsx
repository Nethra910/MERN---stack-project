/**
 * CallPage.jsx
 * 
 * Active call screen. Displays remote video (full screen),
 * local video (picture-in-picture), and call controls.
 * 
 * Route: /calls/active
 * Protected: yes (redirect to home if no active call)
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCall } from '../../context/CallContext';
import CallControls from './CallControls';

// Format seconds → mm:ss
const formatDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const CallPage = () => {
  const navigate = useNavigate();
  const {
    callStatus,
    callType,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    isConnecting,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Guard: redirect if no active call
  useEffect(() => {
    if (callStatus === 'idle') {
      navigate('/', { replace: true });
    }
  }, [callStatus, navigate]);

  const statusLabel = {
    calling: 'Calling...',
    ringing: 'Connecting...',
    in_call: formatDuration(callDuration),
  }[callStatus] || '';

  return (
    <div className="call-page">
      {/* ── Remote video / audio-only view ─────────────────────────────────── */}
      <div className="remote-area">
        {callType === 'video' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            className="remote-video"
            autoPlay
            playsInline
          />
        ) : (
          <div className="audio-only-bg">
            <div className="remote-avatar-large">
              {remoteUser?.avatar ? (
                <img src={remoteUser.avatar} alt={remoteUser.name} />
              ) : (
                <span>{remoteUser?.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </div>
        )}

        {/* Connecting / calling overlay */}
        {(callStatus === 'calling' || callStatus === 'ringing' || isConnecting) && (
          <div className="connecting-overlay">
            <div className="connecting-spinner" />
          </div>
        )}

        {/* Remote user info & timer */}
        <div className="remote-info">
          <h2 className="remote-name">{remoteUser?.name}</h2>
          <span className="call-status-label">{statusLabel}</span>
        </div>
      </div>

      {/* ── Local video (PiP) ───────────────────────────────────────────────── */}
      {callType === 'video' && (
        <div className="local-video-pip">
          <video
            ref={localVideoRef}
            className="local-video"
            autoPlay
            playsInline
            muted
          />
          {isVideoOff && (
            <div className="video-off-overlay">
              <span>📷 Off</span>
            </div>
          )}
        </div>
      )}

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        callType={callType}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onEndCall={endCall}
      />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .call-page {
          position: fixed;
          inset: 0;
          background: #0a0a0f;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        /* ── Remote area ─────────────────────────────────────────────────────── */
        .remote-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .audio-only-bg {
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a0f 70%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 24px;
        }

        .remote-avatar-large {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ade80, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 0 60px rgba(74,222,128,0.2);
          animation: avatarPulse 2s ease-in-out infinite;
        }

        @keyframes avatarPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(74,222,128,0.2); }
          50%       { box-shadow: 0 0 80px rgba(74,222,128,0.4); }
        }

        .remote-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remote-avatar-large span {
          font-size: 56px;
          font-weight: 700;
          color: white;
        }

        /* ── Connecting overlay ────────────────────────────────────────────────── */
        .connecting-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .connecting-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255,255,255,0.15);
          border-top-color: #4ade80;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Remote info overlay ───────────────────────────────────────────────── */
        .remote-info {
          position: absolute;
          top: 24px;
          left: 0;
          right: 0;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
          pointer-events: none;
        }

        .remote-name {
          font-size: 22px;
          font-weight: 600;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }

        .call-status-label {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.05em;
        }

        /* ── Local PiP ─────────────────────────────────────────────────────────── */
        .local-video-pip {
          position: absolute;
          top: 80px;
          right: 20px;
          width: 120px;
          height: 180px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          cursor: grab;
          z-index: 10;
          background: #1a1a2e;
        }

        .local-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* Mirror effect */
        }

        .video-off-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          gap: 4px;
        }

        /* ── Responsive ─────────────────────────────────────────────────────────── */
        @media (max-width: 480px) {
          .local-video-pip { width: 90px; height: 135px; top: 70px; right: 12px; }
          .remote-avatar-large { width: 110px; height: 110px; }
          .remote-avatar-large span { font-size: 44px; }
        }
      `}</style>
    </div>
  );
};

export default CallPage;