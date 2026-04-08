import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import ConversationList from '../components/ConversationList';

export default function MessagesLayout() {
  const { fetchConversations } = useChat();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="flex h-full bg-white dark:bg-dark-card transition-colors">
      <div className="w-96 border-r border-gray-200 dark:border-dark-border flex flex-col bg-white dark:bg-dark-card">
        <div className="flex-1 overflow-y-auto">
          <ConversationList />
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors">
        <Outlet />
      </div>
    </div>
  );
}
