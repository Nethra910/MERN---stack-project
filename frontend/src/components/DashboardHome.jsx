import { motion } from 'framer-motion';

export default function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const stats = [
    { label: 'Messages', value: '0', icon: '💬', color: 'from-blue-400 to-blue-600' },
    { label: 'Friends', value: '0', icon: '👥', color: 'from-green-400 to-green-600' },
    { label: 'Groups', value: '0', icon: '👫', color: 'from-purple-400 to-purple-600' },
  ];

  return (
    <div className="p-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Welcome back, {user.name}! 👋
        </h2>
        <p className="text-gray-600">
          Stay connected with your friends through real-time messaging
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">{stat.label}</h3>
              <span className="text-3xl">{stat.icon}</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"
      >
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Getting Started</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg border border-[#2563EB]">
            <div className="text-3xl mb-3">💬</div>
            <h4 className="font-bold text-gray-800 mb-2">Start a Conversation</h4>
            <p className="text-gray-600 text-sm mb-4">
              Open the Messages tab and search for users to start chatting
            </p>
            <button className="text-[#2563EB] font-medium text-sm hover:text-[#1D4ED8] transition">
              Go to Messages →
            </button>
          </div>

          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="text-3xl mb-3">🌟</div>
            <h4 className="font-bold text-gray-800 mb-2">Real-time Updates</h4>
            <p className="text-gray-600 text-sm mb-4">
              See online status, typing indicators, and instant message delivery
            </p>
            <button className="text-green-600 font-medium text-sm hover:text-green-700 transition">
              Learn more →
            </button>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-8"
      >
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Features</h3>
        <div className="space-y-4">
          {[
            { icon: '⚡', title: 'Real-time Messaging', desc: 'Instant message delivery with WebSocket' },
            { icon: '👥', title: 'Group Chats', desc: 'Create groups and chat with multiple users' },
            { icon: '✔️', title: 'Read Receipts', desc: 'Know when your messages are read' },
            { icon: '🔔', title: 'Online Status', desc: 'See who is online in real-time' },
            { icon: '✍️', title: 'Typing Indicators', desc: 'See when others are typing' },
            { icon: '🔒', title: 'Secure & Private', desc: 'Your messages are encrypted' },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition"
            >
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <p className="font-medium text-gray-800">{feature.title}</p>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}