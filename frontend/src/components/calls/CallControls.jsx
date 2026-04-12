/**
 * CallControls.jsx
 * 
 * Floating control bar at the bottom of CallPage.
 * Handles: mute, video toggle, end call.
 */

import React from 'react';

const MicIcon = ({ muted }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    {muted ? (
      <>
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
      </>
    ) : (
      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
    )}
  </svg>
);

const VideoIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    {off ? (
      <path d="M21 6.5l-4-4-1.63 1.63L17 5.5V11l4 4V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM15 16H5V8h1.73l9 9H15v-1z"/>
    ) : (
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    )}
  </svg>
);

const PhoneEndIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.65 0 12.38c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
  </svg>
);

const CallControls = ({
  isMuted,
  isVideoOff,
  callType,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}) => (
  <div className="controls-bar">
    {/* Mute */}
    <button
      className={`ctrl-btn ${isMuted ? 'ctrl-active' : ''}`}
      onClick={onToggleMute}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      <MicIcon muted={isMuted} />
      <span className="ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
    </button>

    {/* Video toggle — only for video calls */}
    {callType === 'video' && (
      <button
        className={`ctrl-btn ${isVideoOff ? 'ctrl-active' : ''}`}
        onClick={onToggleVideo}
        aria-label={isVideoOff ? 'Enable video' : 'Disable video'}
        title={isVideoOff ? 'Enable video' : 'Disable video'}
      >
        <VideoIcon off={isVideoOff} />
        <span className="ctrl-label">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
      </button>
    )}

    {/* End call */}
    <button
      className="ctrl-btn ctrl-end"
      onClick={onEndCall}
      aria-label="End call"
      title="End call"
    >
      <PhoneEndIcon />
      <span className="ctrl-label">End</span>
    </button>

    <style>{`
      .controls-bar {
        position: relative;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 20px 24px 28px;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
      }

      .ctrl-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        border: none;
        cursor: pointer;
        background: rgba(255,255,255,0.1);
        color: white;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        justify-content: center;
        transition: background 0.2s ease, transform 0.15s ease;
        position: relative;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.12);
      }

      .ctrl-btn:hover {
        background: rgba(255,255,255,0.18);
        transform: scale(1.05);
      }

      .ctrl-btn:active { transform: scale(0.96); }

      .ctrl-active {
        background: rgba(239,68,68,0.25) !important;
        border-color: rgba(239,68,68,0.4) !important;
        color: #fca5a5;
      }

      .ctrl-end {
        background: linear-gradient(135deg, #ef4444, #b91c1c) !important;
        border-color: transparent !important;
        box-shadow: 0 4px 20px rgba(239,68,68,0.5);
        width: 68px;
        height: 68px;
      }

      .ctrl-end:hover {
        box-shadow: 0 6px 28px rgba(239,68,68,0.7) !important;
      }

      .ctrl-label {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.03em;
        position: absolute;
        bottom: -20px;
        white-space: nowrap;
        color: rgba(255,255,255,0.7);
      }

      .controls-bar { padding-bottom: 48px; }
    `}</style>
  </div>
);

export default CallControls;