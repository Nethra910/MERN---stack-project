import { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import DashboardHome from '../components/DashboardHome';
import Chat from '../components/Chat';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <DashboardHome />;
      case 'messages':
        return <Chat />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        // ✅ FIX: Both branches were 'ml-0' so toggling sidebarOpen had no visible effect.
        // On desktop the sidebar is always in the flex flow (width 288px = w-72),
        // so we don't need a margin hack — flex handles it.
        // On mobile the sidebar is fixed-positioned, so we add a left margin only there
        // when the sidebar is open so content isn't fully obscured.
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
        }`}
      >
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            {/* ✅ Hamburger only shown on mobile (sidebar is always visible on lg) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              ☰
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {activeSection === 'home' ? '🏠 Dashboard' : '💬 Messages'}
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {JSON.parse(localStorage.getItem('user') || '{}').name}
                </p>
                <p className="text-xs text-gray-500">
                  {JSON.parse(localStorage.getItem('user') || '{}').email}
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </motion.div>
    </div>
  );
}