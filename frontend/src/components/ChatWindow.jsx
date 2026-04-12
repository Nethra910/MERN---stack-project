import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useChat } from '../context/ChatContext';
import MessageInput from './MessageInput';
import ChatHeaderCallButtons from './calls/ChatHeaderCallButtons'; // ✅ NEW

// ─── Emoji picker for reactions ───────────────────────
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ─── Sanitize user content to prevent XSS ─────────────
const sanitizeContent = (content) => {
  if (!content) return '';
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  return clean;
};

// ─── Helper: serialise reactions map from backend ─────
const parseReactions = (reactions) => {
  if (!reactions) return {};
  if (reactions instanceof Map) {
    const obj = {};
    reactions.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  return reactions;
};

const renderMessageContent = (content) => {
  const clean = sanitizeContent(content);
  const parts = clean.split(/(@all\b|@everyone\b|@[a-zA-Z0-9_]+)/gi);
  return parts
    .filter((part) => part !== '')
    .map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span key={`${part}-${idx}`} className="text-[#2563EB] font-semibold">
            {part}
          </span>
        );
      }
      return <span key={`text-${idx}`}>{part}</span>;
    });
};

const isMentionedByMessage = (msg, currentUserId) => {
  if (!msg || !currentUserId) return false;
  if (msg.mentionAll) return true;
  if (!Array.isArray(msg.mentions)) return false;
  return msg.mentions.some((m) => String(m.userId || m) === String(currentUserId));
};

