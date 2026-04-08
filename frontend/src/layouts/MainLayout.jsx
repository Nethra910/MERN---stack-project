import { Outlet } from 'react-router-dom';
import ModernSidebar from '../components/ModernSidebar';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg overflow-hidden transition-colors duration-200">
      <ModernSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
