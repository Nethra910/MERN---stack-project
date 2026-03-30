import { useState, useCallback } from 'react';
import { searchUsers } from '../api/chatApi.js';
import useChat from '../hooks/useChat.js';

export default function UserSearch({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const { createConversation, selectConversation } = useChat();

  const handleSearch = useCallback(async (value) => {
    setQuery(value);
    if (value.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUsers(value);
      setResults(res.data.data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleStartChat = async (user) => {
    const conversation = await createConversation({ participantId: user._id });
    if (conversation) {
      await selectConversation(conversation);
      onClose();
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-800">New Conversation</h3>
        <button
          onClick={onClose}
          className="ml-auto text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        autoFocus
      />
      <div className="mt-3 max-h-64 overflow-y-auto">
        {searching && (
          <p className="text-center text-gray-500 text-sm py-4">Searching...</p>
        )}
        {!searching && results.length === 0 && query.trim() !== '' && (
          <p className="text-center text-gray-500 text-sm py-4">No users found</p>
        )}
        {results.map((user) => (
          <button
            key={user._id}
            onClick={() => handleStartChat(user)}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-lg transition text-left"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
