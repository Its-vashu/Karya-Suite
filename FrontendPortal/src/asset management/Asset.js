import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const API_SERVICE = {
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
    } catch {
      localStorage.removeItem('access_token');
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Authentication required');

    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }
    return response.json();
  },

  // ✨ Asset API calls connected to your endpoints
  async getHealthCheck() {
    return this.request('/api/assets/health');
  },

  async getAssetCategories() {
    return this.request('/api/assets/categories');
  },

  // Connected to GET /api/assets/list with all filter options
  async getAllAssets(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.approval_status) params.append('approval_status', filters.approval_status);
    if (filters.provided_to_employee) params.append('provided_to_employee', filters.provided_to_employee);
    if (filters.available_only) params.append('available_only', filters.available_only);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/assets/list?${queryString}` : '/api/assets/list';
    
    return this.request(endpoint);
  },

  async getAvailableAssets() {
    return this.getAllAssets({
      status: 'available',
      approval_status: 'approved'
    });
  },

  async getAssetById(assetId) {
    return this.request(`/api/assets/${assetId}`);
  },

  async getAssetHistory(assetId) {
    return this.request(`/api/assets/${assetId}/history`);
  },

  async getPendingApprovalAssets() {
    return this.request('/api/assets/pending-approval');
  },

  async getApprovedNotProvidedAssets() {
    return this.request('/api/assets/approved-not-provided');
  },

  // Claims API calls
  async createAssetClaim(claimData, employeeId) {
    return this.request(`/api/assets/claims/create?employee_id=${employeeId}`, {
      method: 'POST',
      body: JSON.stringify({
        asset_id: claimData.asset_id,
        reason: claimData.reason,
        priority: claimData.priority,
        expected_return_date: claimData.expected_return_date
      }),
    });
  },

  async getAllClaims(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/assets/claims/list?${params}`);
  },

  async getMyClaims(employeeId) {
    return this.request(`/api/assets/claims/list?employee_id=${employeeId}`);
  },

  // Stats API calls
  async getDashboardStats() {
    return this.request('/api/assets/stats/dashboard');
  },

  async getApprovalDashboardStats() {
    return this.request('/api/assets/stats/approval-dashboard');
  },
};

