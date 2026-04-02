import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const API_SERVICE = {
  BASE: API_BASE,
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
    if (!token) throw new Error('Authentication token missing or expired');
    
    let url = this.BASE;
    if (endpoint.startsWith('/')) {
      url = url.replace(/\/$/, '') + endpoint;
    } else {
      url = url.replace(/\/$/, '') + '/' + endpoint;
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

const UTILS = {
  decodeToken(token) {
    if (!token || typeof token !== 'string') return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      if (!payload || typeof payload !== 'object') return null;
      
      return payload;
    } catch {
      return null;
    }
  }
};

const LeaveRequestsPage = () => {
  const navigate = useNavigate();
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingLeave, setProcessingLeave] = useState(null);
  
  // Enhanced filter states
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterLeaveTypes, setFilterLeaveTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    type: 'all', // all, applied, start, end
    from: '',
    to: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'applied_date', direction: 'desc' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Available leave types for filter
  const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Marriage', 'Bereavement'];

  // Helper function to get current user ID from token
  const getCurrentUserID = useCallback(() => {
    try {
      const token = API_SERVICE.getToken();
      if (!token) return null;
      
      const decoded = UTILS.decodeToken(token);
      return decoded?.user_id || decoded?.sub;
    } catch (error) {
      // console.error('Error extracting user ID from token:', error);
      return error;
    }
  }, []);
  
  // Fetch all leave requests (except HR's own requests)
  const fetchAllLeaves = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current HR's ID to filter out their own requests
      const currentUserID = getCurrentUserID();
      
      // Use the new HR-specific endpoint
      const response = await API_SERVICE.request(`/leave-applications/hr-view/?current_user_id=${currentUserID}`);
        
      setAllLeaves(Array.isArray(response) ? response : []);
    } catch (error) {
      // console.error('🔴 Failed to fetch leave requests:', error);
      setError('Failed to fetch leave requests. Please try again.');
      setAllLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUserID]);

  // Handle leave approval/rejection
  const handleLeaveAction = useCallback(async (leaveId, action, employeeName, leaveUserID) => {
    try {
      // Get current HR's ID to prevent self-approval
      const currentUserID = getCurrentUserID();
      
      // Safety check: Prevent HR from approving their own leave requests
      if (leaveUserID === currentUserID) {
        alert('Error: You cannot approve/reject your own leave requests. This requires Hr approval.');
        return;
      }
      
      setProcessingLeave(leaveId);
      
      const token = API_SERVICE.getToken();
      const decoded = UTILS.decodeToken(token);
      const hrName = decoded?.sub || decoded?.username || 'HR';
      
      const response = await API_SERVICE.request(`/leave-applications/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action,
          approved_by: hrName
        })
      });

      if (response) {
        // Update the leave in the list with new status and approver info
        setAllLeaves(prev => prev.map(leave => 
          leave.id === leaveId 
            ? { 
                ...leave, 
                status: action, 
                approved_by: hrName,
                approved_by_name: hrName,  // You might want to get the full name from token
                approved_by_designation: 'HR'  // Or get actual designation
              }
            : leave
        ));
        
        // Show success message
        alert(`Leave ${action === 'approved' ? 'approved' : 'rejected'} for ${employeeName}`);
        
        // Refresh the data to ensure consistency with backend
        setTimeout(() => {
          fetchAllLeaves();
        }, 500);
      }
    } catch (error) {
      // console.error(`🔴 Failed to ${action} leave:`, error);
      // alert(`Failed to ${action} leave. Please try again.`);
      toast.error(`Failed to ${action} leave. Please try again.`);
    } finally {
      setProcessingLeave(null);
    }
  }, [fetchAllLeaves, getCurrentUserID]);

  // Format date for display
  const formatLeaveDate = useCallback((dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Calculate leave duration
  const calculateLeaveDuration = useCallback((startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, []);

  // Filter leaves based on all criteria
  const filteredLeaves = allLeaves.filter(leave => {
    // Status filter (multi-select)
    const matchesStatus = filterStatus.length === 0 || filterStatus.includes(leave.status);
    
    // Leave type filter (multi-select) - case insensitive comparison
    const matchesLeaveType = filterLeaveTypes.length === 0 || 
      filterLeaveTypes.some(type => type.toLowerCase() === (leave.leave_type || '').trim().toLowerCase());
    
    // Search filter
    const matchesSearch = searchTerm === '' || 
      leave.user_id.toString().includes(searchTerm) ||
      leave.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (leave.approved_by && leave.approved_by.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Date range filter
    let matchesDateRange = true;
    if (dateFilter.from && dateFilter.to) {
      const fromDate = new Date(dateFilter.from);
      const toDate = new Date(dateFilter.to);
      
      let compareDate;
      switch (dateFilter.type) {
        case 'applied':
          compareDate = new Date(leave.applied_date);
          break;
        case 'start':
          compareDate = new Date(leave.start_date);
          break;
        case 'end':
          compareDate = new Date(leave.end_date);
          break;
        default:
          compareDate = new Date(leave.applied_date);
      }
      
      matchesDateRange = compareDate >= fromDate && compareDate <= toDate;
    }
    
    return matchesStatus && matchesLeaveType && matchesSearch && matchesDateRange;
  });
  
  // Sort filtered leaves
  const sortedLeaves = [...filteredLeaves].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortConfig.key) {
      case 'applied_date':
        aValue = new Date(a.applied_date);
        bValue = new Date(b.applied_date);
        break;
      case 'start_date':
        aValue = new Date(a.start_date);
        bValue = new Date(b.start_date);
        break;
      case 'duration':
        aValue = calculateLeaveDuration(a.start_date, a.end_date);
        bValue = calculateLeaveDuration(b.start_date, b.end_date);
        break;
      case 'user_id':
        aValue = a.user_id;
        bValue = b.user_id;
        break;
      case 'leave_type':
        aValue = a.leave_type;
        bValue = b.leave_type;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Toggle sort direction or change sort key
  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Toggle status filter
  const toggleStatusFilter = (status) => {
    setFilterStatus(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Toggle leave type filter
  const toggleLeaveTypeFilter = (type) => {
    setFilterLeaveTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilterStatus([]);
    setFilterLeaveTypes([]);
    setSearchTerm('');
    setDateFilter({ type: 'all', from: '', to: '' });
    setSortConfig({ key: 'applied_date', direction: 'desc' });
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Duration (Days)', 'Reason', 'Status', 'Applied Date', 'Approved By'];
    
    const csvData = sortedLeaves.map(leave => [
      leave.user_id,
      leave.leave_type,
      formatLeaveDate(leave.start_date),
      formatLeaveDate(leave.end_date),
      calculateLeaveDuration(leave.start_date, leave.end_date),
      leave.reason,
      leave.status,
      formatLeaveDate(leave.applied_date),
      leave.approved_by || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Select/deselect leave
  const toggleSelectLeave = (leaveId) => {
    setSelectedLeaves(prev => 
      prev.includes(leaveId) 
        ? prev.filter(id => id !== leaveId)
        : [...prev, leaveId]
    );
  };
  
  // Select all pending leaves
  const selectAllPending = () => {
    const pendingIds = sortedLeaves
      .filter(leave => leave.status === 'pending')
      .map(leave => leave.id);
    setSelectedLeaves(pendingIds);
  };
  
  // Bulk approve/reject
  const handleBulkAction = async (action) => {
    if (selectedLeaves.length === 0) {
      alert('Please select at least one leave request');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to ${action} ${selectedLeaves.length} leave request(s)?`)) {
      return;
    }
    
    const currentUserID = getCurrentUserID();
    const token = API_SERVICE.getToken();
    const decoded = UTILS.decodeToken(token);
    const hrName = decoded?.sub || decoded?.username || 'HR';
    
    try {
      setProcessingLeave('bulk');
      
      // Process each selected leave
      const promises = selectedLeaves.map(leaveId => {
        const leave = allLeaves.find(l => l.id === leaveId);
        if (leave && leave.user_id !== currentUserID && leave.status === 'pending') {
          return API_SERVICE.request(`/leave-applications/${leaveId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action, approved_by: hrName })
          });
        }
        return Promise.resolve(null);
      });
      
      await Promise.all(promises);
      
      alert(`Successfully ${action} ${selectedLeaves.length} leave request(s)`);
      setSelectedLeaves([]);
      fetchAllLeaves();
    } catch (error) {
      // console.error(`Failed to bulk ${action}:`, error);
      // alert(`Failed to process bulk action. Please try again.`);
      toast.error(`Failed to bulk ${action}: ${error.message}`);
    } finally {
      setProcessingLeave(null);
    }
  };
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaves = sortedLeaves.slice(startIndex, endIndex);
  
  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  const changeItemsPerPage = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  useEffect(() => {
    fetchAllLeaves();
  }, [fetchAllLeaves]);

  return (
    <div className="min-h-screen bg-blue-900 py-8 px-4">
      <div className=" px-10 mx-10">
        {/* Header */}
        <div className="bg-gray-100 rounded-2xl shadow-lg p-6 mb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white hover:bg-gray-200 rounded-lg transition-colors shadow-sm "
                title="Go back"
              >
                <ArrowLeft />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Employee Leave Requests</h1>
                <p className="text-gray-600">Approve or reject leave requests from employees</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAllLeaves}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  loading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>


        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-2xl font-bold text-blue-600">
              {allLeaves.length}
            </div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-2xl font-bold text-orange-600">
              {allLeaves.filter(l => l.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-2xl font-bold text-green-600">
              {allLeaves.filter(l => l.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-2xl font-bold text-red-600">
              {allLeaves.filter(l => l.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-2xl font-bold text-purple-600">
              {sortedLeaves.length}
            </div>
            <div className="text-sm text-gray-600">Filtered Results</div>
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">Filters & Search</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {showAdvancedFilters ? '▼ Hide Advanced' : '▶ Show Advanced'}
              </button>
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ✕ Reset All
              </button>
              <button
                onClick={exportToCSV}
                disabled={sortedLeaves.length === 0}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ↓ Export CSV
              </button>
            </div>
          </div>
          
          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Box */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔍 Search
              </label>
              <input
                type="text"
                placeholder="Search by Employee ID, Leave Type, Reason, or Approver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Quick Status Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Status (Multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {['pending', 'approved', 'rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all ${
                      filterStatus.includes(status)
                        ? status === 'pending' ? 'bg-yellow-100 border-yellow-500 text-yellow-800' :
                          status === 'approved' ? 'bg-green-100 border-green-500 text-green-800' :
                          'bg-red-100 border-red-500 text-red-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-1 rounded-md space-y-4">
              {/* Leave Type Multi-select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 Leave Types (Multi-select)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LEAVE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleLeaveTypeFilter(type)}
                      className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all ${
                        filterLeaveTypes.includes(type)
                          ? 'bg-blue-100 border-blue-500 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Date Range Filter
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <select
                      value={dateFilter.type}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Dates</option>
                      <option value="applied">Applied Date</option>
                      <option value="start">Start Date</option>
                      <option value="end">End Date</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={dateFilter.from}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={dateFilter.type === 'all'}
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={dateFilter.to}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={dateFilter.type === 'all'}
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => setDateFilter({ type: 'all', from: '', to: '' })}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Clear Dates
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Active Filters Summary */}
              {(filterStatus.length > 0 || filterLeaveTypes.length > 0 || dateFilter.from || searchTerm) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-800 mb-1">Active Filters:</div>
                      <div className="flex flex-wrap gap-2">
                        {filterStatus.length > 0 && (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                            Status: {filterStatus.join(', ')}
                          </span>
                        )}
                        {filterLeaveTypes.length > 0 && (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                            Types: {filterLeaveTypes.join(', ')}
                          </span>
                        )}
                        {dateFilter.from && (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                            Date: {dateFilter.from} to {dateFilter.to || 'now'}
                          </span>
                        )}
                        {searchTerm && (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                            Search: "{searchTerm}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Bulk Actions Bar (shown when leaves are selected) */}
        {selectedLeaves.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl shadow-lg p-4 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-indigo-900">
                  {selectedLeaves.length} leave request(s) selected
                </span>
                <button
                  onClick={() => setSelectedLeaves([])}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Clear Selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllPending}
                  className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Select All Pending
                </button>
                <button
                  onClick={() => handleBulkAction('approved')}
                  disabled={processingLeave === 'bulk'}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                >
                  ✓ Approve Selected
                </button>
                <button
                  onClick={() => handleBulkAction('rejected')}
                  disabled={processingLeave === 'bulk'}
                  className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300"
                >
                  ✗ Reject Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Requests Table */}
        <div className="bg-white rounded-2xl shadow-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-600">Loading leave requests...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchAllLeaves}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : sortedLeaves.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Requests Found</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus.length > 0 || filterLeaveTypes.length > 0 || dateFilter.from
                  ? 'No requests match your current filters.' 
                  : 'No leave requests have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLeaves.length === sortedLeaves.filter(l => l.status === 'pending').length && sortedLeaves.filter(l => l.status === 'pending').length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllPending();
                          } else {
                            setSelectedLeaves([]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </th>
                    <th 
                      className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('user_id')}
                    >
                      <div className="flex items-center gap-1">
                        Employee
                        {sortConfig.key === 'user_id' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('leave_type')}
                    >
                      <div className="flex items-center gap-1">
                        Leave Type
                        {sortConfig.key === 'leave_type' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('duration')}
                    >
                      <div className="flex items-center gap-1">
                        Duration
                        {sortConfig.key === 'duration' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('start_date')}
                    >
                      <div className="flex items-center gap-1">
                        Dates
                        {sortConfig.key === 'start_date' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortConfig.key === 'status' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('applied_date')}
                    >
                      <div className="flex items-center gap-1">
                        Applied
                        {sortConfig.key === 'applied_date' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLeaves.map((leave) => (
                    <tr key={leave.id} className={`hover:bg-gray-50 transition-colors duration-200 ${selectedLeaves.includes(leave.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        {leave.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedLeaves.includes(leave.id)}
                            onChange={() => toggleSelectLeave(leave.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {leave.user_id.toString().slice(-2)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              Employee ID: {leave.user_id}
                            </div>
                            <div className="text-sm text-gray-500">
                              Applied: {new Date(leave.applied_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          leave.leave_type === 'Sick' ? 'bg-red-100 text-red-800' :
                          leave.leave_type === 'Casual' ? 'bg-blue-100 text-blue-800' :
                          leave.leave_type === 'Earned' ? 'bg-green-100 text-green-800' :
                          leave.leave_type === 'Maternity' ? 'bg-purple-100 text-purple-800' :
                          leave.leave_type === 'Paternity' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {leave.leave_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="font-medium">{calculateLeaveDuration(leave.start_date, leave.end_date)}</span>
                          <span className="text-gray-500 ml-1">
                            {calculateLeaveDuration(leave.start_date, leave.end_date) === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">From:</span>
                            <span className="font-medium">{formatLeaveDate(leave.start_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">To:</span>
                            <span className="font-medium">{formatLeaveDate(leave.end_date)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={leave.reason}>
                          {leave.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                        {(leave.approved_by_name || leave.approved_by) && (
                          <div className="text-xs text-gray-500 mt-1">
                            by {leave.approved_by_name || leave.approved_by}
                            {leave.approved_by_designation && (
                              <span className="text-gray-400"> ({leave.approved_by_designation})</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.applied_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {leave.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleLeaveAction(leave.id, 'approved', `Employee ${leave.user_id}`, leave.user_id)}
                              disabled={processingLeave === leave.id}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                                processingLeave === leave.id 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800'
                              }`}
                            >
                              {processingLeave === leave.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Approve
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleLeaveAction(leave.id, 'rejected', `Employee ${leave.user_id}`, leave.user_id)}
                              disabled={processingLeave === leave.id}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                                processingLeave === leave.id 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800'
                              }`}
                            >
                              {processingLeave === leave.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Reject
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            {leave.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {sortedLeaves.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => changeItemsPerPage(Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600">
                    per page
                  </span>
                </div>
                
                {/* Page info */}
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, sortedLeaves.length)}</span> of{' '}
                  <span className="font-medium">{sortedLeaves.length}</span> results
                </div>
                
                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    ‹
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestsPage;
