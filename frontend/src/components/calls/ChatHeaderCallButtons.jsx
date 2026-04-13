/**
 * ChatHeaderCallButtons.jsx  (FIXED)
 *
 * Fix: button styles used rgba(255,255,255,0.08) which was invisible in
 * light mode. Replaced with Tailwind classes that correctly adapt to
 * the app's dark/light theme (matches the rest of ChatWindow.jsx).
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
    <div className="flex items-center gap-1.5">
      {/* Voice Call */}
      <button
        className={`
          flex items-center justify-content-center p-2 rounded-full border transition-all duration-150
          ${disabled
            ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-dark-hover border-gray-200 dark:border-dark-border text-gray-400 dark:text-dark-muted'
            : 'bg-gray-100 dark:bg-dark-hover border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 hover:scale-105 active:scale-95'
          }
        `}
        onClick={() => handleCall('audio')}
        disabled={disabled}
        aria-label="Voice call"
        title={disabled ? 'Already in a call' : 'Voice call'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </button>

      {/* Video Call */}
      <button
        className={`
          flex items-center justify-content-center p-2 rounded-full border transition-all duration-150
          ${disabled
            ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-dark-hover border-gray-200 dark:border-dark-border text-gray-400 dark:text-dark-muted'
            : 'bg-gray-100 dark:bg-dark-hover border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95'
          }
        `}
        onClick={() => handleCall('video')}
        disabled={disabled}
        aria-label="Video call"
        title={disabled ? 'Already in a call' : 'Video call'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
        </svg>
      </button>
    </div>
  );
};

export default ChatHeaderCallButtons;