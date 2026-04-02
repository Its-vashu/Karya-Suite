import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaCog, FaQuestionCircle, FaSignOutAlt, FaUserShield } from 'react-icons/fa';
import { ThumbsUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../context/UserContext';

const ProfilePic = lazy(() => import('../utils/ProfilePic'));


const ProfileDropdown = () => {
  const { user_id, role, username } = useUser();
  const [open, setOpen] = useState(false);

  // Access user role from context
  const userRole = role;
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    toast.success('You have been successfully logged out');
    navigate('/login');
  };


  return (
    <div className="relative inline-block mr-5" ref={dropdownRef}>
      {/* Profile Picture */}
      <div 
        className="h-10 w-10 rounded-full border-2 border-white cursor-pointer flex items-center justify-center text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white uppercase select-none overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:border-blue-600"
        onClick={() => setOpen(!open)}
        title={`${username}'s Profile`}
      >
        <Suspense fallback={<div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse inline-block"></div>}>
          <ProfilePic userId={user_id} />
        </Suspense>
      </div>
      
      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-[130%] right-0 bg-white text-black rounded-lg shadow-lg p-3 min-w-[220px] z-50 border border-gray-300">
          {/* User Information */}
          <div className="text-center font-bold mb-2 text-base">Hi, {username}</div>
          
          {/* Role Badge */}
          <div className="flex items-center justify-center bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mx-auto mb-3 w-fit shadow-sm tracking-wider">
            <FaUserShield className="mr-1" />
            <span>{userRole ? userRole.toUpperCase() : 'USER'}</span>
          </div>

          {/* Menu Items */}
          <div 
            className="flex items-center px-4 py-2.5 cursor-pointer rounded-md transition-colors duration-200 hover:bg-blue-50 group" 
            onClick={() => {
              navigate('/profile');
              setOpen(false);
            }}
          >
            <FaUser className="text-gray-600 mr-3 group-hover:text-blue-600" />
            <span className="group-hover:text-blue-700">Profile</span>
          </div>
          <div 
            className="flex items-center px-4 py-2.5 cursor-pointer rounded-md transition-colors duration-200 hover:bg-blue-50 group" 
            onClick={() => {
              navigate('/self-appreciation');
              setOpen(false);
            }}
          >
            <ThumbsUp className="text-gray-600 mr-3 group-hover:text-blue-600" />
            <span className="group-hover:text-blue-700">Appreciation</span>
          </div>

          <div className="flex items-center px-4 py-2.5 cursor-pointer rounded-md transition-colors duration-200 hover:bg-blue-50 group"
            onClick={() => {
              navigate('/settings');
              setOpen(false);
            }}
          >
            <FaCog className="text-gray-600 mr-3 group-hover:text-blue-600" />
            <span className="group-hover:text-blue-700">Settings</span>
          </div>

          <div className="flex items-center px-4 py-2.5 cursor-pointer rounded-md transition-colors duration-200 hover:bg-blue-50 group"
            onClick={() => {
              navigate('/help');
              setOpen(false);
            }}
          >
            <FaQuestionCircle className="text-gray-600 mr-3 group-hover:text-blue-600" />
            <span className="group-hover:text-blue-700">Help & Support</span>
          </div>

          {/* Logout Button */}
          <div 
            className="flex  bg-red-200 items-center px-4 py-2.5 mt-2 cursor-pointer rounded-md transition-colors duration-200 text-black hover:text-blue hover:bg-red-500 border-t border-gray-200 pt-2 group" 
            onClick={handleLogout}
          >
            <FaSignOutAlt className= "mr-3" />
            <span>Log out</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
