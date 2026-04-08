import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useChat } from '../context/ChatContext';

export default function MessageInput() {
  const {
    sendMessage, sendMediaMessage, sendVoiceMessage, editMessage,
    socket, currentConversation,
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
  } = useChat();

  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const [morphingMessage, setMorphingMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioPreviewRef = useRef(null);
  
  const typingRef               = useRef(null);
  const inputRef                = useRef(null);
  const fileInputRef            = useRef(null);

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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || user._id;

  // ─── Voice Recording Functions ─────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Create preview URL for playback
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setAudioBlob(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    setRecordingDuration(0);
    clearInterval(recordingTimerRef.current);
  };

  const sendVoice = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    try {
      await sendVoiceMessage(audioBlob, recordingDuration);
      // Cleanup
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      setAudioBlob(null);
      setRecordingDuration(0);
    } catch (err) {
      console.error('Failed to send voice message:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (files.length > 5) {
      alert('Maximum 5 files allowed at once');
      return;
    }

    // Validate file sizes (50MB max per file)
    const invalidFile = files.find(f => f.size > 50 * 1024 * 1024);
    if (invalidFile) {
      alert(`File "${invalidFile.name}" is too large. Maximum size is 50MB.`);
      return;
    }

    setSelectedFiles(files);
    
    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if we have content or files
    const hasContent = input.trim();
    const hasFiles = selectedFiles.length > 0;
    
    if (!hasContent && !hasFiles) return;

    // Trigger liquid morph animation
    setIsMorphing(true);
    setMorphingMessage(input);

    if (editingMessage) {
      // Edit mode - only text
      await editMessage(editingMessage._id, input);
    } else if (hasFiles) {
      // Media message
      setIsUploading(true);
      try {
        await sendMediaMessage(selectedFiles, input);
        clearFiles();
      } catch (err) {
        console.error('Failed to send media:', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Text-only message
      await sendMessage(input);
    }

    // Reset after animation completes
    setTimeout(() => {
      setIsMorphing(false);
      setMorphingMessage('');
    }, 1000);

    setInput('');
    setIsTyping(false);
    clearTimeout(typingRef.current);
    socket?.emit('stop-typing', { conversationId: currentConversation?._id });
  };

  const handleCancel = () => {
    setEditingMessage(null);
    setReplyingTo(null);
    setInput('');
    clearFiles();
  };

  const isEdit = !!editingMessage;

  return (
    <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card transition-colors">
      {/* ─── Reply / Edit banner ────────────────────── */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex items-center justify-between px-4 py-2 border-b ${
              isEdit ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-[#DBEAFE] dark:bg-blue-900/20 border-[#2563EB] dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-lg flex-shrink-0 ${isEdit ? 'text-amber-500' : 'text-[#2563EB]'}`}>
                {isEdit ? '✏️' : '↩️'}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${isEdit ? 'text-amber-700' : 'text-[#2563EB]'}`}>
                  {isEdit ? 'Editing message' : `Replying to ${replyingTo?.senderId?.name || 'message'}`}
                </p>
                <p className={`text-xs truncate ${isEdit ? 'text-amber-600' : 'text-[#2563EB]'}`}>
                  {(isEdit ? editingMessage?.content : replyingTo?.content)?.slice(0, 60)}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className={`flex-shrink-0 p-1 rounded-full ${
                isEdit ? 'hover:bg-amber-200 text-amber-500' : 'hover:bg-[#BFDBFE] text-[#2563EB]'
              } transition`}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Media Preview ──────────────────────────── */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 border-b border-gray-100 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearFiles}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative flex-shrink-0">
                  {file.type.startsWith('video/') ? (
                    <div className="w-20 h-20 rounded-lg bg-gray-800 flex items-center justify-center">
                      <span className="text-2xl">🎥</span>
                      <video
                        src={previewUrls[index]}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50"
                      />
                    </div>
                  ) : (
                    <img
                      src={previewUrls[index]}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] truncate px-1 rounded-b-lg">
                    {file.name.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Voice Recording UI ─────────────────────── */}
      <AnimatePresence>
        {(isRecording || audioBlob) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-4 py-4 border-b ${isRecording ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}
          >
            {isRecording ? (
              /* Recording State */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-200"
                  >
                    <motion.div
                      animate={{ scale: [1, 0.8, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-4 h-4 rounded-full bg-white"
                    />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-red-600">Recording...</p>
                    <p className="text-2xl font-bold text-red-700 tabular-nums">
                      {formatDuration(recordingDuration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={cancelRecording}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
                  >
                    ✕ Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={stopRecording}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-200 hover:shadow-red-300"
                  >
                    ⏹ Stop
                  </motion.button>
                </div>
              </div>
            ) : (
              /* Preview State - Listen before sending */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                    <span className="text-lg">🎤</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Voice Message</p>
                    <p className="text-xs text-gray-500">{formatDuration(recordingDuration)} recorded</p>
                  </div>
                </div>
                
                {/* Audio Preview Player */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">Preview:</span>
                    <audio
                      ref={audioPreviewRef}
                      src={audioPreviewUrl}
                      controls
                      className="flex-1 h-10"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <motion.button
                    type="button"
                    onClick={cancelRecording}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    🗑️ Discard
                  </motion.button>
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={startRecording}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      🔄 Re-record
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={sendVoice}
                      disabled={isUploading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-[#2563EB] text-white shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] hover:shadow-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          >
                            ⏳
                          </motion.span>
                          Sending...
                        </>
                      ) : (
                        <>📤 Send</>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Input row ──────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 relative">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Media attach button - Enhanced design */}
        {!isEdit && !isRecording && !audioBlob && (
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!currentConversation || isUploading}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            className="group relative p-3 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            title="Attach photo or video"
          >
            <span className="text-lg block">📎</span>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Media
            </span>
          </motion.button>
        )}

        {/* Voice record button - Enhanced design */}
        {!isEdit && !isRecording && !audioBlob && !input.trim() && selectedFiles.length === 0 && (
          <motion.button
            type="button"
            onClick={startRecording}
            disabled={!currentConversation || isUploading}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="group relative p-3 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-pink-200 hover:shadow-pink-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            title="Record voice message"
          >
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="text-lg block"
            >
              🎤
            </motion.span>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Voice
            </span>
          </motion.button>
        )}

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
              : selectedFiles.length > 0
              ? 'Add a caption (optional)...'
              : 'Type a message...'
          }
          disabled={!currentConversation || isUploading}
          className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition disabled:bg-gray-50 dark:disabled:bg-dark-hover disabled:text-gray-400 dark:disabled:text-dark-muted ${
            isEdit
              ? 'border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-dark-text'
              : 'border-gray-200 dark:border-dark-border focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] bg-white dark:bg-dark-bg dark:text-dark-text dark:placeholder:text-dark-muted'
          }`}
        />
        
        {/* Liquid Morph Send Button */}
        <AnimatePresence>
          {!isMorphing ? (
            <motion.button
              key="send-button"
              type="submit"
              disabled={(!input.trim() && selectedFiles.length === 0) || !currentConversation || isUploading}
              className={`relative px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden ${
                isEdit
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              exit={{
                scale: [1, 1.2, 0.8, 1.5],
                borderRadius: ['12px', '20px', '30px', '50%'],
                x: 150,
                y: -50,
                opacity: 0,
                transition: {
                  duration: 0.8,
                  times: [0, 0.3, 0.6, 1],
                  ease: [0.34, 1.56, 0.64, 1],
                }
              }}
            >
              {/* Liquid ripple effect overlay */}
              <motion.div
                className="absolute inset-0 bg-white/30 rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 2],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <span className="relative z-10">
                {isUploading ? '⏳' : isEdit ? 'Save' : selectedFiles.length > 0 ? '📤' : 'Send'}
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="morphing-bubble"
              className={`absolute right-3 px-5 py-2.5 rounded-xl font-semibold text-sm text-white ${
                isEdit ? 'bg-amber-500' : 'bg-[#2563EB]'
              }`}
              initial={{
                scale: 1,
                borderRadius: '12px',
                x: 0,
                y: 0,
                opacity: 1,
              }}
              animate={{
                scale: [1, 1.3, 0.9, 1.5, 2, 1.2],
                borderRadius: ['12px', '20px', '35px', '50%', '30px', '18px'],
                x: [0, 20, 50, 100, 150, 200],
                y: [0, -20, -40, -80, -100, -120],
                opacity: [1, 1, 0.9, 0.7, 0.4, 0],
                rotate: [0, 5, -5, 10, -10, 0],
              }}
              transition={{
                duration: 1,
                times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{
                filter: 'blur(0px)',
              }}
            >
              {/* Mercury liquid effect - multiple layers */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40"
                animate={{
                  x: ['-100%', '100%'],
                  scaleY: [1, 1.2, 0.8, 1],
                }}
                transition={{
                  duration: 0.8,
                  ease: "easeInOut",
                }}
              />
              
              {/* Liquid blob effect */}
              <motion.div
                className={`absolute inset-0 ${isEdit ? 'bg-amber-400' : 'bg-[#1D4ED8]'} rounded-full`}
                animate={{
                  scale: [1, 1.5, 0.8, 1.3],
                  borderRadius: ['50%', '40% 60% 70% 30%', '60% 40% 30% 70%', '50%'],
                }}
                transition={{
                  duration: 0.8,
                  ease: "easeInOut",
                }}
                style={{
                  filter: 'blur(8px)',
                  opacity: 0.6,
                }}
              />
              
              {/* Bubble particles */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 ${isEdit ? 'bg-amber-300' : 'bg-blue-300'} rounded-full`}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{
                    x: Math.random() * 60 - 30,
                    y: Math.random() * -60 - 20,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut",
                  }}
                />
              ))}
              
              <span className="relative z-10 opacity-0">{isEdit ? 'Save' : 'Send'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}