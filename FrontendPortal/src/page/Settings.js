// src/components/Settings.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { 
  FaUser, 
  FaLock, 
  FaCamera, 
  FaTrash, 
  FaSave, 
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaShieldAlt,  // Changed from FaShield to FaShieldAlt
  FaInfoCircle
} from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const Settings = () => {
  // State management
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  
  // Profile states
  const [profileData, setProfileData] = useState({
    nickname: '',
    bio: '',
    profilePicture: null
  });
  
  // Password reset states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Get user info from token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUsername(decoded.sub || 'User');
        const extractedUserId = decoded.user_id || decoded.id || '';
        setUserId(extractedUserId);
        if (extractedUserId) {
          fetchUserProfile(extractedUserId);
        }
      } catch (err) {
        // console.error("Token decode error:", err);
        toast.error('Session expired. Please login again.');
      }
    }
  }, []);

  // Fetch user profile data
  const fetchUserProfile = async (userId) => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch nickname
      const nicknameResponse = await fetch(`${API_BASE}/users/${userId}/nickname`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Fetch bio
      const bioResponse = await fetch(`${API_BASE}/users/${userId}/bio`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Fetch profile picture
      const profilePicResponse = await fetch(`${API_BASE}/users/${userId}/profile-pic`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let nickname = '';
      let bio = '';
      let profilePicture = null;

      if (nicknameResponse.ok) {
        const nicknameData = await nicknameResponse.json();
        nickname = nicknameData.nickname || '';
      }

      if (bioResponse.ok) {
        const bioData = await bioResponse.json();
        bio = bioData.bio || '';
      }

      if (profilePicResponse.ok) {
        const blob = await profilePicResponse.blob();
        profilePicture = URL.createObjectURL(blob);
      }

      setProfileData({ nickname, bio, profilePicture });
      
    } catch (error) {
      // console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  // Update nickname
  const updateNickname = async () => {
    if (!profileData.nickname.trim()) {
      toast.error('Nickname cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/users/${userId}/nickname`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: profileData.nickname.trim() }),
      });

      if (response.ok) {
        toast.success('Nickname updated successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to update nickname');
      }
    } catch (error) {
      // console.error('Error updating nickname:', error);
      toast.error('Failed to update nickname');
    } finally {
      setLoading(false);
    }
  };

  // Update bio
  const updateBio = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/users/${userId}/bio`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: profileData.bio.trim() }),
      });

      if (response.ok) {
        toast.success('Bio updated successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to update bio');
      }
    } catch (error) {
      // console.error('Error updating bio:', error);
      toast.error('Failed to update bio');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection for profile picture
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE}/upload-profile-pic/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('Profile picture updated successfully');
        setSelectedFile(null);
        setPreviewUrl(null);
        // Refresh profile data
        fetchUserProfile(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to upload profile picture');
      }
    } catch (error) {
      // console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  // Delete profile picture
  const deleteProfilePicture = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/users/${userId}/profile-pic`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Profile picture deleted successfully');
        setProfileData(prev => ({ ...prev, profilePicture: null }));
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to delete profile picture');
      }
    } catch (error) {
      // console.error('Error deleting profile picture:', error);
      toast.error('Failed to delete profile picture');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Password updated successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to update password');
      }
    } catch (error) {
      // console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password (send reset email)
  const forgotPassword = async () => {
    if (!username) {
      toast.error('Username not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username }),
      });

      if (response.ok) {
        toast.success('Password reset email sent successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to send reset email');
      }
    } catch (error) {
      // console.error('Error sending forgot password email:', error);
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: FaUser },
    { id: 'security', label: 'Security', icon: FaShieldAlt },  // Changed from FaShield to FaShieldAlt
  ];

  return (
    <div className="max-w-full mx-auto p-2  space-2 md:p-3 bg-blue-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 md:p-5 bg-blue-400 text-white rounded-2xl shadow-xl">
        <div className="flex items-center space-x-2">
          <div>
             <button
                onClick={() => navigate(-1)}
                className="mt-2 py-2 px-2 rounded-md  text-gray-900 hover:bg-blue-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">⚙️ Settings</h1>
            <p className="text-blue-100 text-lg">Manage your account settings and preferences</p>
          </div>
        </div>
       
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Tab Navigation */}
        <div className="flex flex-row lg:flex-col bg-white p-4 m-1 rounded-2xl shadow-lg border gap-3 border-gray-100 min-w-[250px] w-full lg:w-[280px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 p-4 rounded-xl min-w-[100px] w-full lg:w-[230px] transition-all duration-300 font-semibold text-left ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:bg-gray-200 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="text-xl" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-white w-full px-5 rounded-2xl shadow-lg border border-gray-100">
          {activeTab === 'profile' && (
            <div>
              <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-200">
                <FaUser className="text-2xl text-blue-600" />
                <h2 className="text-2xl md:text-3xl  p-4 font-bold text-gray-800">Profile Information</h2>
              </div>
              
              {/* Profile Picture Section */}
              <div className="mb-10">
                <div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
                    <FaCamera className="text-blue-600" />
                    Profile Picture
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                    <div className="text-center">
                      {profileData.profilePicture ? (
                        <img 
                          src={profileData.profilePicture} 
                          alt="Profile" 
                          className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow-lg ring-4 ring-blue-50" 
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-200 shadow-lg">
                          <FaUser />
                        </div>
                      )}
                      <p className="text-sm text-gray-500 mt-2 font-medium">Current</p>
                    </div>
                    
                    {previewUrl && (
                      <div className="text-center">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-28 h-28 rounded-full object-cover border-4 border-green-300 shadow-lg ring-4 ring-green-50" 
                        />
                        <p className="text-sm text-green-600 mt-2 font-semibold">Preview</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <input
                      type="file"
                      id="profile-pic-input"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <label 
                      htmlFor="profile-pic-input" 
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 cursor-pointer border border-gray-300 font-medium shadow-md hover:shadow-lg"
                    >
                      <FaCamera /> Choose Picture
                    </label>
                    
                    {selectedFile && (
                      <button 
                        onClick={uploadProfilePicture} 
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        Upload
                      </button>
                    )}
                    
                    {profileData.profilePicture && (
                      <button 
                        onClick={deleteProfilePicture} 
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-black rounded-xl hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                      >
                        <FaTrash /> Delete
                      </button>
                    )}
                  </div>
                  <div className="flex items-start gap-2 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Image Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Maximum file size: 5MB</li>
                        <li>Supported formats: JPG, PNG, GIF</li>
                        <li>Recommended size: 400x400 pixels</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nickname Section */}
              <div className="mb-2 justify-between items-right">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Display Name</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={profileData.nickname}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="Enter your nickname"
                    maxLength={50}
                    className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-lg"
                  />
                  <button 
                    onClick={updateNickname} 
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 ml-auto py-4 w-[100px] lg:w-[120px] bg-blue-500  text-white rounded-xl hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    Save
                  </button>
                </div>
              </div>

              {/* Bio Section */}
              <div className='mb-8 '>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">About Me</h3>
                <div className="space-y-4">
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={5}
                    maxLength={500}
                    className="w-full px-5 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-vertical text-lg"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-medium">{profileData.bio.length}/500 characters</span>
                    <button 
                      onClick={updateBio} 
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-3 py-3 bg-blue-500  text-white rounded-xl hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                      Save  Your Bio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className='py-3'>
              <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-gray-200">
                <FaShieldAlt className="text-2xl text-blue-600" />  {/* Changed from FaShield to FaShieldAlt */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Security Settings</h2>
              </div>
              
              {/* Change Password Section */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <FaLock className="text-blue-600" />
                  Change Password
                </h3>
                <div className="max-w-md space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                        className="w-full px-5 py-4 pr-14 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-lg"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-300"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        className="w-full px-5 py-4 pr-14 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-lg"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-300"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="w-full px-5 py-4 pr-14 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-lg"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-300"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t-2 border-gray-200">
                    <button 
                      onClick={resetPassword} 
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : <FaLock />}
                      Update Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Forgot Password Section */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-gray-700 mb-6">Forgot Password</h3>
                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    If you can't remember your current password, you can request a password reset email to be sent to your registered email address.
                  </p>
                  <button 
                    onClick={forgotPassword} 
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-600 text-white rounded-xl hover:from-orange-600 hover:to-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaEdit />}
                    Send Reset Email
                  </button>
                </div>
              </div>

              {/* Account Info Section */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8 border-2 border-gray-200">
                <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
                  <FaInfoCircle className="text-blue-600" />
                  Account Information
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 px-4 bg-white rounded-lg border border-gray-200">
                    <label className="font-semibold text-gray-700">Username/Email:</label>
                    <span className="text-gray-600 font-mono text-lg">{username}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 px-4 bg-white rounded-lg border border-gray-200">
                    <label className="font-semibold text-gray-700">User ID:</label>
                    <span className="text-gray-600 font-mono text-lg">{userId}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
