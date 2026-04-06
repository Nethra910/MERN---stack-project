import { useState } from 'react';
import ModernSidebar from '../components/ModernSidebar';
import ModernDashboardHome from '../components/ModernDashboardHome';
import ModernChat from '../components/ModernChat';
import ModernProfileNew from '../components/ModernProfileNew';
import Settings from '../components/Settings';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('home');

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <ModernDashboardHome />;
      case 'messages':
        return <ModernChat />;
      case 'profile':
        return <ModernProfileNew />;
      case 'contacts':
        return <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-dark-muted">Contacts section coming soon...</p></div>;
      case 'calls':
        return <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-dark-muted">Calls section coming soon...</p></div>;
      case 'files':
        return <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-dark-muted">Files section coming soon...</p></div>;
      case 'settings':
        return <Settings />;
      default:
        return <ModernDashboardHome />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg overflow-hidden transition-colors duration-200">
      {/* Left Sidebar */}
      <ModernSidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}