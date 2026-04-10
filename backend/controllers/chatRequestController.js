import ChatRequest from '../models/ChatRequest.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { io } from '../server.js';

// ─── Helper: check block status ────────────────────────
const checkBlocked = async (userAId, userBId) => {
  const [a, b] = await Promise.all([
    User.findById(userAId).select('blockedUsers'),
    User.findById(userBId).select('blockedUsers'),
  ]);
  return (
    a?.blockedUsers?.some(id => id.toString() === userBId.toString()) ||
    b?.blockedUsers?.some(id => id.toString() === userAId.toString())
  );
};

// ─── Send Chat Request ─────────────────────────────────
export const sendChatRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (!receiverId)
      return res.status(400).json(new ApiResponse(400, 'receiverId is required'));
    if (senderId.toString() === receiverId)
      return res.status(400).json(new ApiResponse(400, "You can't send a request to yourself"));

    const receiver = await User.findById(receiverId);
    if (!receiver)
      return res.status(404).json(new ApiResponse(404, 'User not found'));

    if (await checkBlocked(senderId, receiverId))
      return res.status(403).json(new ApiResponse(403, 'Action not allowed'));

    // Already connected via an accepted request → just return conversation
    const existingConv = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiverId] },
    });
    if (existingConv)
      return res.status(400).json(new ApiResponse(400, 'Already connected', {
        conversationId: existingConv._id,
      }));

    // Mutual request → auto-accept
    const reverseRequest = await ChatRequest.findOne({
      senderId: receiverId,
      receiverId: senderId,
      status: 'pending',
    });
    if (reverseRequest) {
      const conversation = await Conversation.create({
        participants: [senderId, receiverId],
        isGroup: false,
      });
      await conversation.populate('participants', 'name email profilePicture');

      reverseRequest.status = 'accepted';
      reverseRequest.conversationId = conversation._id;
      await reverseRequest.save();

      [senderId.toString(), receiverId.toString()].forEach(uid => {
        io.to(uid).emit('chat_request_accepted', {
          requestId: reverseRequest._id,
          conversationId: conversation._id,
          conversation,
        });
      });

      return res.json(new ApiResponse(200, 'Mutual request — you are now connected!', {
        status: 'accepted',
        conversationId: conversation._id,
        conversation,
      }));
    }

    // Check for duplicate pending
    const duplicate = await ChatRequest.findOne({ senderId, receiverId, status: 'pending' });
    if (duplicate)
      return res.status(400).json(new ApiResponse(400, 'Request already sent'));

    const sender = await User.findById(senderId).select('name email profilePicture');
    const request = await ChatRequest.create({ senderId, receiverId });

    io.to(receiverId.toString()).emit('chat_request_received', {
      request: {
        _id: request._id,
        senderId: {
          _id: sender._id,
          name: sender.name,
          email: sender.email,
          profilePicture: sender.profilePicture,
        },
        createdAt: request.createdAt,
      },
    });

    return res.status(201).json(new ApiResponse(201, 'Chat request sent', request));
  } catch (err) {
    console.error('sendChatRequest:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Accept Chat Request ───────────────────────────────
export const acceptChatRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const request = await ChatRequest.findById(requestId);
    if (!request || request.status !== 'pending')
      return res.status(404).json(new ApiResponse(404, 'Request not found'));

    if (request.receiverId.toString() !== userId.toString())
      return res.status(403).json(new ApiResponse(403, 'Not authorized'));

    const conversation = await Conversation.create({
      participants: [request.senderId, request.receiverId],
      isGroup: false,
    });
    await conversation.populate('participants', 'name email profilePicture');

    request.status = 'accepted';
    request.conversationId = conversation._id;
    await request.save();

    [request.senderId.toString(), request.receiverId.toString()].forEach(uid => {
      io.to(uid).emit('chat_request_accepted', {
        requestId: request._id,
        conversationId: conversation._id,
        conversation,
      });
    });

    return res.json(new ApiResponse(200, 'Request accepted', {
      conversationId: conversation._id,
      conversation,
    }));
  } catch (err) {
    console.error('acceptChatRequest:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Reject Chat Request ───────────────────────────────
export const rejectChatRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const request = await ChatRequest.findById(requestId);
    if (!request || request.status !== 'pending')
      return res.status(404).json(new ApiResponse(404, 'Request not found'));

    if (request.receiverId.toString() !== userId.toString())
      return res.status(403).json(new ApiResponse(403, 'Not authorized'));

    request.status = 'rejected';
    await request.save();

    io.to(request.senderId.toString()).emit('chat_request_rejected', {
      requestId: request._id,
    });

    return res.json(new ApiResponse(200, 'Request rejected'));
  } catch (err) {
    console.error('rejectChatRequest:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Cancel Outgoing Pending Request ──────────────────
// Only sender can cancel a PENDING request they sent.
export const cancelChatRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const request = await ChatRequest.findOne({
      _id: requestId,
      senderId: userId,
      status: 'pending',
    });
    if (!request)
      return res.status(404).json(new ApiResponse(404, 'Pending request not found'));

    await request.deleteOne();

    io.to(request.receiverId.toString()).emit('chat_request_cancelled', {
      requestId: request._id,
    });

    return res.json(new ApiResponse(200, 'Request cancelled'));
  } catch (err) {
    console.error('cancelChatRequest:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── DELETE Chat Request ───────────────────────────────
// Works for ANY status (pending, accepted, rejected, cancelled).
// Either the sender OR the receiver can delete.
// After deletion, either party can send a fresh request again.
export const deleteChatRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ChatRequest.findById(requestId);

    if (!request)
      return res.status(404).json(new ApiResponse(404, 'Chat request not found'));

    // Only participants of the request can delete it
    const isSender   = request.senderId.toString()   === userId.toString();
    const isReceiver = request.receiverId.toString()  === userId.toString();

    if (!isSender && !isReceiver)
      return res.status(403).json(new ApiResponse(403, 'Not authorized to delete this request'));

    const otherUserId = isSender
      ? request.receiverId.toString()
      : request.senderId.toString();

    const previousStatus = request.status;

    // Hard-delete the request record so a new one can be created freely
    await request.deleteOne();

    // Notify the other party so their UI updates instantly
    io.to(otherUserId).emit('chat_request_deleted', {
      requestId: request._id,
      deletedBy: userId,
      previousStatus,
    });

    return res.json(new ApiResponse(200, 'Chat request deleted. You can now send a new request.', {
      requestId: request._id,
      previousStatus,
    }));
  } catch (err) {
    console.error('deleteChatRequest:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── DELETE by target user ID (simpler URL pattern) ───
// DELETE /api/chat-requests/with/:targetUserId
// Deletes whatever request exists between the two users regardless of direction.
// This is more convenient for the frontend — just pass the other user's ID.
export const deleteChatRequestByUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    if (userId.toString() === targetUserId)
      return res.status(400).json(new ApiResponse(400, 'Invalid target'));

    // Find any request between these two users (either direction, any status)
    const request = await ChatRequest.findOne({
      $or: [
        { senderId: userId,       receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId },
      ],
    });

    if (!request)
      return res.status(404).json(new ApiResponse(404, 'No chat request found between these users'));

    const previousStatus = request.status;
    const requestId = request._id;

    await request.deleteOne();

    // Notify the other party
    io.to(targetUserId.toString()).emit('chat_request_deleted', {
      requestId,
      deletedBy: userId,
      previousStatus,
    });

    return res.json(new ApiResponse(200, 'Chat request deleted. A fresh request can now be sent.', {
      requestId,
      previousStatus,
    }));
  } catch (err) {
    console.error('deleteChatRequestByUser:', err);
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Get My Requests ───────────────────────────────────
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const [incoming, outgoing] = await Promise.all([
      ChatRequest.find({ receiverId: userId, status: 'pending' })
        .populate('senderId', 'name email profilePicture')
        .sort({ createdAt: -1 }),
      ChatRequest.find({ senderId: userId, status: 'pending' })
        .populate('receiverId', 'name email profilePicture')
        .sort({ createdAt: -1 }),
    ]);
    return res.json(new ApiResponse(200, 'Requests fetched', { incoming, outgoing }));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Get Connection Status with a Specific User ────────
export const getConnectionStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;

    const [conversation, outgoing, incoming, currentUser] = await Promise.all([
      Conversation.findOne({
        isGroup: false,
        participants: { $all: [userId, targetUserId] },
      }),
      ChatRequest.findOne({ senderId: userId, receiverId: targetUserId, status: 'pending' }),
      ChatRequest.findOne({ senderId: targetUserId, receiverId: userId, status: 'pending' }),
      User.findById(userId).select('blockedUsers'),
    ]);

    const isBlocked = currentUser.blockedUsers?.some(
      id => id.toString() === targetUserId
    );

    let status = 'none';
    let requestId = null;
    let conversationId = null;

    if (isBlocked) {
      status = 'blocked';
    } else if (conversation) {
      status = 'connected';
      conversationId = conversation._id;
    } else if (outgoing) {
      status = 'requested';
      requestId = outgoing._id;
    } else if (incoming) {
      status = 'incoming';
      requestId = incoming._id;
    }

    return res.json(new ApiResponse(200, 'Status fetched', {
      status, requestId, conversationId,
    }));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Block User ────────────────────────────────────────
export const blockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;

    if (userId.toString() === targetUserId)
      return res.status(400).json(new ApiResponse(400, "Can't block yourself"));

    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: targetUserId },
    });

    // Remove any pending requests between them
    await ChatRequest.deleteMany({
      $or: [
        { senderId: userId,       receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId },
      ],
      status: 'pending',
    });

    io.to(targetUserId.toString()).emit('user_blocked_by', {
      userId: userId.toString(),
    });

    return res.json(new ApiResponse(200, 'User blocked'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Unblock User ──────────────────────────────────────
export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;

    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetUserId },
    });

    io.to(targetUserId.toString()).emit('user_unblocked_by', {
      userId: userId.toString(),
    });

    return res.json(new ApiResponse(200, 'User unblocked'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};

// ─── Get Blocked Users ─────────────────────────────────
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name email profilePicture');
    return res.json(new ApiResponse(200, 'Blocked users', user.blockedUsers));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, 'Server error'));
  }
};