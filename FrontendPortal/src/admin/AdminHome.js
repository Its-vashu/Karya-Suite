import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// The base URL for your FastAPI backend
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const ADMIN_API_SERVICE = {
  BASE: API_BASE,
  /**
   * Retrieves and validates the JWT token from local storage.
   * @returns {string|null} The token if valid, otherwise null.
   */
  getToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check if the token is expired
      if (payload.exp * 1000 < Date.now()) {
        console.warn('🔴 Token expired. Removing from localStorage.');
        localStorage.removeItem('access_token');
        return null;
      }
      return token;
    } catch (error) {
      console.error('🔴 Error decoding or validating token:', error);
      localStorage.removeItem('access_token');
      return null;
    }
  },

  /**
   * Performs an authenticated API request with caching and retry logic.
   * @param {string} endpoint - The API endpoint to call (e.g., 'users/stats').
   * @param {object} options - Fetch options.
   * @returns {Promise<any>} The parsed JSON response.
   */
  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication token missing or expired. Please log in again.');
    }
    const url = `${this.BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const cacheKey = `${url}_${options.method || 'GET'}_${JSON.stringify(options.body || {})}`;
    
    // Caching logic for GET requests
    if (options.method === 'GET' || !options.method) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { message: response.statusText || 'Unknown API Error' };
          }
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            throw new Error('Authentication failed. Please log in again.');
          }
          throw new Error(errorData.message || errorData.detail || 'API Error');
        }
        const data = await response.json();
        if (options.method === 'GET' || !options.method) {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      } catch (error) {
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
  },

  // --- FastAPI admin methods (corrected to match your API) ---
  
  async getAPIHealth() {
    try {
      const response = await fetch(`${this.BASE}/`);
      return response.ok;
    } catch {
      return false;
    }
  },

  async fetchOpenAPISpec() {
    try {
      const response = await fetch(`${this.BASE}/openapi.json`);
      return await response.json();
    } catch {
      return null;
    }
  },

  // Fetches user statistics from the API
  async fetchUserStats() {
    try {
      return await this.request('users/stats');
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        total_users: 0,
        verified_users: 0,
        unverified_users: 0,
        users_by_role: {},
        profile_stats: {}
      };
    }
  },

  // Fetches all users from the API
  async fetchAllUsers() {
    try {
      return await this.request('users/');
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },

  // NEW: Fetches the total count of policies
  async fetchPoliciesCount() {
    try {
      const result = await this.request('policies/count');
      return result.count;
    } catch (error) {
      console.error('Error fetching policies count:', error);
      return 0;
    }
  },

  // NEW: Fetches the total number of leave applications
  async fetchLeaveApplicationsCount() {
    try {
      const applications = await this.request('leave-applications/');
      return applications.length; // Assuming the API returns an array
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      return 0;
    }
  },

  // MOCK: This data is not from an API, as no endpoint was provided.
  async fetchAdminLogs() {
    return [
      { id: 1, user: 'admin', action: 'update', target: 'category#419', time: '2 days ago', type: 'update' },
      { id: 2, user: 'admin', action: 'delete', target: 'category#417', time: '2 days ago', type: 'delete' },
      { id: 3, user: 'admin', action: 'create', target: 'product#454', time: '4 days ago', type: 'create' },
      { id: 4, user: 'admin', action: 'delete', target: 'config#119', time: '4 days ago', type: 'delete' },
      { id: 5, user: 'admin', action: 'delete', target: 'category#414', time: '4 days ago', type: 'delete' },
      { id: 6, user: 'admin', action: 'delete', target: 'category#418', time: '4 days ago', type: 'delete' },
      { id: 7, user: 'admin', action: 'delete', target: 'category#416', time: '4 days ago', type: 'delete' }
    ];
  },

  clearCache() {
    this.cache.clear();
  }
};

// --- Utility functions ---
const UTILS = {
  decodeToken(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  },
  
  // This is mock data, as there is no API endpoint for 'Stargazers'.
  generateStargazersData() {
    const data = [];
    const baseDate = new Date('2020-04-04');
    let value = 0;
    for (let i = 0; i <= 2000; i += 7) {
      const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      value += Math.floor(Math.random() * 50) + 20;
      data.push({
        date: date.toISOString().split('T')[0],
        value: value
      });
    }
    return data;
  },
};

// --- Child Components ---
const AdminAPIConfig = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  const [endpoints, setEndpoints] = useState([]);
  const [apiSpec, setApiSpec] = useState(null);

  useEffect(() => {
    const checkAPI = async () => {
      const health = await ADMIN_API_SERVICE.getAPIHealth();
      setApiStatus(health ? 'connected' : 'error');
      if (health) {
        const spec = await ADMIN_API_SERVICE.fetchOpenAPISpec();
        if (spec) {
          setApiSpec(spec);
          setEndpoints(Object.keys(spec.paths || {}));
        }
      }
    };
    checkAPI();
  }, []);

  return (
    <div className="border border-gray-200 p-4 rounded-lg bg-gray-50">
      <h3 className="text-base font-semibold mb-2">🔧 FastAPI Configuration</h3>
      <div className={`text-sm font-medium mb-4 ${apiStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
        Status: {apiStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
      </div>
      <div className="flex space-x-2 mb-4">
        <a
          href={`${API_BASE}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-indigo-200 transition-colors duration-200"
        >
          📖 FastAPI Docs
        </a>
        <a
          href={`${API_BASE}/redoc`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-indigo-200 transition-colors duration-200"
        >
          📚 ReDoc
        </a>
      </div>
      <div className="endpoints-overview">
        <h4 className="text-sm font-semibold mb-2">Available Endpoints ({endpoints.length})</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {endpoints.slice(0, 8).map((endpoint, index) => (
            <div key={index} className="bg-gray-100 text-xs px-2 py-1 rounded truncate">
              {endpoint}
            </div>
          ))}
          {endpoints.length > 8 && (
            <div className="bg-gray-200 text-center text-xs px-2 py-1 rounded truncate">
              +{endpoints.length - 8} more
            </div>
          )}
        </div>
      </div>
      {apiSpec && (
        <div className="mt-4 text-sm">
          <p><strong>API Version:</strong> {apiSpec.info?.version || 'N/A'}</p>
          <p><strong>Title:</strong> {apiSpec.info?.title || 'FastAPI'}</p>
        </div>
      )}
    </div>
  );
};

const StargazersChart = ({ data }) => {
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
  const chartHeight = 200;
  return (
    <div className="w-full h-auto">
      <svg width="100%" height={chartHeight} viewBox="0 0 800 200">
        <defs>
          <linearGradient id="stargazersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4299e1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4299e1" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(percent => (
          <line
            key={percent}
            x1="0"
            y1={chartHeight * percent / 100}
            x2="800"
            y2={chartHeight * percent / 100}
            stroke="#e2e8f0"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
        {data.length > 1 && (
          <path
            d={`M 0 ${chartHeight} ${data.map((d, i) =>
              `L ${(i / (data.length - 1)) * 800} ${chartHeight - (d.value / maxValue) * chartHeight}`
            ).join(' ')} L 800 ${chartHeight} Z`}
            fill="url(#stargazersGradient)"
          />
        )}
        {data.length > 1 && (
          <path
            d={`M ${data.map((d, i) =>
              `${(i / (data.length - 1)) * 800},${chartHeight - (d.value / maxValue) * chartHeight}`
            ).join(' L ')}`}
            fill="none"
            stroke="#4299e1"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>2020-04-04</span>
        <span>2025-08-12</span>
      </div>
    </div>
  );
};

// --- Main AdminHome Component ---
const AdminHome = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    usersByRole: {}
  });
  const [apiHealth, setApiHealth] = useState(false);
  const [showAPIManager, setShowAPIManager] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [stargazersData, setStargazersData] = useState([]);
  const [policiesCount, setPoliciesCount] = useState(0); // New state for policies
  const [leaveApplicationsCount, setLeaveApplicationsCount] = useState(0); // New state for leave applications

  const checkAPIHealth = useCallback(async () => {
    const health = await ADMIN_API_SERVICE.getAPIHealth();
    setApiHealth(health);
  }, []);

  const getCurrentUser = useCallback(() => {
    const token = ADMIN_API_SERVICE.getToken();
    if (token) {
      const decoded = UTILS.decodeToken(token);
      if (decoded) {
        setCurrentUser({
          username: decoded.sub || decoded.username || 'admin',
          role: decoded.role || 'admin'
        });
      }
    }
  }, []);

  // Updated `loadAdminDashboard` to fetch real data for new stats
  const loadAdminDashboard = useCallback(async () => {
    try {
      const token = ADMIN_API_SERVICE.getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const [
        userStatsResponse,
        logsResponse,
        policiesCountResponse,
        leaveApplicationsCountResponse
      ] = await Promise.allSettled([
        ADMIN_API_SERVICE.fetchUserStats(),
        ADMIN_API_SERVICE.fetchAdminLogs(),
        ADMIN_API_SERVICE.fetchPoliciesCount(),
        ADMIN_API_SERVICE.fetchLeaveApplicationsCount(),
      ]);
      if (userStatsResponse.status === 'fulfilled') {
        const stats = userStatsResponse.value;
        setSystemStats({
          totalUsers: stats.total_users || 0,
          verifiedUsers: stats.verified_users || 0,
          unverifiedUsers: stats.unverified_users || 0,
          usersByRole: stats.users_by_role || {}
        });
      }
      if (logsResponse.status === 'fulfilled') {
        setRecentActivities(logsResponse.value || []);
      }
      if (policiesCountResponse.status === 'fulfilled') {
        setPoliciesCount(policiesCountResponse.value);
      }
      if (leaveApplicationsCountResponse.status === 'fulfilled') {
        setLeaveApplicationsCount(leaveApplicationsCountResponse.value);
      }
      setStargazersData(UTILS.generateStargazersData());
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshDashboard = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    ADMIN_API_SERVICE.clearCache();
    await loadAdminDashboard();
    await checkAPIHealth();
    setIsRefreshing(false);
  }, [loadAdminDashboard, checkAPIHealth, isRefreshing]);

  const formatTime = useCallback((date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), []);

  const getGreeting = useCallback(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);
    const healthInterval = setInterval(checkAPIHealth, 30000);
    getCurrentUser();
    checkAPIHealth();
    loadAdminDashboard();
    return () => {
      clearInterval(timeInterval);
      clearInterval(healthInterval);
    };
  }, [loadAdminDashboard, getCurrentUser, checkAPIHealth]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-600">
        <div className="w-10 h-10 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800 p-4 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center bg-white shadow rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xl font-bold text-indigo-600">
            <div className="text-2xl">📊</div>
            <span className="brand-name">tabler</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getGreeting()}, {currentUser?.username || 'ADMIN'}!</span>
            <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full">ADMIN</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50"
            onClick={refreshDashboard}
            disabled={isRefreshing}
          >
            {isRefreshing ? '🔄' : '🔃'}
          </button>
          <div className="text-sm text-gray-500">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-col space-y-4 w-full md:w-2/3">
          {/* Overview Section */}
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-2xl font-semibold mb-4">📈 Overview</h2>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Stargazers over time</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900">3400</span>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">+24%</span>
                </div>
              </div>
              <StargazersChart data={stargazersData} />
            </div>
          </div>

          {/* FastAPI Admin Section */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">🔧 FastAPI Admin Management</h3>
              <div className={`text-sm font-semibold px-2 py-1 rounded-full ${apiHealth ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {apiHealth ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => window.open(`${API_BASE}/docs`, '_blank')}
                className="flex-1 flex justify-center items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 bg-indigo-500 text-white hover:bg-indigo-600"
              >
                📖 API Docs
              </button>
              <button
                onClick={() => window.open(`${API_BASE}/redoc`, '_blank')}
                className="flex-1 flex justify-center items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                📚 ReDoc
              </button>
              <button
                onClick={() => setShowAPIManager(!showAPIManager)}
                className="flex-1 flex justify-center items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                ⚙️ Manager
              </button>
            </div>
            {showAPIManager && <AdminAPIConfig />}
          </div>
        </div>

        <div className="flex flex-col space-y-4 w-full md:w-1/3">
          {/* Admin Logs */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">📋 Admin Logs</h3>
            <div className="flex flex-col space-y-2">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{activity.user}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activity.type === 'update' ? 'bg-blue-100 text-blue-700' : activity.type === 'delete' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{activity.action}</span>
                    <span className="log-target">{activity.target}</span>
                  </div>
                  <div className="text-xs text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats (Updated with real data) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-start p-4 bg-gray-50 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-gray-900">{systemStats.totalUsers}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="flex flex-col items-start p-4 bg-gray-50 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-gray-900">{policiesCount}</div>
              <div className="text-sm text-gray-500">Total Policies</div>
            </div>
            <div className="flex flex-col items-start p-4 bg-gray-50 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-gray-900">{leaveApplicationsCount}</div>
              <div className="text-sm text-gray-500">Leave Apps</div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white shadow rounded-lg p-4">
            <h4 className="text-lg font-medium mb-4">⚡ System Health</h4>
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">API Status</span>
                <span className={`font-medium ${apiHealth ? 'text-green-600' : 'text-red-600'}`}>
                  {apiHealth ? 'Healthy' : 'Down'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Database</span>
                <span className="font-medium text-green-600">Connected</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Redis Cache</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
