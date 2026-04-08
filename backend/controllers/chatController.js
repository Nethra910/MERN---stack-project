import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import crypto from 'crypto';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { sanitizeInput } from '../utils/validators.js';
import { uploadChatMedia, uploadVoiceMessage, deleteImage } from '../config/cloudinary.js';

// ─── Helper ────────────────────────────────────────────
const isParticipant = (participants, userId) =>
  participants.some((id) => id.equals(userId));

const getRole = (conversation, userId) => {
  if (!conversation?.roles) return 'member';
  if (typeof conversation.roles.get === 'function') {
    return conversation.roles.get(String(userId)) || 'member';
  }
  return conversation.roles[String(userId)] || 'member';
};

const requireRole = (conversation, userId, allowed) => {
  const role = getRole(conversation, userId);
  if (!allowed.includes(role)) {
    throw new ApiError(403, 'Insufficient group role');
  }
  return role;
};

const normalizeName = (name) => String(name || '').toLowerCase().replace(/\s+/g, '');

const parseMentions = (content, participants) => {
  const text = String(content || '');
  const mentionAll = /@all\b|@everyone\b/i.test(text);
  const tokens = text.match(/@[a-zA-Z0-9_]+/g) || [];
  if (tokens.length === 0 && !mentionAll) {
    return { mentionAll: false, mentions: [] };
  }

  const mentionNames = tokens.map((t) => t.slice(1).toLowerCase());
  const mentions = [];

  participants.forEach((user) => {
    const key = normalizeName(user.name);
    if (mentionNames.includes(key)) {
      mentions.push({ userId: user._id });
    }
  });

  return { mentionAll, mentions };
};

// ─── Get all conversations for user ────────────────────
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email profilePicture lastSeen') // ✅ Added lastSeen
      .populate('lastMessageSenderId', 'name profilePicture')
      .sort({ lastMessageTime: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, 'Conversations fetched successfully', conversations)
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Create or get one-to-one conversation ────────────
export const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { participantIds, isGroup, groupName, description, groupSettings } = req.body;

    if (!participantIds || participantIds.length === 0)
      throw new ApiError(400, 'Participant IDs are required');

    if (isGroup) {
      if (!groupName?.trim()) throw new ApiError(400, 'Group name is required');
      if (participantIds.length < 2)
        throw new ApiError(400, 'At least 2 participants required for group');

      const allParticipants = [userId, ...participantIds];
      const users = await User.find({ _id: { $in: allParticipants } });
      if (users.length !== allParticipants.length)
        throw new ApiError(400, 'Some participants do not exist');

      const roles = new Map();
      roles.set(String(userId), 'admin');
      allParticipants.forEach((id) => {
        if (String(id) !== String(userId)) roles.set(String(id), 'member');
      });

      const normalizedGroupSettings = {
        joinApprovalRequired: Boolean(groupSettings?.joinApprovalRequired),
        linkJoinEnabled: groupSettings?.linkJoinEnabled !== false,
      };

      const conversation = await Conversation.create({
        participants: allParticipants,
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmin: userId,
        description: description?.trim() || null,
        roles,
        groupSettings: normalizedGroupSettings,
      });
      await conversation.populate('participants', 'name email profilePicture'); // ✅ Added profilePicture

      return res.status(201).json(
        new ApiResponse(201, 'Group conversation created', conversation)
      );
    }

    if (participantIds.length !== 1)
      throw new ApiError(400, 'One participant ID required for 1-to-1 chat');

    const otherUserId = participantIds[0];
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) throw new ApiError(400, 'Participant does not exist');

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, otherUserId] },
    }).populate('participants', 'name email profilePicture'); // ✅ Added profilePicture

    if (conversation)
      return res.status(200).json(new ApiResponse(200, 'Conversation already exists', conversation));

    conversation = await Conversation.create({
      participants: [userId, otherUserId],
      isGroup: false,
    });
    await conversation.populate('participants', 'name email profilePicture');

    return res.status(201).json(new ApiResponse(201, 'Conversation created', conversation));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Get messages ──────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email profilePicture')
      .populate('replyTo')                          // ← populate reply preview
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await Message.countDocuments({ conversationId });

    return res.status(200).json(
      new ApiResponse(200, 'Messages fetched', { messages, total, limit: parseInt(limit), skip: parseInt(skip) })
    );
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Send message ──────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, replyToId } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) throw new ApiError(400, 'Message content is required');

    // Sanitize and validate message content
    const sanitizedContent = sanitizeInput(content.trim());
    
    // Limit message length to prevent abuse
    if (sanitizedContent.length > 5000) {
      throw new ApiError(400, 'Message is too long (max 5000 characters)');
    }

    if (sanitizedContent.length === 0) {
      throw new ApiError(400, 'Message content cannot be empty');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    // Validate replyTo message belongs to same conversation
    if (replyToId) {
      const replyMsg = await Message.findById(replyToId);
      if (!replyMsg || String(replyMsg.conversationId) !== String(conversationId))
        throw new ApiError(400, 'Invalid reply target');
    }

    let mentionAll = false;
    let mentions = [];
    if (conversation.isGroup) {
      const users = await User.find({ _id: { $in: conversation.participants } }).select('name');
      const parsed = parseMentions(sanitizedContent, users);
      mentionAll = parsed.mentionAll;
      mentions = parsed.mentions;
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: sanitizedContent,
      replyTo: replyToId || null,
      mentions,
      mentionAll,
    });

    await message.populate('senderId', '-password');
    await message.populate('replyTo');

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content.trim(),
      lastMessageSenderId: userId,
      lastMessageTime: new Date(),
    });

    return res.status(201).json(new ApiResponse(201, 'Message sent', message));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Send media message (photos/videos) ────────────────
