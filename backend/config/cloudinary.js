import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS
});

// Validate configuration
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Cloudinary configuration incomplete. Missing:', missing.join(', '));
    console.warn('⚠️  Profile picture upload will not work until configured.');
    return false;
  }
  
  console.log('✅ Cloudinary configured successfully');
  return true;
};

// Test connection (optional, for debugging)
export const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return false;
  }
};

// Helper function to upload image
export const uploadImage = async (filePath, folder = 'profile-pictures') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // Smart crop focusing on face
        { quality: 'auto:good' }, // Automatic quality optimization
        { fetch_format: 'auto' } // Automatic format selection (WebP for supported browsers)
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    });
    
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Helper function to upload chat media (images/videos)
export const uploadChatMedia = async (filePath, resourceType = 'image') => {
  try {
    const options = {
      folder: 'chat-media',
      resource_type: resourceType,
    };

    // Different transformations for images vs videos
    if (resourceType === 'image') {
      options.transformation = [
        { width: 1200, height: 1200, crop: 'limit' }, // Max dimensions
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    } else if (resourceType === 'video') {
      options.eager = [
        { width: 300, height: 300, crop: 'pad', audio_codec: 'none', format: 'jpg' } // Thumbnail
      ];
      options.eager_async = true;
    }

    const result = await cloudinary.uploader.upload(filePath, options);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      duration: result.duration || null,
      format: result.format,
      bytes: result.bytes,
      thumbnail: resourceType === 'video' && result.eager?.[0]?.secure_url 
        ? result.eager[0].secure_url 
        : null
    };
  } catch (error) {
    console.error('❌ Cloudinary chat media upload error:', error);
    throw new Error('Failed to upload media');
  }
};

// Helper function to upload voice messages (audio)
export const uploadVoiceMessage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'voice-messages',
      resource_type: 'video', // Cloudinary uses 'video' for audio files too
    });
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration || null,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('❌ Cloudinary voice message upload error:', error);
    throw new Error('Failed to upload voice message');
  }
};

// Helper function to delete image
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'ok') {
      console.log('✅ Image deleted from Cloudinary:', publicId);
      return true;
    } else {
      console.warn('⚠️  Image deletion result:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicId = (url) => {
  if (!url) return null;
  
  try {
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/filename.ext
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload' and version number
    const pathParts = parts.slice(uploadIndex + 2); // Skip 'upload' and version
    const fullPath = pathParts.join('/');
    
    // Remove file extension
    const publicId = fullPath.replace(/\.[^/.]+$/, '');
    return publicId;
  } catch (error) {
    console.error('❌ Failed to extract public ID from URL:', url);
    return null;
  }
};

// Initialize configuration
validateCloudinaryConfig();

export default cloudinary;
