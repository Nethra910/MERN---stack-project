import { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import DashboardHome from '../components/DashboardHome.jsx';
import Chat from '../components/Chat.jsx';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('home');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="flex-1 flex flex-col overflow-hidden md:ml-0">
        {activeSection === 'home' && (
          <div className="flex-1 overflow-y-auto">
            <DashboardHome />
          </div>
        )}
        {activeSection === 'chat' && (
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        )}
      </main>
    </div>
  );
}