export const sendMediaMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, replyToId } = req.body;
    const userId = req.user._id;
    const files = req.files;

    if (!files || files.length === 0) {
      throw new ApiError(400, 'At least one media file is required');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    // Validate replyTo message belongs to same conversation
    if (replyToId) {
      const replyMsg = await Message.findById(replyToId);
      if (!replyMsg || String(replyMsg.conversationId) !== String(conversationId))
        throw new ApiError(400, 'Invalid reply target');
    }

    // Upload all media files to Cloudinary
    const attachments = [];
    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';
      
      // Convert buffer to base64 data URI
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const uploadResult = await uploadChatMedia(dataURI, resourceType);
      
      attachments.push({
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        type: isVideo ? 'video' : 'image',
        mimeType: file.mimetype,
        name: file.originalname,
        size: file.size,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        thumbnail: uploadResult.thumbnail,
      });
    }

    // Create message with attachments
    let mentionAll = false;
    let mentions = [];
    if (conversation.isGroup && content?.trim()) {
      const users = await User.find({ _id: { $in: conversation.participants } }).select('name');
      const parsed = parseMentions(content.trim(), users);
      mentionAll = parsed.mentionAll;
      mentions = parsed.mentions;
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: content?.trim() || '',
      attachments,
      replyTo: replyToId || null,
      mentions,
      mentionAll,
    });

    await message.populate('senderId', 'name email profilePicture');
    await message.populate('replyTo');

    // Update conversation
    const lastMsgText = attachments.length > 1 
      ? `📎 ${attachments.length} media files`
      : attachments[0].type === 'video' ? '🎥 Video' : '📷 Photo';
    
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content?.trim() || lastMsgText,
      lastMessageSenderId: userId,
      lastMessageTime: new Date(),
    });

    return res.status(201).json(new ApiResponse(201, 'Media message sent', message));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Send voice message ────────────────────────────────
