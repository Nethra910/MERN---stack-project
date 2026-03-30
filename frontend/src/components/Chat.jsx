import { ChatProvider } from '../context/ChatContext.jsx';
import ConversationList from './ConversationList.jsx';
import ChatWindow from './ChatWindow.jsx';

export default function Chat() {
  return (
    <ChatProvider>
      <div className="flex h-full relative">
        <div className="w-72 flex-shrink-0 h-full overflow-hidden relative">
          <ConversationList />
        </div>
        <div className="flex-1 flex h-full overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </ChatProvider>
  );
}
