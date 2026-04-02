import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Appreciation from '../appreciation/Appreciation';
import ShowThought from '../utils/ShowThought';
import {useUser} from '../context/UserContext';
import ShowAppreciation from '../appreciation/ShowAppreciation';
import NotifyAppreciation from '../appreciation/NotifyAppreciation';
import { toast } from 'react-toastify';
const Weather = lazy(() => import('../utils/Weather'));

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const API_SERVICE = {
  BASE: API_BASE,
  
  // Cache and retry configuration
  cache: new Map(),
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,

  /**
   * @returns {string|null} The valid access token or null if invalid/missing.
   */
  getToken() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('refresh_token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        // console.warn('🔴 Token expired. Removing from localStorage.');
        localStorage.removeItem('access_token');
        return null;
      }
      return token;
    } catch (error) {
    //   console.error('🔴 Error decoding or validating token:', error);
      localStorage.removeItem('access_token'); // Remove invalid token
      return null;
    }
  },

  /**
   * Performs an HTTP request with authentication, caching, and retry logic.
   * @param {string} endpoint The API endpoint (e.g., '/users/').
   * @param {object} options Fetch options (method, body, headers, etc.).
   * @returns {Promise<any>} The parsed JSON response data.
   * @throws {Error} If authentication fails or API returns an error.
   */
  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      // It's crucial to throw an error here to prevent unauthenticated requests.
      // The calling component should handle navigation to login.
      throw new Error('Authentication token missing or expired. Please log in again.');
    }

    // Ensure URL is correctly formed, avoiding double slashes.
    const url = `${this.BASE}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;

    const cacheKey = `${url}_${options.method || 'GET'}_${JSON.stringify(options.body || {})}`;

    // ⚡ Smart cache retrieval for GET requests
    if (options.method === 'GET' || !options.method) { // Only cache GET requests
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        //console.log(`✅ Cache hit for ${endpoint}`);
        return cached.data;
      }
    }

    // 🔄 Retry mechanism for reliability
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...options.headers
          }
        });

        if (!response.ok) {
          let errorData;
          try {
            // Attempt to parse JSON error from response body
            errorData = await response.json();
            // If the error object has 'detail' which is an array, extract messages
            if (errorData && Array.isArray(errorData.detail) && errorData.detail.length > 0) {
              // Extract 'msg' from each object in 'detail' array or provide a fallback
              const messages = errorData.detail.map(d => d.msg || 'Validation Error');
              errorData = { message: messages.join(', '), details: errorData.detail };
            } else if (errorData && errorData.detail) {
              errorData = { message: errorData.detail, details: errorData };
            } else if (errorData.message) {
              errorData = { message: errorData.message, details: errorData };
            } else {
              errorData = { message: response.statusText || 'Unknown API Error', details: errorData };
            }
          } catch (jsonError) {
            // If JSON parsing fails, use the status text as the error message
            errorData = { message: response.statusText || 'Unknown API Error', details: { status: response.status } };
          }

          if (response.status === 401) {
            localStorage.removeItem('access_token');
            // Re-throw an authentication error to trigger logout/re-login flow
            throw new Error('Authentication failed. Please log in again.');
          }
          if (response.status >= 500 && attempt < this.MAX_RETRIES) {
            // console.warn(`⚠️ Server error (${response.status}). Retrying attempt ${attempt}/${this.MAX_RETIESR}...`);
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
            continue; // Retry the request
          }
          // For other non-retryable errors (e.g., 400, 404, 422), throw immediately
          throw new Error(errorData.message); // Throw the extracted error message
        }

        const data = await response.json();

        // 📝 Cache management: limit cache size
        if (this.cache.size >= 100) {
          // Remove the oldest entry if cache exceeds limit
          const oldestKey = [...this.cache.keys()].reduce((oldest, key) => {
            const current = this.cache.get(key);
            const oldestEntry = this.cache.get(oldest);
            return (oldestEntry && current.timestamp < oldestEntry.timestamp) ? key : oldest;
          }, this.cache.keys().next().value); // Get first key as initial oldest
          if (oldestKey) {
            this.cache.delete(oldestKey);
          }
        }
        if (options.method === 'GET' || !options.method) {
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }

        return data;
      } catch (error) {
        if (attempt === this.MAX_RETRIES) {
          // console.error(`🔴 API Request Failed [${endpoint}] after ${this.MAX_RETRIES} attempts:`, error);
          throw error; // Re-throw the final error after all retries
        }
        // If it's not a 5xx error, don't retry, just re-throw.
        if (error.message && !error.message.includes('Server error')) { // Crude check, refine if API has specific error codes
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
    // Should theoretically not reach here if MAX_RETRIES > 0
    throw new Error('Request failed after multiple retries.');
  },
  

  async fetchPolicies() {
    try {
      return await this.request('/policies/');
    } catch (error) {
      // console.error('🔴 Policies fetch failed:', error);
      toast.error(`Policies fetch failed: ${error.message}`);
      // Return an empty array on error to prevent cascading issues in UI
      return [];
    }
  },

  async fetchDashboardData(userId) {
    try {
      // Use Promise.allSettled to allow some fetches to fail without stopping others
      const [profileResponse, timesheetsResponse] = await Promise.allSettled([
        this.request(`/user-details/users/${userId}`),
        this.request(`/timesheets/?user_id=${userId}`)
      ]);

      const profile = profileResponse.status === 'fulfilled' ? profileResponse.value : null;
      const timesheets = timesheetsResponse.status === 'fulfilled' ? timesheetsResponse.value : [];

      if (profileResponse.status === 'rejected') {
        console.error('🔴 Profile fetch failed:', profileResponse.reason);
        // alert('Failed to load user profile. Please try again later.' + profileResponse.reason);
        // toast.warning(`please update your profile. ${profileResponse.reason}`);
      }
      if (timesheetsResponse.status === 'rejected') {
        console.error('🔴 Timesheets fetch failed:', timesheetsResponse.reason);
        // alert('Failed to load timesheet data. Please try again later.' + timesheetsResponse.reason);
        // toast.warning(`Please update your timesheet. ${timesheetsResponse.reason}`);
      }

      return [profile, timesheets];
    } catch (error) {
      // console.error('🔴 Dashboard data fetch failed:', error);
      return [null, []]; // Ensure consistent return on error
    }
  },

  async createUser(userData) {
    try {
      return await this.request('/users/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch (error) {
      // console.error('🔴 Create User Failed:', error);
      throw error;
    }
  },

  async fetchUsersStats() {
    try {
      return await this.request('/users/stats');
    } catch (error) {
      // console.error('🔴 Fetch Users Stats Failed:', error);
      throw error; 
    }
  },

  async fetchAllUsers() {
    try {
      // console.log('🔗 API_SERVICE: Starting fetchAllUsers request...');
      // console.log('🔗 Token available:', !!this.getToken());
      
      const result = await this.request('/users/basic');
      // console.log('🔗 API_SERVICE: Raw result from request:', result);
      // console.log('🔗 API_SERVICE: Result type:', typeof result);
      
      return result;
    } catch (error) {
      // console.error('🔴 Fetch All Users Failed in API_SERVICE:', error);
      // console.error('🔴 Error details:', {
      //   message: error.message,
      //   stack: error.stack,
      //   name: error.name
      // });
      throw error; 
    }
  },

  async updateLeaveStatus(leaveId, status, approvedBy) {
    try {
      return await this.request(`/leave-applications/${leaveId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, approved_by: approvedBy }),
      });
    } catch (error) {
      // console.error(`🔴 Failed to update leave status for ID ${leaveId}:`, error);
      throw error;
    }
  },

  async fetchPendingLeaves(currentUserId) {
    try {
      // Assuming the backend endpoint for HR view correctly filters out HR's own leaves
      // or we can add a client-side filter here if not.
      const response = await this.request(`/leave-applications/hr-view/?status=pending`);
      // Filter out current HR's own leave requests if they exist in the response
      return Array.isArray(response)
        ? response.filter(leave => leave.user_id !== currentUserId)
        : [];
    } catch (error) {
      // console.error('🔴 Failed to fetch pending leaves:', error);
      return [];
    }
  },

  // 🎂 NEW: Fetch form data for birthday checks from EmployeeBackgroundForm
  async fetchFormData() {
    try {
      return await this.request('/api/background-check/forms/');
    } catch (error) {
      // console.error('🔴 Failed to fetch form data:', error);
      return [];
    }
  },

  // 🧹 Cache management utilities
  clearCache() {
    this.cache.clear();
  },

  getCacheSize() {
    return this.cache.size;
  },

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
};

