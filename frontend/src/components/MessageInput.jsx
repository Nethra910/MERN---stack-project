import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';

export default function MessageInput() {
  const {
    sendMessage, editMessage,
    socket, currentConversation,
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
  } = useChat();

  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingRef               = useRef(null);
  const inputRef                = useRef(null);

  // When entering edit mode, prefill the input with existing content
  useEffect(() => {
    if (editingMessage) {
      setInput(editingMessage.content);
      inputRef.current?.focus();
    } else {
      setInput('');
    }
  }, [editingMessage]);

  // Focus on reply
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || user._id;

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', {
        conversationId: currentConversation?._id,
        userId,
      });
    }
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('stop-typing', { conversationId: currentConversation?._id });
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (editingMessage) {
      // Edit mode
      await editMessage(editingMessage._id, input);
    } else {
      // Send mode (replyingTo is read from context inside sendMessage)
      await sendMessage(input);
    }

    setInput('');
    setIsTyping(false);
    clearTimeout(typingRef.current);
    socket?.emit('stop-typing', { conversationId: currentConversation?._id });
  };

  const handleCancel = () => {
    setEditingMessage(null);
    setReplyingTo(null);
    setInput('');
  };

  const isEdit = !!editingMessage;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* ─── Reply / Edit banner ────────────────────── */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex items-center justify-between px-4 py-2 border-b ${
              isEdit ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-lg flex-shrink-0 ${isEdit ? 'text-amber-500' : 'text-blue-500'}`}>
                {isEdit ? '✏️' : '↩️'}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${isEdit ? 'text-amber-700' : 'text-blue-700'}`}>
                  {isEdit ? 'Editing message' : `Replying to ${replyingTo?.senderId?.name || 'message'}`}
                </p>
                <p className={`text-xs truncate ${isEdit ? 'text-amber-600' : 'text-blue-600'}`}>
                  {(isEdit ? editingMessage?.content : replyingTo?.content)?.slice(0, 60)}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className={`flex-shrink-0 p-1 rounded-full ${
                isEdit ? 'hover:bg-amber-200 text-amber-500' : 'hover:bg-blue-200 text-blue-500'
              } transition`}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Input row ──────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={
            !currentConversation
              ? 'Select a conversation...'
              : isEdit
              ? 'Edit your message...'
              : 'Type a message...'
          }
          disabled={!currentConversation}
          className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition disabled:bg-gray-50 disabled:text-gray-400 ${
            isEdit
              ? 'border-amber-300 focus:ring-2 focus:ring-amber-300 bg-amber-50'
              : 'border-gray-200 focus:ring-2 focus:ring-blue-300 bg-white'
          }`}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!input.trim() || !currentConversation}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition ${
            isEdit
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isEdit ? 'Save' : 'Send'}
        </motion.button>
      </form>
    </div>
  );
}