import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Edit2, 
  Save, 
  X,
  Camera,
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Loader,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ModernProfile() {
  const navigate = useNavigate();
  const {
    isLoading,
    uploadProfilePicture,
    deleteProfilePicture,
    updateBio,
    updateName,
    changePassword,
    deleteAccount
  } = useProfile();

  // Get user from localStorage and listen for updates
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  
  const fileInputRef = useRef(null);

  // Form states
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    password: '',
    checked: false
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  // ═══════════════════════════════════════════════════════════════
  // PROFILE PICTURE HANDLERS
  // ═══════════════════════════════════════════════════════════════
  
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    const result = await uploadProfilePicture(file);
    setUploadingPicture(false);

    if (result.success) {
      toast.success('Profile picture updated!');
    } else {
      toast.error(result.error || 'Failed to upload picture');
    }
  };

  const handleDeletePicture = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) return;

    const result = await deleteProfilePicture();
    if (result.success) {
      toast.success('Profile picture deleted');
    } else {
      toast.error(result.error || 'Failed to delete picture');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // NAME UPDATE HANDLER
  // ═══════════════════════════════════════════════════════════════
  
  const handleSaveName = async () => {
    if (nameInput.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    const result = await updateName(nameInput.trim());
    if (result.success) {
      toast.success('Name updated successfully!');
      setIsEditingName(false);
    } else {
      toast.error(result.error || 'Failed to update name');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // BIO UPDATE HANDLER
  // ═══════════════════════════════════════════════════════════════
  
  const handleSaveBio = async () => {
    if (bioInput.length > 200) {
      toast.error('Bio cannot exceed 200 characters');
      return;
    }

    const result = await updateBio(bioInput);
    if (result.success) {
      toast.success('Bio updated successfully!');
      setIsEditingBio(false);
    } else {
      toast.error(result.error || 'Failed to update bio');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD CHANGE HANDLER
  // ═══════════════════════════════════════════════════════════════
  
  const handleChangePassword = async (e) => {
    e.preventDefault();

    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    // Validate
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    const result = await changePassword(oldPassword, newPassword);
    if (result.success) {
      toast.success('Password changed successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      toast.error(result.error || 'Failed to change password');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DELETE ACCOUNT HANDLER
  // ═══════════════════════════════════════════════════════════════
  
  const handleDeleteAccount = async () => {
    if (!deleteConfirm.checked) {
      toast.error('Please confirm account deletion');
      return;
    }

    if (!deleteConfirm.password) {
      toast.error('Please enter your password');
      return;
    }

    const result = await deleteAccount(deleteConfirm.password);
    if (result.success) {
      toast.success('Account deleted. Goodbye!');
      setTimeout(() => {
        logout();
      }, 1500);
    } else {
      toast.error(result.error || 'Failed to delete account');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Profile Info */}
          <div className="px-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 relative">
              {/* Avatar */}
              <div className="flex items-end gap-6 mb-4 md:mb-0">
                <div className="relative group">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      className="w-32 h-32 rounded-2xl object-cover shadow-xl border-4 border-white"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  
                  {/* Upload/Delete Overlay */}
                  <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                      title="Upload picture"
                    >
                      {uploadingPicture ? (
                        <Loader className="w-5 h-5 text-gray-700 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-gray-700" />
                      )}
                    </button>
                    {user?.profilePicture && (
                      <button
                        onClick={handleDeletePicture}
                        disabled={isLoading}
                        className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition"
                        title="Delete picture"
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'User'}</h1>
                  <p className="text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email || 'email@example.com'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100">
            <div className="flex gap-1 px-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition relative ${
                      activeTab === tab.id
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

              {/* Name Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Enter your name"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isLoading}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setNameInput(user?.name || '');
                      }}
                      className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{user?.name || 'Not set'}</span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Email Field (Read-only) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-500">
                  {user?.email || 'Not set'}
                </div>
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              {/* Bio Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                  <span className="text-gray-400 text-xs ml-2">
                    ({bioInput.length}/200)
                  </span>
                </label>
                {isEditingBio ? (
                  <div>
                    <textarea
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      maxLength={200}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Tell us about yourself..."
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleSaveBio}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingBio(false);
                          setBioInput(user?.bio || '');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-700 min-h-[100px]">
                      {user?.bio || 'No bio yet. Click edit to add one.'}
                    </div>
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="absolute top-2 right-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Change Password */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  Change Password
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Old Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.old ? 'text' : 'password'}
                        value={passwordForm.oldPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.old ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Change Password
                      </>
                    )}
                  </button>
                </form>

                <p className="text-xs text-gray-500 mt-4">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>

              {/* Delete Account */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Danger Zone
                </h2>
                <p className="text-red-700 mb-4">
                  Once you delete your account, there is no going back. All your data, messages, and profile will be permanently deleted.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
              <p className="text-gray-500">Notification settings coming soon...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Account Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
                </div>

                <p className="text-gray-600 mb-6">
                  This action cannot be undone. All your data, messages, conversations, and profile picture will be permanently deleted.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your password to confirm
                    </label>
                    <input
                      type="password"
                      value={deleteConfirm.password}
                      onChange={(e) => setDeleteConfirm({ ...deleteConfirm, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder="Your password"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteConfirm.checked}
                      onChange={(e) => setDeleteConfirm({ ...deleteConfirm, checked: e.target.checked })}
                      className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      I understand that this action is permanent and cannot be reversed
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirm({ password: '', checked: false });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isLoading || !deleteConfirm.checked || !deleteConfirm.password}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Forever
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
