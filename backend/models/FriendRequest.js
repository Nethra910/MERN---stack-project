import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate pending requests between the same two users
friendRequestSchema.index(
  { senderId: 1, receiverId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

// Speed up lookups by receiver (for incoming requests)
friendRequestSchema.index({ receiverId: 1, status: 1 });
// Speed up lookups by sender (for outgoing requests)
friendRequestSchema.index({ senderId: 1, status: 1 });

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

export default FriendRequest;