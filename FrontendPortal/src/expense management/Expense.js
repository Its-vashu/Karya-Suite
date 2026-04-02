import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';
import ClaimDetails from './ClaimDetails';

/** Set your API base URL in .env as REACT_APP_API_BASE_URL */
const API_SERVICE = {
  BASE: process.env.REACT_APP_API_BASE_URL,

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

  // DEBUG: Log what's being sent
  // console.log('Making request to:', url);
  // console.log('Options:', options);
  // console.log('Body being sent:', options.body);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers 
      }
    });
    
    // console.log('Response status:', response.status);
    // console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        throw new Error('Authentication failed');
      }
      
      let errorMessage;
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
        } else if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else {
          errorMessage = JSON.stringify(data.detail, null, 2);
        }
      } else {
        errorMessage = data.message || JSON.stringify(data, null, 2) || `API Error ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    // console.error(`API Request Failed [${endpoint}]:`, error);
    throw error;
  }
},

  // --- Expense Management API Endpoints ---

  // Category APIs
  async getCategories() {
    return await this.request('/api/expense/categories');
  },

  // User profile
  async getUserProfile(email) {
    return await this.request(`/api/expense/user-profile/${email}`);
  },

  // Expense Claims
  async getExpenseClaims(params = {}) {
  // Convert user_id to submitter_id if present
  if (params.user_id) {
    params.submitter_id = params.user_id;  // <-- CORRECT PARAMETER NAME
    delete params.user_id;
  }
  
  const query = new URLSearchParams(params).toString();
  return await this.request(`/api/expense/claims${query ? '?' + query : ''}`);
},
  async getExpenseClaimById(claimId) {
    return await this.request(`/api/expense/claims/${claimId}`);
  },
  async createClaim(claimData) {
    return await this.request('/api/expense/claims', {
      method: 'POST',
      body: JSON.stringify({
        ...claimData,
        status: 'pending',
        currency_code: 'INR'
      })
    });
  },
  async approveClaim(claimId, action, remarks = null, approverId) {
    return await this.request(`/api/expense/claims/${claimId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: action === 'approve' ? 'approved' : 'rejected',
        remarks: remarks,
        updated_by: approverId
      })
    });
  },
  async getPendingApprovals() {
    return await this.request('/api/expense/claims/pending');
  },

  // Expense Items
  async getExpenseItems(claimId) {
    return await this.request(`/api/expense/claims/${claimId}/items`);
  },
  // REPLACE your bulkCreateExpenseItems function with:
