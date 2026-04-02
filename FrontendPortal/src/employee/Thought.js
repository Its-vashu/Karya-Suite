import React, { useState, useEffect } from 'react';

const API_SERVICE = {
  BASE: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000',
  
  getToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('access_token');
        return null;
      }
      return token;
    } catch (error) {
      localStorage.removeItem('access_token');
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Authentication required');

    const url = `${this.BASE}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || response.statusText);
    }

    return response.json();
  }
};

const Thought = () => {
  const [thought, setThought] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [latestThought, setLatestThought] = useState(null);

  const getUserInfo = () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.user_id || payload.id || payload.sub,
        username: payload.username || payload.sub || 'HR'
      };
    } catch (error) {
      return null;
    }
  };

  const fetchLatestThought = async () => {
    try {
      const response = await API_SERVICE.request('user-details/thoughtoftheday/latest');
      setLatestThought(response);
    } catch (error) {
      console.error('Failed to fetch latest thought:', error);
    }
  };

  useEffect(() => {
    fetchLatestThought();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!thought.trim()) {
      setError('Please enter a thought');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userInfo = getUserInfo();
      if (!userInfo) throw new Error('User information not available');

      await API_SERVICE.request('user-details/thoughtoftheday', {
        method: 'POST',
        body: JSON.stringify({
          thought: thought.trim(),
          author_id: userInfo.id,
          author_name: userInfo.username
        })
      });

      setSuccess('Thought of the day created successfully!');
      setThought('');
      fetchLatestThought(); // Refresh latest thought
    } catch (error) {
      setError(error.message || 'Failed to create thought');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Thought of the Day</h2>
      
      {/* Latest Thought Display */}
      {latestThought && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-800 mb-2">Current Thought of the Day</h3>
          <p className="text-gray-700 italic">"{latestThought.thought}"</p>
          <p className="text-sm text-gray-500 mt-2">
            By {latestThought.author_name} • {new Date(latestThought.created_at).toLocaleDateString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="thought" className="block text-sm font-medium text-gray-700 mb-2">
            New Thought of the Day
          </label>
          <textarea
            id="thought"
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="Enter an inspiring thought for your team..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">{thought.length}/1000 characters</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !thought.trim()}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            loading || !thought.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Creating...' : 'Create Thought of the Day'}
        </button>
      </form>
    </div>
  );
};

export default Thought;
