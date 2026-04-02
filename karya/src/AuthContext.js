import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from './api';
import { Alert, AppState } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastActive, setLastActive] = useState(Date.now());
  
  // Session timeout in milliseconds (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  // Check for stored authentication on app start
  useEffect(() => {
    checkStoredAuth();
    
    // Set up app state listener for session management
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Handle app state changes for session management
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState === 'background' && nextAppState === 'active') {
      // App came to foreground
      const now = Date.now();
      if (token && now - lastActive > SESSION_TIMEOUT) {
        // Session timed out, force re-authentication
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
      } else {
        // Optionally verify token is still valid with backend
        verifySession();
      }
    } else if (nextAppState === 'active') {
      // Update last active timestamp whenever app is active
      setLastActive(Date.now());
    }
    
    setAppState(nextAppState);
  }, [appState, lastActive, token]);
  
  // Verify session is still valid with backend
  const verifySession = useCallback(async () => {
    if (!token) return;
    
    try {
      const isValid = await authAPI.checkAuth();
      if (!isValid) {
        logout();
        setAuthError('Session expired. Please log in again.');
      }
    } catch (error) {
      console.warn('Error verifying session:', error);
    }
  }, [token]);

  const checkStoredAuth = async () => {
    try {
      console.log('🔍 Checking for stored authentication...');
      
      // Load stored auth data if present so the app can resume session
      const storedToken = await AsyncStorage.getItem('authToken');
      // Some parts of the app use the key 'user' and others use 'userData'.
      // Read both and prefer 'userData' but fall back to 'user' to remain compatible.
      let storedUser = await AsyncStorage.getItem('userData');
      if (!storedUser) {
        storedUser = await AsyncStorage.getItem('user');
      }
      
      console.log('📝 Stored token exists:', !!storedToken);
      console.log('📝 Stored user exists:', !!storedUser);
      
      // Only restore session if both token AND user data exist
      // This ensures fresh installs always show login screen
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Verify user object has minimum required fields
          if (parsedUser && (parsedUser.id || parsedUser.user_id || parsedUser.username)) {
            // Additional validation: check if token is not expired or corrupted
            // For production, you might want to verify token with backend
            setToken(storedToken);
            setUser(parsedUser);
            setLastActive(Date.now());
            console.log('✅ Session restored for user:', parsedUser.username || parsedUser.email);
          } else {
            // Invalid user data, clear storage
            console.warn('⚠️ Invalid user data structure, clearing storage');
            await AsyncStorage.multiRemove(['authToken', 'userData', 'user']);
            setToken(null);
            setUser(null);
          }
        } catch (parseErr) {
          console.warn('⚠️ Failed to parse stored user JSON, clearing it', parseErr);
          await AsyncStorage.multiRemove(['authToken', 'userData', 'user']);
          setToken(null);
          setUser(null);
        }
      } else {
        // No complete auth data, ensure clean state for first-time users
        console.log('🆕 No stored session found - First time user or logged out');
        // Clear any partial/corrupted data
        await AsyncStorage.multiRemove(['authToken', 'userData', 'user']);
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error reading stored auth:', error);
      // On error, clear everything to ensure clean state
      try {
        await AsyncStorage.multiRemove(['authToken', 'userData', 'user']);
      } catch (clearError) {
        console.error('❌ Error clearing storage:', clearError);
      }
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('✅ Auth check completed');
    }
  };

  const login = async (authToken, userData) => {
    try {
      if (!authToken) {
        throw new Error('No auth token provided');
      }
      
      // Add token to user data for easier access
      const enhancedUserData = {
        ...userData,
        token: authToken
      };
      
  // Store in AsyncStorage. Persist to both 'userData' and 'user' keys for
  // compatibility with other screens that still use the 'user' key.
  await AsyncStorage.setItem('authToken', authToken);
  await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
  await AsyncStorage.setItem('user', JSON.stringify(enhancedUserData));
      
      // Update state
      setToken(authToken);
      setUser(enhancedUserData);
      setLastActive(Date.now());
      setAuthError(null);
      
      return true;
    } catch (error) {
      console.error('Error storing auth data:', error);
      setAuthError('Failed to complete login process');
      return false;
    }
  };

  const logout = async () => {
    try {
      // First, attempt server-side logout
      await authAPI.logout();
      
      // Then clear local storage
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData', 'user']);
      
      // Clear state
      setToken(null);
      setUser(null);
      setAuthError(null);
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Still clear local state even if API call fails
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData', 'user']);
      setToken(null);
      setUser(null);
      
      return false;
    }
  };

  const isAuthenticated = () => {
    return !!(user && token);
  };
  
  const updateUserProfile = async (updatedData) => {
    try {
      if (!user) {
        throw new Error('No user is logged in');
      }
      
      // Update user data with new profile info
      const updatedUser = { ...user, ...updatedData };
      
      // Save to storage
      // Persist under both keys for compatibility
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    authError,
    setUser,
    login,
    logout,
    isAuthenticated,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
