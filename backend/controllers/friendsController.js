import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import mongoose from 'mongoose';
import { io } from '../server.js';

// Send Friend Request
export const sendFriendRequest = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;
  if (senderId.toString() === receiverId) {
    return res.status(400).json({ message: "You can't send a request to yourself." });
  }
  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);
  if (!receiver) return res.status(404).json({ message: 'User not found.' });
  if (sender.friends.includes(receiverId)) {
    return res.status(400).json({ message: 'Already friends.' });
  }
  if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
    return res.status(400).json({ message: 'User is blocked.' });
  }
  const existing = await FriendRequest.findOne({ senderId, receiverId, status: 'pending' });
  if (existing) return res.status(400).json({ message: 'Request already sent.' });
  const request = await FriendRequest.create({ senderId, receiverId });
  // Emit real-time event to receiver
  io.to(receiverId.toString()).emit('friend_request_received', {
    request: {
      _id: request._id,
      senderId: { _id: sender._id, name: sender.name, profilePicture: sender.profilePicture },
    }
  });
  res.json({ message: 'Friend request sent.' });
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  const request = await FriendRequest.findById(requestId);
  if (!request || request.status !== 'pending') return res.status(404).json({ message: 'Request not found.' });
  request.status = 'accepted';
  await request.save();
  await User.findByIdAndUpdate(request.senderId, { $addToSet: { friends: request.receiverId } });
  await User.findByIdAndUpdate(request.receiverId, { $addToSet: { friends: request.senderId } });
  // Emit real-time event to both users
  io.to(request.senderId.toString()).emit('friend_request_accepted', {
    userId: request.receiverId.toString(),
  });
  io.to(request.receiverId.toString()).emit('friend_request_accepted', {
    userId: request.senderId.toString(),
  });
  res.json({ message: 'Friend request accepted.' });
};

// Reject Friend Request
export const rejectFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  const request = await FriendRequest.findById(requestId);
  if (!request || request.status !== 'pending') return res.status(404).json({ message: 'Request not found.' });
  request.status = 'rejected';
  await request.save();
  // Emit real-time event to sender
  io.to(request.senderId.toString()).emit('friend_request_rejected', {
    userId: request.receiverId.toString(),
  });
  res.json({ message: 'Friend request rejected.' });
};

// Get Friends
export const getFriends = async (req, res) => {
  const user = await User.findById(req.user._id).populate('friends', 'name profilePicture isOnline lastSeen');
  res.json(user.friends);
};

// Remove Friend
export const removeFriend = async (req, res) => {
  const { friendId } = req.params;
  await User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } });
  await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } });
  // Emit real-time event to both users
  io.to(friendId.toString()).emit('friend_removed', { userId: req.user._id.toString() });
  io.to(req.user._id.toString()).emit('friend_removed', { userId: friendId.toString() });
  res.json({ message: 'Friend removed.' });
};

// Block User
export const blockUser = async (req, res) => {
  const { userId } = req.params;
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: userId }, $pull: { friends: userId } });
  await User.findByIdAndUpdate(userId, { $pull: { friends: req.user._id } });
  // Emit real-time event to blocked user
  io.to(userId.toString()).emit('user_blocked', { userId: req.user._id.toString() });
  res.json({ message: 'User blocked.' });
};

// Unblock User
export const unblockUser = async (req, res) => {
  const { userId } = req.params;
  await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
  // Emit real-time event to unblocked user
  io.to(userId.toString()).emit('user_unblocked', { userId: req.user._id.toString() });
  res.json({ message: 'User unblocked.' });
};

// Get Requests (incoming & outgoing)
export const getRequests = async (req, res) => {
  const userId = req.user._id;
  const incoming = await FriendRequest.find({ receiverId: userId, status: 'pending' }).populate('senderId', 'name profilePicture');
  const outgoing = await FriendRequest.find({ senderId: userId, status: 'pending' }).populate('receiverId', 'name profilePicture');
  res.json({ incoming, outgoing });
};

// Get Blocked Users
export const getBlockedUsers = async (req, res) => {
  const user = await User.findById(req.user._id).populate('blockedUsers', 'name profilePicture');
  res.json(user.blockedUsers);
};
