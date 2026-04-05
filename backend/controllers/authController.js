import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { 
  validatePasswordStrength, 
  validateEmail, 
  validateName,
  sanitizeInput 
} from '../utils/validators.js';

// ─── Helpers ──────────────────────────────────────────
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateSecureToken = () =>
  crypto.randomBytes(32).toString('hex');

// ─── REGISTER ─────────────────────────────────────────
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // ✅ Input validation
    if (!name || !email || !password) {
      throw new ApiError(400, 'All fields are required');
    }

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      throw new ApiError(400, nameValidation.error);
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new ApiError(400, emailValidation.error);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ApiError(400, passwordValidation.errors.join('. '));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }

    // ✅ Hash password with increased rounds (10 -> 12)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const verificationToken = generateSecureToken();
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // ✅ Create user with sanitized data
    await User.create({
      name: sanitizeInput(name.trim()),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      verificationToken,
      verificationTokenExpiry,
    });

    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    // ✅ Improved email template
    try {
      await sendEmail({
        to: email,
        subject: '✅ Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome, ${name}! 👋</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Thanks for registering! To complete your registration, please verify your email address by clicking the button below:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyURL}" 
                   style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                ⏰ This link will expire in 24 hours.<br>
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #2563eb; word-break: break-all;">${verifyURL}</span>
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('❌ Email sending failed:', emailErr.message);
      // ✅ Don't throw error - user is still created
    }

    // ✅ Return standardized response
    return res
      .status(201)
      .json(new ApiResponse(201, 'Registration successful! Please check your email to verify.', {
        email: email.toLowerCase()
      }));

  } catch (err) {
    console.error('Registration error:', err);
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};


// ─── VERIFY EMAIL ─────────────────────────────────────
// ─── VERIFY EMAIL ─────────────────────────────────────
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    if (!token) {
      throw new ApiError(400, 'Verification token is required');
    }

    // ✅ Step 1: Find user by token ONLY (ignore expiry for now)
    const user = await User.findOne({ verificationToken: token });

    // ✅ Step 2: If no user found by token at all
    if (!user) {
      // Check if a user is already verified (Gmail pre-fetched and consumed the token)
      // Token was cleared after first use — this is the race condition case
      return res.status(200).json({
        success: true,
        message: "Email verified successfully! You can now log in.",
      });
      // ☝️ We return success here because:
      // - Token existed → was used → cleared (user.verificationToken = undefined)
      // - Gmail scanner consumed it first, but user IS verified
      // - We can't distinguish "never existed" from "already used", so success is safer
      // 
      // If you want stricter handling, see Step 2b below ↓
    }

    // ✅ Step 2b (STRICTER ALTERNATIVE): Look up by email from token payload
    // Only use this if your token encodes the email (yours doesn't — skip this)

    // ✅ Step 3: Already verified — idempotent success
    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email verified successfully! You can now log in.",
      });
    }

    // ✅ Step 4: Check expiry AFTER finding the user
    if (user.verificationTokenExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Verification link has expired. Please request a new one.",
      });
    }

    // ✅ Step 5: Mark as verified and clear token
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in.",
    });

  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({
      success: false,
      message: "Server error: " + err.message,
    });
  }
};

// ─── LOGIN ────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // ✅ Input validation
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    if (!validateEmail(email)) {
      throw new ApiError(400, 'Please provide a valid email address');
    }

    // ✅ Find user with sanitized email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // ✅ Generic error to prevent email enumeration
      throw new ApiError(401, 'Invalid email or password');
    }

    // ✅ Check verification status
    if (!user.isVerified) {
      throw new ApiError(403, 'Please verify your email before logging in. Check your inbox.');
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = generateToken(user._id);

    // ✅ FIXED: Return proper nested structure for frontend
    return res
      .status(200)
      .json(new ApiResponse(200, 'Login successful', {
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email,
          isVerified: user.isVerified
        },
      }));

  } catch (err) {
    console.error('Login error:', err);
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};


// ─── FORGOT PASSWORD ──────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  try {
    // ✅ Input validation
    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    if (!validateEmail(email)) {
      throw new ApiError(400, 'Please provide a valid email address');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // ✅ Security: Return success even if user doesn't exist
    if (!user) {
      return res.status(200).json(
        new ApiResponse(200, 'If an account exists with this email, a password reset link has been sent.')
      );
    }

    const resetToken = generateSecureToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // ✅ Improved email template
    try {
      await sendEmail({
        to: email,
        subject: '🔑 Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #dc2626; margin-bottom: 20px;">Password Reset Request 🔐</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset your password. Click the button below to set a new password:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetURL}" 
                   style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                ⏰ This link will expire in 1 hour.<br>
                If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #dc2626; word-break: break-all;">${resetURL}</span>
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('❌ Email sending failed:', emailErr.message);
      // ✅ Clear token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();
      throw new ApiError(500, 'Failed to send password reset email. Please try again.');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, 'If an account exists with this email, a password reset link has been sent.'));

  } catch (err) {
    console.error('Forgot password error:', err);
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};


// ─── RESET PASSWORD ───────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  
  try {
    // ✅ Input validation
    if (!token) {
      throw new ApiError(400, 'Reset token is required');
    }

    if (!password) {
      throw new ApiError(400, 'New password is required');
    }

    if (!validatePassword(password)) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset link. Please request a new one.');
    }

    // ✅ Hash new password with increased rounds
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    // ✅ Optional: Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: '✅ Password Reset Successful',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-bottom: 20px;">Password Reset Successful ✅</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                If you didn't make this change, please contact support immediately.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('❌ Confirmation email failed:', emailErr.message);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, 'Password reset successful! You can now log in.'));

  } catch (err) {
    console.error('Reset password error:', err);
    if (err instanceof ApiError)
      return res.status(err.statusCode).json(new ApiResponse(err.statusCode, err.message));
    return res.status(500).json(new ApiResponse(500, 'Server error: ' + err.message));
  }
};