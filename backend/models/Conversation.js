import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: null,
      trim: true,
    },
    groupImage: {
      type: String,
      default: null,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessage: {
      type: String,
      default: null,
    },
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessageTime: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: null,
      maxlength: [500, 'Description exceeds maximum length'],
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Indexes for performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTime: -1 });
conversationSchema.index({ 'participants': 1, 'lastMessageTime': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;