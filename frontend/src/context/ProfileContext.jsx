import { createContext, useContext, useState } from 'react';

const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};

export const ProfileProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Get user and token from localStorage
  const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');
  const getToken = () => localStorage.getItem('token');

  // Update user in localStorage
  const updateLocalUser = (updates) => {
    const currentUser = getUser();
    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    // Trigger storage event for other components to update
    window.dispatchEvent(new Event('storage'));
    return updatedUser;
  };

  // Helper function for API calls
  const apiCall = async (endpoint, options = {}) => {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/profile${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  };

  // ═══════════════════════════════════════════════════════════════
  // 📸 UPLOAD PROFILE PICTURE
  // ═══════════════════════════════════════════════════════════════
  const uploadProfilePicture = async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const data = await apiCall('/upload-picture', {
        method: 'POST',
        body: formData,
      });

      // Update local user state
      updateLocalUser({ profilePicture: data.profilePicture });

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🗑️  DELETE PROFILE PICTURE
  // ═══════════════════════════════════════════════════════════════
  const deleteProfilePicture = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/delete-picture', {
        method: 'DELETE',
      });

      // Update local user state
      updateLocalUser({ profilePicture: null });

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 📝 UPDATE BIO
  // ═══════════════════════════════════════════════════════════════
  const updateBio = async (bio) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/bio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });

      // Update local user state
      updateLocalUser({ bio: data.bio });

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 👤 UPDATE NAME
  // ═══════════════════════════════════════════════════════════════
  const updateName = async (name) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      // Update local user state
      updateLocalUser({ name: data.name });

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔑 CHANGE PASSWORD
  // ═══════════════════════════════════════════════════════════════
  const changePassword = async (oldPassword, newPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🗑️  DELETE ACCOUNT
  // ═══════════════════════════════════════════════════════════════
  const deleteAccount = async (password) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      // Clear local storage and logout
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isLoading,
    error,
    uploadProfilePicture,
    deleteProfilePicture,
    updateBio,
    updateName,
    changePassword,
    deleteAccount,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
