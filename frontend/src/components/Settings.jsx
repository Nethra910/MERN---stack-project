import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Bell, 
  BellOff, 
  Shield, 
  Palette,
  Eye,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { notificationsEnabled, toggleNotifications } = useChat();
  const [browserPermission, setBrowserPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const handleNotificationToggle = async () => {
    // If browser permission not granted, request it first
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        // Enable notifications after permission granted
        if (!notificationsEnabled) {
          toggleNotifications();
        }
      }
    } else if (browserPermission === 'granted') {
      // Toggle the app preference
      toggleNotifications();
    }
  };

  const getNotificationDescription = () => {
    if (browserPermission === 'denied') {
      return 'Notifications are blocked in browser settings. Please enable in browser.';
    }
    if (browserPermission === 'default') {
      return 'Click to request browser notification permission';
    }
    return notificationsEnabled 
      ? 'You will receive notifications for new messages'
      : 'Notifications are disabled. Click to enable.';
  };

  const settingsSections = [
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          id: 'theme',
          label: 'Dark Mode',
          description: isDark ? 'Dark theme is active' : 'Light theme is active',
          icon: isDark ? Moon : Sun,
          iconColor: isDark ? 'text-indigo-400' : 'text-yellow-500',
          action: toggleTheme,
          toggle: true,
          isActive: isDark
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          id: 'push-notifications',
          label: 'Push Notifications',
          description: getNotificationDescription(),
          icon: (notificationsEnabled && browserPermission === 'granted') ? Bell : BellOff,
          iconColor: (notificationsEnabled && browserPermission === 'granted') ? 'text-green-500' : 'text-gray-400',
          action: handleNotificationToggle,
          toggle: true,
          isActive: notificationsEnabled && browserPermission === 'granted',
          disabled: browserPermission === 'denied'
        }
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      items: [
        {
          id: 'read-receipts',
          label: 'Read Receipts',
          description: 'Let others know when you\'ve read their messages',
          icon: Eye,
          iconColor: 'text-blue-500',
          comingSoon: true
        },
        {
          id: 'two-factor',
          label: 'Two-Factor Authentication',
          description: 'Add an extra layer of security',
          icon: Lock,
          iconColor: 'text-purple-500',
          comingSoon: true
        }
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-dark-bg overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
          Manage your preferences and account settings
        </p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {settingsSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden"
              >
                {/* Section Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-center gap-3">
                  <SectionIcon className="w-5 h-5 text-gray-400 dark:text-dark-muted" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                </div>

                {/* Section Items */}
                <div className="divide-y divide-gray-100 dark:divide-dark-border">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={item.comingSoon ? undefined : item.action}
                        disabled={item.disabled || item.comingSoon}
                        whileHover={!item.comingSoon && !item.disabled ? { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' } : {}}
                        whileTap={!item.comingSoon && !item.disabled ? { scale: 0.995 } : {}}
                        className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-colors ${
                          item.comingSoon || item.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDark ? 'bg-dark-hover' : 'bg-gray-100'
                        }`}>
                          <ItemIcon className={`w-5 h-5 ${item.iconColor}`} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.label}
                            </span>
                            {item.comingSoon && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-dark-muted">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-dark-muted truncate">
                            {item.description}
                          </p>
                        </div>

                        {/* Toggle or Arrow */}
                        {item.toggle && !item.comingSoon ? (
                          <div 
                            className={`w-12 h-7 rounded-full p-1 transition-colors ${
                              item.isActive 
                                ? 'bg-blue-500' 
                                : 'bg-gray-300 dark:bg-dark-hover'
                            }`}
                          >
                            <motion.div
                              animate={{ x: item.isActive ? 20 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="w-5 h-5 rounded-full bg-white shadow-sm"
                            />
                          </div>
                        ) : !item.comingSoon ? (
                          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-dark-muted" />
                        ) : null}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}

          {/* App Info */}
          <div className="text-center py-6 text-sm text-gray-400 dark:text-dark-muted">
            <p>Auth Chat App v1.0</p>
            <p className="mt-1">Made with ❤️</p>
          </div>
        </div>
      </div>
    </div>
  );
}
