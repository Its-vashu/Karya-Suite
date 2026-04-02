import React, { useState, useEffect } from 'react';
import {useNavigate} from 'react-router-dom'
import { useUser } from '../context//UserContext';
import { ClaimDetailsByHr } from './ClaimDetailsByHr';
import { ArrowLeft } from 'lucide-react';

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
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          throw new Error('Authentication failed');
        }
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // console.error(`API Request Failed [${endpoint}]:`, error);
      throw error;
    }
  },
  // Statistics Management
  async getStatistics() {
    return await this.request('/api/expense/stats');

  },
  // Categories Management
  async getCategories() {
    return await this.request('/api/expense/categories');
  },

  async createCategory(categoryData) {
    return await this.request('/api/expense/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  },

  async updateCategory(categoryId, categoryData) {
    return await this.request(`/api/expense/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  },

  async deleteCategory(categoryId) {
    return await this.request(`/api/expense/categories/${categoryId}`, {
      method: 'DELETE'
    });
  },

  // User Profile Management
  async getUserProfile(email) {
    return await this.request(`/api/expense/user-profile/${email}`);
  },

  // Claims Management
  async getAllClaims(filters = {}) {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const params = new URLSearchParams(cleanFilters).toString();
    return await this.request(`/api/expense/claims?${params}`);
  },

  async getExpenseClaims(filters = {}) {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const params = new URLSearchParams(cleanFilters).toString();
    return await this.request(`/api/expense/claims?${params}`);
  },

  async createClaim(claimData) {
    return await this.request('/api/expense/claims', {
      method: 'POST',
      body: JSON.stringify(claimData)
    });
  },

  async getClaimDetails(claimId) {
    return await this.request(`/api/expense/claims/${claimId}`);
  },

  async getClaimItems(claimId) {
    return await this.request(`/api/expense/claims/${claimId}/items?t=${Date.now()}`);
  },

  async processApproval(claimId, approvalData) {
    const requestData = {
      action: approvalData.action,
      approved_amount: approvalData.approved_amount ? parseFloat(approvalData.approved_amount) : null,
      comments: approvalData.comments || approvalData.remarks || null
    };

    if (!requestData.action) {
      throw new Error('Action is required for approval');
    }
    if (requestData.action === 'approve' && !requestData.approved_amount) {
      throw new Error('Approved amount is required for approval');
    }

    const query = approvalData.approver_id ? `?approver_id=${approvalData.approver_id}` : '';
    return await this.request(
      `/api/expense/claims/${claimId}/approve${query}`,
      {
        method: 'PUT',
        body: JSON.stringify(requestData)
      }
    );
  },

  async getPendingApprovals() {
    return await this.request('/api/expense/claims/pending-approval');
  },

  // Expense Items Management
  async getExpenseItems(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await this.request(`/api/expense/items?${params}`);
  },

  async bulkCreateExpenseItems(claimId, itemsData) {
    return await this.request(`/api/expense/claims/${claimId}/items/bulk`, {
      method: 'POST',
      body: JSON.stringify(itemsData)
    });
  },

  async bulkApproveItems(itemIds, approverData) {
    return await this.request(`/api/expense/items/bulk-approve?approver_id=${approverData.approver_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        item_ids: itemIds,
        approved_amounts: approverData.approved_amounts,
        comments: approverData.comments
      })
    });
  },

  // Document Management
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

  async getDocuments(claimId = null, itemId = null) {
    const params = new URLSearchParams();
    if (claimId) params.append('claim_id', claimId);
    if (itemId) params.append('item_id', itemId);
    const query = params.toString();
    return await this.request(`/api/expense/documents${query ? `?${query}` : ''}`);
  },

  async deleteDocument(documentId) {
    return await this.request(`/api/expense/documents/${documentId}`, {
      method: 'DELETE'
    });
  },

  // Document Download
  async downloadDocument(documentId) {
    const token = this.getToken();
    if (!token) throw new Error('Authentication token missing or expired');

    const url = `${this.BASE}/api/expense/documents/${documentId}/download`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} - ${response.statusText}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `document_${documentId}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true, filename };
    } catch (error) {
      throw new Error(`Document download failed: ${error.message}`);
    }
  },

  // Reimbursements Management
  async getReimbursements(params = {}) {
    return await this.request(`/api/expense/reimbursements?params=${params}`)
  },

  async createReimbursement(reimbursementData, processedBy) {
    return await this.request(`/api/expense/reimbursements?processed_by=${processedBy}`, {
      method: 'POST',
      body: JSON.stringify(reimbursementData)
    });
  },

  async updateReimbursementStatus(reimbursementId, statusData) {
    return await this.request(`/api/expense/reimbursements/${reimbursementId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    });
  },

};

