import React, { useMemo } from 'react';
import CallsList from '../components/calls/CallsList';

export default function CallsPage() {
  // ✅ Same pattern as the rest of your app — read directly from localStorage
  const currentUserId = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user._id || user.id || '';
    } catch { return ''; }
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card transition-colors">
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">Calls</h1>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">
            Recent call history
          </p>
        </div>
      </div>

      {/* ── Call list ────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <CallsList currentUserId={currentUserId} />
      </div>
    </div>
  );
}