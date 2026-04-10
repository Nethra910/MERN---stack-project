import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, MessageSquare, User, Users, Phone,
  FileText, Settings, Star, Archive, LogOut, ChevronDown, Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import { useChatRequest } from '../context/ChatRequestContext';
import GlobalSearch from './GlobalSearch';
import ChatRequestsPanel from './ChatRequestsPanel';

const menuItems = [
  { id: 'dashboard', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
  { id: 'friends', label: 'Friends', icon: Users, path: '/friends' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  { id: 'contacts', label: 'Contacts', icon: Users, path: '/contacts' },
  { id: 'calls', label: 'Calls', icon: Phone, path: '/calls' },
  { id: 'files', label: 'Files', icon: FileText, path: '/files' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function ModernSidebar() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  });
  const [showProfile, setShowProfile] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const requestBellRef = useRef(null);

  const { totalUnread } = useChat();
  const { pendingCount } = useChatRequest();

  useEffect(() => {
    const handleStorageChange = () => {
      try { setUser(JSON.parse(localStorage.getItem('user') || '{}')); } catch { }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Close requests panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (requestBellRef.current && !requestBellRef.current.contains(e.target)) {
        setRequestsPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border flex flex-col h-screen transition-colors duration-200">

      {/* ─── Top bar: Search + Notifications ─────────── */}
      <div className="px-3 pt-4 pb-3 border-b border-gray-100 dark:border-dark-border space-y-2">
        {/* Global user search */}
        <GlobalSearch />

        {/* Request notification bell */}
        <div ref={requestBellRef} className="relative flex justify-end">
          <button
            onClick={() => setRequestsPanelOpen(v => !v)}
            className={`relative p-2 rounded-lg transition-colors ${
              requestsPanelOpen
                ? 'bg-[#DBEAFE] dark:bg-blue-900/30 text-[#2563EB]'
                : 'text-gray-500 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-hover'
            }`}
            title="Chat requests"
          >
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {requestsPanelOpen && (
              <ChatRequestsPanel onClose={() => setRequestsPanelOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── User profile ─────────────────────────────── */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-dark-border">
        <div
          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
          onClick={() => setShowProfile(!showProfile)}
        >
          <div className="relative">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt={user.name || 'User'}
                className="w-9 h-9 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-dark-card rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-dark-text text-sm truncate">{user.name || 'User'}</p>
            <p className="text-xs text-gray-400 dark:text-dark-muted truncate">{user.email || ''}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
        </div>

        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-1 px-2 py-2 bg-gray-50 dark:bg-dark-hover rounded-lg text-xs text-gray-600 dark:text-dark-muted space-y-1 overflow-hidden"
            >
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Navigation ───────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider px-3 mb-2">
          Main Menu
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const showMsgBadge = item.id === 'messages' && totalUnread > 0;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#DBEAFE] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400'
                    : 'text-gray-600 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                }`
              }
            >
              {({ isActive }) => (
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-gray-400 dark:text-dark-muted group-hover:text-gray-600 dark:group-hover:text-dark-text'}`} />
                    {showMsgBadge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-blue-400" />
                  )}
                </motion.div>
              )}
            </NavLink>
          );
        })}

        <div className="pt-3 pb-2">
          <div className="border-t border-gray-200 dark:border-dark-border" />
        </div>

        <div className="text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider px-3 mb-2">
          Quick Access
        </div>

        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition-all group">
          <Star className="w-5 h-5 text-gray-400 dark:text-dark-muted group-hover:text-yellow-500" />
          <span className="font-medium text-sm">Starred Messages</span>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-dark-hover px-1.5 py-0.5 rounded-full">0</span>
        </motion.button>

        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition-all group">
          <Archive className="w-5 h-5 text-gray-400 dark:text-dark-muted" />
          <span className="font-medium text-sm">Archived Chats</span>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-dark-hover px-1.5 py-0.5 rounded-full">0</span>
        </motion.button>
      </nav>

      {/* ─── Logout ───────────────────────────────────── */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-border">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (confirm('Are you sure you want to logout?')) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </motion.button>
        <p className="text-xs text-gray-400 dark:text-dark-muted text-center mt-3">MERN Chat v1.0.0</p>
      </div>
    </div>
  );
}