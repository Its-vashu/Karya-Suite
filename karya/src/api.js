import axios from 'axios';
import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production base URL - ensure this is set in your .env file
const BASE_URL = API_BASE_URL || 'https://employee-backend-2-lmby.onrender.com';

if (!API_BASE_URL) {
  console.warn('⚠️ API_BASE_URL not found in .env, using fallback:', BASE_URL);
}
// Store auth refresh state to prevent multiple refresh requests
let isRefreshing = false;
let refreshSubscribers = [];

// Function to process queued requests after token refresh
const processQueue = (error, token = null) => {
  refreshSubscribers.forEach(callback => {
    if (error) {
      callback(error);
    } else {
      callback(token);
    }
  });
  
  refreshSubscribers = [];
};

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error accessing token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle network errors gracefully
    if (!error.response) {
      return Promise.reject({
        ...error,
        message: 'Network Error: Please check your internet connection'
      });
    }
    
    // Handle token expiration
    if (error.response.status === 401 && !originalRequest._retry) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Attempt to refresh the token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        
        if (response.data.access_token) {
          await AsyncStorage.setItem('authToken', response.data.access_token);
          
          // Update the original request with the new token
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          
          // Process the queue
          processQueue(null, response.data.access_token);
          
          return api(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }
      } catch (refreshError) {
        // Handle refresh token failure - clear all auth and redirect to login
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
        
        // You can emit an event here to notify the app to redirect to login
        console.log('Token refresh failed - user needs to login again');
        
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Global error handling for specific status codes
    if (error.response.status === 403) {
      console.warn('Permission denied: User does not have access to this resource');
    } else if (error.response.status === 429) {
      console.warn('Rate limit exceeded: Too many requests');
    } else if (error.response.status >= 500) {
      // Downgrade to warn so dev overlay won't treat this as an unhandled console error.
      console.warn('Server error (5xx):', error.response.status);
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  // Login user
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/employee/login', {
        username,
        password,
      });
      
      // Store tokens
      if (response.data.access_token) {
        await AsyncStorage.setItem('authToken', response.data.access_token);
        
        // If the API returns a refresh token, store it as well
        if (response.data.refresh_token) {
          await AsyncStorage.setItem('refreshToken', response.data.refresh_token);
        }
        
        // Store user data for quick access
        if (response.data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      // Send logout request to backend if needed
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.warn('Logout API error:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear all auth data
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    }
  },
  
  // Check if user is authenticated
  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;
      
      const response = await api.get('/auth/verify');
      return response.status === 200;
    } catch (error) {
      console.warn('Auth check failed:', error);
      return false;
    }
  },
};

