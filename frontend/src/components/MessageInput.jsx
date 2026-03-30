import { useState, useRef, useCallback } from 'react';
import useChat from '../hooks/useChat.js';

export default function MessageInput() {
  const [text, setText] = useState('');
  const { sendMessage, startTyping, stopTyping } = useChat();
  const typingTimeoutRef = useRef(null);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
    startTyping();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1500);
  }, [startTyping, stopTyping]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    stopTyping();
    clearTimeout(typingTimeoutRef.current);
    await sendMessage(content);
  }, [text, sendMessage, stopTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 bg-white">
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
        className="flex-1 px-3 py-2 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm max-h-32 overflow-y-auto"
        style={{ minHeight: '40px' }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </div>
  );
}
