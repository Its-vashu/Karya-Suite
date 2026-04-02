import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeBackgroundForm from './EmployeeBackgroundForm';
import ShowThought from '../utils/ShowThought';

import NotifyAppreciation from '../appreciation/NotifyAppreciation';
import Appreciation from '../appreciation/Appreciation';
import ShowAppreciation from '../appreciation/ShowAppreciation';

import { useUser } from '../context/UserContext';

const Weather = lazy( ()=> (import ('../utils/Weather')) );

const API_SERVICE = {
  API_BASE: process.env.REACT_APP_API_BASE_URL,

  // 🔐 Secure token management with validation
  getToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    // Basic token validation (check if expired)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('access_token');
        return null;
      }
      return token;
    } catch {
      localStorage.removeItem('access_token');
      return null;
    }
  },

  // 🚄 High-performance HTTP client with retry logic
  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Authentication token missing or expired');

    // Build the complete URL
    const baseUrl = this.API_BASE;
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // console.log('🚀 Making API request to:', url);

    // const fetchOptions = {
    //   ...options,
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json',
    //     ...options.headers,
    //   }
    // };

    // console.log('Request options:', fetchOptions);

    // 🔄 Retry mechanism for reliability
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // console.log(`Fetching from URL: ${url}`);
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
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            throw new Error('Authentication failed');
          }
          if (response.status >= 500 && attempt < this.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
            continue;
          }
          throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();

        if (this.cache.size > 100) {
          const oldest = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
          this.cache.delete(oldest[0]);
        }
        this.cache.set( { data, timestamp: Date.now() });

        return data;
      } catch (error) {
        if (attempt === this.MAX_RETRIES) {
          //console.error(`🔴 API Request Failed [${endpoint}] after ${this.MAX_RETRIES} attempts:`, error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
  },

  async fetchDashboardData(user_id) {
    try {
      if (!user_id) {
        //console.error('❌ No user_id provided to fetchDashboardData');
        throw new Error('User ID is required');
      }

      // console.log('🔍 Fetching dashboard data for user:', user_id);

      // Make profile request first
      // console.log('📊 Fetching profile data...');
      const profileResponse = await fetch(`${this.API_BASE}/user-details/${user_id}/company-project-details`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        // console.error('Profile API Response:', {
        //   status: profileResponse.status,
        //   statusText: profileResponse.statusText,
        //   url: profileResponse.url
        // });
        throw new Error(`Profile API error: ${profileResponse.status} ${profileResponse.statusText}`);
      }

      const profileData = await profileResponse.json();
      // console.log('✅ Profile data received:', profileData);

      // Now fetch timesheet data
      // console.log('📅 Fetching timesheet data...');
      const timesheetResponse = await fetch(`${this.API_BASE}/timesheets?user_id=${user_id}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!timesheetResponse.ok) {
        throw new Error(`Timesheet API error: ${timesheetResponse.status} ${timesheetResponse.statusText}`);
      }

      const timesheetData = await timesheetResponse.json();
      // console.log('✅ Timesheet data received:', timesheetData);

      // Extract project details and add error handling
      let projectData = {
        ...profileData,
        timesheets: timesheetData
      };

      // console.log('🎯 Final processed data:', {
      //   profile: profileData,
      //   timesheets: timesheetData,
      //   projectDetails: {
      //     projectName: profileData?.project_name || 'No project name',
      //   }
      // });

      return [projectData, timesheetData];
    } catch (error) {
      //console.error('🔴 Dashboard data fetch failed:', error.message);
      // Show detailed error in console for debugging
      // console.error('Error details:', {
      //   message: error.message,
      //   stack: error.stack,
      //   response: error.response
      // });
      throw error; // Propagate error to be handled by the component
    }
  },

  // 🎂 NEW: Fetch form data for birthday checks from EmployeeBackgroundForm
  async fetchFormData() {
    try {
      return await this.request('/api/background-check/forms/');
    } catch (error) {
      //console.error('🔴 Failed to fetch form data:', error);
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

const UTILS = {
  // 🔐 Advanced JWT token decoder with validation
  decodeToken(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));

      // Validate token structure
      if (!payload || typeof payload !== 'object') return null;

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        //console.warn('🔴 Token expired');
        return null;
      }

      return payload;
    } catch (error) {
      //console.error('🔴 Token decode failed:', error);
      return null;
    }
  },

  // 🎯 Advanced project name extraction with fallback hierarchy
  extractProjectName(profile) {
    if (!profile || typeof profile !== 'object') return 'No Assign';

    const projectField = 'project_name';

    // Check direct fields
    if (profile[projectField] && typeof profile[projectField] === 'string') {
      return profile[projectField].trim();
    }
    return 'No Assign';
  },

  // 📊 High-performance weekly statistics calculator
  calculateWeeklyStats(timesheets) {
    if (!Array.isArray(timesheets)) return { hours: 0, tasks: 0 };

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return timesheets.reduce((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;

      const entryDate = new Date(entry.sheet_date || entry.date);
      if (isNaN(entryDate.getTime())) return acc;

      if (entryDate >= weekStart && entryDate <= weekEnd) {
        // Parse hours with multiple field support
        const hours = parseFloat(entry.time_hour || entry.hours || entry.duration || 0);
        if (!isNaN(hours)) acc.hours += hours;

        // Count tasks
        if (entry.task_name || entry.task || entry.description) {
          acc.tasks++;
        }
      }

      return acc;
    }, { hours: 0, tasks: 0 });
  },

  // 🗓️ Advanced deadline formatter with urgency detection
  formatDeadline(dateStr) {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const options = { day: '2-digit', month: 'short' };
    const formatted = date.toLocaleDateString('en-US', options);
    const [month, day] = formatted.toUpperCase().split(' ');

    // Determine urgency levels
    let urgencyLevel = 'normal';
    if (diffDays < 0) urgencyLevel = 'overdue';
    else if (diffDays <= 1) urgencyLevel = 'critical';
    else if (diffDays <= 3) urgencyLevel = 'urgent';
    else if (diffDays <= 7) urgencyLevel = 'soon';

    return {
      id: `deadline-${Date.now()}`,
      date: day,
      month: month,
      title: 'Project Deadline',
      dueIn: diffDays === 0 ? 'Today' :
             diffDays === 1 ? 'Tomorrow' :
             diffDays < 0 ? `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue` :
             `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
      urgencyLevel,
      urgent: diffDays <= 3,
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
           (profile.username || profile.full_name);
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

const EmployeeHome = () => {
  const navigate = useNavigate();
  const { role, username, user_id, full_name } = useUser();
  // console.log('User Info:', { role, username, user_id, full_name });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBackgroundForm, setShowBackgroundForm] = useState(false);
  const [showAppreciation, setShowAppreciation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');


  // 📊 Consolidated dashboard state
  const [dashboardState, setDashboardState] = useState({
    user: {
      username: '',
      role: '',
      full_name: full_name,
      projectName: '',
      isValid: false,
    },
    stats: {
      projectsActive: 0,
      hoursThisWeek: 0,
      tasksCompleted: 0,
      goalProgress: 0,
      lastUpdated: null,
    },
    projectDeadline: '',
    dataQuality: {
      profileComplete: false,
      timesheetAvailable: false,
      lastSync: null,
    },
  });

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

  // 🚀 PERFORMANCE-OPTIMIZED COMPUTED VALUES
  // const formattedDeadline = useMemo(() => {
  //   const deadline = UTILS.formatDeadline(dashboardState.projectDeadline);
  //   return deadline ? [deadline] : [];
  // }, [dashboardState.projectDeadline]);

  const dashboardHealth = useMemo(() => {
    const { user, stats, dataQuality } = dashboardState;
    return {
      userDataComplete: user.isValid && user.full_name,
      statsAvailable: stats.lastUpdated && stats.hoursThisWeek >= 0,
      overallHealth: user.isValid && dataQuality.profileComplete ? 'good' : 'partial',
    };
  }, [dashboardState]);

  // 📊 DASHBOARD DATA LOADER
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      // console.log('Loading dashboard data for user_id:', user_id);
      const [profile, timesheets] = await API_SERVICE.fetchDashboardData(user_id);

      // console.log('Full Profile Data:', profile);

      setDashboardState(prev => {
        const newState = {
          ...prev,
          user: {
            ...prev.user,
            username: username,
            role: role,
            full_name: full_name,
            projectName: profile?.project_name || 'No Project Assigned',
            isValid: !!profile
          },
          stats: {
            ...prev.stats,
            projectsActive: profile?.project_name ? 1 : 0,
            hoursThisWeek: Array.isArray(timesheets) ? UTILS.calculateWeeklyStats(timesheets).hours : 0,
            tasksCompleted: Array.isArray(timesheets) ? UTILS.calculateWeeklyStats(timesheets).tasks : 0,
            lastUpdated: new Date().toISOString()
          },
          projectDeadline: profile?.project_end_date || '',
          dataQuality: {
            profileComplete: !!profile,
            timesheetAvailable: Array.isArray(timesheets) && timesheets.length > 0,
            lastSync: new Date().toISOString()
          }
        };
        // console.log('New Dashboard State:', newState);
        return newState;
      });

    } catch (error) {
      //console.error('🔴 Dashboard load failed:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user_id,full_name,role,username]);

  const loadPolicies = useCallback(async () => {
    try {
      setPoliciesLoading(true);
      const policiesData = await API_SERVICE.fetchPolicies();
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
    } catch (error) {
      //console.error('🔴 Policies load failed:', error);
      setPolicies([]);
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  // 🔄 SMART REFRESH
  // const refreshStats = useCallback(async () => {
  //   if (isRefreshing) return;
  //   setIsRefreshing(true);
  //   setError(null);

  //   try {
  //     if (API_SERVICE && typeof API_SERVICE.clearCache === 'function') {
  //       API_SERVICE.clearCache();
  //     }
  //     await loadDashboardData();
  //   } catch (error) {
  //     console.error('🔴 Refresh failed:', error);
  //     setError('Refresh failed. Please try again.');
  //   } finally {
  //     setIsRefreshing(false);
  //   }
  // }, [loadDashboardData, isRefreshing]);


  const getGreeting = useCallback(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  useEffect(() => {
    let timerId = null;

    const updateTime = () => setCurrentTime(new Date());

    timerId = setInterval(updateTime, 60000);

    loadDashboardData();
    loadPolicies();

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [loadDashboardData, loadPolicies]);

  // 🌟 Conditional render for policies view
  if (currentView === 'policies') {
    return (
      <div className="p-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Company Policies</h2>
          
          {policiesLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No policies available at the moment
            </div>
          ) : (
            <div className="grid gap-4">
              {policies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{policy.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {policy.department}
                        </span>
                        {policy.policy_category && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {policy.policy_category}
                          </span>
                        )}
                        {policy.effective_date && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Effective: {new Date(policy.effective_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {policy.pdf_path && (
                      <a
                        href={`${API_SERVICE.API_BASE}/policies/${policy.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard return
  return (
    <div className="p-8 font-sans bg-blue-900">
      <div className="relative z-[2]">
        {/* Background Check Form Modal */}
        {showBackgroundForm && (
          <div className="fixed inset-0 bg-blue-100 flex items-center justify-center z-50">
            <div className=" rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <EmployeeBackgroundForm onClose={() => setShowBackgroundForm(false)} />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.186-.833-2.956 0L3.858 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-700 font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-auto ">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        )}

        {/* Dashboard Content - Only show when not loading */}
        {!loading && (
          <div>
            {/* Header Section */}
            <div className="mb-5">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start bg-blue-50 p-6 rounded-2xl shadow-lg">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h2 className="text-gray-800 text-3xl md:text-4xl font-bold mb-2">
                    {getGreeting()}, {full_name || username}
                  </h2> 
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg">
                      {dashboardState.user.role}
                    </span>
                    <span className="text-gray-900 font-bold">•</span>
                    <span className="text-gray-600">
                      {formatDate(currentTime)} • {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div>
                    <Suspense fallback={ 
                        <div className="w-24 h-24 bg-blue-100 rounded-full animate-pulse mx-auto md:mx-0"></div>
                      }>
                      <Weather />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="bg-blue-100 flex-col  backdrop-blur-sm  lg:space-x-2 sm:space-y-5 p-6 rounded-2xl shadow-lg border border-blue-100">
                <ShowThought />
                <NotifyAppreciation />
                <ShowAppreciation />
              </div>
            </div>

            {/* 📊 ENHANCED QUICK STATS WITH HEALTH INDICATORS */}
            <div className="mb-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-800">Dashboard Overview</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    dashboardHealth.overallHealth === 'good' ? 'bg-green-100 text-green-800' :
                    dashboardHealth.overallHealth === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {dashboardHealth.overallHealth === 'good' ? '✅ All Systems' :
                    dashboardHealth.overallHealth === 'partial' ? '⚠️ Partial Data' :
                    '❌ Data Issues'}
                  </div>
                </div>
              </div>
            
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Project Card */}
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                      📊
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      dashboardState.user.projectField !== 'No Assignment' ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="text-gray-600 text-sm font-medium mb-2">Active Project</h4>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {dashboardState.user.projectName || 'Not Assigned'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {dashboardState.stats.projectsActive > 0 ? `${dashboardState.stats.projectsActive} active` : 'No active projects'}
                    </div>
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

                {/* Add Appreciation Card */}
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
                <div>
                </div>
              </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              >
                <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Timesheet</h3>
                <p className="text-gray-600 text-sm mb-4 relative">Log your working hours</p>
                <div className="mt-4 relative">
                  <button
                      onClick={() => navigate('/timesheet')}
                      className=" bg-blue-600 text-white px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-colors hover:shadow-lg group-hover:scale-105"
                    >
                      View Timesheet
                    </button>
                </div>
              </div>

              {/* Leave Management Card */}
              <div
                className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => navigate('/leaveManagement')}
              >
                <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Leave Management</h3>
                <p className="text-gray-600 text-sm mb-4 relative">Manage your leave requests</p>
                <div className="mt-4 relative">
                  <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
                    Request Leave
                  </button>
                </div>
              </div>

              {/* View Policies Card */}
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-blue-600 text-xl font-semibold relative">Company Policies</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 relative">View company policies & guidelines</p>
                <div className="mt-4 relative">
                  <button 
                    className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105"
                    onClick={() => navigate('/policies-view')}
                  >
                    View Policies
                  </button>
                </div>
              </div>

              {/* Background Check Form Card */}
              <div
                className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => setShowBackgroundForm(true)}
              >
                <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Profile Details</h3>
                <p className="text-gray-600 text-sm mb-4 relative">Complete your background information</p>
                <div className="mt-4 relative">
                  <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
                    Update Profile
                  </button>
                </div>
              </div>

              {/* Expense Management Card - Added here */}
              <div 
                className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => navigate('/expense')}
              >
                <h3 className="text-blue-600 text-xl font-semibold mb-2 relative">Expense Management</h3>
                <p className="text-gray-600 text-sm mb-4 relative">Submit and track your expenses</p>
                <div className="mt-4 relative">
                  <button className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-blue-700 transition-all duration-300 hover:shadow-lg group-hover:scale-105">
                    Manage Expenses
                  </button>
                </div>
              </div>
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
    </div>
  );
};

export default EmployeeHome;
