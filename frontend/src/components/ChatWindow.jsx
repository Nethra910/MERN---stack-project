import { useEffect, useRef } from 'react';
import useChat from '../hooks/useChat.js';
import MessageInput from './MessageInput.jsx';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow() {
  const { activeConversation, messages, currentUser, typingUsers, onlineUsers } = useChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a conversation</h3>
          <p className="text-gray-400 text-sm">Choose a conversation from the left or start a new one</p>
        </div>
      </div>
    );
  }

  const other = !activeConversation.isGroup
    ? activeConversation.participants?.find((p) => p._id !== currentUser?._id)
    : null;

  const isOtherOnline = other && onlineUsers.includes(other._id);
  const typingInfo = typingUsers[activeConversation._id];
  const displayName = activeConversation.isGroup ? activeConversation.groupName : other?.name || 'Unknown';

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${activeConversation.isGroup ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {activeConversation.isGroup ? '👥' : displayName.charAt(0).toUpperCase()}
          </div>
          {isOtherOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{displayName}</p>
          <p className="text-xs text-gray-500">
            {activeConversation.isGroup
              ? `${activeConversation.participants?.length || 0} members`
              : isOtherOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender?._id === currentUser?._id || msg.sender === currentUser?._id;
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md xl:max-w-lg`}>
                {!isOwn && activeConversation.isGroup && (
                  <p className="text-xs text-gray-500 mb-1 ml-1">{msg.sender?.name}</p>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    isOwn
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'} text-right`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {typingInfo && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
              <p className="text-xs text-gray-500">{typingInfo.userName} is typing...</p>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput />
    </div>
  );
}
