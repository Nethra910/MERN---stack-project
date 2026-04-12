/**
 * ChatHeaderCallButtons.jsx
 * 
 * Drop these two buttons into your existing ChatWindow.jsx or ChatHeader
 * wherever you render the top bar of the active conversation.
 * 
 * ─── INTEGRATION ──────────────────────────────────────────────────────────────
 * 
 * 1. In your ChatWindow.jsx (or wherever you show the active chat header):
 * 
 *    import ChatHeaderCallButtons from './ChatHeaderCallButtons';
 * 
 *    // Inside the header JSX, alongside the existing back/info buttons:
 *    <ChatHeaderCallButtons remoteUser={activeConversationUser} />
 * 
 * The `remoteUser` prop must include: { _id, name, avatar }
 * (same shape as your User model's public fields)
 */

import React from 'react';
import { useCall } from '../../context/CallContext';

const ChatHeaderCallButtons = ({ remoteUser }) => {
  const { initiateCall, callStatus } = useCall();
  const disabled = callStatus !== 'idle';

  const handleCall = (type) => {
    if (!remoteUser || disabled) return;
    initiateCall(remoteUser, type);
  };

  return (
    <div className="chat-call-btns">
      {/* Voice Call */}
      <button
        className="chat-call-btn"
        onClick={() => handleCall('audio')}
        disabled={disabled}
        aria-label="Voice call"
        title="Voice call"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </button>

      {/* Video Call */}
      <button
        className="chat-call-btn"
        onClick={() => handleCall('video')}
        disabled={disabled}
        aria-label="Video call"
        title="Video call"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
        </svg>
      </button>

      <style>{`
        .chat-call-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chat-call-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
        }

        .chat-call-btn:hover:not(:disabled) {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          transform: scale(1.05);
        }

        .chat-call-btn:active:not(:disabled) { transform: scale(0.95); }

        .chat-call-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ChatHeaderCallButtons;