export const sendVoiceMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body;
    const userId = req.user._id;
    const file = req.file;

    if (!file) {
      throw new ApiError(400, 'Audio file is required');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    // Convert buffer to base64 data URI
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    const uploadResult = await uploadVoiceMessage(dataURI);

    const attachment = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      type: 'audio',
      mimeType: file.mimetype,
      name: file.originalname || 'voice-message.webm',
      size: file.size,
      duration: duration ? parseFloat(duration) : uploadResult.duration,
    };

    // Create message with voice attachment
    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: '',
      attachments: [attachment],
    });

    await message.populate('senderId', 'name email profilePicture');

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: '🎤 Voice message',
      lastMessageSenderId: userId,
      lastMessageTime: new Date(),
    });

    return res.status(201).json(new ApiResponse(201, 'Voice message sent', message));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── NEW: Edit a message ───────────────────────────────
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) throw new ApiError(400, 'Content is required');

    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    // Only sender can edit
    if (!message.senderId.equals(userId))
      throw new ApiError(403, 'Only the sender can edit this message');

    if (message.isDeleted)
      throw new ApiError(400, 'Cannot edit a deleted message');

    if (!message.editHistory) message.editHistory = [];
    message.editHistory.push({
      content: message.content,
      editedAt: message.editedAt || message.updatedAt || message.createdAt || new Date(),
    });
    if (message.editHistory.length > 10) {
      message.editHistory = message.editHistory.slice(-10);
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('senderId', '-password');
    await message.populate('replyTo');

    return res.status(200).json(new ApiResponse(200, 'Message edited', message));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── NEW: Delete a message ────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.body;   // 'everyone' | 'self'
    const userId = req.user._id;

    if (!['everyone', 'self'].includes(deleteFor))
      throw new ApiError(400, 'deleteFor must be "everyone" or "self"');

    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    const conversation = await Conversation.findById(message.conversationId);
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant in this conversation');

    // Only sender can delete for everyone
    if (deleteFor === 'everyone' && !message.senderId.equals(userId))
      throw new ApiError(403, 'Only the sender can delete for everyone');

    if (deleteFor === 'everyone') {
      // Delete for everyone - mark as deleted and wipe content
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deleteType = 'everyone';
      message.content = 'This message was deleted';
    } else {
      // Delete for self - add user to deletedBy array
      if (!message.deletedBy) {
        message.deletedBy = [];
      }
      if (!message.deletedBy.some(id => id.equals(userId))) {
        message.deletedBy.push(userId);
      }
    }
    await message.save();

    return res.status(200).json(
      new ApiResponse(200, 'Message deleted', { messageId, deleteFor })
    );
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── NEW: Toggle reaction on a message ────────────────
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) throw new ApiError(400, 'Emoji is required');

    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    if (message.isDeleted)
      throw new ApiError(400, 'Cannot react to a deleted message');

    const reactions = message.reactions || new Map();
    const usersForEmoji = reactions.get(emoji) || [];

    const alreadyReacted = usersForEmoji.some((id) => id.equals(userId));

    if (alreadyReacted) {
      // Toggle off — remove user from this emoji
      reactions.set(
        emoji,
        usersForEmoji.filter((id) => !id.equals(userId))
      );
      // Clean up empty emoji keys
      if (reactions.get(emoji).length === 0) reactions.delete(emoji);
    } else {
      // Toggle on — add user to this emoji
      reactions.set(emoji, [...usersForEmoji, userId]);
    }

    message.reactions = reactions;
    await message.save();

    // Return serialised reactions as plain object { emoji: [userId, ...] }
    const reactionsObj = {};
    for (const [key, val] of message.reactions.entries()) {
      reactionsObj[key] = val.map(String);
    }

    return res.status(200).json(
      new ApiResponse(200, 'Reaction updated', { messageId, reactions: reactionsObj })
    );
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── NEW: Forward a message ───────────────────────────
export const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { targetConversationIds } = req.body;   // array of conversation IDs
    const userId = req.user._id;

    if (!targetConversationIds?.length)
      throw new ApiError(400, 'Target conversation IDs are required');

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) throw new ApiError(404, 'Original message not found');
    if (originalMessage.isDeleted)
      throw new ApiError(400, 'Cannot forward a deleted message');

    const forwardedMessages = [];

    for (const targetConversationId of targetConversationIds) {
      const conversation = await Conversation.findById(targetConversationId);
      if (!conversation || !isParticipant(conversation.participants, userId)) continue;

      const msg = await Message.create({
        conversationId: targetConversationId,
        senderId: userId,
        content: originalMessage.content,
        forwardedFrom: {
          messageId: originalMessage._id,
          conversationId: originalMessage.conversationId,
        },
      });

      await Conversation.findByIdAndUpdate(targetConversationId, {
        lastMessage: originalMessage.content,
        lastMessageSenderId: userId,
        lastMessageTime: new Date(),
      });

      await msg.populate('senderId', '-password');
      forwardedMessages.push(msg);
    }

    return res.status(201).json(
      new ApiResponse(201, 'Message forwarded', forwardedMessages)
    );
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── NEW: Search messages within a conversation ───────
export const searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.trim().length < 1)
      throw new ApiError(400, 'Search query is required');

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    // Escape regex for safety
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const messages = await Message.find({
      conversationId,
      isDeleted: false,
      content: { $regex: escaped, $options: 'i' },
    })
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(
      new ApiResponse(200, 'Search results', { results: messages, count: messages.length })
    );
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Mark as read ──────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    // Update lastReadAt for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`lastReadAt.${userId}`]: new Date() }
    });

    await Message.updateMany(
      { conversationId, senderId: { $ne: userId }, isRead: false },
      { $set: { isRead: true }, $addToSet: { readBy: { userId, readAt: new Date() } } }
    );

    return res.status(200).json(new ApiResponse(200, 'Messages marked as read'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Get unread counts ─────────────────────────────────
export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const conversations = await Conversation.find({ participants: userId }).lean();
    const unreadCounts = {};
    let totalUnread = 0;

    for (const conv of conversations) {
      const lastReadAt = conv.lastReadAt?.get?.(String(userId)) || conv.lastReadAt?.[String(userId)] || new Date(0);
      
      const count = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userId },
        createdAt: { $gt: lastReadAt },
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      });

      if (count > 0) {
        unreadCounts[conv._id] = count;
        totalUnread += count;
      }
    }

    return res.status(200).json(new ApiResponse(200, 'Unread counts fetched', { unreadCounts, totalUnread }));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Pin conversation ──────────────────────────────────