const ExpenseManagement = () => {
  const { user_id, email } = useUser();

  // Navigation state
  const [activeView, setActiveView] = useState('claims');
  const navigate = useNavigate();

  // const handleBackToClaims = () => {
  //   setSelectedClaim(null);
  //   setActiveView('claims');
  //   loadAllClaims(); // Refresh the claims list when going back
  // };

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [pendingClaims, setPendingClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  // const [documents, setDocuments] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [statistics, setStatistics] = useState({
    approved_claims: 0,
    pending_claims: 0,
    reimbursed_claims: 0,
    rejected_claims: 0
  });

  // Filter states
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    min_amount: '',
    max_amount: ''
  });

  // Form states
  const [newCategory, setNewCategory] = useState({
    category_name: '',
    description: ''
  });

  const [editCategory, setEditCategory] = useState({
    id: '',
    category_name: '',
    description: '',
    is_active: true
  });

  const [newClaim, setNewClaim] = useState({
    user_id: user_id,
    title: '',
    // description: '',
    claim_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    currency: 'INR',
    approver_id: ''
  });

  // const [newExpenseItems, setNewExpenseItems] = useState([{
  //   category_id: '',
  //   item_description: '',
  //   amount: '',
  //   expense_date: new Date().toISOString().split('T')[0],
  //   receipt_required: true,
  //   comments: ''
  // }]);

  const [approvalData, setApprovalData] = useState({
    action: 'approve',
    approved_amount: '',
    comments: ''
  });

  const [reimbursementData, setReimbursementData] = useState({
    claim_id: '',
    payment_method: 'bank_transfer',
    payment_reference: ''
    //  payment_date: ''  // Uncomment if needed
  });

  // const [uploadData, setUploadData] = useState({
  //   file: null,
  //   claim_id: '',
  //   expense_item_id: '',
  //   document_type: 'receipt'
  // });

  // Helper functions
  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (isNaN(num) || amount === null || amount === undefined) {
      return '₹0.00';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(num);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'reimbursed': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'paid': return 'text-green-600 bg-green-50 border-green-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'reimbursed': return '💰';
      case 'paid': return '💸';
      case 'processing': return '🔄';
      case 'active': return '✅';
      case 'expired': return '⚠️';
      case 'cancelled': return '❌';
      default: return '📄';
    }
  };

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user profile first
      if (email) {
        try {
          const profileData = await API_SERVICE.getUserProfile(email);
          setUserProfile(profileData);
        } catch (err) {
          // console.warn('User profile not found:', err);
          throw err;
        }
      }

      const [
        pendingData,
        categoriesData,
        statisticsData,
      ] = await Promise.all([
        API_SERVICE.getPendingApprovals().catch(err => []),
        API_SERVICE.getCategories().catch(err => []),
        API_SERVICE.getStatistics().catch(err => ({
          approved_claims: 0,
          pending_claims: 0,
          reimbursed_claims: 0,
          rejected_claims: 0
        })),
      ]);

      setPendingClaims(pendingData);
      setCategories(categoriesData);
      setStatistics(statisticsData);
    } catch (error) {
      //console.error('Failed to load dashboard data:', error);
      setError(`Failed to load dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load functions
  // const loadStatistics = async () => {
  //   try {
  //     const statisticsData = await API_SERVICE.getStatistics();
  //     setStatistics(statisticsData);
  //   } catch (error) {
  //     console.error('Failed to load statistics:', error);
  //     setError(`Failed to load statistics: ${error.message}`);
  //   }
  // };

  const loadAllClaims = async () => {
    try {
      setLoading(true);
      const claimsData = await API_SERVICE.getAllClaims(filters);
      setAllClaims(claimsData);
    } catch (error) {
      setError(`Failed to load claims: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadReimbursements = async () => {
    try {
      setLoading(true);
      const reimbursementData = await API_SERVICE.getReimbursements(filters);
      setReimbursements(reimbursementData);
    } catch (error) {
      setError(`Failed to load reimbursements: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadReimbursementByClaimId = async (claimId) => {
    if (!claimId) {
      setReimbursements([]);
      return;
    }
    
    try {
      setLoading(true);
      //console.log('Loading reimbursement for claim ID:', claimId);
      const reimbursementData = await API_SERVICE.getReimbursements(claimId);
      //console.log('Reimbursement data received:', reimbursementData);
      setReimbursements(reimbursementData);
      
      // If reimbursement data exists, populate the form with existing data
      if (reimbursementData && reimbursementData.length > 0) {
        const existingReimbursement = reimbursementData[0];
        //console.log('Populating form with existing reimbursement:', existingReimbursement);
        setReimbursementData(prev => ({
          ...prev,
          claim_id: claimId,
          payment_method: existingReimbursement.payment_method || 'bank_transfer',
          payment_reference: existingReimbursement.payment_reference || ''
        }));
      } else {
        // Reset form if no reimbursement data found
        //console.log('No reimbursement data found, resetting form');
        setReimbursementData(prev => ({
          ...prev,
          claim_id: claimId,
          payment_method: 'bank_transfer',
          payment_reference: ''
        }));
      }
    } catch (error) {
      //console.error('Error loading reimbursement details:', error);
      setError(`Failed to load reimbursement details: ${error.message}`);
      setReimbursements([]);
    } finally {
      setLoading(false);
    }
  };

  // const loadDocuments = async (claimId = null, itemId = null) => {
  //   try {
  //     setLoading(true);
  //     const docsData = await API_SERVICE.getDocuments(claimId, itemId);
  //     setDocuments(docsData);
  //   } catch (error) {
  //     setError(`Failed to load documents: ${error.message}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const loadExpenseItems = async (claimId = null) => {
    try {
      setLoading(true);
      const itemsData = await API_SERVICE.getExpenseItems({ claim_id: claimId });
      setExpenseItems(itemsData);
    } catch (error) {
      setError(`Failed to load expense items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

// Line 1100 - Update handleApproval function
const handleApproval = async (claimId) => {
  // Enhanced validation for different scenarios
  if (!approvalData.action) {
    setError('Please select an action (approve or reject)');
    return;
  }
  
  if (approvalData.action === 'approve' && !approvalData.approved_amount) {
    setError('Approved amount is required when approving a claim');
    return;
  }
  
  if (approvalData.action === 'reject' && !approvalData.comments.trim()) {
    setError('Rejection reason is required when rejecting a claim');
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    await API_SERVICE.processApproval(claimId, {
      ...approvalData,
      approver_id: user_id,
      approved_amount: approvalData.action === 'approve' ? parseFloat(approvalData.approved_amount) : 0
    });

    setSuccess(`Claim ${approvalData.action}d successfully`);
    setApprovalData({ action: 'approve', approved_amount: '', comments: '' });
    setSelectedClaim(null);
    setActiveView('claims'); // Return to approvals view
    loadDashboardData(); // Refresh data
  } catch (error) {
    setError(`Failed to ${approvalData.action} claim: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleCreateCategory = async () => {
    if (!newCategory.category_name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      await API_SERVICE.createCategory(newCategory);
      setSuccess('Category created successfully');
      setNewCategory({ category_name: '', description: '' });
      
      const categoriesData = await API_SERVICE.getCategories();
      setCategories(categoriesData);

    } catch (error) {
      setError(`Failed to create category: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReimbursement = async () => {
    if (!reimbursementData.claim_id) {
      setError('Please select a claim for reimbursement');
      return;
    }

    try {
      setLoading(true);
      await API_SERVICE.createReimbursement(reimbursementData, user_id);
      setSuccess('Reimbursement created successfully');
      setReimbursementData({
        claim_id: '',
        payment_method: 'bank_transfer',
        payment_reference: ''
      });

      loadReimbursements();

    } catch (error) {
      setError(`Failed to create reimbursement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
// Line 1050 - Fix handleViewClaim function
const handleViewClaim = async (claimId) => {
  try {
    setLoading(true);
    const claimDetails = await API_SERVICE.getClaimDetails(claimId);
    
    // Also fetch items with documents
    try {
      const claimItems = await API_SERVICE.getClaimItems(claimId);
      claimDetails.items = claimItems; // Override with items that have documents
      //console.log('Fetched claim items with documents:', claimItems);
    } catch (itemError) {
      //console.warn('Could not fetch claim items with documents:', itemError);
      throw itemError;
    }
    
    setSelectedClaim(claimDetails);
    setApprovalData({
      action: 'approve',
      approved_amount: claimDetails.total_amount?.toString() || '',
      comments: ''
    });
    setActiveView('claim-details'); // Add this line to switch to detail view
  } catch (error) {
    setError(`Failed to load claim details: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      setLoading(true);
      await API_SERVICE.deleteCategory(categoryId);
      setSuccess('Category deleted successfully');
      
      const categoriesData = await API_SERVICE.getCategories();
      setCategories(categoriesData);

    } catch (error) {
      setError(`Failed to delete category: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editCategory.category_name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      await API_SERVICE.updateCategory(categoryId, editCategory);
      setSuccess('Category updated successfully');
      setEditCategory({ id: '', category_name: '', description: '', is_active: true });
      
      const categoriesData = await API_SERVICE.getCategories();
      setCategories(categoriesData);

    } catch (error) {
      setError(`Failed to update category: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async () => {
    if (!newClaim.title || !newClaim.total_amount) {
      setError('Title and total amount are required');
      return;
    }

    try {
      setLoading(true);
      const claimData = {
        ...newClaim,
        total_amount: parseFloat(newClaim.total_amount),
        user_id: user_id
      };
      
      await API_SERVICE.createClaim(claimData);
      setSuccess('Expense claim created successfully');
      setNewClaim({
        user_id: user_id,
        title: '',
        // description: '',
        claim_date: new Date().toISOString().split('T')[0],
        total_amount: '',
        currency: 'USD',
        approver_id: ''
      });

      loadAllClaims();

    } catch (error) {
      setError(`Failed to create claim: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // const handleBulkCreateItems = async (claimId) => {
  //   if (!newExpenseItems.every(item => item.category_id && item.item_description && item.amount)) {
  //     setError('All expense item fields are required');
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     const itemsData = newExpenseItems.map(item => ({
  //       ...item,
  //       category_id: parseInt(item.category_id),
  //       amount: parseFloat(item.amount)
  //     }));

  //     await API_SERVICE.bulkCreateExpenseItems(claimId, { items: itemsData });
  //     setSuccess('Expense items created successfully');
  //     setNewExpenseItems([{
  //       category_id: '',
  //       item_description: '',
  //       amount: '',
  //       expense_date: new Date().toISOString().split('T')[0],
  //       receipt_required: true,
  //       comments: ''
  //     }]);

  //     loadExpenseItems(claimId);

  //   } catch (error) {
  //     setError(`Failed to create expense items: ${error.message}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleUploadDocument = async () => {
  //   if (!uploadData.file) {
  //     setError('Please select a file to upload');
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     await API_SERVICE.uploadDocument(
  //       uploadData.file,
  //       uploadData.claim_id || null,
  //       uploadData.expense_item_id || null,
  //       uploadData.document_type,
  //       user_id
  //     );

  //     setSuccess('Document uploaded successfully');
  //     setUploadData({
  //       file: null,
  //       claim_id: '',
  //       expense_item_id: '',
  //       document_type: 'receipt'
  //     });

  //     loadDocuments(uploadData.claim_id, uploadData.expense_item_id);

  //   } catch (error) {
  //     setError(`Failed to upload document: ${error.message}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleDeleteDocument = async (documentId) => {
  //   if (!window.confirm('Are you sure you want to delete this document?')) {
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     await API_SERVICE.deleteDocument(documentId);
  //     setSuccess('Document deleted successfully');
  //     loadDocuments();
  //   } catch (error) {
  //     setError(`Failed to delete document: ${error.message}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleDownloadDocument = async (documentId, filename = null) => {
  //   try {
  //     setLoading(true);
  //     const result = await API_SERVICE.downloadDocument(documentId);
  //     setSuccess(`Document downloaded successfully: ${result.filename}`);
  //   } catch (error) {
  //     setError(`Failed to download document: ${error.message}`);
  //     console.error('Download error:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const addNewExpenseItem = () => {
  //   setNewExpenseItems([...newExpenseItems, {
  //     category_id: '',
  //     item_description: '',
  //     amount: '',
  //     expense_date: new Date().toISOString().split('T')[0],
  //     receipt_required: true,
  //     comments: ''
  //   }]);
  // };

  // const removeExpenseItem = (index) => {
  //   setNewExpenseItems(newExpenseItems.filter((_, i) => i !== index));
  // };

  // const updateExpenseItem = (index, field, value) => {
  //   const updatedItems = [...newExpenseItems];
  //   updatedItems[index] = { ...updatedItems[index], [field]: value };
  //   setNewExpenseItems(updatedItems);
  // };

  // View change handlers
  useEffect(() => {
    switch (activeView) {
      case 'claims':
        loadAllClaims();
        break;
      case 'reimbursements':
        loadReimbursements();
        loadAllClaims(); // Load claims to populate dropdown
        break;
      case 'expense-items':
        loadExpenseItems();
        break;
      default:
        break;
    }
  }, [activeView, filters]);

  if (loading && !categories.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expense management dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-800">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6 flex items-center">
          <div className='flex items-start pl-4'>
            <button
              onClick={() => navigate(-1)}
              className="px-2 py-2 mt-1 text-gray-600 rounded-lg  hover:text-gray-600 hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft />
            </button>
          </div>
          <div className="px-2 py-4">
            <h1 className="text-2xl font-bold text-gray-900">📊 Expense Management</h1>
            <p className="text-gray-600">Comprehensive expense management and analytics</p>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
            <button onClick={() => setError(null)} className="float-right text-red-600 hover:text-red-800">×</button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="text-green-800">{success}</div>
            <button onClick={() => setSuccess(null)} className="float-right text-green-600 hover:text-green-800">×</button>
          </div>
        )}

        {/* Navigation Tabs */}
        {/* Dashboard Summary - Always visible at top */}
        <div className="bg-white shadow rounded-lg mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">📋</div>
                  </div>
                  <div className="ml-2 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Claims</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {allClaims?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">✅</div>
                  </div>
                  <div className="ml-2 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Approved Claims</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics?.approved_claims || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">⏳</div>
                  </div>
                  <div className="ml-2 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Claims</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics?.pending_claims || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">❌</div>
                  </div>
                  <div className="ml-2 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Rejected Claims</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics?.rejected_claims || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">💰</div>
                  </div>
                  <div className="ml-2 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Reimbursed Claims</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics?.reimbursed_claims || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - dashboard tab removed */}
        <div className="bg-white shadow rounded-lg mb-6">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
          {[
            { key: 'claims', label: '📋 Claims' },
            { key: 'create-claim', label: '➕ Create Claim' },
            { key: 'claim-details', label: '🔍 Claim Details' },
            { key: 'reimbursements', label: '💰 Reimbursements' },
            { key: 'categories', label: '🏷️ Categories' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeView === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } ${tab.key === 'claim-details' && !selectedClaim ? 'hidden' : ''}`}
            >
              {tab.label}
            </button>
          ))}
          </nav>
        </div>


        {/* Create Claim View */}
        {activeView === 'create-claim' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Create New Expense Claim</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newClaim.title}
                      onChange={(e) => setNewClaim(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Business Trip to Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newClaim.total_amount}
                      onChange={(e) => setNewClaim(prev => ({ ...prev, total_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claim Date</label>
                    <input
                      type="date"
                      value={newClaim.claim_date}
                      onChange={(e) => setNewClaim(prev => ({ ...prev, claim_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={newClaim.currency}
                      onChange={(e) => setNewClaim(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateClaim}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Claim'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'claims' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">All Claims ({allClaims.length})</h2>
              <button
                onClick={loadAllClaims}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
    
    {/* Filters */}
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <input
          type="date"
          placeholder="Start Date"
          value={filters.start_date}
          onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="date"
          placeholder="End Date"
          value={filters.end_date}
          onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reimbursed">Reimbursed</option>
        </select>
        <input
          type="number"
          placeholder="Min Amount"
          value={filters.min_amount}
          onChange={(e) => setFilters(prev => ({ ...prev, min_amount: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="number"
          placeholder="Max Amount"
          value={filters.max_amount}
          onChange={(e) => setFilters(prev => ({ ...prev, max_amount: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>

    <div className="p-6">
      {allClaims.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
          <p className="text-gray-500">No expense claims match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {allClaims.map((claim) => (
            <div key={claim.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{getStatusIcon(claim.status)}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{claim.title}</h3>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                        {claim.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Claim Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700 block">Employee</span>
                      <span className="text-blue-600 font-medium">
                        @{claim.employee_name || `User ${claim.user_id}`}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700 block">Claim Date</span>
                      <span className="text-gray-900">
                        {new Date(claim.claim_date || claim.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700 block">Submitted</span>
                      <span className="text-gray-900">
                        {new Date(claim.submission_date || claim.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700 block">Total Amount</span>
                      <span className="text-green-600 font-bold text-lg">
                        {formatCurrency(claim.total_amount)} {claim.currency}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700 block">Items</span>
                      <span className="text-purple-600 font-medium">
                        {claim.items_count || 0} items
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(claim.approved_amount || claim.rejection_reason) && (
                    <div className="mt-4 p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                      {claim.approved_amount && (
                        <div className="text-sm">
                          <span className="font-semibold text-blue-700">Approved Amount: </span>
                          <span className="text-green-600 font-bold">{formatCurrency(claim.approved_amount)}</span>
                        </div>
                      )}
                      {claim.rejection_reason && (
                        <div className="text-sm mt-1">
                          <span className="font-semibold text-red-700">Rejection Reason: </span>
                          <span className="text-red-600">{claim.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="mt-3 text-xs text-gray-500 flex space-x-4">
                    <span>Created: {new Date(claim.created_at).toLocaleString()}</span>
                    {claim.approval_date && (
                      <span>Approved: {new Date(claim.approval_date).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="ml-6 flex flex-col space-y-2">
                  <button
                    onClick={() => handleViewClaim(claim.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    🔍 View Details
                  </button>
                  {claim.status === 'pending' && (
                    <button
                      onClick={() => handleViewClaim(claim.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      ✅ Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

        {/* Categories View */}
        {activeView === 'categories' && (
          <div className="space-y-6">
            {/* Add New Category */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Add New Category</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      value={newCategory.category_name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, category_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Software, Travel, Meals"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateCategory}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">All Categories</h2>
              </div>
              <div className="p-6">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No categories found</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{category.category_name}</h3>
                            <p className="text-sm text-gray-600">{category.description || 'No description'}</p>
                            <div className="text-xs text-gray-400 mt-2">
                              Created: {new Date(category.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditCategory({
                                id: category.id,
                                category_name: category.category_name,
                                description: category.description || '',
                                is_active: category.is_active
                              })}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Category Modal */}
            {editCategory.id && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Category</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                        <input
                          type="text"
                          value={editCategory.category_name}
                          onChange={(e) => setEditCategory(prev => ({ ...prev, category_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={editCategory.description}
                          onChange={(e) => setEditCategory(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editCategory.is_active}
                          onChange={(e) => setEditCategory(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="mr-2"
                        />
                        <label className="text-sm font-medium text-gray-700">Active</label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setEditCategory({ id: '', category_name: '', description: '', is_active: true })}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateCategory(editCategory.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Update Category'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeView === 'claim-details' && selectedClaim && (
          <ClaimDetailsByHr
            selectedClaim={selectedClaim}
            onBack={() => {
              setActiveView('approvals');
              setSelectedClaim(null);
            }}
            onApproval={handleApproval}
            approvalData={approvalData}
            setApprovalData={setApprovalData}
            loading={loading}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        )}

        
        {/* // Line 1400 - Fix Approvals View to show pending claims */}
        {/* {activeView === 'claims' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Pending Claims ({pendingClaims.length})</h2>
                <button
                  onClick={loadDashboardData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
              <div className="p-6">
                {pendingClaims.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">✅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
                    <p className="text-gray-500">All claims have been processed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingClaims.map((claim) => (
                      <div key={claim.id} className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-2xl">⏳</span>
                              <h3 className="text-lg font-medium text-gray-900">{claim.title}</h3>
                              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                                PENDING APPROVAL
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-700 mb-3">
                              <div>
                                <span className="font-semibold text-gray-900">Employee:</span><br />
                                <span className="text-blue-600">{claim.employee_name || `User ${claim.user_id}`}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900">Claim Date:</span><br />
                                {new Date(claim.claim_date).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900">Submitted:</span><br />
                                {new Date(claim.submission_date || claim.created_at).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900">Amount:</span><br />
                                <span className="text-green-600 font-semibold">{formatCurrency(claim.total_amount)}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900">Items:</span><br />
                                {claim.items_count || 0} items
                              </div>
                            </div>

                            <div className="text-xs text-gray-500">
                              Claim ID: #{claim.id} • Waiting for approval since {Math.ceil((new Date() - new Date(claim.submission_date || claim.created_at)) / (1000 * 60 * 60 * 24))} days
                            </div>
                          </div>

                          <div className="ml-4 flex space-x-2">
                            <button
                              onClick={() => handleViewClaim(claim.id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                            >
                              📋 Review & Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )} */}

        {/* Reimbursements View */}
        {activeView === 'reimbursements' && (
          <div className="space-y-6">
            {/* Create Reimbursement */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Create Reimbursement</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Approved Claim *</label>
                    <select
                      value={reimbursementData.claim_id}
                      onChange={(e) => {
                        const claimId = e.target.value;
                        setReimbursementData(prev => ({ ...prev, claim_id: claimId }));
                        // Auto-load reimbursement details when claim ID is selected
                        if (claimId && claimId.length > 0) {
                          loadReimbursementByClaimId(claimId);
                        } else {
                          setReimbursements([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select an approved claim</option>
                      {allClaims
                        .filter(claim => claim.status === 'approved' && !claim.reimbursed)
                        .map(claim => (
                          <option key={claim.id} value={claim.id}>
                            Claim #{claim.id} - {claim.title} - {formatCurrency(claim.approved_amount || claim.total_amount)}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={reimbursementData.payment_method}
                      onChange={(e) => setReimbursementData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                    <input
                      type="text"
                      value={reimbursementData.payment_reference}
                      onChange={(e) => setReimbursementData(prev => ({ ...prev, payment_reference: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Transaction ID, Check number, etc."
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateReimbursement}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Create Reimbursement'}
                </button>
              </div>
            </div>

            {/* Reimbursement Details for Selected Claim */}
            {reimbursementData.claim_id && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Reimbursement Details for Claim #{reimbursementData.claim_id}
                  </h2>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading reimbursement details...</p>
                    </div>
                  ) : reimbursements.length > 0 ? (
                    <div className="space-y-4">
                      {reimbursements.map((reimbursement) => (
                        <div key={reimbursement.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium text-gray-600">Reimbursement ID:</span>
                                <p className="text-gray-900 font-semibold">{reimbursement.id}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Claim ID:</span>
                                <p className="text-gray-900">{reimbursement.claim_id}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Amount:</span>
                                <p className="text-gray-900 font-semibold text-lg">
                                  {formatCurrency(reimbursement.reimbursement_amount)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium text-gray-600">Payment Method:</span>
                                <p className="text-gray-900 capitalize">{reimbursement.payment_method}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Payment Reference:</span>
                                <p className="text-gray-900">{reimbursement.payment_reference || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Status:</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reimbursement.status)}`}>
                                  {getStatusIcon(reimbursement.status)} {reimbursement.status?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium text-gray-600">Processed By:</span>
                                <p className="text-gray-900">{reimbursement.processed_by}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Processed Date:</span>
                                <p className="text-gray-900">
                                  {new Date(reimbursement.processed_date).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Payment Date:</span>
                                <p className="text-gray-900">
                                  {reimbursement.payment_date 
                                    ? new Date(reimbursement.payment_date).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'Not processed yet'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {reimbursement.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <span className="text-sm font-medium text-gray-600">Notes:</span>
                              <p className="text-gray-900 mt-1">{reimbursement.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <span className="text-yellow-600 text-xl">⚠️</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            No Reimbursement Found
                          </h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            No reimbursement records found for Claim ID #{reimbursementData.claim_id}. 
                            You can create a new reimbursement using the form above.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reimbursements List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">All Reimbursements</h2>
              </div>
              <div className="p-6">
                {reimbursements.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No reimbursements found</p>
                ) : (
                  <div className="space-y-4">
                    {reimbursements.map((reimbursement) => (
                      <div key={reimbursement.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-900">Reimbursement #{reimbursement.id}</h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reimbursement.status)}`}>
                                {reimbursement.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Claim ID:</span><br />
                                {reimbursement.claim_id}
                              </div>
                              <div>
                                <span className="font-medium">Amount:</span><br />
                                {formatCurrency(reimbursement.reimbursement_amount)}
                              </div>
                              <div>
                                <span className="font-medium">Method:</span><br />
                                {reimbursement.payment_method}
                              </div>
                              <div>
                                <span className="font-medium">Reference:</span><br />
                                {reimbursement.payment_reference || 'N/A'}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                              Processed: {new Date(reimbursement.processed_date).toLocaleDateString()}
                              {reimbursement.payment_date && ` • Paid: ${new Date(reimbursement.payment_date).toLocaleDateString()}`}
                            </div>
                            {reimbursement.notes && (
                              <div className="text-sm text-gray-600 mt-2">
                                <span className="font-medium">Notes:</span> {reimbursement.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManagement;
