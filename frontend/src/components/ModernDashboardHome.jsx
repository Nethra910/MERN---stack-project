import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export default function ModernDashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { conversations, onlineUsers } = useChat();

  const stats = [
    { 
      label: 'Total Chats', 
      value: conversations.length.toString(), 
      icon: MessageSquare, 
      color: 'blue',
      bgColor: 'bg-[#DBEAFE]',
      textColor: 'text-[#2563EB]',
      iconColor: 'text-[#2563EB]'
    },
    { 
      label: 'Active Users', 
      value: onlineUsers.size.toString(), 
      icon: Users, 
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconColor: 'text-green-500'
    },
    { 
      label: 'Today\'s Messages', 
      value: '0', 
      icon: TrendingUp, 
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      iconColor: 'text-purple-500'
    },
    { 
      label: 'Response Rate', 
      value: '100%', 
      icon: Activity, 
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      iconColor: 'text-orange-500'
    },
  ];

  const recentActivities = [
    { icon: CheckCircle, text: 'Account created successfully', time: '2 days ago', color: 'text-green-500' },
    { icon: MessageSquare, text: 'First conversation started', time: '1 day ago', color: 'text-[#2563EB]' },
    { icon: Users, text: 'Connected with new contacts', time: 'Today', color: 'text-purple-500' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#2563EB] to-purple-600 rounded-2xl p-8 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}! 👋</h1>
              <p className="text-blue-100 text-sm">
                You have {conversations.length} active conversation{conversations.length !== 1 ? 's' : ''} today
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-5xl">💬</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <button className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <Icon className={`w-5 h-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {recentActivities.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-[#DBEAFE] to-[#BFDBFE] hover:from-[#BFDBFE] hover:to-[#93C5FD] rounded-lg transition-all text-left group">
                <MessageSquare className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <p className="font-medium text-sm text-gray-900">New Message</p>
                  <p className="text-xs text-gray-500">Start a conversation</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all text-left group">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm text-gray-900">Find Contacts</p>
                  <p className="text-xs text-gray-500">Search for users</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all text-left group">
                <Activity className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm text-gray-900">View Stats</p>
                  <p className="text-xs text-gray-500">Analytics dashboard</p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-6">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '⚡', title: 'Real-time Messaging', desc: 'Instant delivery with WebSocket' },
              { icon: '👥', title: 'Group Conversations', desc: 'Chat with multiple users' },
              { icon: '✔️', title: 'Read Receipts', desc: 'Message status tracking' },
              { icon: '🔔', title: 'Online Presence', desc: 'Live user status' },
              { icon: '✍️', title: 'Typing Indicators', desc: 'Real-time feedback' },
              { icon: '🔒', title: 'Secure & Encrypted', desc: 'Privacy protected' },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="flex items-start gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">{feature.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
