import mongoose from 'mongoose';

const chatRequestSchema = new mongoose.Schema(
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
      // cancelled = soft-deleted by either party (pending or after acceptance)
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    // Populated once request is accepted
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
  },
  { timestamps: true }
);

// Only one PENDING request allowed between the same two users at a time.
// Once it moves to accepted/rejected/cancelled a new one can be created.
chatRequestSchema.index(
  { senderId: 1, receiverId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

chatRequestSchema.index({ receiverId: 1, status: 1 });
chatRequestSchema.index({ senderId: 1, status: 1 });

const ChatRequest = mongoose.model('ChatRequest', chatRequestSchema);
export default ChatRequest;