async bulkCreateExpenseItems(claimId, itemsData) {
  // console.log('Sending items to backend:', { items: itemsData });
  
  const token = this.getToken();
  if (!token) throw new Error('Authentication required');

  const url = `${this.BASE}/api/expense/claims/${claimId}/items/bulk`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: itemsData })
    });

    const data = await response.json();
    
    if (!response.ok) {
      // console.error('Response not OK:', response.status, data);
      throw new Error(data.detail || JSON.stringify(data) || `Error ${response.status}`);
    }
    
    return data;
  } catch (error) {
    // console.error('Bulk create items failed:', error);
    throw error;
  }
},
  // Document Upload
  async uploadDocument(file, claimId, itemId, documentType = 'receipt', uploadedBy) {
    const formData = new FormData();
    formData.append('file', file);
    if (claimId) formData.append('claim_id', claimId);
    if (itemId) formData.append('expense_item_id', itemId);
    formData.append('document_type', documentType);
    formData.append('uploaded_by', uploadedBy);

    const token = this.getToken();
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${this.BASE}/api/expense/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  },

  // Reimbursements
  async getReimbursements(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/api/expense/reimbursements${query ? '?' + query : ''}`);
  },
  async createReimbursement(reimbursementData) {
    return await this.request('/api/expense/reimbursements', {
      method: 'POST',
      body: JSON.stringify(reimbursementData)
    });
  },
};


const Expense = () => {
  const { user_id, email, role } = useUser();

  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('claims'); // 'claims', 'new-claim', 'admin', 'claim-details'

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Data states
  const [categories, setCategories] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [claims, setClaims] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [allClaims, setAllClaims] = useState([]); // For admin view

  // Form states for new claim
  const [mainClaim, setMainClaim] = useState({
    title: '',
    description: '',
    claim_date: new Date().toISOString().split('T')[0],
    currency: 'INR'
  });

  const [expenseItems, setExpenseItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    category_id: '',
    item_description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_method: 'personal_card',
    receipt_number: '',
    business_purpose: '',
    document: null
  });

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toFixed(2)}`;
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Software': '💻',
      'Hardware': '🖥️',
      'Office': '📋',
      'Travel': '✈️',
      'Meals': '🍽️',
      'Training': '🎓',
      'Internet': '📱',
      'Books': '📚',
      'Marketing': '📈',
      'Professional': '⚖️',
      'Health': '🏥',
      'Miscellaneous': '📦'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    return '📝';
  };

  const getQuickName = (categoryName) => {
    const firstWord = categoryName.split(/[\s&-]/)[0];
    return firstWord.length > 8 ? firstWord.substring(0, 8) : firstWord;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'reimbursed': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'draft': return '📝';
      case 'reimbursed': return '💰';
      default: return '📄';
    }
  };

  // const isClaimPaid = (claimId) => {
  //   return reimbursements.some(reimbursement => 
  //     reimbursement.claim_id === claimId && reimbursement.status === 'paid'
  //   );
  // };

  // const getPaymentStatus = (claimId) => {
  //   const reimbursement = reimbursements.find(r => r.claim_id === claimId);
  //   if (!reimbursement) return 'Not processed';
  //   return reimbursement.status === 'paid' ? 'Paid' : 'Processing';
  // };

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [email]);

  // Calculate total amount
  useEffect(() => {
    const total = expenseItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    setMainClaim(prev => ({ ...prev, total_amount: total }));
  }, [expenseItems]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user_id) {
        setError('User ID is missing. Please log in again.');
        return;
      }

      if (!email || !email.includes('@')) {
        setError('User email is missing or invalid. Please log in again.');
        return;
      }

      // Load user profile
      const profileData = await API_SERVICE.getUserProfile(email);
      setUserProfile(profileData);

      // Load categories
      try {
        const categoriesData = await API_SERVICE.getCategories();
        if (categoriesData && categoriesData.length > 0) {
          const formattedCategories = categoriesData.map(category => ({
            ...category,
            icon: getCategoryIcon(category.category_name),
            quickName: getQuickName(category.category_name)
          }));
          setCategories(formattedCategories);
        }
      } catch (error) {
        // console.error('Failed to load categories:', error);
        setError('Failed to load expense categories. Please try refreshing the page.');
      }

      // Load user's claims and reimbursements
      if (user_id) {
        const [claimsData, reimbursementsData] = await Promise.all([
          API_SERVICE.getExpenseClaims({ user_id: user_id }),
          API_SERVICE.getReimbursements({ user_id: user_id })
        ]);
        setClaims(claimsData || []);
        setReimbursements(reimbursementsData || []);
      }

      // Load all claims for admin view
      if (role === 'admin' || role === 'manager') {
        const allClaimsData = await API_SERVICE.getExpenseClaims();
        setAllClaims(allClaimsData || []);
      }

    } catch (error) {
      // console.error('Failed to load initial data:', error);
      setError(`Failed to load expense data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ALSO UPDATE your handleSubmitClaim function to add logging:
const handleSubmitClaim = async () => {
  if (expenseItems.length === 0) {
    setError('Please add at least one expense item before submitting.');
    return;
  }

  try {
    setLoading(true);
    setError(null);

    // Create the main claim
    const claimData = {
      user_id: user_id,
      title: mainClaim.title,
      description: mainClaim.description || null,
      claim_date: mainClaim.claim_date,
      currency_code: 'INR',
      total_amount: mainClaim.total_amount || 0
    };

    //console.log('Creating claim with data:', claimData); // DEBUG
    const createdClaim = await API_SERVICE.createClaim(claimData);
    //console.log('Created claim:', createdClaim); // DEBUG

    // Process items
    const itemsForCreation = expenseItems.map(item => {
      const processedItem = {
        category_id: parseInt(item.category_id),
        item_description: String(item.item_description).trim(),
        expense_date: item.expense_date,
        amount: parseFloat(item.amount),
        currency: 'INR',
        vendor_name: item.vendor_name || null,
        payment_method: item.payment_method || 'cash',
        receipt_number: item.receipt_number || null,
        business_purpose: item.business_purpose || null,
        is_billable: Boolean(item.is_billable) || false,
        client_name: item.client_name || null,
        project_code: item.project_code || null
      };
      
      //console.log('Processing item:', item, '→', processedItem); // DEBUG
      return processedItem;
    });

    // Validate items
    for (let i = 0; i < itemsForCreation.length; i++) {
      const item = itemsForCreation[i];
      if (!item.category_id || isNaN(item.category_id)) {
        setError(`Item ${i + 1}: Invalid category`);
        return;
      }
      if (!item.item_description || item.item_description.length === 0) {
        setError(`Item ${i + 1}: Description is required`);
        return;
      }
      if (!item.expense_date) {
        setError(`Item ${i + 1}: Date is required`);
        return;
      }
      if (!item.amount || isNaN(item.amount) || item.amount <= 0) {
        setError(`Item ${i + 1}: Valid amount > 0 is required`);
        return;
      }
    }

      // console.log('Final items for API call:', itemsForCreation);
      // console.log('Will send to API:', { items: itemsForCreation });
    
    const createdItems = await API_SERVICE.bulkCreateExpenseItems(createdClaim.id, itemsForCreation);
    //console.log('Created items response:', createdItems); // DEBUG

    // Upload documents for items that have files
    const uploadPromises = [];
    for (let i = 0; i < expenseItems.length; i++) {
      const originalItem = expenseItems[i];
      const createdItem = createdItems[i];
      
      if (originalItem.document && createdItem?.id) {
        //console.log(`Uploading document for item ${createdItem.id}:`, originalItem.document.name);
        
        const uploadPromise = API_SERVICE.uploadDocument(
          originalItem.document,      // file
          createdClaim.id,           // claimId
          createdItem.id,            // itemId
          'receipt',                 // documentType
          user_id                    // uploadedBy
        ).catch(error => {
          console.error(`Failed to upload document for item ${createdItem.id}:`, error);
          // Don't fail the entire process for document upload errors
          return null;
        });
        
        uploadPromises.push(uploadPromise);
      }
    }

    // Wait for all document uploads to complete
    if (uploadPromises.length > 0) {
      //console.log(`Uploading ${uploadPromises.length} documents...`);
      const uploadResults = await Promise.all(uploadPromises);
    //  console.log('Document upload results:', uploadResults);
      
      const successfulUploads = uploadResults.filter(result => result !== null);
      if (successfulUploads.length > 0) {
        //console.log(`Successfully uploaded ${successfulUploads.length} documents`);
      }
    }

    setSuccess('Expense claim submitted successfully!');
    resetForm();
    setActiveView('claims');
    loadInitialData();

  } catch (error) {
    //console.error('Failed to submit claim:', error);
    setError(`Failed to submit expense claim: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleApproveClaim = async (claimId, action, remarks = '') => {
    try {
      setLoading(true);
      setError(null);
      await API_SERVICE.approveClaim(claimId, action, remarks, user_id);
      setSuccess(`Claim ${action}d successfully!`);
      loadInitialData();
    } catch (error) {
      //console.error(`Failed to ${action} claim:`, error);
      setError(`Failed to ${action} claim: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // const handleCreateReimbursement = async (claimId, paymentMethod = 'bank_transfer', paymentReference = '') => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     await API_SERVICE.createReimbursement(claimId, user_id, paymentMethod, paymentReference);
  //     setSuccess('Reimbursement created successfully!');
  //     loadInitialData();
  //   } catch (error) {
  //     console.error('Failed to create reimbursement:', error);
  //     setError(`Failed to create reimbursement: ${error.message}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const viewClaimDetails = async (claimId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch detailed claim information
      const claimDetails = await API_SERVICE.getExpenseClaimById(claimId);
      setSelectedClaim(claimDetails);
      setActiveView('claim-details');
    } catch (error) {
      //console.error('Failed to fetch claim details:', error);
      setError(`Failed to fetch claim details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMainClaim({
      title: '',
      description: '',
      claim_date: new Date().toISOString().split('T')[0],
      currency: 'INR'
    });

    setExpenseItems([]);
    setCurrentItem({
      category_id: '',
      item_description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      payment_method: 'personal_card',
      receipt_number: '',
      business_purpose: '',
      document: null
    });
  };

  const addExpenseItem = () => {
    if (!currentItem.category_id || !currentItem.amount || !currentItem.item_description) {
      setError('Please fill in required fields: Category, Amount, and Description');
      return;
    }

    const newItem = {
      ...currentItem,
      id: Date.now(),
      amount: parseFloat(currentItem.amount)
    };

    setExpenseItems(prev => [...prev, newItem]);
    setCurrentItem({
      category_id: '',
      item_description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      payment_method: 'personal_card',
      receipt_number: '',
      business_purpose: '',
      document: null
    });
    setError(null);
  };

  const removeExpenseItem = (itemId) => {
    setExpenseItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleFileUpload = (file) => {
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError('File size must be less than 5MB');
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      setCurrentItem(prev => ({ ...prev, document: file }));
      setError(null);
    }
  };

  if (loading && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expense management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-800">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6 flex align-center p-3 space-x-3">
          <div>
             <button
                onClick={() => navigate(-1)}
                className="mt-2 py-2 px-2 rounded-md flex items-center text-gray-600 hover:bg-blue-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
          </div>
          <div className="">
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-gray-600">Manage your expense claims and reimbursements</p>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="text-green-800">{success}</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveView('claims')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeView === 'claims' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 My Claims
            </button>
            <button
              onClick={() => setActiveView('new-claim')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeView === 'new-claim' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ➕ New Claim
            </button>
            {(role === 'admin' || role === 'manager') && (
              <button
                onClick={() => setActiveView('admin')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeView === 'admin' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                👨‍💼 Admin Panel
              </button>
            )}
          </nav>
        </div>

        {/* Main Content */}
        {activeView === 'claims' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">My Expense Claims</h2>
            </div>
            <div className="p-6">
              {claims.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Yet</h3>
                  <p className="text-gray-500 mb-4">You haven't submitted any expense claims yet.</p>
                  <button
                    onClick={() => setActiveView('new-claim')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Create Your First Claim
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <div key={claim.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-2xl">{getStatusIcon(claim.status)}</span>
                            <h3 className="text-lg font-medium text-gray-900">{claim.title}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                              {claim.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Date: </span>
                              {new Date(claim.claim_date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Amount: </span>
                              {formatAmount(claim.total_amount)} {claim.currency || 'INR'}
                            </div>
                            <div className='border border-gray-300 rounded hover:bg-blue-200 max-w-fit px-2 py-1'>
                              <button onClick={() => viewClaimDetails(claim.id)}>View Details</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'new-claim' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Create New Expense Claim</h2>
            </div>
            <div className="p-6">
              {/* Main Claim Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claim Title *
                  </label>
                  <input
                    type="text"
                    value={mainClaim.title}
                    onChange={(e) => setMainClaim(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Business Trip to Mumbai"
                  />
                </div>
                
                {/* NON-EDITABLE CLAIM DATE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claim Date
                  </label>
                  <input
                    type="text"
                    value={new Date(mainClaim.claim_date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically set to today's date
                  </p>
                </div>
              </div>

              {/* Add Expense Item Form */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense Items</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={currentItem.category_id}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.amount}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={currentItem.item_description}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, item_description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter item description"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor/Merchant
                    </label>
                    <input
                      type="text"
                      value={currentItem.vendor_name}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, vendor_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Vendor or merchant name"
                    />
                  </div>
                </div>

                {/* UPDATED: Document Upload and Receipt Number Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receipt/Document
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    {currentItem.document && (
                      <div className="mt-1 text-sm text-green-600">
                        ✅ File selected: {currentItem.document.name}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Upload receipt, invoice, or supporting document (PDF, JPG, PNG)
                    </p>
                  </div>
                  
                  {/* NEW: Invoice/Receipt Number Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice/Receipt Number
                      <span className="text-gray-400 font-normal"> (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={currentItem.receipt_number || ''}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, receipt_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., INV-2025-001, REC-123456"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Reference number from invoice or receipt
                    </p>
                  </div>
                </div>

                <button
                  onClick={addExpenseItem}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mb-6"
                >
                  Add Item
                </button>
              </div>

              {/* Added Items List */}
              {expenseItems.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Added Items</h3>
                  <div className="space-y-3">
                    {expenseItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.item_description}</div>
                          <div className="text-sm text-gray-600">
                            {formatAmount(item.amount)} • {new Date(item.expense_date).toLocaleDateString()}
                            {item.vendor_name && ` • ${item.vendor_name}`}
                            {item.receipt_number && ` • Receipt: ${item.receipt_number}`}
                            {item.document && ` • 📎 ${item.document.name}`}
                          </div>
                        </div>
                        <button
                          onClick={() => removeExpenseItem(item.id)}
                          className="text-red-600 hover:text-red-800 ml-4"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatAmount(mainClaim.total_amount)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitClaim}
                    disabled={loading || expenseItems.length === 0}
                    className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Expense Claim'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'admin' && (role === 'admin' || role === 'manager') && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Admin Panel - All Claims</h2>
            </div>
            <div className="p-6">
              {allClaims.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Found</h3>
                  <p className="text-gray-500">No expense claims found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allClaims.map((claim) => (
                    <div key={claim.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-2xl">{getStatusIcon(claim.status)}</span>
                            <h3 className="text-lg font-medium text-gray-900">{claim.title}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                              {claim.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Employee:</span><br />
                              {claim.employee_name || `User ID ${claim.user_id}`}
                            </div>
                            <div>
                              <span className="font-medium">Date:</span><br />
                              {new Date(claim.claim_date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Description:</span><br />
                              {claim.description || 'No description'}
                            </div>
                            <div>
                              <span className="font-medium">Amount:</span><br />
                              {formatAmount(claim.total_amount)} {claim.currency || 'INR'}
                            </div>
                            <div>
                              <span className="font-medium">Items:</span><br />
                              {claim.items_count || 'N/A'} items
                            </div>
                          </div>
                        </div>
                        {claim.status === 'pending' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleApproveClaim(claim.id, 'approve')}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              disabled={loading}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleApproveClaim(claim.id, 'reject', 'Rejected by admin')}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                              disabled={loading}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'claim-details' && selectedClaim && (
          <ClaimDetails 
            claim={selectedClaim}
            onBack={() => setActiveView('claims')}
            formatAmount={formatAmount}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        )}
      </div>
    </div>
  );
};

export default Expense;
