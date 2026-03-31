import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../context/ChatContext';

export default function MessageInput() {
  const { sendMessage, socket, currentConversation } = useChat();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', {
        conversationId: currentConversation?._id,
        userId: JSON.parse(localStorage.getItem('user') || '{}')._id,
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('stop-typing', {
        conversationId: currentConversation?._id,
      });
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    await sendMessage(input);
    setInput('');
    setIsTyping(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white p-4 flex gap-2"
    >
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Type a message..."
        disabled={!currentConversation}
        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="submit"
        disabled={!input.trim() || !currentConversation}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition"
      >
        Send
      </motion.button>
    </form>
  );
}