const Asset = () => {
  const { user_id } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Asset data states
  const [availableAssets, setAvailableAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [allAssetsForSelection, setAllAssetsForSelection] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assetSelectionFilter, setAssetSelectionFilter] = useState('all');
  
  // Modals
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showAssetHistory, setShowAssetHistory] = useState(false);
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  
  // Selected data
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  
  // Claim form data
  const [claimFormData, setClaimFormData] = useState({
    asset_id: '',
    reason: '',
    priority: 'normal',
    expected_return_date: ''
  });
  const [claiming, setClaiming] = useState(false);

  // Asset images mapping
  const ASSET_IMAGES = {
    'laptop': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    'desktop': 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&h=300&fit=crop',
    'monitor': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    'keyboard': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop',
    'mouse': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop',
    'headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    'webcam': 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop',
    'tablet': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=300&fit=crop',
    'phone': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    'chair': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    'desk': 'https://images.unsplash.com/photo-1595515106969-1ca8de29c2fe?w=400&h=300&fit=crop',
    'default': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
  };

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await API_SERVICE.getHealthCheck();
      
      const [
        availableAssetsData, 
        allAssetsData,
        allAssetsForSelectionData,
        claimsData,
        allClaimsData,
        categoriesData, 
        statsData
      ] = await Promise.allSettled([
        API_SERVICE.getAvailableAssets(),
        API_SERVICE.getAllAssets(),
        API_SERVICE.getAllAssets(),
        API_SERVICE.getMyClaims(user_id),
        API_SERVICE.getAllClaims(),
        API_SERVICE.getAssetCategories(),
        API_SERVICE.getDashboardStats()
      ]);

      if (availableAssetsData.status === 'fulfilled') setAvailableAssets(availableAssetsData.value || []);
      if (allAssetsData.status === 'fulfilled') setAllAssets(allAssetsData.value || []);
      if (allAssetsForSelectionData.status === 'fulfilled') setAllAssetsForSelection(allAssetsForSelectionData.value || []);
      if (claimsData.status === 'fulfilled') setMyClaims(claimsData.value || []);
      if (allClaimsData.status === 'fulfilled') setAllClaims(allClaimsData.value || []);
      if (categoriesData.status === 'fulfilled') setCategories(categoriesData.value || []);
      if (statsData.status === 'fulfilled') setStats(statsData.value || {});

    } catch (err) {
      console.error('Load data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter assets for selection dropdown
  const filteredAssetsForSelection = allAssetsForSelection.filter(asset => {
    const categoryMatch = assetSelectionFilter === 'all' || asset.category === assetSelectionFilter;
    const availabilityMatch = asset.status === 'available' && asset.approval_status === 'approved';
    return categoryMatch && availabilityMatch;
  });

  // Filter assets for main display
  const filteredAssets = availableAssets.filter(asset => {
    const categoryMatch = selectedCategory === 'all' || asset.category === selectedCategory;
    const searchMatch = asset.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       asset.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       asset.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatch && searchMatch;
  });

  // Filter claims
  const filteredClaims = myClaims.filter(claim => {
    if (statusFilter === 'all') return true;
    return claim.status === statusFilter;
  });

  // Handle new claim submission
  const handleAddClaimSubmit = async () => {
    if (!claimFormData.asset_id || !claimFormData.reason.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setClaiming(true);
      await API_SERVICE.createAssetClaim({
        asset_id: parseInt(claimFormData.asset_id),
        reason: claimFormData.reason,
        priority: claimFormData.priority,
        expected_return_date: claimFormData.expected_return_date || null,
      }, user_id);
      
      setShowAddClaimModal(false);
      resetClaimForm();
      await loadData();
      alert('Asset claim submitted successfully!');
    } catch (err) {
      console.error('Add claim submission error:', err);
      alert(`Failed to submit claim: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  // Handle existing asset claim submission
  const handleClaimSubmit = async () => {
    if (!claimFormData.reason.trim()) {
      alert('Please provide a reason for your request');
      return;
    }

    try {
      setClaiming(true);
      await API_SERVICE.createAssetClaim({
        asset_id: selectedAsset.id,
        reason: claimFormData.reason,
        priority: claimFormData.priority,
        expected_return_date: claimFormData.expected_return_date || null,
      }, user_id);
      
      setShowClaimModal(false);
      resetClaimForm();
      await loadData();
      alert('Asset claim submitted successfully!');
    } catch (err) {
      console.error('Claim submission error:', err);
      alert(`Failed to submit claim: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  // Reset claim form
  const resetClaimForm = () => {
    setClaimFormData({
      asset_id: '',
      reason: '',
      priority: 'normal',
      expected_return_date: ''
    });
    setSelectedAsset(null);
  };

  // Show asset details
  const handleShowAssetDetails = async (asset) => {
    try {
      const detailedAsset = await API_SERVICE.getAssetById(asset.id);
      setSelectedAsset(detailedAsset);
      setShowAssetDetails(true);
    } catch (err) {
      console.error('Error fetching asset details:', err);
      alert('Failed to load asset details');
    }
  };

  // Show asset history
  const handleShowAssetHistory = async (asset) => {
    try {
      const history = await API_SERVICE.getAssetHistory(asset.id);
      setAssetHistory(history);
      setSelectedAsset(asset);
      setShowAssetHistory(true);
    } catch (err) {
      console.error('Error fetching asset history:', err);
      alert('Failed to load asset history');
    }
  };

  // Utility functions
  const getAssetImage = (category) => {
    const categoryKey = category?.toLowerCase().replace(/[^a-z]/g, '');
    return ASSET_IMAGES[categoryKey] || ASSET_IMAGES.default;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'available': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getAssetDisplayName = (asset) => {
    return `${asset.asset_code} - ${asset.asset_name} (${asset.category?.replace('_', ' ')})`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assets</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Management</h1>
              <p className="text-gray-600">Request and manage company assets</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={() => setShowAddClaimModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>➕</span>
                Add New Claim
              </button>
              <button
                onClick={loadData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>🔄</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total_assets || 0}</div>
              <div className="text-sm text-gray-500">Total Assets</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.available_assets || 0}</div>
              <div className="text-sm text-gray-500">Available</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.assigned_assets || 0}</div>
              <div className="text-sm text-gray-500">Assigned</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_claims || 0}</div>
              <div className="text-sm text-gray-500">Pending Claims</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{myClaims.filter(c => c.status === 'approved').length}</div>
              <div className="text-sm text-gray-500">My Assets</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{myClaims.filter(c => c.status === 'pending').length}</div>
              <div className="text-sm text-gray-500">My Pending</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {['available', 'myclaims', 'allclaims', 'all'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'available' && `Available Assets (${filteredAssets.length})`}
                  {tab === 'myclaims' && `My Claims (${myClaims.length})`}
                  {tab === 'allclaims' && `All Claims (${allClaims.length})`}
                  {tab === 'all' && `All Assets (${allAssets.length})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Available Assets Tab */}
          {activeTab === 'available' && (
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search assets by name, code, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Assets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAssets.map(asset => (
                  <div key={asset.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative">
                      <img
                        src={getAssetImage(asset.category)}
                        alt={asset.asset_name}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => handleShowAssetDetails(asset)}
                        onError={(e) => {
                          e.target.src = ASSET_IMAGES.default;
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.status)}`}>
                          {asset.status?.charAt(0).toUpperCase() + asset.status?.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">{asset.asset_name}</h3>
                      <p className="text-sm text-gray-500 mb-2">Code: {asset.asset_code}</p>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{asset.description || 'No description available'}</p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {asset.category?.replace('_', ' ')}
                        </span>
                        {asset.value && (
                          <span className="text-sm font-medium text-gray-900">
                            ₹{asset.value.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setClaimFormData(prev => ({ ...prev, asset_id: asset.id }));
                            setShowClaimModal(true);
                          }}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <span>📝</span>
                          Request Asset
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShowAssetDetails(asset)}
                            className="flex-1 bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs hover:bg-gray-200 transition-colors"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleShowAssetHistory(asset)}
                            className="flex-1 bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs hover:bg-gray-200 transition-colors"
                          >
                            History
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAssets.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          )}

          {/* My Claims Tab */}
          {activeTab === 'myclaims' && (
            <div className="p-6">
              <div className="mb-6">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredClaims.map(claim => (
                  <div key={claim.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">Asset ID: {claim.asset_id}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                            {claim.status?.charAt(0).toUpperCase() + claim.status?.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(claim.priority)}`}>
                            {claim.priority?.charAt(0).toUpperCase() + claim.priority?.slice(1)} Priority
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Reason:</strong> {claim.reason}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500 mb-2">
                          <span><strong>Priority:</strong> {claim.priority}</span>
                          <span><strong>Claimed:</strong> {formatDate(claim.claimed_at)}</span>
                          <span><strong>Expected Return:</strong> {formatDate(claim.expected_return_date)}</span>
                          {claim.processed_at && (
                            <span><strong>Processed:</strong> {formatDate(claim.processed_at)}</span>
                          )}
                        </div>
                        
                        {claim.hr_remarks && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                            <strong className="text-blue-800">HR Remarks:</strong>
                            <p className="text-blue-700 mt-1">{claim.hr_remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredClaims.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {statusFilter === 'all' ? 'No claims yet' : `No ${statusFilter} claims`}
                  </h3>
                  <p className="text-gray-500">
                    {statusFilter === 'all' 
                      ? "You haven't made any asset requests" 
                      : `You don't have any ${statusFilter} claims`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* All Assets Tab */}
          {activeTab === 'all' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allAssets.map(asset => (
                  <div key={asset.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative">
                      <img
                        src={getAssetImage(asset.category)}
                        alt={asset.asset_name}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => handleShowAssetDetails(asset)}
                        onError={(e) => {
                          e.target.src = ASSET_IMAGES.default;
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.status)}`}>
                          {asset.status?.charAt(0).toUpperCase() + asset.status?.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">{asset.asset_name}</h3>
                      <p className="text-sm text-gray-500 mb-2">Code: {asset.asset_code}</p>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{asset.description || 'No description'}</p>
                      
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {asset.category?.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(asset.approval_status)}`}>
                          {asset.approval_status}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShowAssetDetails(asset)}
                          className="flex-1 bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs hover:bg-gray-200 transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleShowAssetHistory(asset)}
                          className="flex-1 bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs hover:bg-gray-200 transition-colors"
                        >
                          History
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Claim Modal */}
        {showAddClaimModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add New Asset Claim</h3>
                <button
                  onClick={() => {
                    setShowAddClaimModal(false);
                    resetClaimForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter Assets by Category
                  </label>
                  <select
                    value={assetSelectionFilter}
                    onChange={(e) => setAssetSelectionFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Asset * ({filteredAssetsForSelection.length} available)
                  </label>
                  <select
                    value={claimFormData.asset_id}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, asset_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose an asset to claim</option>
                    {filteredAssetsForSelection.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {getAssetDisplayName(asset)}
                      </option>
                    ))}
                  </select>
                  {filteredAssetsForSelection.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No available assets found in selected category. Try changing the category filter.
                    </p>
                  )}
                </div>

                {claimFormData.asset_id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    {(() => {
                      const selectedAssetData = filteredAssetsForSelection.find(a => a.id === parseInt(claimFormData.asset_id));
                      return selectedAssetData ? (
                        <div>
                          <h4 className="font-medium text-blue-900">{selectedAssetData.asset_name}</h4>
                          <p className="text-sm text-blue-700">Code: {selectedAssetData.asset_code}</p>
                          <p className="text-sm text-blue-700">Category: {selectedAssetData.category?.replace('_', ' ')}</p>
                          {selectedAssetData.description && (
                            <p className="text-sm text-blue-600 mt-1">{selectedAssetData.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedAssetData.status)}`}>
                              {selectedAssetData.status}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedAssetData.approval_status)}`}>
                              {selectedAssetData.approval_status}
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Request *
                  </label>
                  <textarea
                    value={claimFormData.reason}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Please explain why you need this asset..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={claimFormData.priority}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Return Date
                  </label>
                  <input
                    type="date"
                    value={claimFormData.expected_return_date}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, expected_return_date: e.target.value }))}
                    min={getTomorrowDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional - Leave empty if permanent assignment</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddClaimModal(false);
                    resetClaimForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClaimSubmit}
                  disabled={!claimFormData.asset_id || !claimFormData.reason.trim() || claiming}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {claiming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Claim Modal for Existing Assets */}
        {showClaimModal && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Request Asset</h3>
                <button
                  onClick={() => {
                    setShowClaimModal(false);
                    resetClaimForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <img
                  src={getAssetImage(selectedAsset.category)}
                  alt={selectedAsset.asset_name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h4 className="font-medium">{selectedAsset.asset_name}</h4>
                <p className="text-sm text-gray-500">{selectedAsset.asset_code}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedAsset.status)}`}>
                    {selectedAsset.status}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedAsset.approval_status)}`}>
                    {selectedAsset.approval_status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Request *
                  </label>
                  <textarea
                    value={claimFormData.reason}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Please explain why you need this asset..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={claimFormData.priority}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Return Date
                  </label>
                  <input
                    type="date"
                    value={claimFormData.expected_return_date}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, expected_return_date: e.target.value }))}
                    min={getTomorrowDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional - Leave empty if permanent assignment</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowClaimModal(false);
                    resetClaimForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaimSubmit}
                  disabled={!claimFormData.reason.trim() || claiming}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {claiming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Asset Details Modal */}
        {showAssetDetails && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Asset Details</h3>
                <button
                  onClick={() => setShowAssetDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={getAssetImage(selectedAsset.category)}
                    alt={selectedAsset.asset_name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Asset Name</label>
                    <p className="text-lg font-semibold">{selectedAsset.asset_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Asset Code</label>
                    <p>{selectedAsset.asset_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p>{selectedAsset.category?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedAsset.status)}`}>
                      {selectedAsset.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Approval Status</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedAsset.approval_status)}`}>
                      {selectedAsset.approval_status}
                    </span>
                  </div>
                  {selectedAsset.value && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Value</label>
                      <p className="text-lg font-semibold">₹{selectedAsset.value.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedAsset.description && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-gray-700">{selectedAsset.description}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAssetDetails(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedAsset.status === 'available' && selectedAsset.approval_status === 'approved' && (
                  <button
                    onClick={() => {
                      setShowAssetDetails(false);
                      setClaimFormData(prev => ({ ...prev, asset_id: selectedAsset.id }));
                      setShowClaimModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Request This Asset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Asset History Modal */}
        {showAssetHistory && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Asset History - {selectedAsset.asset_name}</h3>
                <button
                  onClick={() => setShowAssetHistory(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {assetHistory.map((history, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{history.action_type}</span>
                      <span className="text-sm text-gray-500">{new Date(history.changed_at).toLocaleString()}</span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      {history.previous_status && (
                        <div>
                          <span className="text-gray-500">Previous Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(history.previous_status)}`}>
                            {history.previous_status}
                          </span>
                        </div>
                      )}
                      {history.new_status && (
                        <div>
                          <span className="text-gray-500">New Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(history.new_status)}`}>
                            {history.new_status}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {history.remarks && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Remarks:</strong> {history.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {assetHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📜</div>
                  <p className="text-gray-500">No history available for this asset</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAssetHistory(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Asset;
