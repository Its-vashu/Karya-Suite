import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../utils/Loading.css';
import {useUser} from '../context/UserContext';

const RootRedirect = () => {
  const {role} = useUser();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const userRole = role || localStorage.getItem('user_role');

    // Small delay for better UX
    const redirectTimer = setTimeout(() => {
      if (token) {
        // Redirect based on role
        switch (userRole) {
          case 'hr':
            navigate('/HrHome');
            break;
          case 'admin':
            navigate('/AdminHome');
            break;
          case 'employee':
            navigate('/EmployeeHome');
            break;
          default:
            // If role is unknown but user has token, default to login
            navigate('/login');
        }
      } else {
        // Not logged in, go to login page
        navigate('/login');
      }
    }, 500);
    
    return () => clearTimeout(redirectTimer);
  }, [navigate]);
  
  // Return loading spinner while redirect happens
  return <div className="loading">Redirecting...</div>;
};

export default RootRedirect;
