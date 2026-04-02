import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import {useUser} from '../context/UserContext';

const Navbar = () => {
  const { role } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  

  const token = localStorage.getItem('access_token');
  const showLoginButton = !token && location.pathname !== '/' && location.pathname !== '/login';

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get appropriate home link based on user role
  const getHomeLink = () => {
    if (!token) return "/";
   
    switch (role) {
      case 'hr':
        return "/HrHome";
      case 'admin':
        return "/AdminHome";
      case 'employee':
        return "/EmployeeHome";
      default:
        return "/EmployeeHome";
    }
  };

  return (
    <nav 
      className="flex justify-between items-center px-5 py-2 text-black w-full h-auto"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.93)' }}
    >
      <div 
        className="cursor-pointer" 
        onClick={() => navigate(getHomeLink())}
      >
        <img
          src="https://staging.concientech.com/wp-content/uploads/2025/04/cropped-chatgpt-logo1.png"
          alt="Logo"
          className="h-12 w-35 object-contain"
        />
      </div>

      <div 
        className="flex items-center m-1 lg:gap-20 md:gap-10 sm:gap-10 gap-4"
      >
        <Link to={getHomeLink()} className="text-black font-medium">
          Home
        </Link>
        <Link to="/about" className="text-black font-medium">
          About
        </Link>
        
        {token ? (
          <>
            <div 
              className="relative inline-block mr-6"
              ref={dropdownRef}
              style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
            >
              {/* Dashboard dropdown toggle */}
              <span
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className=" cursor-pointer group relative px-2 py-1.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl font-semibold text-lg text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                Dashboard
              </span>
              
              {/* Dropdown menu with role-specific items */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 bg-blue-100 text-black px-2 py-1 rounded-lg shadow-lg z-50 border border-blue-400"
                  style={{ top: '120%', minWidth: '340px' }}
                >
                  <ul className="list-none m-0 p-0 font-medium grid grid-cols-2 gap-1">
                    <li>
                      <Link
                        to="/calendar"
                        className="block w-full cursor-pointer group relative px-1 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                        onClick={() => {
                          // navigate('/calendar');
                          setIsDropdownOpen(false);
                        }}
                      >
                        Calendar
                      </Link>
                    </li>
                    
                    <li className="mb-2">
                      <Link
                        to="/timesheet"
                        className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                        onClick={() =>{
                          setIsDropdownOpen(false);
                        }}
                      >
                        Timesheet
                      </Link>
                    </li>
                    
                    <li className="mb-2">
                      <Link
                        to="/dashboard/mompage"
                        className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                        onClick={() =>{
                          setIsDropdownOpen(false);
                        }}
                      >
                        AI Tracker
                      </Link>
                    </li>

                    {(role === 'hr') && (
                      <li className="mb-2">
                        <Link
                          to="/assetmanagement"
                          className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                          onClick={() =>{
                            setIsDropdownOpen(false);
                          }}
                        >
                          Asset Management
                        </Link>
                      </li>
                    )}

                    {(role === 'hr') && (
                      <li className="mb-2">
                        <Link
                          to="/policyManagement"
                          className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                          onClick={() =>{
                            setIsDropdownOpen(false);
                          }}
                        >
                          Policy Management
                        </Link>
                      </li>
                    )}

                    {role === 'employee' ? 
                      (
                        <li className="mb-2">
                          <Link
                            to="/expense"
                            className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                            onClick={() =>{
                              setIsDropdownOpen(false);
                            }}
                          >
                            Expense Management
                          </Link>
                        </li>
                      ) 
                      : 
                      (
                        <li className="mb-2">
                          <Link
                            to="/expense-management"
                            className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                            onClick={()=>{
                              setIsDropdownOpen(false);
                            }}
                          >
                            Expense Management
                          </Link>
                        </li>
                      )
                    }
                    
                    <li className="mb-2">
                      <Link
                        to="/leaveManagement"
                        className="block w-full cursor-pointer group relative px-2 py-1.5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 hover:rounded-2xl hover:font-semibold hover:text-white hover:transform hover:transition-all hover:duration-300 hover:scale-105 hover:shadow-2xl"
                        onClick={() =>{
                          setIsDropdownOpen(false);
                        }}
                      >
                        Leave Management
                      </Link>
                    </li>
                    
                  </ul>
                </div>
              )}
            </div>
            <ProfileDropdown />
          </>
        ) : (
          showLoginButton && (
            <span
              onClick={() => navigate('/login')}
              className="cursor-pointer text-white font-medium px-3 py-1.5 rounded bg-blue-600"
            >
              Login
            </span>
          )
        )}
      </div>
    </nav>
  );
};

export default Navbar;