export const pinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    // Check if already pinned
    const alreadyPinned = conversation.pinnedBy?.some(p => p.userId?.equals(userId));
    if (alreadyPinned) {
      return res.status(200).json(new ApiResponse(200, 'Already pinned'));
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $push: { pinnedBy: { userId, pinnedAt: new Date() } }
    });

    return res.status(200).json(new ApiResponse(200, 'Conversation pinned'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Unpin conversation ────────────────────────────────
export const unpinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');

    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: { pinnedBy: { userId } }
    });

    return res.status(200).json(new ApiResponse(200, 'Conversation unpinned'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Search users ──────────────────────────────────────
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.params;
    const userId = req.user._id;

    if (!query || query.trim().length < 2)
      throw new ApiError(400, 'Query must be at least 2 characters');

    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      name: { $regex: escaped, $options: 'i' },
      _id: { $ne: userId },
    })
      .select('-password')
      .limit(20)
      .lean();

    return res.status(200).json(new ApiResponse(200, 'Users found', users));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Delete conversation ───────────────────────────────
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!isParticipant(conversation.participants, userId))
      throw new ApiError(403, 'Not a participant');
    if (conversation.isGroup && conversation.groupAdmin && !conversation.groupAdmin.equals(userId))
      throw new ApiError(403, 'Only group admin can delete group');

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    return res.status(200).json(new ApiResponse(200, 'Conversation deleted'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Add participant ───────────────────────────────────
export const addParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId: newUserId } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    if (!conversation.groupAdmin.equals(userId))
      throw new ApiError(403, 'Only admin can add participants');

    const newUser = await User.findById(newUserId);
    if (!newUser) throw new ApiError(400, 'User does not exist');
    if (conversation.participants.some((id) => id.equals(newUserId)))
      throw new ApiError(400, 'User already a participant');

    conversation.participants.push(newUserId);
    await conversation.save();
    await conversation.populate('participants', 'name email profilePicture');

    return res.status(200).json(new ApiResponse(200, 'Participant added', conversation));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Remove participant ───────────────────────────────
export const removeParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId: removeUserId } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    if (!conversation.groupAdmin.equals(userId) && !userId.equals(removeUserId))
      throw new ApiError(403, 'Only admin can remove participants');
    if (!conversation.participants.some((id) => id.equals(removeUserId)))
      throw new ApiError(400, 'User is not a participant');

    conversation.participants = conversation.participants.filter(
      (id) => !id.equals(removeUserId)
    );

    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId });
      await Conversation.findByIdAndDelete(conversationId);
      return res.status(200).json(new ApiResponse(200, 'Group deleted — no participants left'));
    }

    await conversation.save();
    await conversation.populate('participants', 'name email profilePicture');

    return res.status(200).json(new ApiResponse(200, 'Participant removed', conversation));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Update rules ─────────────────────────────
export const updateGroupRules = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    conversation.groupRules = {
      text: String(text || '').trim(),
      updatedBy: userId,
      updatedAt: new Date(),
    };
    await conversation.save();

    return res.status(200).json(new ApiResponse(200, 'Group rules updated', conversation.groupRules));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Create invite link ───────────────────────
