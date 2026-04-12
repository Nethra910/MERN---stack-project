/**
 * CallsList.jsx
 * 
 * Replaces the existing Calls section in the sidebar.
 * Shows call history, status badges, and allows re-calling.
 * 
 * Uses: GET /api/calls/history
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useCall } from '../../context/CallContext';

// ─── API helper (use your existing axios instance) ────────────────────────────
const fetchCallHistory = async () => {
  const res = await fetch('/api/calls/history', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  const data = await res.json();
  return data.data.calls;
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    completed: { label: 'Completed', color: '#4ade80' },
    missed:    { label: 'Missed',    color: '#ef4444' },
    rejected:  { label: 'Rejected',  color: '#f59e0b' },
    cancelled: { label: 'Cancelled', color: '#94a3b8' },
  };
  const { label, color } = config[status] || config.cancelled;
  return (
    <span style={{ color, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
      {label}
    </span>
  );
};

const CallTypeIcon = ({ type }) => (
  <span style={{ fontSize: '14px' }} title={type === 'video' ? 'Video call' : 'Voice call'}>
    {type === 'video' ? '📹' : '📞'}
  </span>
);

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatDuration = (secs) => {
  if (!secs) return '';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
};

// ─── Main component ────────────────────────────────────────────────────────────
const CallsList = ({ currentUserId }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { initiateCall, callStatus } = useCall();

  const loadCalls = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCallHistory();
      setCalls(data);
    } catch (err) {
      setError('Could not load call history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const handleRecall = (call) => {
    if (callStatus !== 'idle') return;
    const remoteUser = call.caller._id === currentUserId ? call.receiver : call.caller;
    initiateCall(remoteUser, call.type);
  };

  if (loading) return (
    <div className="calls-list-container">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-item">
          <div className="skeleton-avatar" />
          <div className="skeleton-lines">
            <div className="skeleton-line long" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="calls-error">
      <span>⚠️</span>
      <p>{error}</p>
      <button onClick={loadCalls}>Retry</button>
    </div>
  );

  if (calls.length === 0) return (
    <div className="calls-empty">
      <span className="calls-empty-icon">📵</span>
      <p>No call history yet</p>
    </div>
  );

  return (
    <div className="calls-list-container">
      {calls.map((call) => {
        const isCaller = call.caller._id === currentUserId;
        const remote = isCaller ? call.receiver : call.caller;
        const directionIcon = isCaller ? '↗' : '↙';
        const directionColor = isCaller ? '#60a5fa' : (call.status === 'missed' ? '#ef4444' : '#4ade80');

        return (
          <div
            key={call._id}
            className="call-item"
            onClick={() => handleRecall(call)}
            title={`Re-call ${remote.name}`}
          >
            {/* Avatar */}
            <div className="call-avatar">
              {remote.avatar ? (
                <img src={remote.avatar} alt={remote.name} />
              ) : (
                <span>{remote.name?.[0]?.toUpperCase()}</span>
              )}
              <div
                className="direction-badge"
                style={{ background: directionColor }}
              >
                {directionIcon}
              </div>
            </div>

            {/* Info */}
            <div className="call-info">
              <div className="call-info-top">
                <span className="call-remote-name">{remote.name}</span>
                <span className="call-time">{formatTime(call.createdAt)}</span>
              </div>
              <div className="call-info-bottom">
                <CallTypeIcon type={call.type} />
                <StatusBadge status={call.status} />
                {call.duration > 0 && (
                  <span className="call-duration">{formatDuration(call.duration)}</span>
                )}
              </div>
            </div>

            {/* Recall button */}
            <button
              className="recall-btn"
              onClick={(e) => { e.stopPropagation(); handleRecall(call); }}
              title={`${call.type === 'video' ? 'Video' : 'Voice'} call ${remote.name}`}
              disabled={callStatus !== 'idle'}
            >
              {call.type === 'video' ? '📹' : '📞'}
            </button>
          </div>
        );
      })}

      <style>{`
        .calls-list-container {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          height: 100%;
          padding: 8px 0;
        }

        .call-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          border-radius: 10px;
          margin: 0 8px 2px;
          transition: background 0.15s ease;
        }

        .call-item:hover { background: rgba(255,255,255,0.06); }

        .call-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ade80, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
        }

        .call-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .call-avatar span {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .direction-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: white;
          font-weight: 700;
          border: 2px solid #1a1a2e;
        }

        .call-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .call-info-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .call-remote-name {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .call-time {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .call-info-bottom {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .call-duration {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin-left: 2px;
        }

        .recall-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease;
        }

        .call-item:hover .recall-btn { opacity: 1; }
        .recall-btn:hover { background: rgba(74,222,128,0.2); }
        .recall-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Skeletons */
        .skeleton-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          margin: 0 8px 2px;
        }

        .skeleton-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          flex-shrink: 0;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }

        .skeleton-line {
          height: 10px;
          border-radius: 5px;
          background: rgba(255,255,255,0.08);
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-line.long { width: 70%; }
        .skeleton-line.short { width: 40%; }

        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }

        /* Empty & error states */
        .calls-empty, .calls-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 200px;
          color: rgba(255,255,255,0.4);
          font-size: 14px;
          text-align: center;
        }

        .calls-empty-icon { font-size: 40px; }

        .calls-error button {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 6px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default CallsList;