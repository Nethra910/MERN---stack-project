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
    roles: {
      type: Map,
      of: {
        type: String,
        enum: ['admin', 'moderator', 'member'],
        default: 'member',
      },
      default: {},
    },
    groupRules: {
      text: {
        type: String,
        default: '',
        maxlength: [2000, 'Rules exceed maximum length'],
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    inviteLinks: [
      {
        code: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: null },
        maxUses: { type: Number, default: 0 },
        uses: { type: Number, default: 0 },
        revoked: { type: Boolean, default: false },
      },
    ],
    joinRequests: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
      },
    ],
    pinnedMessages: [
      {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        pinnedAt: { type: Date, default: Date.now },
      },
    ],
    groupSettings: {
      linkJoinEnabled: { type: Boolean, default: true },
      joinApprovalRequired: { type: Boolean, default: true },
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
    // 📌 Pin conversations per user
    pinnedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        pinnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // 📖 Track when each user last read the conversation
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
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