// ─── Single Message Bubble ────────────────────────────
function MessageBubble({
  msg, isMine, currentUserId, readStatus, isGroup, isPinned, canModerate,
  onReply, onEdit, onDelete, onForward, onReact, onViewHistory, onPin, onUnpin,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setReactionPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const reactions = parseReactions(msg.reactions);
  const isDeleted = msg.isDeleted && msg.deleteType === 'everyone';
  const mentionedMe = !isMine && isMentionedByMessage(msg, currentUserId);

  const formatTime = (msg) => {
    const d = new Date(msg.createdAt || msg.timestamp);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex group ${isMine ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div className={`relative max-w-xs lg:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>

        {msg.replyTo && !isDeleted && (
          <div className={`text-xs px-3 py-1.5 mb-1 rounded-lg border-l-4 ${
            isMine
              ? 'bg-blue-400/20 border-blue-300 text-blue-100'
              : 'bg-gray-100 dark:bg-dark-hover border-gray-400 dark:border-gray-600 text-gray-600 dark:text-dark-muted'
          } truncate max-w-full`}>
            {msg.replyTo?.content && (
              <>
                <span className="font-semibold">{msg.replyTo?.senderId?.name || 'Unknown'}:</span>{' '}
                {sanitizeContent(msg.replyTo.content.slice(0, 60))}
              </>
            )}
            {!msg.replyTo?.content && '...'}
          </div>
        )}

        <div className="flex items-end gap-1">
          {!isMine && (
            msg.senderId?.profilePicture ? (
              <img src={msg.senderId.profilePicture} alt={msg.senderId?.name || 'User'} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-4" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-4">
                {(msg.senderId?.name?.[0] || '?').toUpperCase()}
              </div>
            )
          )}

          <div ref={menuRef} className="relative">
            {!isDeleted && (
              <button
                onClick={() => { setMenuOpen((v) => !v); setReactionPickerOpen(false); }}
                className={`absolute top-1 ${isMine ? '-left-7' : '-right-7'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted text-xs`}
              >
                ⋯
              </button>
            )}

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute z-50 bottom-full mb-1 ${isMine ? 'right-0' : 'left-0'} bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border py-1 min-w-[160px]`}
                >
                  <MenuItem icon="😊" label="React" onClick={() => { setReactionPickerOpen(true); setMenuOpen(false); }} />
                  <MenuItem icon="↩️" label="Reply" onClick={() => { onReply(msg); setMenuOpen(false); }} />
                  <MenuItem icon="➡️" label="Forward" onClick={() => { onForward(msg); setMenuOpen(false); }} />
                  {isMine && !msg.isDeleted && (
                    <MenuItem icon="✏️" label="Edit" onClick={() => { onEdit(msg); setMenuOpen(false); }} />
                  )}
                  {msg.isEdited && msg.editHistory?.length > 0 && (
                    <MenuItem icon="🕘" label="Edit history" onClick={() => { onViewHistory(msg); setMenuOpen(false); }} />
                  )}
                  {!msg.isDeleted && (
                    <>
                      {isGroup && canModerate && (
                        isPinned
                          ? <MenuItem icon="📌" label="Unpin" onClick={() => { onUnpin(msg._id); setMenuOpen(false); }} />
                          : <MenuItem icon="📌" label="Pin"   onClick={() => { onPin(msg._id);   setMenuOpen(false); }} />
                      )}
                      {isMine && (
                        <MenuItem icon="🗑️" label="Delete for everyone" danger onClick={() => { onDelete(msg._id, 'everyone'); setMenuOpen(false); }} />
                      )}
                      <MenuItem icon="🗑️" label="Delete for me" danger onClick={() => { onDelete(msg._id, 'self'); setMenuOpen(false); }} />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {reactionPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute z-50 bottom-full mb-1 ${isMine ? 'right-0' : 'left-0'} bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-dark-border px-2 py-1.5 flex gap-1`}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => { onReact(msg._id, emoji); setReactionPickerOpen(false); }} className="text-xl hover:scale-125 transition-transform p-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${
              isDeleted
                ? 'bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-dark-muted italic border border-gray-200 dark:border-dark-border'
                : isMine
                  ? 'bg-[#2563EB] text-white rounded-br-sm'
                  : `bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-dark-text rounded-bl-sm${mentionedMe ? ' ring-2 ring-[#DBEAFE] border border-[#2563EB]/40' : ''}`
            }`}>
              {mentionedMe && !isDeleted && (
                <span className="inline-block text-[10px] uppercase tracking-wide text-[#2563EB] bg-[#DBEAFE] px-2 py-0.5 rounded-full mb-1">Mentioned you</span>
              )}
              {msg.forwardedFrom?.messageId && !isDeleted && (
                <p className={`text-xs mb-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>➡️ Forwarded</p>
              )}

              {msg.attachments?.length > 0 && !isDeleted && (
                <div className={`mb-2 ${msg.attachments.length > 1 && msg.attachments[0].type !== 'audio' ? 'grid grid-cols-2 gap-1' : ''}`}>
                  {msg.attachments.map((attachment, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden">
                      {attachment.type === 'video' ? (
                        <video src={attachment.url} controls className="max-w-full rounded-lg max-h-64" poster={attachment.thumbnail} />
                      ) : attachment.type === 'audio' ? (
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${isMine ? 'bg-blue-400/30' : 'bg-gray-200'}`}>
                          <span className="text-lg">🎤</span>
                          <audio src={attachment.url} controls className="h-8 max-w-[200px]" />
                          {attachment.duration && (
                            <span className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                              {Math.floor(attachment.duration / 60)}:{String(Math.floor(attachment.duration % 60)).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <img src={attachment.url} alt={attachment.name || 'Image'} className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition" onClick={() => window.open(attachment.url, '_blank')} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.content && (
                <p className="text-sm break-words leading-relaxed">{renderMessageContent(msg.content)}</p>
              )}

              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                  {formatTime(msg)}
                </span>
                {msg.isEdited && !isDeleted && (
                  msg.editHistory?.length > 0 ? (
                    <button onClick={() => onViewHistory(msg)} className="text-xs text-[#2563EB] hover:text-[#1D4ED8] hover:underline">· edited</button>
                  ) : (
                    <span className={`text-xs ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>· edited</span>
                  )
                )}
                {isMine && readStatus && !isDeleted && (
                  <span className="text-xs">
                    {readStatus.state === 'sent' && <span className="text-gray-400"> · ✓</span>}
                    {(readStatus.state === 'read' || readStatus.state === 'read-count') && <span className="text-[#2563EB]"> · ✓✓</span>}
                    {readStatus.state === 'read-count' && <span className="text-[#2563EB]"> {readStatus.count}</span>}
                  </span>
                )}
              </div>
            </div>

            {Object.keys(reactions).length > 0 && !isDeleted && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {Object.entries(reactions).map(([emoji, users]) =>
                  users.length > 0 ? (
                    <button key={emoji} onClick={() => onReact(msg._id, emoji)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                        users.includes(currentUserId) || users.map(String).includes(String(currentUserId))
                          ? 'bg-[#DBEAFE] border-[#2563EB] text-[#2563EB]'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      <span>{emoji}</span>
                      <span>{users.length}</span>
                    </button>
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark-hover transition ${
        danger ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-dark-text'
      }`}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ForwardModal({ message, conversations, onForward, onClose, currentUserId }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const getConvName = (conv) => {
    if (conv.isGroup) return conv.groupName || 'Group';
    const other = conv.participants?.find((p) => String(p._id || p.id) !== String(currentUserId));
    return other?.name || 'Unknown';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-dark-border">
          <h3 className="font-bold text-gray-800 dark:text-dark-text text-lg">Forward Message</h3>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-0.5 truncate">"{message?.content?.slice(0, 50)}"</p>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <label key={conv._id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition">
              <input type="checkbox" checked={selected.includes(conv._id)} onChange={() => toggle(conv._id)} className="w-4 h-4 accent-[#2563EB]" />
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                {getConvName(conv)[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text truncate">{getConvName(conv)}</span>
            </label>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-dark-border flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text font-medium text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition">Cancel</button>
          <button disabled={selected.length === 0} onClick={() => onForward(message._id, selected)}
            className="flex-1 py-2 rounded-xl bg-[#2563EB] text-white font-medium text-sm disabled:opacity-50 hover:bg-[#1D4ED8] transition">
            Forward{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SearchBar({ onSearch, onClose, results, loading, onJumpTo }) {
  const [query, setQuery] = useState('');
  const timer = useRef(null);
  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(q), 400);
  };

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card overflow-hidden">
      <div className="p-3">
        <div className="flex items-center gap-2 bg-white dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2">
          <span className="text-gray-400 dark:text-dark-muted">🔍</span>
          <input autoFocus type="text" placeholder="Search messages..." value={query} onChange={handleChange}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-dark-muted" />
          {loading && <span className="text-gray-400 dark:text-dark-muted text-xs">...</span>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text text-sm">✕</button>
        </div>
        {results.length > 0 && (
          <div className="mt-2 max-h-52 overflow-y-auto space-y-1">
            {results.map((msg) => (
              <button key={msg._id} onClick={() => onJumpTo(msg._id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-hover border border-transparent hover:border-gray-200 dark:hover:border-dark-border transition text-sm">
                <p className="font-medium text-gray-700 dark:text-dark-text text-xs">{msg.senderId?.name}</p>
                <p className="text-gray-500 dark:text-dark-muted truncate">{msg.content}</p>
              </button>
            ))}
          </div>
        )}
        {query.length > 0 && results.length === 0 && !loading && (
          <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-2">No messages found</p>
        )}
      </div>
    </motion.div>
  );
}

function EditHistoryModal({ message, onClose }) {
  const history = message?.editHistory || [];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-dark-border">
          <h3 className="font-bold text-gray-800 dark:text-dark-text text-lg">Edit history</h3>
        </div>
        <div className="max-h-80 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-dark-muted">No history available.</p>
          ) : (
            history.slice().reverse().map((entry, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-dark-border">
                <p className="text-sm text-gray-800 dark:text-dark-text whitespace-pre-wrap">{entry.content || '(empty)'}</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-2">{entry.editedAt ? new Date(entry.editedAt).toLocaleString() : 'Unknown time'}</p>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={onClose} className="w-full py-2 rounded-xl bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-dark-text text-sm font-medium hover:bg-gray-200 dark:hover:bg-dark-card transition">Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GroupInfoPanel({
  conversation, role, canModerate, currentUserId, pinnedMessages, pinnedLoading,
  onClose, onJumpTo, onUnpin, onFetchJoinRequests, joinRequests, joinRequestsLoading,
  onRespondRequest, onUpdateRules, onCreateInvite, onSetRole, latestInviteCode, setLatestInviteCode,
}) {
  const [rulesDraft, setRulesDraft] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const isAdmin = role === 'admin';

  const getMemberRole = (memberId) => {
    const roles = conversation?.roles;
    if (!roles) return 'member';
    if (typeof roles.get === 'function') return roles.get(String(memberId)) || 'member';
    return roles[String(memberId)] || 'member';
  };

  useEffect(() => { setRulesDraft(conversation?.groupRules?.text || ''); }, [conversation]);

  const handleSaveRules = async () => {
    if (!conversation?._id) return;
    try { setSavingRules(true); await onUpdateRules(conversation._id, rulesDraft); }
    finally { setSavingRules(false); }
  };

  const handleCreateInvite = async () => {
    if (!conversation?._id) return;
    try { setCreatingInvite(true); await onCreateInvite(conversation._id, {}); }
    finally { setCreatingInvite(false); }
  };

  const handleCopyInvite = async () => {
    if (!latestInviteCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/messages?invite=${latestInviteCode}`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 18 }}
        onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-dark-text text-lg">Group info</h3>
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">Role: {role}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Group rules</h4>
            {canModerate ? (
              <>
                <textarea value={rulesDraft} onChange={(e) => setRulesDraft(e.target.value)} rows={4}
                  className="w-full text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg px-3 py-2 outline-none"
                  placeholder="Add group rules here..." />
                <div className="mt-2 flex gap-2">
                  <button onClick={handleSaveRules} disabled={savingRules} className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-medium hover:bg-[#1D4ED8] disabled:opacity-50">Save rules</button>
                  {conversation?.groupRules?.updatedAt && (
                    <span className="text-xs text-gray-400 flex items-center">Updated {new Date(conversation.groupRules.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-dark-muted whitespace-pre-wrap">{conversation?.groupRules?.text || 'No rules set yet.'}</p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Invite link</h4>
            {conversation?.groupSettings?.linkJoinEnabled === false ? (
              <p className="text-xs text-gray-400">Invite links are disabled for this group.</p>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCreateInvite} disabled={creatingInvite} className="px-3 py-1.5 rounded-lg bg-[#DBEAFE] text-[#2563EB] text-xs font-medium hover:bg-[#BFDBFE] disabled:opacity-50">Create invite</button>
                {latestInviteCode && (
                  <>
                    <span className="text-xs text-gray-600 dark:text-dark-text">{latestInviteCode}</span>
                    <button onClick={handleCopyInvite} className="px-2 py-1 rounded-md text-xs border border-gray-200 dark:border-dark-border text-gray-600 hover:bg-gray-50">Copy link</button>
                    <button onClick={() => setLatestInviteCode('')} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                  </>
                )}
              </div>
            )}
          </div>

          {canModerate && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text">Join requests</h4>
                <button onClick={() => conversation?._id && onFetchJoinRequests(conversation._id)} className="text-xs text-[#2563EB] hover:text-[#1D4ED8]">Refresh</button>
              </div>
              {joinRequestsLoading ? (
                <p className="text-xs text-gray-400">Loading requests...</p>
              ) : joinRequests.length === 0 ? (
                <p className="text-xs text-gray-400">No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {joinRequests.map((req) => (
                    <div key={req._id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-dark-border">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-dark-text">{req.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{req.userId?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onRespondRequest(conversation._id, req._id, 'approve')} className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-xs hover:bg-[#1D4ED8]">Approve</button>
                        <button onClick={() => onRespondRequest(conversation._id, req._id, 'reject')}  className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Pinned messages</h4>
            {pinnedLoading ? <p className="text-xs text-gray-400">Loading pins...</p> : (
              <div className="space-y-2">
                {pinnedMessages.length === 0 ? (
                  <p className="text-xs text-gray-400">No pinned messages.</p>
                ) : (
                  pinnedMessages.map((msg) => (
                    <div key={msg._id} className="p-3 rounded-xl border border-gray-100 dark:border-dark-border">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-500">{msg.senderId?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-700 dark:text-dark-text truncate">{msg.content || 'Attachment'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => onJumpTo(msg._id)} className="text-xs text-[#2563EB] hover:text-[#1D4ED8]">Jump</button>
                          {canModerate && <button onClick={() => onUnpin(conversation._id, msg._id)} className="text-xs text-gray-400 hover:text-gray-600">Unpin</button>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Members</h4>
            <div className="space-y-2">
              {(conversation?.participants || []).map((member) => {
                const memberId = member?._id || member?.id || member;
                const memberRole = getMemberRole(memberId);
                const isSelf = String(memberId) === String(currentUserId);
                return (
                  <div key={String(memberId)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-dark-border">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-dark-text">{member?.name || 'Unknown'}{isSelf ? ' (You)' : ''}</p>
                      <p className="text-xs text-gray-400">{member?.email}</p>
                    </div>
                    <div>
                      {isAdmin && !isSelf ? (
                        <select value={memberRole} onChange={(e) => onSetRole(conversation._id, memberId, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
                          <option value="admin">admin</option>
                          <option value="moderator">moderator</option>
                          <option value="member">member</option>
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500 capitalize">{memberRole}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ChatWindow ──────────────────────────────────
export default function ChatWindow() {
  const {
    currentConversation, messages, typingUsers, onlineUsers,
    replyingTo, setReplyingTo, editingMessage, setEditingMessage,
    searchResults, searchLoading, forwardModalOpen, setForwardModalOpen,
    messageToForward, setMessageToForward, conversations,
    editMessage, deleteMessage, reactToMessage, forwardMessage, searchInConversation,
    hasMoreMessages, isLoadingMore, loadMoreMessages,
    updateGroupRules, createInviteLink, fetchJoinRequests, respondToJoinRequest,
    setGroupRole, pinnedMessages, pinnedLoading, fetchPinnedMessages,
    pinMessage, unpinMessage, joinRequests, joinRequestsLoading,
    latestInviteCode, setLatestInviteCode, inviteBanner,
    messagesLoadedFor, messagesLoadedCount,
  } = useChat();

  const [searchOpen, setSearchOpen]       = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [historyOpen, setHistoryOpen]     = useState(false);
  const [historyMessage, setHistoryMessage] = useState(null);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [bannerReady, setBannerReady]     = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const messagesEndRef       = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageRefs          = useRef({});
  const prevScrollHeight     = useRef(0);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const currentUserId = String(user?.id || user?._id || '');

  const lastReadAt = useMemo(() => {
    const raw = currentConversation?.lastReadAt;
    if (!raw) return null;
    if (typeof raw.get === 'function') return raw.get(currentUserId) || null;
    return raw[currentUserId] || null;
  }, [currentConversation, currentUserId]);

  const role = useMemo(() => {
    const roles = currentConversation?.roles;
    if (!roles) return 'member';
    if (typeof roles.get === 'function') return roles.get(currentUserId) || 'member';
    return roles[currentUserId] || 'member';
  }, [currentConversation, currentUserId]);

  const canModerate = role === 'admin' || role === 'moderator';

  const pinnedIdSet = useMemo(() => {
    const items = currentConversation?.pinnedMessages || [];
    return new Set(items.map((p) => String(p.messageId)));
  }, [currentConversation]);

  const unreadCount = useMemo(() => {
    if (!messages.length) return 0;
    const lastRead = lastReadAt ? new Date(lastReadAt) : null;
    return messages.filter((m) => {
      const senderId = typeof m.senderId === 'object' ? String(m.senderId?._id) : String(m.senderId);
      if (senderId === currentUserId) return false;
      if (!lastRead) return true;
      return new Date(m.createdAt || m.timestamp) > lastRead;
    }).length;
  }, [messages, lastReadAt, currentUserId]);

  const firstUnreadMessageId = useMemo(() => {
    if (!messages.length) return null;
    const lastRead = lastReadAt ? new Date(lastReadAt) : null;
    const unread = messages.find((m) => {
      const senderId = typeof m.senderId === 'object' ? String(m.senderId?._id) : String(m.senderId);
      if (senderId === currentUserId) return false;
      if (!lastRead) return true;
      return new Date(m.createdAt || m.timestamp) > lastRead;
    });
    return unread?._id || null;
  }, [messages, lastReadAt, currentUserId]);

  // ✅ Build the "other user" object for call buttons
  const otherUser = useMemo(() => {
    if (!currentConversation || currentConversation.isGroup) return null;
    return currentConversation.participants?.find(
      (p) => String(p?._id || p?.id) !== currentUserId
    ) || null;
  }, [currentConversation, currentUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  useEffect(() => {
    let rafId = null;
    setBannerReady(false);
    if (!currentConversation?._id) return undefined;
    rafId = requestAnimationFrame(() => setBannerReady(true));
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [currentConversation?._id, messages.length]);

  useEffect(() => {
    if (currentConversation?.isGroup) fetchPinnedMessages(currentConversation._id);
  }, [currentConversation, fetchPinnedMessages]);

  useEffect(() => {
    if (groupPanelOpen && currentConversation?.isGroup && canModerate) fetchJoinRequests(currentConversation._id);
  }, [groupPanelOpen, currentConversation, canModerate, fetchJoinRequests]);

  useEffect(() => {
    if (messagesContainerRef.current && prevScrollHeight.current > 0) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeight.current;
      if (scrollDiff > 0) messagesContainerRef.current.scrollTop = scrollDiff;
      prevScrollHeight.current = 0;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore || !hasMoreMessages) return;
    if (container.scrollTop < 100) {
      prevScrollHeight.current = container.scrollHeight;
      loadMoreMessages();
    }
  }, [isLoadingMore, hasMoreMessages, loadMoreMessages]);

  const getOtherUser      = (conv) => conv?.participants?.find((p) => String(p?.id || p?._id) !== currentUserId) || null;
  const getDisplayName    = (conv) => !conv ? '' : conv.isGroup ? (conv.groupName || 'Group Chat') : (getOtherUser(conv)?.name || 'Unknown');
  const isOnline          = () => { const other = getOtherUser(currentConversation); return other ? onlineUsers.has(String(other._id || other.id)) : false; };

  const getLastSeenText = () => {
    const other = getOtherUser(currentConversation);
    if (!other?.lastSeen) return 'Offline';
    const diffMs   = Date.now() - new Date(other.lastSeen).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs  = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)  return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24)  return `${diffHrs}h ago`;
    if (diffDays < 7)  return `${diffDays}d ago`;
    return new Date(other.lastSeen).toLocaleDateString();
  };

  const handleJumpTo = useCallback((msgId) => {
    setHighlightedId(msgId);
    setSearchOpen(false);
    messageRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedId(null), 2000);
  }, []);

  const handleJumpToFirstUnread = useCallback(() => {
    if (firstUnreadMessageId) handleJumpTo(firstUnreadMessageId);
  }, [firstUnreadMessageId, handleJumpTo]);

  useEffect(() => {
    if (location.state?.jumpToFirstUnread && firstUnreadMessageId) {
      handleJumpToFirstUnread();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, firstUnreadMessageId, handleJumpToFirstUnread, navigate]);

  if (!currentConversation) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-dark-bg dark:to-dark-card">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-[#DBEAFE] flex items-center justify-center text-5xl mb-4">💬</div>
          <p className="text-gray-600 dark:text-dark-text text-lg font-medium">No conversation selected</p>
          <p className="text-gray-400 dark:text-dark-muted text-sm">Select a chat to start messaging</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-white dark:bg-dark-card transition-colors">

      {/* ─── Header ──────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            {getDisplayName(currentConversation)[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-dark-text text-sm">{getDisplayName(currentConversation)}</h2>
            <p className="text-xs text-gray-500 dark:text-dark-muted flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline() ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {isOnline() ? 'Online' : `Last seen ${getLastSeenText()}`}
            </p>
          </div>
        </div>

        {/* ── Right side header actions ─────────────────────── */}
        <div className="flex items-center gap-2">
          {currentConversation?.isGroup && (
            <button onClick={() => setGroupPanelOpen(true)}
              className="p-2 rounded-lg text-sm transition hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted" title="Group info">
              👥
            </button>
          )}

          {/* ✅ NEW: Voice + Video call buttons (only for 1-to-1 chats) */}
          {!currentConversation?.isGroup && otherUser && (
            <ChatHeaderCallButtons remoteUser={otherUser} />
          )}

          {firstUnreadMessageId && (
            <button onClick={handleJumpToFirstUnread}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#DBEAFE] text-[#2563EB] hover:bg-[#BFDBFE] transition">
              First unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          )}
          <button onClick={() => setSearchOpen((v) => !v)}
            className={`p-2 rounded-lg text-sm transition ${searchOpen ? 'bg-[#DBEAFE] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted'}`}>
            🔍
          </button>
        </div>
      </div>

      <AnimatePresence>
        {inviteBanner?.conversationId === currentConversation?._id && inviteBanner?.message &&
          messagesLoadedFor === String(currentConversation?._id) &&
          (messages.length > 0 || messagesLoadedCount === 0) && bannerReady && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
            className="px-4 py-2 text-xs text-[#2563EB] bg-[#DBEAFE] border-b border-[#BFDBFE]">
            {inviteBanner.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <SearchBar onSearch={searchInConversation} onClose={() => setSearchOpen(false)} results={searchResults} loading={searchLoading} onJumpTo={handleJumpTo} />
        )}
      </AnimatePresence>

      {/* ─── Messages ────────────────────────────────── */}
      <div ref={messagesContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50 dark:bg-dark-bg transition-colors">
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full" />
          </div>
        )}
        {hasMoreMessages && !isLoadingMore && (
          <div className="flex justify-center py-2">
            <button onClick={loadMoreMessages} className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium">↑ Load older messages</button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const senderId  = typeof msg.senderId === 'object' ? String(msg.senderId?._id) : String(msg.senderId);
          const isMine    = senderId === currentUserId;
          const isHighlighted = highlightedId === msg._id;
          const isPinned  = pinnedIdSet.has(String(msg._id));
          const readByList   = Array.isArray(msg.readBy) ? msg.readBy : [];
          const readByOthers = readByList.filter((entry) => String(entry?.userId || entry) !== currentUserId);
          const readStatus = isMine
            ? (readByOthers.length > 0
              ? (currentConversation?.isGroup ? { state: 'read-count', count: readByOthers.length } : { state: 'read' })
              : { state: 'sent' })
            : null;

          if (msg.isDeleted && msg.deleteType === 'everyone') { /* show deleted placeholder in bubble */ }
          else if (msg.deletedBy && Array.isArray(msg.deletedBy)) {
            if (msg.deletedBy.some(id => String(id) === currentUserId)) return null;
          }

          return (
            <div key={msg._id || idx} ref={(el) => { if (el) messageRefs.current[msg._id] = el; }}
              className={`transition-all duration-500 rounded-xl ${isHighlighted ? 'bg-[#DBEAFE] scale-105' : ''}`}>
              <MessageBubble
                msg={msg} isMine={isMine} currentUserId={currentUserId} readStatus={readStatus}
                isGroup={currentConversation?.isGroup} isPinned={isPinned} canModerate={canModerate}
                onReply={setReplyingTo} onEdit={setEditingMessage} onDelete={deleteMessage}
                onForward={(msg) => { setMessageToForward(msg); setForwardModalOpen(true); }}
                onReact={reactToMessage}
                onViewHistory={(msg) => { setHistoryMessage(msg); setHistoryOpen(true); }}
                onPin={(messageId) => pinMessage(currentConversation._id, messageId)}
                onUnpin={(messageId) => unpinMessage(currentConversation._id, messageId)}
              />
            </div>
          );
        })}

        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-2">
              <div className="bg-[#DBEAFE] px-3 py-2 rounded-2xl flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ delay: i * 0.12, duration: 0.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                ))}
              </div>
              <span className="text-xs text-gray-400">typing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <MessageInput />

      <AnimatePresence>
        {groupPanelOpen && currentConversation?.isGroup && (
          <GroupInfoPanel
            conversation={currentConversation} role={role} canModerate={canModerate} currentUserId={currentUserId}
            pinnedMessages={pinnedMessages} pinnedLoading={pinnedLoading} onClose={() => setGroupPanelOpen(false)}
            onJumpTo={handleJumpTo} onUnpin={unpinMessage} onFetchJoinRequests={fetchJoinRequests}
            joinRequests={joinRequests} joinRequestsLoading={joinRequestsLoading} onRespondRequest={respondToJoinRequest}
            onUpdateRules={updateGroupRules} onCreateInvite={createInviteLink} onSetRole={setGroupRole}
            latestInviteCode={latestInviteCode} setLatestInviteCode={setLatestInviteCode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forwardModalOpen && messageToForward && (
          <ForwardModal message={messageToForward} conversations={conversations} currentUserId={currentUserId}
            onForward={forwardMessage} onClose={() => { setForwardModalOpen(false); setMessageToForward(null); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyOpen && historyMessage && (
          <EditHistoryModal message={historyMessage} onClose={() => { setHistoryOpen(false); setHistoryMessage(null); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

