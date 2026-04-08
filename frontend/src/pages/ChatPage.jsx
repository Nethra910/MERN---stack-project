import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatWindow from '../components/ChatWindow';

export default function ChatPage() {
  const { chatId } = useParams();
  const { conversations, fetchConversations, setCurrentConversation, fetchMessages } = useChat();

  const activeConversation = useMemo(() => {
    return conversations.find((c) => String(c._id) === String(chatId)) || null;
  }, [conversations, chatId]);

  useEffect(() => {
    if (!conversations.length) {
      fetchConversations();
    }
  }, [conversations.length, fetchConversations]);

  useEffect(() => {
    if (activeConversation) {
      setCurrentConversation(activeConversation);
      fetchMessages(activeConversation._id);
    }
  }, [activeConversation, fetchMessages, setCurrentConversation]);

  if (!chatId) {
    return null;
  }

  return <ChatWindow />;
}
