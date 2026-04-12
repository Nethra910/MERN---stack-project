/**
 * IncomingCallModal.jsx
 * 
 * Global incoming call notification. Place this in your root layout
 * so it renders on ALL pages.
 * 
 * Usage: Add <IncomingCallModal /> inside <CallProvider> in App.jsx
 */

import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';

// ─── Ringtone using Web Audio API (no external files needed) ──────────────────
function useRingtone(active) {
  const audioCtx = useRef(null);
  const intervalRef = useRef(null);

  const playBeep = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.setValueAtTime(620, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  };

  useEffect(() => {
    if (active) {
      playBeep();
      intervalRef.current = setInterval(playBeep, 1500);
    }
    return () => {
      clearInterval(intervalRef.current);
    };
  }, [active]);
}

// ─── Component ────────────────────────────────────────────────────────────────
const IncomingCallModal = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  useRingtone(!!incomingCall);

  if (!incomingCall) return null;

  const { caller, callType } = incomingCall;

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        {/* Animated ring effect */}
        <div className="ring-container">
          <div className="ring-pulse ring-1" />
          <div className="ring-pulse ring-2" />
          <div className="ring-pulse ring-3" />
          <div className="avatar-circle">
            {caller.avatar ? (
              <img src={caller.avatar} alt={caller.name} className="caller-avatar" />
            ) : (
              <span className="caller-initial">{caller.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
        </div>

        <div className="caller-info">
          <p className="call-label">
            {callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
          </p>
          <h2 className="caller-name">{caller.name}</h2>
        </div>

        <div className="call-actions">
          <button className="btn-reject" onClick={rejectCall} aria-label="Reject call">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
              <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          <button className="btn-accept" onClick={acceptCall} aria-label="Accept call">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .incoming-call-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }

        .incoming-call-modal {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px;
          padding: 40px 32px;
          text-align: center;
          width: 320px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .ring-container {
          position: relative;
          width: 110px;
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ring-pulse {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(74, 222, 128, 0.4);
          animation: ringPulse 2s ease-out infinite;
        }
        .ring-1 { width: 110px; height: 110px; animation-delay: 0s; }
        .ring-2 { width: 90px;  height: 90px;  animation-delay: 0.4s; }
        .ring-3 { width: 70px;  height: 70px;  animation-delay: 0.8s; }

        @keyframes ringPulse {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .avatar-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ade80, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 1;
          flex-shrink: 0;
        }

        .caller-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .caller-initial {
          font-size: 32px;
          font-weight: 700;
          color: white;
        }

        .caller-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .call-label {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0;
        }

        .caller-name {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .call-actions {
          display: flex;
          gap: 40px;
          align-items: center;
          margin-top: 8px;
        }

        .btn-reject, .btn-accept {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .btn-reject {
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          color: white;
          box-shadow: 0 4px 20px rgba(239,68,68,0.4);
        }

        .btn-accept {
          background: linear-gradient(135deg, #4ade80, #16a34a);
          color: white;
          box-shadow: 0 4px 20px rgba(74,222,128,0.4);
        }

        .btn-reject:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(239,68,68,0.6); }
        .btn-accept:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(74,222,128,0.6); }
        .btn-reject:active, .btn-accept:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;