import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import { io } from '../server.js';

// ─── Send Friend Request ───────────────────────────────────────────────────
export const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) return res.status(400).json({ message: 'receiverId is required.' });
    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "You can't send a request to yourself." });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);

    if (!receiver) return res.status(404).json({ message: 'User not found.' });

    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'Already friends.' });
    }

    if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
      return res.status(400).json({ message: 'Action not allowed.' });
    }

    // Check if receiver already sent a request to sender → auto-accept
    const reverseRequest = await FriendRequest.findOne({
      senderId: receiverId,
      receiverId: senderId,
      status: 'pending',
    });
    if (reverseRequest) {
      reverseRequest.status = 'accepted';
      await reverseRequest.save();
      await Promise.all([
        User.findByIdAndUpdate(senderId, { $addToSet: { friends: receiverId } }),
        User.findByIdAndUpdate(receiverId, { $addToSet: { friends: senderId } }),
      ]);
      io.to(receiverId.toString()).emit('friend_request_accepted', { userId: senderId.toString() });
      io.to(senderId.toString()).emit('friend_request_accepted', { userId: receiverId.toString() });
      return res.json({ message: 'You had a mutual request — you are now friends!' });
    }

    // Check for existing pending request
    const existing = await FriendRequest.findOne({ senderId, receiverId, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'Request already sent.' });

    const request = await FriendRequest.create({ senderId, receiverId });

    io.to(receiverId.toString()).emit('friend_request_received', {
      request: {
        _id: request._id,
        senderId: {
          _id: sender._id,
          name: sender.name,
          profilePicture: sender.profilePicture,
        },
        createdAt: request.createdAt,
      },
    });

    res.json({ message: 'Friend request sent.' });
  } catch (e) {
    console.error('sendFriendRequest error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Accept Friend Request ─────────────────────────────────────────────────
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ message: 'requestId is required.' });

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found or already handled.' });
    }

    // Only the receiver can accept
    if (request.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    request.status = 'accepted';
    await request.save();

    await Promise.all([
      User.findByIdAndUpdate(request.senderId, { $addToSet: { friends: request.receiverId } }),
      User.findByIdAndUpdate(request.receiverId, { $addToSet: { friends: request.senderId } }),
    ]);

    io.to(request.senderId.toString()).emit('friend_request_accepted', {
      userId: request.receiverId.toString(),
    });
    io.to(request.receiverId.toString()).emit('friend_request_accepted', {
      userId: request.senderId.toString(),
    });

    res.json({ message: 'Friend request accepted.' });
  } catch (e) {
    console.error('acceptFriendRequest error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Reject Friend Request ─────────────────────────────────────────────────
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ message: 'requestId is required.' });

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found.' });
    }

    if (request.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    request.status = 'rejected';
    await request.save();

    io.to(request.senderId.toString()).emit('friend_request_rejected', {
      userId: request.receiverId.toString(),
    });

    res.json({ message: 'Friend request rejected.' });
  } catch (e) {
    console.error('rejectFriendRequest error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Cancel Outgoing Friend Request ───────────────────────────────────────
export const cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ message: 'requestId is required.' });

    const request = await FriendRequest.findOne({
      _id: requestId,
      senderId: req.user._id,
      status: 'pending',
    });

    if (!request) return res.status(404).json({ message: 'Request not found.' });

    await request.deleteOne();

    io.to(request.receiverId.toString()).emit('friend_request_cancelled', {
      requestId: request._id.toString(),
    });

    res.json({ message: 'Friend request cancelled.' });
  } catch (e) {
    console.error('cancelFriendRequest error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Get Friends ───────────────────────────────────────────────────────────
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'friends',
      'name profilePicture isOnline lastSeen bio'
    );
    res.json(user.friends);
  } catch (e) {
    console.error('getFriends error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Remove Friend ─────────────────────────────────────────────────────────
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: 'User not found.' });

    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),
      // Clean up any accepted friend request records between them
      FriendRequest.deleteMany({
        $or: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      }),
    ]);

    io.to(friendId.toString()).emit('friend_removed', { userId: userId.toString() });
    io.to(userId.toString()).emit('friend_removed', { userId: friendId.toString() });

    res.json({ message: 'Friend removed.' });
  } catch (e) {
    console.error('removeFriend error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Block User ────────────────────────────────────────────────────────────
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "You can't block yourself." });
    }

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $addToSet: { blockedUsers: userId },
        $pull: { friends: userId },
      }),
      User.findByIdAndUpdate(userId, { $pull: { friends: currentUserId } }),
      FriendRequest.deleteMany({
        $or: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
        status: 'pending',
      }),
    ]);

    io.to(userId.toString()).emit('user_blocked', { userId: currentUserId.toString() });

    res.json({ message: 'User blocked.' });
  } catch (e) {
    console.error('blockUser error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Unblock User ──────────────────────────────────────────────────────────
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
    io.to(userId.toString()).emit('user_unblocked', { userId: req.user._id.toString() });
    res.json({ message: 'User unblocked.' });
  } catch (e) {
    console.error('unblockUser error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Get Friend Requests (incoming & outgoing) ─────────────────────────────
export const getRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ receiverId: userId, status: 'pending' })
        .populate('senderId', 'name profilePicture bio')
        .sort({ createdAt: -1 }),
      FriendRequest.find({ senderId: userId, status: 'pending' })
        .populate('receiverId', 'name profilePicture bio')
        .sort({ createdAt: -1 }),
    ]);
    res.json({ incoming, outgoing });
  } catch (e) {
    console.error('getRequests error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Get Blocked Users ─────────────────────────────────────────────────────
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'blockedUsers',
      'name profilePicture bio'
    );
    res.json(user.blockedUsers);
  } catch (e) {
    console.error('getBlockedUsers error:', e);
    res.status(500).json({ message: 'Server error.' });
  }
};