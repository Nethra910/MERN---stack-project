import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    description: 'Dashboard overview',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: '💬',
    description: 'Chat with friends',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    description: 'Your profile settings',
  },
];

export default function Sidebar({
  activeSection,
  setActiveSection,
  sidebarOpen,
  setSidebarOpen,
}) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex-col shadow-xl"
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-700">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">MERN Chat</h1>
              <p className="text-xs text-slate-400">v1.0.0</p>
            </div>
          </motion.div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center font-bold">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeSection === item.id
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg'
                  : 'hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-slate-300/70">{item.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
          >
            Sign Out
          </motion.button>
          <p className="text-xs text-slate-400 text-center mt-3">
            © 2024 MERN Chat App
          </p>
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />

            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-xl z-50"
            >
              {/* Close Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg"
              >
                ✕
              </button>

              {/* Logo/Brand */}
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold">M</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">MERN Chat</h1>
                    <p className="text-xs text-slate-400">v1.0.0</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center font-bold">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-slate-300/70">{item.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Footer */}
              <div className="p-6 border-t border-slate-700 bg-slate-800/50">
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  }}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-sm"
                >
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}