export const dataAPI = {
  // Generic helpers that return response.data to match caller expectations
  get: async (endpoint, config = {}) => {
    try {
      const response = await api.get(endpoint, config);
      return response.data;
    } catch (err) {
      console.warn(`dataAPI.get ${endpoint} error:`, err?.message || err);
      throw err;
    }
  },
  post: async (endpoint, body = {}, config = {}) => {
    try {
      const response = await api.post(endpoint, body, config);
      return response.data;
    } catch (err) {
      console.warn(`dataAPI.post ${endpoint} error:`, err?.message || err);
      throw err;
    }
  },
  delete: async (endpoint, config = {}) => {
    try {
      const response = await api.delete(endpoint, config);
      return response.data;
    } catch (err) {
      console.warn(`dataAPI.delete ${endpoint} error:`, err?.message || err);
      throw err;
    }
  },

  // Web-compatible endpoints used by the Appreciation module
  fetchAllEmployees: async () => {
    try {
      // Web uses /user-details/ to list employees
      const data = await api.get('/user-details/');
      return data.data || data;
    } catch (err) {
      console.warn('fetchAllEmployees error:', err?.message || err);
      throw err;
    }
  },

  fetchAwardTypes: async () => {
    try {
      const data = await api.get('/appreciation/awards/types');
      // Expect object: { award_types: [...], badge_levels: [...] }
      return data.data || data;
    } catch (err) {
      console.warn('fetchAwardTypes error:', err?.message || err);
      throw err;
    }
  },

  // Fetch latest appreciations for dashboard (web parity)
  fetchDashboardAppreciations: async (limit = 5) => {
    try {
      const response = await api.get('/appreciation/dashboard', { params: { limit } });
      // response.data is expected to be an array of appreciation objects
      const data = response.data || [];

      // Normalize common fields so mobile and web use same keys
      const mapped = data.map(item => ({
        id: item.id,
        employee_id: item.employee_id || (item.employee && (item.employee.id || item.employee.user_id)) || null,
        employee_username: item.employee_username || item.employee?.username || item.employee?.full_name || item.employee_name || item.employee_name_display,
        award_type: item.award_type || item.award || item.type,
        appreciation_message: item.appreciation_message || item.message || item.note || item.description,
        month: item.month,
        year: item.year,
        badge_level: item.badge_level || (item.badge ? String(item.badge).toLowerCase() : null),
        // best-effort engagement fields if backend provided them directly
        likes_count: item.likes_count ?? item.like_count ?? item.total_likes ?? null,
        comments_count: item.comments_count ?? item.comment_count ?? item.total_comments ?? null,
        created_at: item.created_at || item.createdAt || null,
        raw: item, // keep original object for debugging if needed
      }));

      // If backend didn't include engagement counts for dashboard items, do a best-effort
      // client-side fetch of likes/comments for the small number of dashboard items.
      const needCounts = mapped.some(i => i.likes_count == null || i.comments_count == null);
      if (needCounts) {
        // Limit extra requests to the provided limit (dashboard sets a small default)
        const filled = await Promise.all(mapped.map(async (it) => {
          if ((it.likes_count == null || it.comments_count == null) && it.id) {
            try {
              // fetch likes
              const likesResp = await api.get(`/appreciation/${it.id}/likes`);
              const likesData = likesResp && likesResp.data ? likesResp.data : likesResp;
              // backend may return { total_likes: N } or { total_likes: N, liked_users: [...] } or { liked_users: [...] }
              let likesCount = 0;
              if (Array.isArray(likesData)) likesCount = likesData.length;
              else if (typeof likesData === 'object' && likesData != null) {
                likesCount = Number(likesData.total_likes ?? likesData.totalLikes ?? likesData.count ?? likesData.total ?? NaN);
                if (isNaN(likesCount)) {
                  if (Array.isArray(likesData.liked_users)) likesCount = likesData.liked_users.length;
                  else if (Array.isArray(likesData.likedUsers)) likesCount = likesData.likedUsers.length;
                  else if (Array.isArray(likesData.likes)) likesCount = likesData.likes.length;
                  else if (Array.isArray(likesData.data)) likesCount = likesData.data.length;
                  else likesCount = 0;
                }
              }

              // fetch comments
              const commentsResp = await api.get(`/appreciation/${it.id}/comments`);
              const commentsData = commentsResp && commentsResp.data ? commentsResp.data : commentsResp;
              let commentsCount = 0;
              if (Array.isArray(commentsData)) commentsCount = commentsData.length;
              else if (typeof commentsData === 'object' && commentsData != null) {
                commentsCount = Number(commentsData.total_comments ?? commentsData.totalComments ?? commentsData.count ?? commentsData.total ?? NaN);
                if (isNaN(commentsCount)) {
                  if (Array.isArray(commentsData.comments)) commentsCount = commentsData.comments.length;
                  else if (Array.isArray(commentsData.data)) commentsCount = commentsData.data.length;
                  else commentsCount = 0;
                }
              }

              return {
                ...it,
                likes_count: it.likes_count ?? likesCount,
                comments_count: it.comments_count ?? commentsCount,
              };
            } catch (e) {
              // If per-item fetch fails, leave counts as-is (null) and continue
              return it;
            }
          }
          return it;
        }));
        return filled;
      }

      return mapped;
    } catch (err) {
      console.warn('fetchDashboardAppreciations error:', err?.message || err);
      const status = err?.response?.status;
      // If server returned 5xx, treat as temporary server issue and return empty list
      if (status && status >= 500 && status < 600) {
        console.warn('Server 5xx during fetchDashboardAppreciations - returning empty list to avoid surfacing 500 to UI');
        return [];
      }
      // For other errors (network, 4xx) rethrow so callers can handle specifically
      throw err;
    }
  },

  createAppreciation: async (payload) => {
    try {
      const data = await api.post('/appreciation', payload);
      return data.data || data;
    } catch (err) {
      console.error('createAppreciation error:', err);
      throw err;
    }
  },

  fetchEmployeeDetails: async (userId) => {
    try {
      const data = await api.get(`/users/${userId}/details`);
      return data.data || data;
    } catch (err) {
      console.warn(`fetchEmployeeDetails ${userId} error:`, err?.message || err);
      throw err;
    }
  },

  sendAppreciationEmail: async (emailPayload) => {
    try {
      const data = await api.post('/appreciation/send-email', emailPayload);
      return data.data || data;
    } catch (err) {
      console.error('sendAppreciationEmail error:', err);
      throw err;
    }
  },

  // Get thought of the day (stable for 48 hours)
  // Strategy: cache a chosen thought id + payload in AsyncStorage for 48 hours.
  // If cache expired or missing: pick a new one via /thoughts/random, then (if id present)
  // fetch canonical via /thoughts/{id} and store {id, ts, thought}.
  getThoughtOfTheDay: async () => {
    const STABLE_KEY = '@stable_thought_v1';
    const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
    const fallback = {
      quote: "The best way to predict the future is to create it.",
      author: "Abraham Lincoln"
    };

    try {
      // Try cached value first
      const raw = await AsyncStorage.getItem(STABLE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.ts && (Date.now() - parsed.ts) < TTL_MS && parsed.thought) {
            // Still valid
            return parsed.thought;
          }
        } catch (e) {
          // ignore parse errors and continue to fetch
          console.warn('Stable thought parse error, will refresh:', e);
        }
      }

      // Need to pick a new thought
      const resp = await api.get('/thoughts/random');
      const data = resp && resp.data ? resp.data : null;
      if (!data) return fallback;

      // Normalize a best-effort thought object
      const normalize = (d) => {
        if (!d) return null;
        if (d.quote) return { quote: d.quote, author: d.author || '' };
        if (d.thoughts) return { quote: d.thoughts, author: d.author || '' };
        if (d.thought) return { quote: d.thought, author: d.author || '' };
        return { quote: d.text || d.content || d.message || d.description || fallback.quote, author: d.author || '' };
      };

      let chosen = normalize(data);
      const chosenId = data.id || data._id || data.thought_id || null;

      // If we have an id, try to fetch canonical record to avoid transient/random shape
      if (chosenId) {
        try {
          const canonicalResp = await api.get(`/thoughts/${chosenId}`);
          const canonical = canonicalResp && canonicalResp.data ? canonicalResp.data : null;
          if (canonical) chosen = normalize(canonical) || chosen;
        } catch (e) {
          // If fetching canonical fails, keep the original normalized one
          console.warn('Failed to fetch canonical thought by id, using picked random:', e?.message || e);
        }
      }

      const toStore = { id: chosenId, ts: Date.now(), thought: chosen };
      try {
        await AsyncStorage.setItem(STABLE_KEY, JSON.stringify(toStore));
      } catch (e) {
        console.warn('Failed to persist stable thought:', e);
      }

      return chosen || fallback;
    } catch (error) {
      console.warn('Error fetching stable thought:', error);
      return fallback;
    }
  },
  // Get weather from backend
  getWeather: async (lat, lon) => {
    try {
      const response = await api.get('/api/weather', { params: { lat, lon } });
      // Normalize the backend response to a predictable shape
      const data = response.data || {};
      return {
        temp: typeof data.temp === 'number' ? data.temp : null,
        condition: typeof data.condition === 'string' ? data.condition : (data.condition || null),
        city: typeof data.city === 'string' ? data.city : (data.city || null)
      };
    } catch (error) {
      console.warn('Error fetching weather from backend:', error?.message || error);
      return null;
    }
  },
  // Add other dataAPI functions here (getTimesheets, etc.)
};

