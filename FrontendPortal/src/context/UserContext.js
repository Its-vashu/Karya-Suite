import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

const UserContext = createContext();

const API_BASE = process.env.REACT_APP_API_BASE_URL; 


export const UserProvider = ({ children }) => {
  function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    let period = hours >= 12 ? 'PM' : 'AM';
    let displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')} ${period}`;
  }

  const [userData, setUserData] = useState(() => ({
    user_id: '',
    username: '', 
    email: '',
    full_name: '',
    role: '',
    currentTime: getCurrentTime(), 
    currentdate: new Date().toISOString().split('T')[0],
    loading: true,
    error: null
  }));

  // Initialize user from localStorage
  useEffect(() => {
    const initializeUser = () => {
      // console.log('Initializing user from localStorage...');
      
      const token = localStorage.getItem('access_token');
      const storedUsername = localStorage.getItem('username');
      const storedRole = localStorage.getItem('user_role');
      
      // First check if token is valid
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            // console.warn('Token expired. Clearing user data.');
            localStorage.removeItem('access_token');
            setUserData(prev => ({ 
              ...prev, 
              loading: false,
              role: '',
              username: '',
              user_id: ''
            }));
            return;
          }
        } catch (error) {
          // console.error('Error decoding token:', error);
          localStorage.removeItem('access_token');
          setUserData(prev => ({ ...prev, loading: false }));
          return;
        }
      }
      
      if (storedUsername && token) {
        
        setUserData(prev => ({
          ...prev,
          user_id: localStorage.getItem('user_id') || '',
          username: storedUsername || '',
          email: localStorage.getItem('email') || '',
          full_name: localStorage.getItem('user_full_name') || '',
          role: storedRole || 'employee',
          currentTime: getCurrentTime(),
          currentdate: new Date().toISOString().split('T')[0],
          loading: true,
          error: null
        }));
        
        // Fetch complete user details by username
        const fetchUserDetails = async () => {
          const apiUrl = `${API_BASE}/users/username/${storedUsername}`;
          // console.log('Fetching user details from:', apiUrl);
          
          try {
            const response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            //console.log('API response status:', response.status);
            
            if (response.ok) {
              const responseData = await response.json();
              const userData = responseData.user;
              
              if (userData) {
                setUserData(prev => {
                  const updatedData = {
                    ...prev,
                    user_id: userData.user_id || prev.user_id || '',
                    username: userData.username || storedUsername || '',
                    email: userData.email || prev.email || '',
                    full_name: userData.full_name || prev.full_name || '',
                    role: userData.role || storedRole || 'employee',
                    loading: false
                  };
                  
                  // console.log('Updated user data state:', updatedData);
                  return updatedData;
                });
                
                // Update localStorage with latest data
                if (userData.user_id) {
                  localStorage.setItem('user_id', userData.user_id);
                  // console.log('User ID set in localStorage:', userData.user_id);
                }
                
                if (userData.email) {
                  localStorage.setItem('email', userData.email);
                  // console.log('Email set in localStorage:', userData.email);
                }
                
                if (userData.full_name) {
                  localStorage.setItem('user_full_name', userData.full_name);
                  //  console.log('Full name set in localStorage:', userData.full_name);
                }
              } else {
                //console.error('No user data available to update state');
                setUserData(prev => ({
                  ...prev,
                  loading: false,
                  error: 'Failed to get user data from response'
                }));
              }
            } else {
              //console.error('Failed to fetch user details. Response status:', response.status);
              try {
                const errorText = await response.text();
                //console.error('Error response:', errorText);
                toast.error(`Error fetching user details. Status code: ${response.status}. Message: ${errorText}`);
              } catch (e) {
                //console.error('Could not read error response');
                toast.error(`Error fetching user details. Status code: ${response.status}. Message: ${e}`);
              }
              
              // Try a fallback endpoint
              //console.log('Trying fallback endpoint...');
              try {
                const userId = localStorage.getItem('user_id');
                if (userId) {
                  const detailsResponse = await fetch(`${API_BASE}/users/${userId}/details`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (detailsResponse.ok) {
                    const detailsData = await detailsResponse.json();
                    // console.log('Fetched user details from fallback endpoint:', detailsData);
                    
                    setUserData(prev => ({
                      ...prev,
                      user_id: detailsData.user_id || prev.user_id,
                      username: detailsData.username || storedUsername,
                      email: detailsData.email || prev.email,
                      full_name: detailsData.full_name || prev.full_name,
                      role: detailsData.role || storedRole || 'employee',
                      loading: false
                    }));
                    
                    // Update localStorage
                    if (detailsData.user_id) localStorage.setItem('user_id', detailsData.user_id);
                    if (detailsData.email) localStorage.setItem('email', detailsData.email);
                    if (detailsData.full_name) localStorage.setItem('user_full_name', detailsData.full_name);
                    
                    return; // Exit early if fallback was successful
                  }
                }
              } catch (fallbackError) {
                // console.error('Fallback endpoint failed:', fallbackError);
                // alert(`Fallback endpoint failed: ${fallbackError.message}`);
                toast.error(`Fallback endpoint failed: ${fallbackError.message}`);
              }
              
              // If we're here, both attempts failed - fallback to localStorage data
              setUserData(prev => ({ 
                ...prev, 
                loading: false,
                error: `Failed to fetch user details. Status: ${response.status}`
              }));
            }
          } catch (error) {
            // console.error('Error fetching user details:', error.message);
            // console.error('Error details:', error);
            // alert(`Network error while fetching user details: ${error.message}`);
            toast.error(`Network error while fetching user details: ${error.message}`);
            
            // Fallback to localStorage data
            setUserData(prev => ({ 
              ...prev, 
              loading: false,
              error: `Network error: ${error.message}`
            }));
          }
        };
        
        fetchUserDetails();
      } else {
        // console.log('Incomplete user data in localStorage. Username:', storedUsername, 'Token exists:', !!token);
        setUserData(prev => ({ ...prev, loading: false }));
      }
    };
    
    initializeUser();
    
    // Listen for login updates
    const handleUpdate = () => {
      // console.log('User data updated, reinitializing...');
      initializeUser();
    };
    
    window.addEventListener('userDataUpdated', handleUpdate);
    return () => window.removeEventListener('userDataUpdated', handleUpdate);
  }, []);

  // Time update every 5 minutes
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setUserData(prev => ({ ...prev, currentTime: getCurrentTime() }));
    }, 5 * 60 * 1000);
    return () => clearInterval(timeInterval);
  }, []);

  return (
    <UserContext.Provider value={userData}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};