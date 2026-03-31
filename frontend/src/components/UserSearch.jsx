import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import API from '../api/axios';

export default function UserSearch({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { createConversation } = useChat();

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await API.get(`/chat/search/${query}`);
      setResults(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (userId) => {
    await createConversation([userId]);
    onClose();
    setSearchQuery('');
    setResults([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 border-b border-gray-200"
    >
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        autoFocus
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 max-h-64 overflow-y-auto"
          >
            {results.map((user, idx) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelectUser(user._id)}
                className="p-3 bg-gray-50 rounded-lg mb-2 cursor-pointer hover:bg-gray-100 transition"
              >
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <p className="text-sm text-gray-400 mt-2">Searching...</p>
      )}
    </motion.div>
  );
}