import multer from 'multer';
import path from 'path';

// Configure storage (memory storage - files stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter for profile pictures - validate file type
const profileFileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  
  // Check extension
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mime type
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true); // Accept file
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// File filter for chat media - images and videos
const chatMediaFileFilter = (req, file, cb) => {
  // Allowed image types
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  // Allowed video types
  const videoTypes = /mp4|webm|mov|avi|mkv/;
  
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mime = file.mimetype;
  
  // Check if it's an image
  if (imageTypes.test(ext) && mime.startsWith('image/')) {
    return cb(null, true);
  }
  
  // Check if it's a video
  if (videoTypes.test(ext) && mime.startsWith('video/')) {
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed.'));
};

// File filter for voice messages - audio only
const voiceMessageFileFilter = (req, file, cb) => {
  const audioTypes = /webm|mp3|wav|ogg|m4a|aac/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mime = file.mimetype;
  
  // Check if it's audio
  if (audioTypes.test(ext) || mime.startsWith('audio/')) {
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only audio files are allowed for voice messages.'));
};

// Configure multer for profile pictures
const profileUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: profileFileFilter
});

// Configure multer for chat media (higher limit for videos)
const chatMediaUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
  },
  fileFilter: chatMediaFileFilter
});

// Configure multer for voice messages
const voiceMessageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for voice messages
  },
  fileFilter: voiceMessageFileFilter
});

// Error handling middleware for multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB for media.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // Other errors (like file type validation)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Export configured upload middlewares
export const uploadSingle = profileUpload.single('profilePicture'); // For profile pictures
export const uploadChatMedia = chatMediaUpload.array('media', 5); // For chat media (up to 5 files)
export const uploadVoiceMessage = voiceMessageUpload.single('audio'); // For voice messages

export default profileUpload;
