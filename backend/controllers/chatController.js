import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// ✅ Helper - Safe ObjectId comparison
const isParticipant = (participants, userId) => {
  return participants.some(id => id.equals(userId));
};

// ─── Get all conversations for user ────────────────────
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', '-password')
      .populate('lastMessageSenderId', 'name')
      .sort({ lastMessageTime: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, 'Conversations fetched successfully', conversations)
    );
  } catch (err) {
    console.error('❌ Get conversations error:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Create or get one-to-one conversation ────────────
export const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { participantIds, isGroup, groupName, description } = req.body;

    // ✅ Validation
    if (!participantIds || participantIds.length === 0) {
      throw new ApiError(400, 'Participant IDs are required');
    }

    // ─── GROUP CHAT ───
    if (isGroup) {
      if (!groupName || groupName.trim().length === 0) {
        throw new ApiError(400, 'Group name is required for group chats');
      }

      if (participantIds.length < 2) {
        throw new ApiError(400, 'At least 2 participants are required for group chat');
      }

      const allParticipants = [userId, ...participantIds];

      // ✅ Verify all participants exist
      const users = await User.find({ _id: { $in: allParticipants } });
      if (users.length !== allParticipants.length) {
        throw new ApiError(400, 'Some participants do not exist');
      }

      const conversation = await Conversation.create({
        participants: allParticipants,
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmin: userId,
        description: description?.trim() || null,
      });

      await conversation.populate('participants', '-password');

      return res.status(201).json(
        new ApiResponse(201, 'Group conversation created successfully', conversation)
      );
    }

    // ─── ONE-TO-ONE CHAT ───
    if (participantIds.length !== 1) {
      throw new ApiError(400, 'One participant ID is required for one-to-one chat');
    }

    const otherUserId = participantIds[0];

    // ✅ Verify other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      throw new ApiError(400, 'Participant does not exist');
    }

    // ✅ Check if conversation already exists
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, otherUserId] },
    }).populate('participants', '-password');

    if (conversation) {
      return res.status(200).json(
        new ApiResponse(200, 'Conversation already exists', conversation)
      );
    }

    // ✅ Create new conversation
    conversation = await Conversation.create({
      participants: [userId, otherUserId],
      isGroup: false,
    });

    await conversation.populate('participants', '-password');

    return res.status(201).json(
      new ApiResponse(201, 'Conversation created successfully', conversation)
    );
  } catch (err) {
    console.error('❌ Create conversation error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Get messages in conversation ──────────────────────
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    // ✅ Validate conversation ID
    if (!conversationId) {
      throw new ApiError(400, 'Conversation ID is required');
    }

    // ✅ Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (!isParticipant(conversation.participants, userId)) {
      throw new ApiError(403, 'You are not a participant in this conversation');
    }

    // ✅ Fetch messages - SORTED CORRECTLY
    const messages = await Message.find({ conversationId })
      .populate('senderId', '-password')
      .sort({ createdAt: 1 }) // ✅ Ascending (oldest first)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const totalMessages = await Message.countDocuments({ conversationId });

    return res.status(200).json(
      new ApiResponse(200, 'Messages fetched successfully', {
        messages,
        total: totalMessages,
        limit: parseInt(limit),
        skip: parseInt(skip),
      })
    );
  } catch (err) {
    console.error('❌ Get messages error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Send message ─────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // ✅ Validation
    if (!conversationId) {
      throw new ApiError(400, 'Conversation ID is required');
    }

    if (!content || content.trim().length === 0) {
      throw new ApiError(400, 'Message content is required');
    }

    // ✅ Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (!isParticipant(conversation.participants, userId)) {
      throw new ApiError(403, 'You are not a participant in this conversation');
    }

    // ✅ Create message
    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: content.trim(),
    });

    await message.populate('senderId', '-password');

    // ✅ Update conversation with last message
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: content.trim(),
        lastMessageSenderId: userId,
        lastMessageTime: new Date(),
      },
      { new: true }
    );

    return res.status(201).json(
      new ApiResponse(201, 'Message sent successfully', message)
    );
  } catch (err) {
    console.error('❌ Send message error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Mark messages as read ────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // ✅ Validation
    if (!conversationId) {
      throw new ApiError(400, 'Conversation ID is required');
    }

    // ✅ Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (!isParticipant(conversation.participants, userId)) {
      throw new ApiError(403, 'You are not a participant in this conversation');
    }

    // ✅ Mark all unread messages as read - NO DUPLICATES
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        isRead: false,
      },
      {
        $set: { isRead: true },
        $addToSet: { readBy: { userId, readAt: new Date() } }, // ✅ No duplicates
      }
    );

    return res.status(200).json(
      new ApiResponse(200, 'Messages marked as read')
    );
  } catch (err) {
    console.error('❌ Mark as read error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Search users ─────────────────────────────────────
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.params;
    const userId = req.user._id;

    // ✅ Validation
    if (!query || query.trim().length === 0) {
      throw new ApiError(400, 'Search query is required');
    }

    if (query.trim().length < 2) {
      throw new ApiError(400, 'Search query must be at least 2 characters');
    }

    // ✅ Search users by name only - SAFER
    const users = await User.find({
      name: { $regex: query, $options: 'i' }, // ✅ Case-insensitive name search
      _id: { $ne: userId }, // ✅ Exclude self
    })
      .select('-password')
      .limit(20)
      .lean();

    return res.status(200).json(
      new ApiResponse(200, 'Users found successfully', users)
    );
  } catch (err) {
    console.error('❌ Search users error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Delete conversation ──────────────────────────────
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // ✅ Validation
    if (!conversationId) {
      throw new ApiError(400, 'Conversation ID is required');
    }

    // ✅ Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (!isParticipant(conversation.participants, userId)) {
      throw new ApiError(403, 'You are not a participant in this conversation');
    }

    // ✅ If group, check if user is admin
    if (conversation.isGroup && !conversation.groupAdmin.equals(userId)) {
      throw new ApiError(403, 'Only group admin can delete the group');
    }

    // ✅ Delete all messages in conversation
    await Message.deleteMany({ conversationId });

    // ✅ Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    return res.status(200).json(
      new ApiResponse(200, 'Conversation deleted successfully')
    );
  } catch (err) {
    console.error('❌ Delete conversation error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Add participant to group ──────────────────────────
export const addParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId: newUserId } = req.body;
    const userId = req.user._id;

    // ✅ Validation
    if (!conversationId) {
      throw new ApiError(400, 'Conversation ID is required');
    }

    if (!newUserId) {
      throw new ApiError(400, 'User ID is required');
    }

    // ✅ Check if conversation exists and is group
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new ApiError(400, 'Cannot add participants to one-to-one chat');
    }

    // ✅ Check if user is admin
    if (!conversation.groupAdmin.equals(userId)) {
      throw new ApiError(403, 'Only group admin can add participants');
    }

    // ✅ Check if new user exists
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      throw new ApiError(400, 'User does not exist');
    }

    // ✅ Check if user is already participant
    if (conversation.participants.some(id => id.equals(newUserId))) {
      throw new ApiError(400, 'User is already a participant');
    }

    // ✅ Add participant
    conversation.participants.push(newUserId);
    await conversation.save();
    await conversation.populate('participants', '-password');

    return res.status(200).json(
      new ApiResponse(200, 'Participant added successfully', conversation)
    );
  } catch (err) {
    console.error('❌ Add participant error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};

// ─── Remove participant from group ────────────────────
export const removeParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId: removeUserId } = req.body;
    const userId = req.user._id;

    // ✅ Validation
    if (!conversationId) {
      throw new ApiError(400, 'Conversation ID is required');
    }

    if (!removeUserId) {
      throw new ApiError(400, 'User ID is required');
    }

    // ✅ Check if conversation exists and is group
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new ApiError(400, 'Cannot remove participants from one-to-one chat');
    }

    // ✅ Check if user is admin or is removing themselves
    if (!conversation.groupAdmin.equals(userId) && !userId.equals(removeUserId)) {
      throw new ApiError(403, 'Only group admin can remove participants');
    }

    // ✅ Check if user is participant
    if (!conversation.participants.some(id => id.equals(removeUserId))) {
      throw new ApiError(400, 'User is not a participant');
    }

    // ✅ Remove participant
    conversation.participants = conversation.participants.filter(
      (id) => !id.equals(removeUserId)
    );

    // ✅ If group becomes empty, delete it
    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId });
      await Conversation.findByIdAndDelete(conversationId);
      return res.status(200).json(
        new ApiResponse(200, 'Last participant removed. Group deleted.')
      );
    }

    await conversation.save();
    await conversation.populate('participants', '-password');

    return res.status(200).json(
      new ApiResponse(200, 'Participant removed successfully', conversation)
    );
  } catch (err) {
    console.error('❌ Remove participant error:', err);
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    }
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};