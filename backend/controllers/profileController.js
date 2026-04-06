import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import bcrypt from 'bcryptjs';
import { uploadImage, deleteImage, extractPublicId } from '../config/cloudinary.js';
import { sanitizeInput, validatePasswordStrength } from '../utils/validators.js';
import fs from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

// ═══════════════════════════════════════════════════════════════
// 📸 UPLOAD PROFILE PICTURE
// ═══════════════════════════════════════════════════════════════
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image.'
      });
    }

    // Get user to check for existing profile picture
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePicture) {
      const oldPublicId = extractPublicId(user.profilePicture);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (error) {
          console.warn('⚠️  Failed to delete old profile picture:', error.message);
          // Continue anyway - don't fail the upload
        }
      }
    }

    // Upload new image to Cloudinary
    // Convert buffer to base64 data URI for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    const { url } = await uploadImage(dataURI, 'profile-pictures');

    // Update user record
    user.profilePicture = url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: url
    });

  } catch (error) {
    console.error('❌ Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture. Please try again.',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🗑️  DELETE PROFILE PICTURE
// ═══════════════════════════════════════════════════════════════
export const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'No profile picture to delete'
      });
    }

    // Extract public ID and delete from Cloudinary
    const publicId = extractPublicId(user.profilePicture);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (error) {
        console.warn('⚠️  Failed to delete from Cloudinary:', error.message);
        // Continue anyway
      }
    }

    // Remove from database
    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile picture',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📝 UPDATE BIO
// ═══════════════════════════════════════════════════════════════
export const updateBio = async (req, res) => {
  try {
    const userId = req.user.id;
    let { bio } = req.body;

    // Validate bio length
    if (bio && bio.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Bio cannot exceed 200 characters'
      });
    }

    // Sanitize bio (remove HTML/XSS)
    bio = sanitizeInput(bio || '');

    // Update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.bio = bio;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Bio updated successfully',
      bio: user.bio
    });

  } catch (error) {
    console.error('❌ Update bio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bio',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 👤 UPDATE NAME
// ═══════════════════════════════════════════════════════════════
export const updateName = async (req, res) => {
  try {
    const userId = req.user.id;
    let { name } = req.body;

    // Validate name
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
      });
    }

    if (name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 50 characters'
      });
    }

    // Sanitize name
    name = sanitizeInput(name.trim());

    // Update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.name = name;
    await user.save();

    // TODO: Broadcast name update via socket.io to update UI in real-time

    res.status(200).json({
      success: true,
      message: 'Name updated successfully',
      name: user.name
    });

  } catch (error) {
    console.error('❌ Update name error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update name',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔑 CHANGE PASSWORD
// ═══════════════════════════════════════════════════════════════
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    // Validate inputs
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both old and new passwords'
      });
    }

    // Get user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12); // 12 rounds for security
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again for security.'
    });

    // TODO: Consider invalidating all existing JWT tokens for this user

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🗑️  DELETE ACCOUNT
// ═══════════════════════════════════════════════════════════════
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Require password confirmation
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation required to delete account'
      });
    }

    // Get user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Account deletion cancelled.'
      });
    }

    // Delete profile picture from Cloudinary
    if (user.profilePicture) {
      const publicId = extractPublicId(user.profilePicture);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (error) {
          console.warn('⚠️  Failed to delete profile picture during account deletion:', error.message);
        }
      }
    }

    // Delete user's messages (or mark as deleted by user)
    // Option 1: Hard delete
    await Message.deleteMany({ sender: userId });
    
    // Option 2: Soft delete (keep messages but mark sender as deleted)
    // await Message.updateMany({ sender: userId }, { sender: null, senderDeleted: true });

    // Delete conversations where user is the only participant
    const conversations = await Conversation.find({ participants: userId });
    for (const conversation of conversations) {
      if (conversation.participants.length === 1) {
        // User is the only participant - delete conversation
        await Conversation.findByIdAndDelete(conversation._id);
        await Message.deleteMany({ conversationId: conversation._id });
      } else {
        // Remove user from participants
        await Conversation.findByIdAndUpdate(conversation._id, {
          $pull: { participants: userId }
        });
      }
    }

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully. We\'re sorry to see you go.'
    });

    // TODO: Revoke JWT token (add to blacklist or use token versioning)
    
  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account. Please try again or contact support.',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📊 GET PROFILE
// ═══════════════════════════════════════════════════════════════
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};
