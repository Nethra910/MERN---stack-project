import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  User, 
  Users, 
  Phone, 
  FileText, 
  Settings, 
  Star, 
  Archive,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useChat } from '../context/ChatContext';

const menuItems = [
  { id: 'dashboard', label: 'Home', icon: Home, description: 'Dashboard overview', path: '/dashboard' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, description: 'Chat conversations', path: '/messages' },
  { id: 'profile', label: 'Profile', icon: User, description: 'Account settings', path: '/profile' },
  { id: 'contacts', label: 'Contacts', icon: Users, description: 'Manage contacts', path: '/contacts' },
  { id: 'calls', label: 'Calls', icon: Phone, description: 'Call history', path: '/calls' },
  { id: 'files', label: 'Files', icon: FileText, description: 'Shared files', path: '/files' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'App preferences', path: '/settings' },
];

export default function ModernSidebar() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [showProfile, setShowProfile] = useState(false);
  const { totalUnread } = useChat();

  // Listen for localStorage changes (when profile picture is updated)
  useEffect(() => {
    const handleStorageChange = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border flex flex-col h-screen transition-colors duration-200">
      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-border">
        <div 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
          onClick={() => setShowProfile(!showProfile)}
        >
          <div className="relative">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name || 'User'}
                className="w-10 h-10 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-dark-card rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-dark-text text-sm truncate">{user.name || 'User'}</p>
            <p className="text-xs text-gray-500 dark:text-dark-muted truncate">{user.email || 'user@example.com'}</p>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 dark:text-dark-muted transition-transform ${showProfile ? 'rotate-180' : ''}`} 
          />
        </div>

        {/* Profile Dropdown */}
        {showProfile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-2 bg-gray-50 dark:bg-dark-hover rounded-lg text-xs text-gray-600 dark:text-dark-muted space-y-1"
          >
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>
            <div className="flex justify-between">
              <span>Member since:</span>
              <span className="font-medium">2024</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider px-3 mb-3">
          Main Menu
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const showBadge = item.id === 'messages' && totalUnread > 0;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                }`
              }
            >
              {({ isActive }) => (
                <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-dark-muted group-hover:text-gray-600 dark:group-hover:text-dark-text'}`}
                    />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </motion.div>
              )}
            </NavLink>
          );
        })}

        {/* Divider */}
        <div className="py-3">
          <div className="border-t border-gray-200 dark:border-dark-border"></div>
        </div>

        {/* Additional Sections */}
        <div className="text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider px-3 mb-3">
          Quick Access
        </div>
        
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-200 group"
        >
          <Star className="w-5 h-5 text-gray-400 dark:text-dark-muted group-hover:text-yellow-500" />
          <span className="font-medium text-sm">Starred Messages</span>
          <span className="ml-auto text-xs text-gray-400 dark:text-dark-muted bg-gray-100 dark:bg-dark-hover px-2 py-0.5 rounded-full">0</span>
        </motion.button>

        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-200 group"
        >
          <Archive className="w-5 h-5 text-gray-400 dark:text-dark-muted group-hover:text-gray-600 dark:group-hover:text-dark-text" />
          <span className="font-medium text-sm">Archived Chats</span>
          <span className="ml-auto text-xs text-gray-400 dark:text-dark-muted bg-gray-100 dark:bg-dark-hover px-2 py-0.5 rounded-full">0</span>
        </motion.button>

        <NavLink
          to="/settings"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-200 group"
        >
          <Settings className="w-5 h-5 text-gray-400 dark:text-dark-muted group-hover:text-gray-600 dark:group-hover:text-dark-text" />
          <span className="font-medium text-sm">Settings</span>
        </NavLink>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (confirm('Are you sure you want to logout?')) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-all duration-200 text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </motion.button>
        <p className="text-xs text-gray-400 dark:text-dark-muted text-center mt-3">
          MERN Chat v1.0.0
        </p>
      </div>
    </div>
  );
}
