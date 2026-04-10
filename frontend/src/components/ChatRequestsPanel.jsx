import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, UserPlus } from 'lucide-react';
import { useChatRequest } from '../context/ChatRequestContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default function ChatRequestsPanel({ onClose }) {
  const { incomingRequests, outgoingRequests, acceptRequest, rejectRequest, cancelRequest, loading } = useChatRequest();
  const { fetchConversations } = useChat();
  const navigate = useNavigate();

  const handleAccept = async (requestId) => {
    try {
      const result = await acceptRequest(requestId);
      await fetchConversations();
      if (result?.conversationId) {
        navigate(`/messages/chat/${result.conversationId}`);
        onClose?.();
      }
    } catch { /* handled in context */ }
  };

  const hasAny = incomingRequests.length > 0 || outgoingRequests.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
        <h3 className="font-semibold text-gray-800 dark:text-dark-text text-sm">Chat Requests</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !hasAny ? (
          <div className="px-4 py-10 text-center">
            <UserPlus className="w-10 h-10 text-gray-300 dark:text-dark-border mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-dark-muted">No pending requests</p>
            <p className="text-xs text-gray-300 dark:text-dark-border mt-1">Search for people to start chatting</p>
          </div>
        ) : (
          <>
            {/* Incoming */}
            {incomingRequests.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                  Incoming ({incomingRequests.length})
                </p>
                <AnimatePresence>
                  {incomingRequests.map((req) => (
                    <motion.div
                      key={req._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {req.senderId?.profilePicture ? (
                          <img src={req.senderId.profilePicture} alt={req.senderId.name}
                            className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                            {(req.senderId?.name?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-dark-text truncate">{req.senderId?.name}</p>
                        <p className="text-xs text-gray-400 dark:text-dark-muted">{timeAgo(req.createdAt)}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAccept(req._id)}
                          className="p-1.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                          title="Accept"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => rejectRequest(req._id)}
                          className="p-1.5 bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-dark-muted rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Decline"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Outgoing */}
            {outgoingRequests.length > 0 && (
              <div className={incomingRequests.length > 0 ? 'border-t border-gray-100 dark:border-dark-border' : ''}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                  Sent ({outgoingRequests.length})
                </p>
                <AnimatePresence>
                  {outgoingRequests.map((req) => (
                    <motion.div
                      key={req._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {req.receiverId?.profilePicture ? (
                          <img src={req.receiverId.profilePicture} alt={req.receiverId.name}
                            className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                            {(req.receiverId?.name?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-dark-text truncate">{req.receiverId?.name}</p>
                        <p className="text-xs text-gray-400 dark:text-dark-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending · {timeAgo(req.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => cancelRequest(req._id)}
                        className="px-2.5 py-1 text-xs text-gray-400 hover:text-red-500 border border-gray-200 dark:border-dark-border rounded-lg hover:border-red-300 transition-colors flex-shrink-0"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}