export const createInviteLink = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { maxUses = 0, expiresAt = null } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    if (!conversation.groupSettings?.linkJoinEnabled) {
      throw new ApiError(400, 'Invite links are disabled for this group');
    }

    const code = crypto.randomBytes(6).toString('hex');
    conversation.inviteLinks.push({
      code,
      createdBy: userId,
      maxUses: Number(maxUses) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    await conversation.save();

    return res.status(201).json(new ApiResponse(201, 'Invite link created', { code }));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Revoke invite link ───────────────────────
export const revokeInviteLink = async (req, res) => {
  try {
    const { conversationId, code } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    const invite = conversation.inviteLinks.find((i) => i.code === code);
    if (!invite) throw new ApiError(404, 'Invite link not found');
    invite.revoked = true;
    await conversation.save();

    return res.status(200).json(new ApiResponse(200, 'Invite link revoked'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Join via invite link ─────────────────────
export const joinViaInvite = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      isGroup: true,
      'inviteLinks.code': code,
    });
    if (!conversation) throw new ApiError(404, 'Invite not found');

    const invite = conversation.inviteLinks.find((i) => i.code === code);
    if (!invite || invite.revoked) throw new ApiError(400, 'Invite link is invalid');
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new ApiError(400, 'Invite link expired');
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) throw new ApiError(400, 'Invite link reached max uses');

    if (conversation.participants.some((id) => id.equals(userId))) {
      return res.status(200).json(
        new ApiResponse(200, 'Already a participant', {
          status: 'member',
          conversationId: conversation._id,
        })
      );
    }

    invite.uses += 1;

    if (conversation.groupSettings?.joinApprovalRequired) {
      const existing = conversation.joinRequests.find((r) => r.userId?.equals(userId) && r.status === 'pending');
      if (!existing) {
        conversation.joinRequests.push({ userId });
      }
      await conversation.save();
      return res.status(200).json(
        new ApiResponse(200, 'Join request created', {
          status: 'pending',
          conversationId: conversation._id,
        })
      );
    }

    conversation.participants.push(userId);
    if (conversation.roles?.set) conversation.roles.set(String(userId), 'member');
    await conversation.save();

    return res.status(200).json(
      new ApiResponse(200, 'Joined group', {
        status: 'member',
        conversationId: conversation._id,
      })
    );
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: List join requests ───────────────────────
export const listJoinRequests = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findById(conversationId).populate('joinRequests.userId', 'name email profilePicture');
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    const pending = (conversation.joinRequests || []).filter((r) => r.status === 'pending');
    return res.status(200).json(new ApiResponse(200, 'Join requests fetched', pending));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Respond to join request ─────────────────-
export const respondJoinRequest = async (req, res) => {
  try {
    const { conversationId, requestId } = req.params;
    const { action } = req.body; // approve | reject
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    const request = conversation.joinRequests.id(requestId);
    if (!request) throw new ApiError(404, 'Join request not found');
    if (request.status !== 'pending') throw new ApiError(400, 'Request already processed');

    if (action === 'approve') {
      request.status = 'approved';
      if (!conversation.participants.some((id) => id.equals(request.userId))) {
        conversation.participants.push(request.userId);
      }
      if (conversation.roles?.set) conversation.roles.set(String(request.userId), 'member');
    } else if (action === 'reject') {
      request.status = 'rejected';
    } else {
      throw new ApiError(400, 'Action must be approve or reject');
    }

    await conversation.save();
    return res.status(200).json(new ApiResponse(200, 'Join request updated', { status: request.status }));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Set role ─────────────────────────────────
export const setGroupRole = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { targetUserId, role } = req.body;
    const userId = req.user._id;

    if (!['admin', 'moderator', 'member'].includes(role)) {
      throw new ApiError(400, 'Invalid role');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin']);

    if (!conversation.participants.some((id) => id.equals(targetUserId))) {
      throw new ApiError(400, 'User is not a participant');
    }

    if (conversation.roles?.set) {
      conversation.roles.set(String(targetUserId), role);
    }

    await conversation.save();
    return res.status(200).json(new ApiResponse(200, 'Role updated', { userId: targetUserId, role }));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Pin message ─────────────────────────────-
export const pinMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    if (!conversation.pinnedMessages.some((p) => String(p.messageId) === String(messageId))) {
      conversation.pinnedMessages.push({ messageId, pinnedBy: userId, pinnedAt: new Date() });
      await conversation.save();
    }

    return res.status(200).json(new ApiResponse(200, 'Message pinned'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Unpin message ─────────────────────────---
export const unpinMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    requireRole(conversation, userId, ['admin', 'moderator']);

    conversation.pinnedMessages = conversation.pinnedMessages.filter(
      (p) => String(p.messageId) !== String(messageId)
    );
    await conversation.save();

    return res.status(200).json(new ApiResponse(200, 'Message unpinned'));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Group: Get pinned messages ─────────────────-----
export const getPinnedMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, 'Conversation not found');
    if (!conversation.isGroup) throw new ApiError(400, 'Not a group chat');
    if (!isParticipant(conversation.participants, userId)) throw new ApiError(403, 'Not a participant');

    const ids = conversation.pinnedMessages.map((p) => p.messageId);
    const messages = await Message.find({ _id: { $in: ids } })
      .populate('senderId', 'name email profilePicture')
      .lean();

    const byId = new Map(messages.map((m) => [String(m._id), m]));
    const ordered = conversation.pinnedMessages
      .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt))
      .map((p) => byId.get(String(p.messageId)))
      .filter(Boolean);

    return res.status(200).json(new ApiResponse(200, 'Pinned messages', ordered));
  } catch (err) {
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};