// --- Utility Functions ---
// Pure, reusable functions for data manipulation and validation.
const UTILS = {
  /**
   * Decodes a JWT token and validates its structure and expiration.
   * @param {string} token The JWT string.
   * @returns {object|null} The decoded token payload or null if invalid.
   */
  decodeToken(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        // console.warn('🔴 Invalid token structure.');
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));

      if (!payload || typeof payload !== 'object') {
        // console.warn('🔴 Invalid token payload.');
        return null;
      }

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // console.warn('🔴 Token expired');
        return null;
      }

      return payload;
    } catch (error) {
      // console.error('🔴 Token decode failed:', error);
      return null;
    }
  },

  calculateWeeklyStats(timesheets) {
    if (!Array.isArray(timesheets)) return { hours: 0, tasks: 0 };

    const now = new Date();
    // Start of the current week (Monday)
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    weekStart.setHours(0, 0, 0, 0);

    // End of the current week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return timesheets.reduce((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;

      const entryDate = new Date(entry.sheet_date || entry.date);
      if (isNaN(entryDate.getTime())) return acc;

      if (entryDate >= weekStart && entryDate <= weekEnd) {
        const hours = parseFloat(entry.time_hour || entry.hours || entry.duration || 0);
        if (!isNaN(hours)) acc.hours += hours;

        if (entry.task_name || entry.task || entry.description) {
          acc.tasks++;
        }
      }
      return acc;
    }, { hours: 0, tasks: 0 });
  },

  /**
   * Formats a deadline date string and determines its urgency.
   * @param {string} dateStr The date string to format.
   * @returns {object|null} Formatted deadline object with urgency or null.
   */
  formatDeadline(dateStr) {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    // Normalize 'now' to start of day for accurate day difference calculation
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const options = { day: '2-digit', month: 'short' };
    const formatted = date.toLocaleDateString('en-US', options);
    const [month, day] = formatted.toUpperCase().split(' ');

    let urgencyLevel = 'normal';
    if (diffDays < 0) urgencyLevel = 'overdue';
    else if (diffDays === 0) urgencyLevel = 'critical'; // Today
    else if (diffDays === 1) urgencyLevel = 'urgent'; // Tomorrow
    else if (diffDays <= 7) urgencyLevel = 'soon'; // Within a week

    return {
      id: `deadline-${Date.now()}`, // Unique ID for React list key
      date: day,
      month: month,
      title: 'Project Deadline',
      dueIn: diffDays === 0 ? 'Today' :
        diffDays === 1 ? 'Tomorrow' :
          diffDays < 0 ? `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue` :
            `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
      urgencyLevel,
      urgent: diffDays <= 3 && diffDays >= 0, // Urgent includes today, tomorrow, and day after
      overdue: diffDays < 0,
      rawDate: date.toISOString(),
      diffDays
    };
  },

  // 🎂 NEW: Check if today is someone's birthday
  isTodayBirthday(dateOfBirth) {
    if (!dateOfBirth) return false;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    return (
      today.getMonth() === birthDate.getMonth() &&
      today.getDate() === birthDate.getDate()
    );
  },


  // 🎨 Performance optimization utilities
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 🔍 Data validation helpers
  validateProfile(profile) {
    return profile &&
      typeof profile === 'object' &&
      (profile.username || profile.name || profile.full_name);
  },

  // 📱 Responsive utilities
  isMobile() {
    return window.innerWidth <= 768;
  },

  // 🎯 Safe property access
  safeGet(obj, path, defaultValue = null) {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }
};

/**
 * 🏠 ENTERPRISE HR HOME DASHBOARD COMPONENT
 * Professional, scalable, and high-performance dashboard for HR portal
 */
const HrHome = () => {
  const { user_id, username, role } = useUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAppreciation, setShowAppreciation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const [dashboardState, setDashboardState] = useState({
    user: {
      username: '',
      role: '',
      fullName: '',
      projectName: '',
      isValid: false
    },
    stats: {
      projectsActive: 0,
      hoursThisWeek: 0,
      tasksCompleted: 0,
    },
    projectDeadline: '',
    dataQuality: {
      profileComplete: false,
      timesheetAvailable: false,
      lastSync: null
    }
  });

  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    email: '',
    password: '',
    role: ''
  });
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false);
  const [createEmployeeError, setCreateEmployeeError] = useState(null);
  const [createEmployeeSuccess, setCreateEmployeeSuccess] = useState(false);

  const [showEmployeeDetailsModal, setShowEmployeeDetailsModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
  

  // ⏰ MEMOIZED TIME FORMATTERS
  const formatTime = useCallback(
    (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    []
  );

  const formatDate = useCallback(
    (date) =>
      date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );
          
  // Dashboard data loader
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if token exists, but don't immediately redirect
      const token = localStorage.getItem('access_token');
      if (!token) {
        // console.log("No token found, but not redirecting immediately");
        setError("Authentication required");
        setLoading(false);
        return;
      }

      // Try to decode token
      let decoded = null;
      try {
        decoded = JSON.parse(atob(token.split('.')[1]));
        
        // Check token expiration
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          // console.log("Token expired, clearing it");
          localStorage.removeItem('access_token');
          setError("Token expired");
          setLoading(false);
          return;
        }
      } catch (e) {
        // console.error("Error decoding token:", e);
        setError("Invalid token format");
        setLoading(false);
        return;
      }

      const userId = user_id || decoded.id || decoded.sub;
      if (!userId) {
        // console.log("No user ID in token");
        setError("Invalid user data");
        setLoading(false);
        return;
      }

      // Set initial user data from token
      const tokenUser = {
        username: username || localStorage.getItem('username') ,
        role: role || localStorage.getItem('role'),
        isValid: true
      };

      setDashboardState(prev => ({
        ...prev,
        user: { ...prev.user, ...tokenUser }
      }));

      const [profile, timesheets] = await API_SERVICE.fetchDashboardData(userId);

      const isValidProfile = UTILS.validateProfile(profile);
      const projectName = profile ? UTILS.extractProjectName(profile) : 'N/A';
      const projectDeadline = profile ? UTILS.extractDeadline(profile) : '';

      const weeklyStats = Array.isArray(timesheets) ?
        UTILS.calculateWeeklyStats(timesheets) :
        { hours: 0, tasks: 0 };

      setDashboardState(prev => ({
        user: {
          ...prev.user,
          fullName: UTILS.safeGet(profile, 'full_name') || UTILS.safeGet(profile, 'name') || prev.user.username,
          username: UTILS.safeGet(profile, 'username', prev.user.username),
          role: UTILS.safeGet(profile, 'designation') || UTILS.safeGet(profile, 'position') || prev.user.role,
          projectName,
          isValid: isValidProfile
        },
        stats: {
          projectsActive: Array.isArray(profile?.projects) ?
            profile.projects.length :
            (projectName !== 'N/A' ? 1 : 0),
          hoursThisWeek: weeklyStats.hours,
          tasksCompleted: weeklyStats.tasks,
          goalProgress: UTILS.safeGet(profile, 'goalProgress', 78),
          lastUpdated: new Date().toISOString()
        },
        projectDeadline,
        dataQuality: {
          profileComplete: isValidProfile,
          timesheetAvailable: Array.isArray(timesheets) && timesheets.length > 0,
          lastSync: new Date().toISOString()
        }
      }));
    } catch (error) {
      // console.error('🔴 Dashboard load failed:', error);
      setError(error.message || 'Failed to load dashboard data');
      setDashboardState(prev => ({
        ...prev,
        user: { ...prev.user, isValid: false },
        dataQuality: { ...prev.dataQuality, lastSync: null },
      }));
    } finally {
      setLoading(false);
    }
  }, [user_id, username, role]);

        
  // 🎯 LEAVE REQUESTS MANAGEMENT
  // const [pendingLeaves, setPendingLeaves] = useState([]);
  // const [leavesLoading, setLeavesLoading] = useState(false);

  // Helper function to extract user ID from token
  // const getUserIDFromToken = useCallback(() => {
  //   try {
  //     const token = localStorage.getItem('access_token');
  //     if (!token) return null;

  //     const payload = JSON.parse(atob(token.split('.')[1]));
  //     return payload.user_id || payload.id || payload.sub; // Ensure we check all possible ID fields
  //   } catch (error) {
  //     console.error('Error extracting user ID from token:', error);
  //     return null;
  //   }
  // }, []);

  // // Fetch pending leave requests
  // const fetchPendingLeaves = useCallback(async () => {
  //   setLeavesLoading(true);
  //   try {
  //     const currentUserID = getUserIDFromToken();
  //     if (!currentUserID) {
  //       throw new Error("Cannot fetch leaves: User ID not found.");
  //     }
  //     // Assuming the backend endpoint for HR view correctly filters out HR's own leaves
  //     const fetchedLeaves = await API_SERVICE.fetchPendingLeaves(currentUserID);
  //     setPendingLeaves(fetchedLeaves);
  //   } catch (error) {
  //     console.error('🔴 Failed to fetch pending leaves:', error);
  //     setPendingLeaves([]);
  //     // If it's an auth error, navigate to login
  //     if (error.message.includes('Authentication failed')) {
  //       navigate('/login');
  //     }
  //   } finally {
  //     setLeavesLoading(false);
  //   }
  // }, [getUserIDFromToken, navigate]);

  // Handle leave approval/rejection
  // const handleLeaveAction = useCallback(async (leaveId, action, employeeName, leaveUserID) => {
  //   try {
  //     const currentUserID = getUserIDFromToken();

  //     if (leaveUserID === currentUserID) {
  //       alert('Error: You cannot approve/reject your own leave requests.');
  //       return;
  //     }

  //     setProcessingLeave(leaveId);

  //     const token = localStorage.getItem('access_token');
  //     let decoded = null;
  //     try {
  //       decoded = JSON.parse(atob(token.split('.')[1]));
  //     } catch (e) {
  //       console.error("Error decoding token:", e);
  //       throw new Error("Invalid token format");
  //     }
  //     const hrName = decoded?.username || decoded?.sub || 'HR'; // Use username from token or fallback

  //     await API_SERVICE.updateLeaveStatus(leaveId, action, hrName);

  //     // Optimistically update UI
  //     setPendingLeaves(prev => prev.filter(leave => leave.id !== leaveId));
  //     alert(`Leave ${action === 'approved' ? 'approved' : 'rejected'} for ${employeeName}`);

  //     // Re-fetch to ensure data consistency, especially if other HRs might be approving
  //     setTimeout(() => fetchPendingLeaves(), 500);

  //   } catch (error) {
  //     console.error(`🔴 Failed to ${action} leave:`, error);
  //     alert(`Failed to ${action} leave. ${error.message || 'Please try again.'}`);
  //   } finally {
  //     setProcessingLeave(null);
  //   }
  // }, [fetchPendingLeaves, getUserIDFromToken]);

  // // Format date for display
  // const formatLeaveDate = useCallback((dateStr) => {
  //   try {
  //     return new Date(dateStr).toLocaleDateString('en-US', {
  //       day: '2-digit',
  //       month: 'short',
  //       year: 'numeric'
  //     });
  //   } catch {
  //     return 'Invalid Date';
  //   }
  // }, []);

  // // Calculate leave duration
  // const calculateLeaveDuration = useCallback((startDate, endDate) => {
  //   try {
  //     const start = new Date(startDate);
  //     const end = new Date(endDate);
  //     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
  //       return 0; // Invalid dates
  //     }
  //     const diffTime = Math.abs(end.getTime() - start.getTime());
  //     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
  //     return diffDays;
  //   } catch (e) {
  //     console.error("Error calculating leave duration:", e);
  //     return 0;
  //   }
  // }, []);

  // 🔄 SMART REFRESH WITH CACHE INVALIDATION
  const refreshStats = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      API_SERVICE.clearCache(); // Invalidate cache for fresh data
      await Promise.all([
        loadDashboardData()
      ]);
    } catch (err) {
      // console.error('🔴 Refresh failed:', err);
      setError(err.message || 'Refresh failed. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDashboardData, isRefreshing]);

  const getGreeting = useCallback(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  // Handle input changes for the new employee form
  const handleEmployeeInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({ ...prev, [name]: value }));
  };

  // Handle creating a new employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreateEmployeeLoading(true);
    setCreateEmployeeError(null);
    setCreateEmployeeSuccess(false);

    try {
      if (!newEmployee.username || !newEmployee.email || !newEmployee.password || !newEmployee.role) {
        throw new Error('All fields are required.');
      }
      if (newEmployee.password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      // Basic email format validation
      if (!/\S+@\S+\.\S+/.test(newEmployee.email)) {
        throw new Error('Please enter a valid email address.');
      }

      await API_SERVICE.createUser(newEmployee);
      setCreateEmployeeSuccess(true);
      setNewEmployee({ username: '', email: '', password: '', role: '' }); 
      setTimeout(() => {
        setShowCreateEmployeeModal(false);
        setCreateEmployeeSuccess(false); // Reset success state
      }, 3000); // Close after 3 seconds

      // Automatically refresh employee list after successful creation
      handleViewEmployeeDetails();
    } catch (err) {
      // console.error('Error creating employee:', err);
      let errorMessage = 'Failed to create employee.';
      if (err.message) {
        errorMessage = err.message; // Use the specific error message from the API_SERVICE or custom validation
      }
      setCreateEmployeeError(errorMessage);
    } finally {
      setCreateEmployeeLoading(false);
    }
  };

  // NEW: Handle fetching all employees for the details modal
  const handleViewEmployeeDetails = useCallback(async () => {
    // console.log('🚀 Button clicked - starting to fetch employees...'); // Debug log
    setShowEmployeeDetailsModal(true);
    setEmployeesLoading(true);
    setEmployeesError(null);
    try {
      // console.log('📡 Making API call to fetchAllUsers...'); // Debug log
      const response = await API_SERVICE.fetchAllUsers();
      // console.log('✅ Raw API Response:', response); // Debug log
      // console.log('✅ Response type:', typeof response); // Debug log
      
      // Better error handling for API response
      if (!response) {
        throw new Error('No response received from API');
      }
      
      // Handle different response structures
      let usersData = [];
      if (response.users && Array.isArray(response.users)) {
        usersData = response.users;
        // console.log('👥 Found users array in response.users'); // Debug log
      } else if (Array.isArray(response)) {
        usersData = response;
        // console.log('👥 Response itself is an array'); // Debug log
      } else {
        // console.warn('⚠️ Unexpected response structure:', response);
        usersData = [];
      }
      
      // console.log('👥 Users data extracted:', usersData); // Debug log
      // console.log('📊 Number of users:', usersData.length); // Debug log
      
      if (!Array.isArray(usersData)) {
        throw new Error('Users data is not an array');
      }
      
      const processedData = usersData.map((user, index) => {
        // console.log(`Processing user ${index + 1}:`, user); // Debug log
        
        // Normalize role to proper case
        let normalizedRole = 'Employee'; // Default
        if (user.role) {
          const roleStr = user.role.toLowerCase();
          if (roleStr === 'admin' || roleStr === 'administrator') {
            normalizedRole = 'Admin';
          } else if (roleStr === 'hr' || roleStr === 'hr manager') {
            normalizedRole = 'HR';
          } else {
            normalizedRole = 'Employee';
          }
        }
        
        return {
          ...user,
          id: user.user_id || user.username || `user_${index}`,
          username: user.username || 'N/A',
          email: user.email || 'N/A',
          role: normalizedRole,
          is_active: user.is_active !== undefined ? user.is_active : true,
          is_verified: user.is_verified !== undefined ? user.is_verified : false,
          created_at: user.created_at || null,
          updated_at: user.updated_at || null,
          email_verified: user.email_verified || (user.is_verified === 1) || false
        };
      });
      setEmployees(processedData);
      // console.log('✨ Processed employees set:', processedData); // Debug log
      // console.log('✅ Employee modal should now show data!'); // Debug log
    } catch (err) {
      // console.error('❌ Error fetching employees:', err); // Debug log
      // setEmployeesError(err.message || 'Failed to fetch employee details.');
      setEmployees([]);
      if (err.message.includes('Authentication failed')) {
        navigate('/login'); // Redirect to login on auth failure
      }
    } finally {
      setEmployeesLoading(false);
      // console.log('🏁 Finished fetching employees'); // Debug log
    }
  }, [navigate]); // Add navigate to dependency array

  // NEW: Sort employees function
  const sortedEmployees = useMemo(() => {
    const sortableEmployees = [...employees];
    if (sortConfig.key) {
      sortableEmployees.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending'
            ? aValue - bValue
            : bValue - aValue;
        }
        // Fallback for other types or mixed types, treat as strings
        return sortConfig.direction === 'ascending'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }
    return sortableEmployees;
  }, [employees, sortConfig]);

  // NEW: Request sort
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // 🚀 MAIN EFFECT FOR INITIALIZATION
  useEffect(() => {
    let timeIntervalId = null;
    let weatherIntervalId = null;


    // Time update every minute
    timeIntervalId = setInterval(() => setCurrentTime(new Date()), 60000);


    loadDashboardData();
    // fetchPendingLeaves();

    // Cleanup function
    return () => {
      if (timeIntervalId) clearInterval(timeIntervalId);
      if (weatherIntervalId) clearInterval(weatherIntervalId);
    };
  }, [loadDashboardData]); 

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-white motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-4 text-lg text-white">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-900 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg relative max-w-lg text-center shadow-md" role="alert">
          <div className="flex items-center justify-center mb-3">
            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold text-lg">Error!</span>
          </div>
          <p className="block sm:inline">{error}</p>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={refreshStats}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center"
            >
              <svg className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Retrying...' : 'Retry Load'}
            </button>
            <button
              onClick={() => navigate('/login')} // Assuming /login is your login route
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen font-sans bg-blue-900">
      {/* Header Section */}
      <div className="mb-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start bg-blue-50 p-6 rounded-2xl shadow-lg">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h2 className="text-gray-900 text-3xl md:text-4xl font-bold mb-2">
              {getGreeting()}, {dashboardState.user.fullName || dashboardState.user.username}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg">
                {dashboardState.user.role}
              </span>
              <span className="text-gray-800 font-bold">•</span>
              <span className="text-gray-800">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <Suspense fallback={<div>Loading Weather...</div>}>
              <Weather />
            </Suspense>
          </div>
          </div>
          </div>
            <div className="mb-8 ">
              <div className="bg-blue-100 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-blue-100 space-y-3">
                <ShowThought />
                <NotifyAppreciation />
                <ShowAppreciation />
              </div>
            </div>
      {/* Policy Management & Employee Details Section */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-xl font-bold text-white">Management Tools</h3>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-blue-800">
            📋 Available Tools
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Policy Management Card */}
          <div
            className="bg-gray-100 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden border border-gray-100"
            onClick={() => navigate('/policymanagement')} 
          >
            <div className="text-3xl mb-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300 w-fit relative">
              📋
            </div>

            <div className="relative">
              <h4 className="text-gray-800 text-xl font-semibold mb-3">Policy Management</h4>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">Comprehensive policy management system with department-wise organization.</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Department Policies</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Policy Creation</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Compliance Tracking</span>
                </div>
              
              </div>

              <button
                onClick={() => navigate('/policymanagement')}
                className="bg-gray-500 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105 w-full">
                Access Policies
              </button>
            </div>
          </div>
        {/* Employee Details Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden border border-gray-100"
          >
         
          <div className="text-3xl mb-4 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl group-hover:from-green-100 group-hover:to-green-200 transition-all duration-300 w-fit relative">
            👥
          </div>
         
          <div className="relative">
            <h4 className="text-gray-800 text-xl font-semibold mb-3">Employee Management</h4>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">Comprehensive employee database and management system.</p>
           
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span>Employee Database</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span>Background Verification</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span>Document Management</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span>Status Tracking</span>
              </div>
            </div>
           
            <div className="space-y-2">
              <button
                onClick={() => handleViewEmployeeDetails()}
                className="bg-blue-500 text-white border-none px-6 py-2 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105 w-full">
                View All Employees
              </button>
              <button
                onClick={() => navigate('/BackgroundCheckForm')}
                className="bg-gray-500 text-white border-none px-6 py-2 rounded-lg cursor-pointer text-sm hover:bg-green-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105 w-full">
                Background Check Form
              </button>
            </div>
          </div>
        </div>
          {/* Create Employee Card - NEW */}
          <div
            className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden border border-gray-100 hover:-translate-y-3 hover:shadow-2xl hover:shadow-gradient-to-r hover:from-blue-600 hover:to-green-200"
            onClick={() => setShowCreateEmployeeModal(true)}
          >
            <div className="text-3xl mb-4 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300 w-fit relative">
              ➕
            </div>

            <div className="relative">
              <h4 className="text-purple-600 text-xl font-semibold mb-3">Create Employee</h4>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">Add new employees to the system with their details and roles.</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>New User Onboarding</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Role Assignment</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Account Creation</span>
                </div>
              </div>
              
              <div className='space-y-1'>
                <button
                  onClick={() => setShowCreateEmployeeModal(true)}
                  className="bg-gray-500 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-purple-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105 w-full">
                  Add New Employee
                </button>
              </div>
              
            </div>
          </div>
        </div>
      </div>
      
      
      {/* 📊 ENHANCED QUICK STATS WITH HEALTH INDICATORS */}
      <div className="mb-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">Dashboard Overview</h3>
          </div> 
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Project Card */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-100">
            <div className="flex items-center space-4 mb-3">
              <div className="text-2xl p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                📊
              </div>
              <h4 className="text-gray-800 px-5 text-md font-4xl mb-2">Active Project details</h4>
            </div>
            <div>
              <button 
                className="px-6 py-2.5 bg-blue-200 hover:bg-gradient-to-r from-blue-600 to-purple-600 text-black hover:text-white rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-zoom duration-300 ml-6 m-2"
                onClick={() => navigate('/project-user-details')}
                >
                View Project Details
              </button>
            </div>
          </div>

          {/* Hours This Week Card */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl group-hover:from-green-100 group-hover:to-green-200 transition-all duration-300">
                ⏰
              </div>
              <div className={`w-2 h-2 rounded-full ${
                dashboardState.stats.hoursThisWeek > 0 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
            </div>
            <div>
              <h4 className="text-gray-600 text-sm font-medium mb-2">Hours This Week</h4>
              <div className="text-2xl font-bold text-green-600 mb-1">
                {dashboardState.stats.hoursThisWeek.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">
                {dashboardState.stats.hoursThisWeek >= 40 ? 'Full time' :
                  dashboardState.stats.hoursThisWeek >= 20 ? 'Part time' : 'Getting started'}
              </div>
            </div>
          </div>

          {/* Tasks Completed Card */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300">
                ✅
              </div>
              <div className={`w-2 h-2 rounded-full ${
                dashboardState.stats.tasksCompleted > 0 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
            </div>
            <div>
              <h4 className="text-gray-600 text-sm font-medium mb-2">Tasks Completed</h4>
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {dashboardState.stats.tasksCompleted}
              </div>
              <div className="text-xs text-gray-500">
                {dashboardState.stats.tasksCompleted > 10 ? 'Highly productive' :
                  dashboardState.stats.tasksCompleted > 5 ? 'Good progress' :
                    dashboardState.stats.tasksCompleted > 0 ? 'Getting started' : 'No tasks yet'}
              </div>
            </div>
          </div>

          {/* Give Appreciation & View Appreciation Card */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all space-3 duration-300 group border border-gray-100">
                  <div>
                    <p className='mb-1'>Send a note of appreciation to a colleague!</p>
                    <button 
                      className="px-6 py-2.5 bg-blue-200 hover:bg-gradient-to-r from-blue-600 to-purple-600 text-black hover:text-white rounded-lg shadow-md hover:shadow-lg transition-all hover:zoom-in-out duration-300 ml-6 m-2"
                      onClick={() => setShowAppreciation(true)}
                    >
                      ✨ Send Appreciation
                    </button>
                  </div>
                  <div>
                    <p>View all appreciation notes of colleagues.</p>
                    <button 
                      className="px-6 py-2.5 bg-blue-200 hover:bg-gradient-to-r from-blue-600 to-purple-600 text-black hover:text-white rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-zoom duration-300 ml-6 m-2"
                      onClick={() => navigate('/viewallappreciation')}
                    >
                      View All Appreciation
                    </button>
                  </div>    
                  
                  
                </div>
        </div>
      </div>

      {/* 📋 PENDING LEAVE REQUESTS SECTION */}

      
    
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {/* Calendar Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/calendar')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Calendar</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Track important events & meetings</p>
          <div className="mt-4 relative">
            <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
              View Calendar
            </button>
          </div>
        </div>

        {/* Timesheet Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/timesheet')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Timesheet</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Log your working hours</p>
          <div className="mt-4 relative">
            <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
              Log Hours
            </button>
          </div>
        </div>

        {/* Leave Approval Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/leave-requests')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Leave Approvals</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Manage employee leave requests</p>
          <div className="mt-4 relative flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/leave-requests')}
              className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105"
            >
              View All Requests
            </button>
          </div>
        </div>

        {/* Personal Leave Management Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/leaveManagement')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">My Leave</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Request and manage your own leaves</p>
          <div className="mt-4 relative">
            <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
              Request Leave
            </button>
          </div>
        </div>
        {/* Expense Management Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/expense-management')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Our Expenses</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Manage your company expenses</p>
          <div className="mt-4 relative">
            <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
              Manage Expenses
            </button>
          </div>
        </div>
        {/* Report Management Card */}
        {/* <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/report-management')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Report Management</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Manage your reports</p>
          <div className="mt-4 relative">
            <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
              Create Reports
            </button>
          </div>
        </div> */}

        {/* Asset management Card */}
        <div
          className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/assetmanagement')}
        >
          <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Asset Management</h3>
          <p className="text-gray-600 text-sm mb-4 relative">Manage company assets</p>
          <div className="mt-4 relative flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/assetmanagement')}
              className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105"
            >
              View All Assets
            </button>
          </div>
        </div>

      </div>

      {/* Create Employee Modal */}
      {showCreateEmployeeModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👤</div>
              <h3 className="text-2xl font-bold text-gray-800">Create New Employee</h3>
              <p className="text-gray-600 text-sm mt-1">Add a new employee to the system</p>
            </div>

            <button
              onClick={() => {
                setShowCreateEmployeeModal(false);
                setCreateEmployeeError(null);
                setCreateEmployeeSuccess(false);
                setNewEmployee({ username: '', email: '', password: '', role: '' });
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newEmployee.username}
                  onChange={handleEmployeeInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter unique username"
                  required
                  minLength="3"
                />
                <p className="text-xs text-gray-500 mt-1">Must be unique and at least 3 characters</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newEmployee.email}
                  onChange={handleEmployeeInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="employee@company.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be a valid and unique email address</p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newEmployee.password}
                  onChange={handleEmployeeInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter secure password"
                  required
                  minLength="6"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={newEmployee.role}
                  onChange={handleEmployeeInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Select employee role</option>
                  <option value="Employee">Employee</option>
                  <option value="HR">HR Manager</option>
                  <option value="Admin">Administrator</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose appropriate role for system access</p>
              </div>

              {createEmployeeError && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-6 py-4 rounded-lg relative" role="alert">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="block text-sm">{createEmployeeError}</span>
                  </div>
                </div>
              )}

              {createEmployeeSuccess && (
                <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative" role="alert">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="block text-sm">Employee created successfully!</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={createEmployeeLoading}
                className={`w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 flex items-center justify-center ${
                  createEmployeeLoading
                    ? 'bg-purple-300 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
                  }`}
              >
                {createEmployeeLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating Employee...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Employee Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setShowCreateEmployeeModal(false);
                  setShowEmployeeDetailsModal(true);
                  setCreateEmployeeError(null);
                  setNewEmployee({ username: '', email: '', password: '', role: '' });
                }}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                View existing employees &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Employee Details Modal */}
      {showEmployeeDetailsModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Employee Database</h3>
                <p className="text-sm text-gray-600 mt-1">Complete employee information and management</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {sortedEmployees.length} Total Employees
                </div>
                <button
                  onClick={() => handleViewEmployeeDetails()}
                  disabled={employeesLoading}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    employeesLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  title="Refresh employee data"
                >
                  <svg className={`w-4 h-4 ${employeesLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowEmployeeDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Content */}
            {employeesLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-lg">Loading employee database...</p>
                <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the latest information</p>
              </div>
            ) : employeesError ? (
              <div className="p-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg relative" role="alert">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Error loading employee data:</span>
                  </div>
                  <span className="block mt-1">{employeesError}</span>
                  <button
                    onClick={() => handleViewEmployeeDetails()}
                    className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Statistics Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{sortedEmployees.length}</div>
                    <div className="text-sm text-blue-700">Total Employees</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {sortedEmployees.filter(emp => emp.role === 'Employee').length}
                    </div>
                    <div className="text-sm text-green-700">Employees</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {sortedEmployees.filter(emp => emp.role === 'HR').length}
                    </div>
                    <div className="text-sm text-purple-700">HR Staff</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {sortedEmployees.filter(emp => emp.role === 'Admin').length}
                    </div>
                    <div className="text-sm text-red-700">Administrators</div>
                  </div>
                </div>

                {/* Enhanced Table */}
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => requestSort('id')}
                        >
                          <div className="flex items-center">
                            Employee ID
                            {sortConfig.key === 'id' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => requestSort('username')}
                        >
                          <div className="flex items-center">
                            Username
                            {sortConfig.key === 'username' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => requestSort('email')}
                        >
                          <div className="flex items-center">
                            Email Address
                            {sortConfig.key === 'email' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => requestSort('role')}
                        >
                          <div className="flex items-center">
                            Role
                            {sortConfig.key === 'role' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedEmployees.map((employee, index) => (
                        <tr key={employee.id} className={`hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                          }`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                  {employee.id}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">ID: {employee.id}</div>
                                <div className="text-sm text-gray-500">
                                  {employee.created_at ?
                                    `Joined ${new Date(employee.created_at).toLocaleDateString()}` :
                                    'Join date N/A'
                                  }
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{employee.username}</div>
                            <div className="text-sm text-gray-500">@{employee.username?.toLowerCase() || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.email}</div>
                            <div className="text-sm text-gray-500">
                              {employee.email_verified ? (
                                <span className="text-green-600">✓ Verified</span>
                              ) : (
                                <span className="text-yellow-600">⚠ Unverified</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              employee.role === 'Admin' ? 'bg-red-100 text-red-800' :
                                employee.role === 'HR' ? 'bg-purple-100 text-purple-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {employee.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              employee.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {employee.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => navigator.clipboard.writeText(employee.email)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Copy email address"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
                                className="text-green-600 hover:text-green-900 transition-colors"
                                title="Send email"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {sortedEmployees.length} employee{sortedEmployees.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setShowEmployeeDetailsModal(false);
                        setShowCreateEmployeeModal(true);
                        setEmployeesError(null); // Clear error when navigating
                        setNewEmployee({ username: '', email: '', password: '', role: '' }); // Reset form when navigating
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      + Add New Employee
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Appreciation Modal */}
        {showAppreciation && (
          <Appreciation 
            isOpen={showAppreciation}
            onClose={() => setShowAppreciation(false)}
            onSuccess={() => {
              setShowAppreciation(false);
              // You could show a success message or refresh data here
            }}
          />
        )}
    </div>
  );
};

export default HrHome;