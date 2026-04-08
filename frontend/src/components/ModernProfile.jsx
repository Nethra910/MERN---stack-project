import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Save, 
  X,
  Camera,
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ModernProfile() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    location: '',
    bio: '',
  });

  const handleSave = () => {
    // Update localStorage
    const updatedUser = { ...user, ...formData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: '',
      location: '',
      bio: '',
    });
    setIsEditing(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

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
          <div className="h-32 bg-gradient-to-r from-[#2563EB] to-purple-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Profile Info */}
          <div className="px-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 relative">
              {/* Avatar */}
              <div className="flex items-end gap-6 mb-4 md:mb-0">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#2563EB] to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <button className="absolute bottom-2 right-2 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100">
                    <Camera className="w-4 h-4 text-gray-700" />
                  </button>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                </div>
                
                <div className="pb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{user.name || 'User Name'}</h1>
                  <p className="text-gray-500 text-sm">{user.email || 'user@example.com'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      Active
                    </span>
                    <span className="px-3 py-1 bg-[#DBEAFE] text-[#2563EB] rounded-full text-xs font-medium">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              {!isEditing ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </motion.button>
              ) : (
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#DBEAFE] text-[#2563EB]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6"
          >
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                  placeholder="Enter your email"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                  placeholder="City, Country"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Edit2 className="w-4 h-4" />
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                rows="4"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 transition-all resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Account Info */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Account Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Member Since</p>
                    <p className="text-sm font-medium text-gray-900">January 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Account Status</p>
                    <p className="text-sm font-medium text-green-600">Verified</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6"
          >
            <h3 className="text-lg font-bold text-gray-900">Security Settings</h3>
            
            {/* Change Password */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-700">Change Password</h4>
              
              <div className="relative">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4" />
                  Current Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent pr-12"
                  placeholder="Enter current password"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4" />
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4" />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>

              <button className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-medium transition-colors">
                Update Password
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-4">Two-Factor Authentication</h4>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enable 2FA</p>
                    <p className="text-xs text-gray-500">Add an extra layer of security</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Enable
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6"
          >
            <h3 className="text-lg font-bold text-gray-900">Notification Preferences</h3>
            
            <div className="space-y-4">
              {[
                { label: 'New Messages', desc: 'Get notified when you receive new messages', checked: true },
                { label: 'Group Mentions', desc: 'Notifications when someone mentions you', checked: true },
                { label: 'Friend Requests', desc: 'Alerts for new friend requests', checked: true },
                { label: 'Email Notifications', desc: 'Receive notifications via email', checked: false },
                { label: 'Desktop Notifications', desc: 'Show notifications on desktop', checked: true },
                { label: 'Sound Alerts', desc: 'Play sound for new messages', checked: false },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#DBEAFE] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