// Expense Management API
export const expenseAPI = {
  // Get all expenses for the current user
  getExpenses: async () => {
    try {
      const response = await api.get('/api/expenses');
      return response.data;
    } catch (error) {
      console.warn('Error fetching expenses:', error);
      return [];
    }
  },

  // Get a single expense by ID
  getExpense: async (id) => {
    try {
      const response = await api.get(`/api/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.warn(`Error fetching expense with ID ${id}:`, error);
      return null;
    }
  },

  // Create a new expense
  createExpense: async (expenseData) => {
    try {
      // For file uploads, we'll need FormData
      const formData = new FormData();
      
      // Add basic expense data
      formData.append('amount', expenseData.amount);
      formData.append('category', expenseData.category);
      formData.append('description', expenseData.description);
      formData.append('date', expenseData.date);
      
      // Add receipt image if provided
      if (expenseData.receipt) {
        const receiptUri = expenseData.receipt;
        const filename = receiptUri.split('/').pop();
        
        // Infer the file type (assumes jpg if can't determine)
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('receipt', {
          uri: receiptUri,
          name: filename,
          type,
        });
      }
      
      const response = await api.post('/api/expenses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  },

  // Update an existing expense
  updateExpense: async (id, expenseData) => {
    try {
      const response = await api.put(`/api/expenses/${id}`, expenseData);
      return response.data;
    } catch (error) {
      console.error(`Error updating expense with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete an expense
  deleteExpense: async (id) => {
    try {
      const response = await api.delete(`/api/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting expense with ID ${id}:`, error);
      throw error;
    }
  },
};

export default api;

// Export the BASE_URL constant instead
export const API_BASE_URL_EXPORT = BASE_URL;