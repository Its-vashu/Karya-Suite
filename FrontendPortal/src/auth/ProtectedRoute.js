import React from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {useUser} from '../context/UserContext'

/**
 * A wrapper component that protects routes based on user roles
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {Array<string>} props.allowedRoles - List of roles that can access this route
 * @returns {React.ReactNode} The protected component or redirect
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role } = useUser();
  const userRole = role || localStorage.getItem('user_role');
  const token = localStorage.getItem('access_token');
  
  // Check if user is authenticated
  if (!token) {
    // toast.error('Please login to access this page');
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has the required role
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    toast.error('You do not have permission to access this page');
    
    // Redirect to the appropriate home based on role
    switch (userRole) {
      case 'hr':
        return <Navigate to="/HrHome" replace />;
      case 'admin':
        return <Navigate to="/AdminHome" replace />;
      case 'employee':
        return <Navigate to="/EmployeeHome" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }
  
  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;
