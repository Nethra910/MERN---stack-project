import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'], // ✅ Added error message
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'], // ✅ Added validation
      maxlength: [50, 'Name cannot exceed 50 characters'] // ✅ Added validation
    },

    email: {
      type: String,
      required: [true, 'Email is required'], // ✅ Added error message
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] // ✅ Added email validation
    },

    password: {
      type: String,
      required: [true, 'Password is required'], // ✅ Added error message
      minlength: [6, 'Password must be at least 6 characters'] // ✅ Added validation with message
    },

    // 👤 Profile Fields
    profilePicture: {
      type: String,
      default: null,
      trim: true
    },

    bio: {
      type: String,
      default: '',
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      trim: true
    },

    // 🔐 Email Verification
    isVerified: {
      type: Boolean,
      default: false
    },

    verificationToken: {
      type: String,
      default: null
    },

    verificationTokenExpiry: {
      type: Date,
      default: null
    },

    // 🔑 Forgot / Reset Password
    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpiry: {
      type: Date,
      default: null
    },

    // 🟢 Last Seen (for online status)
    lastSeen: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true // ✅ Automatically adds createdAt and updatedAt
  }
);

// ✅ Add indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

const User = mongoose.model('User', userSchema);

export default User;