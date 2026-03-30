import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// GET /api/chat/conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/chat/conversations
export const createConversation = async (req, res) => {
  try {
    const { participantId, isGroup, groupName, participantIds } = req.body;

    if (isGroup) {
      if (!groupName || !participantIds || participantIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Group name and at least 2 participants are required',
        });
      }

      const participants = [req.user._id, ...participantIds];
      const conversation = await Conversation.create({
        participants,
        isGroup: true,
        groupName,
        groupAdmin: req.user._id,
      });

      const populated = await conversation.populate('participants', 'name email');
      return res.status(201).json({ success: true, data: populated });
    }

    if (!participantId) {
      return res.status(400).json({ success: false, message: 'Participant ID is required' });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot create conversation with yourself' });
    }

    const existing = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId] },
    }).populate('participants', 'name email');

    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      isGroup: false,
    });

    const populated = await conversation.populate('participants', 'name email');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/conversations/:id/messages
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/chat/conversations/:id/messages
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const message = await Message.create({
      conversation: id,
      sender: req.user._id,
      content: content.trim(),
      readBy: [req.user._id],
    });

    await message.populate('sender', 'name email');

    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/chat/conversations/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Message.updateMany(
      { conversation: id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/users/search?q=
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ success: true, data: [] });
    }

    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const users = await User.find({
      _id: { $ne: req.user._id },
      isVerified: true,
      $or: [{ name: regex }, { email: regex }],
    })
      .select('name email')
      .limit(20);

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/chat/conversations/:id
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Message.deleteMany({ conversation: id });
    await conversation.deleteOne();

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/chat/conversations/:id/participants
export const addParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findOne({
      _id: id,
      groupAdmin: req.user._id,
      isGroup: true,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group conversation not found or not authorized' });
    }

    if (conversation.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User already in group' });
    }

    conversation.participants.push(userId);
    await conversation.save();

    const populated = await conversation.populate('participants', 'name email');
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/chat/conversations/:id/participants/:userId
export const removeParticipant = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      groupAdmin: req.user._id,
      isGroup: true,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group conversation not found or not authorized' });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== userId
    );
    await conversation.save();

    const populated = await conversation.populate('participants', 'name email');
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
