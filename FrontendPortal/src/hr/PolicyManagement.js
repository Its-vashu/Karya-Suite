import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Save, X, FileText, AlertCircle, Calendar, Tag, Clock, Upload, Users, Eye, Download, ArrowLeft, Filter as FilterIcon, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const PolicyListItem = React.memo(({ policy, onEdit, onDelete, onView, onViewPdf }) => {
  return (
    <tr className="hover:bg-blue-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <div className="text-sm md:text-base font-semibold text-gray-900 mb-1">{policy.name}</div>
          <div className="text-sm text-gray-600 max-w-xs truncate" title={policy.description}>
            {policy.description}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          {policy.policy_category && (
            <span className="inline-flex px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full max-w-fit">
              <Tag className="h-3 w-3 mr-1" />
              {policy.policy_category}
            </span>
          )}
          {policy.applicable_roles && policy.applicable_roles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {policy.applicable_roles.slice(0, 3).map((role, index) => (
                <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  <Users className="h-3 w-3 mr-1" />
                  {role}
                </span>
              ))}
              {policy.applicable_roles.length > 3 && (
                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  +{policy.applicable_roles.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
        <div className="flex flex-col gap-2">
          <span className="inline-flex px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full max-w-fit">
            {policy.department}
          </span>
          <span className="inline-flex items-center text-sm text-gray-700">
            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
            {policy.effective_date || 'Not set'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          {policy.pdf_filename && (
            <button
              onClick={() => onViewPdf(policy)}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title={`View PDF (${policy.pdf_filename})`}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onView(policy)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="View details"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(policy)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="Edit policy"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(policy.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete policy"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

/**
 * A modal for creating or editing a policy.
 */
const PolicyFormModal = ({ isOpen, onClose, onSave, editingPolicy, loading, availableRoles }) => {
  const [formData, setFormData] = useState({});
  const fileInputRef = useRef(null);
  
  // Effect to sync form data when modal opens for editing
  useEffect(() => {
    const initialData = editingPolicy || {
      name: '',
      department: '',
      description: '',
      effective_date: new Date().toISOString().split('T')[0],
      policy_category: '',
      applicable_roles: [],
      policyFile: null
    };
    setFormData(initialData);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [editingPolicy, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      setFormData(prev => ({ ...prev, policyFile: file }));
    }
  };
  
  const handleRoleToggle = (roleLevel) => {
    const currentRoles = formData.applicable_roles || [];
    const newRoles = currentRoles.includes(roleLevel)
      ? currentRoles.filter(r => r !== roleLevel)
      : [...currentRoles, roleLevel];
    setFormData(prev => ({ ...prev, applicable_roles: newRoles }));
  };
  
  const isFormValid = formData.name?.trim() && formData.department?.trim() && formData.description?.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Policy Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter policy name"/>
            </div>
            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
              <select name="department" value={formData.department || ''} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select department</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="IT">IT</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Legal">Legal</option>
                  <option value="Sales">Sales</option>
                  <option value="Research">Research & Development</option>
                  <option value="Customer Service">Customer Service</option>
              </select>
            </div>
            {/* Policy Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Category</label>
              <select name="policy_category" value={formData.policy_category || ''} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select category</option>
                  <option value="General">General</option>
                  <option value="Health & Safety">Health & Safety</option>
                  <option value="Security">Security</option>
                  <option value="Leave">Leave & Attendance</option>
                  <option value="Conduct">Code of Conduct</option>
                  <option value="Remote Work">Remote Work</option>
                  <option value="Compensation">Compensation & Benefits</option>
              </select>
            </div>
            {/* Effective Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input type="date" name="effective_date" value={formData.effective_date || ''} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              </div>
            </div>
            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
              <textarea name="description" value={formData.description || ''} onChange={handleInputChange} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter detailed policy description"/>
            </div>
            {/* Applicable Roles */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">Applicable Roles</label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableRoles.map((role) => (
                    <label key={role.level} className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.applicable_roles?.includes(role.level)} onChange={() => handleRoleToggle(role.level)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                      <div className="ml-3 flex-1"><div className="text-sm font-medium text-gray-900">{role.level} - {role.code}</div><div className="text-xs text-gray-500 truncate">{role.description}</div></div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500">Select the roles/levels this policy applies to</div>
            </div>
            {/* File Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Policy Document (PDF)</label>
              <div className="mt-1 flex items-center">
                <label className="block w-full">
                  <div className={`flex items-center justify-center w-full border-2 rounded-lg px-6 py-4 cursor-pointer transition-colors ${formData.policyFile ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300 hover:bg-gray-50'}`}>
                    {formData.policyFile ? (
                      <><svg className="h-6 w-6 text-blue-600 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="text-sm text-blue-700 font-medium">{formData.policyFile.name}</span><button type="button" className="ml-4 text-blue-500 hover:text-blue-700 text-xs underline" onClick={() => { setFormData(prev => ({...prev, policyFile: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Remove</button></>
                    ) : (
                      <><Upload className="h-6 w-6 text-gray-400 mr-2" /><span className="text-sm text-gray-500">Click to upload PDF (max 5MB)</span></>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleFileChange} className="hidden"/>
                </label>
              </div>
              {editingPolicy?.pdf_filename && !formData.policyFile && (<div className="mt-2 text-sm text-gray-500">Current file: <span className="font-medium">{editingPolicy.pdf_filename}</span><span className="ml-2 text-xs text-gray-400">(Upload a new file to replace)</span></div>)}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 mt-8">
            <button onClick={onClose} className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium mt-3 sm:mt-0">Cancel</button>
            <button onClick={() => onSave(formData)} disabled={!isFormValid || loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">
              {loading ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Saving...</span></>) : (<><Save className="h-5 w-5" /><span>{editingPolicy ? 'Update Policy' : 'Create Policy'}</span></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * A read-only modal to show complete policy details to HR.
 */
const PolicyDetailsModal = ({ isOpen, onClose, policy }) => {
  if (!isOpen || !policy) return null;

  const formatDate = (d) => {
    if (!d) return 'Not set';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{policy.name}</h2>
                <p className="text-sm text-gray-500">Complete details</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Department</h3>
              <div className="inline-flex px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full max-w-fit">
                {policy.department || 'Not set'}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Category</h3>
              <div className="inline-flex px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full max-w-fit">
                {policy.policy_category || 'General'}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Effective Date</h3>
              <div className="flex items-center text-sm text-gray-800">
                <Calendar className="h-4 w-4 mr-1 text-gray-400" /> {policy.effective_date || 'Not set'}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Applicable Roles</h3>
              <div className="flex flex-wrap gap-2">
                {(policy.applicable_roles || []).length === 0 ? (
                  <span className="text-sm text-gray-500">Not specified</span>
                ) : (
                  policy.applicable_roles.map((r, i) => (
                    <span key={i} className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">{r}</span>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{policy.description}</p>
            </div>

            <div className="md:col-span-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-600">
                <div>Created at: <span className="font-medium text-gray-800">{formatDate(policy.created_at)}</span></div>
                <div>Last updated: <span className="font-medium text-gray-800">{formatDate(policy.updated_at)}</span></div>
              </div>
              {policy.pdf_filename ? (
                <a
                  href={`${API_BASE}/policies/${policy.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                <Eye className="h-4 w-4" /> View PDF ({policy.pdf_filename})
                </a>
              ) : (
                <span className="text-sm text-gray-500">No PDF uploaded</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * A generic confirmation modal.
 */
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex justify-center space-x-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 font-medium">Yes, Delete</button>
        </div>
      </div>
    </div>
  );
};

/**
 * PDF Viewer Modal - Shows PDF in same page
 */
const PdfViewerModal = ({ isOpen, onClose, policy }) => {
  if (!isOpen || !policy) return null;

  const pdfUrl = `${API_BASE}/policies/${policy.id}/download`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{policy.name}</h3>
              <p className="text-sm text-gray-500">{policy.pdf_filename}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={`PDF Viewer - ${policy.name}`}
          />
        </div>
      </div>
    </div>
  );
};


// =================================================================================
// 2. Main PolicyManagement Component
// =================================================================================

const PolicyManagement = () => {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  const [policies, setPolicies] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal and editing state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [detailsPolicy, setDetailsPolicy] = useState(null);
  const [pdfViewerPolicy, setPdfViewerPolicy] = useState(null);
  
  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilters, setRoleFilters] = useState([]); // array of role levels
  const [hasPdfOnly, setHasPdfOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(5); // Show 5 policies initially

  // --- DERIVED STATE ---
  // Improved: Calculate filtered policies on the fly instead of storing in state.
  const filteredPolicies = useMemo(() => {
    return policies
      .filter(policy => {
        if (activeFilter !== 'all' && policy.department?.toLowerCase() !== activeFilter.toLowerCase()) {
          return false;
        }
        if (categoryFilter !== 'all' && (policy.policy_category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
        if (hasPdfOnly && !policy.pdf_filename) {
          return false;
        }
        if (roleFilters.length > 0) {
          const roles = policy.applicable_roles || [];
          const anyMatch = roleFilters.some(r => roles.includes(r));
          if (!anyMatch) return false;
        }
        if (!searchTerm) {
          return true;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          policy.name?.toLowerCase().includes(lowerSearchTerm) ||
          policy.department?.toLowerCase().includes(lowerSearchTerm) ||
          policy.description?.toLowerCase().includes(lowerSearchTerm) ||
          policy.policy_category?.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .sort((a, b) => {
        // Sort by created_at or updated_at - newest first
        const dateA = new Date(a.created_at || a.updated_at);
        const dateB = new Date(b.created_at || b.updated_at);
        return dateB - dateA; // Descending order (newest first)
      });
  }, [policies, searchTerm, activeFilter, categoryFilter, roleFilters, hasPdfOnly]);
  
  // Paginated policies for display
  const displayedPolicies = useMemo(() => {
    return filteredPolicies.slice(0, displayLimit);
  }, [filteredPolicies, displayLimit]);
  
  const hasMorePolicies = filteredPolicies.length > displayLimit;
  
  const departments = useMemo(() => ['all', ...new Set(policies.map(p => p.department).filter(Boolean))], [policies]);
  const categories = useMemo(() => ['all', ...new Set(policies.map(p => p.policy_category).filter(Boolean))], [policies]);

  // --- DATA FETCHING & API CALLS ---
  const fetchData = useCallback(async (url, options = {}) => {
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        ...options.headers,
      };
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {/* Ignore if response has no JSON body */}
        throw new Error(errorMessage);
      }
      // Handle cases with no response body (like DELETE)
      if (response.status === 204) return null;
      return response.json();
    } catch (err) {
      // console.error('API call failed:', err);
      setError(err.message);
      // Re-throw to be caught by the calling function if needed
      throw err;
    }
  }, []);

  const fetchPoliciesAndRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [policiesData, rolesData] = await Promise.all([
        fetchData(`${API_BASE}/policies/`),
        fetchData(`${API_BASE}/roles/`)
      ]);
      const validatedPolicies = policiesData.map(p => ({
        ...p,
        id: p.id || p._id,
        department: p.department || 'General',
        effective_date: p.effective_date || new Date().toISOString().split('T')[0]
      }));
      setPolicies(validatedPolicies);
      setAvailableRoles(rolesData || []);
    } catch (err) {
      // Error is already set by fetchData
    } finally {
      setLoading(false);
    }
  }, [fetchData]);
  
  useEffect(() => {
    fetchPoliciesAndRoles();
  }, [fetchPoliciesAndRoles]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(5);
  }, [searchTerm, activeFilter, categoryFilter, roleFilters, hasPdfOnly]);

  // --- EVENT HANDLERS ---
  const handleSavePolicy = useCallback(async (formData) => {
    setLoading(true);
    setError('');
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'applicable_roles') {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else if (key === 'policyFile' && formData.policyFile) {
        formDataToSend.append('policy_pdf', formData.policyFile);
      } else if (formData[key] !== null && formData[key] !== undefined) {
        formDataToSend.append(key, formData[key]);
      }
    });

    try {
      const url = editingPolicy ? `${API_BASE}/policies/${editingPolicy.id}/` : `${API_BASE}/policies/`;
      const method = editingPolicy ? 'PUT' : 'POST';
      await fetchData(url, { method, body: formDataToSend });
      
      setShowFormModal(false);
      setEditingPolicy(null);
      // Refetch policies to get the latest data
      await fetchPoliciesAndRoles();
    } catch (err) {
      // Error is set by fetchData
    } finally {
      setLoading(false);
    }
  }, [editingPolicy, fetchData, fetchPoliciesAndRoles]);

  const handleDeletePolicy = useCallback(async () => {
    if (!confirmDeleteId) return;
    setLoading(true);
    setError('');
    try {
      await fetchData(`${API_BASE}/policies/${confirmDeleteId}/`, { method: 'DELETE' });
      setPolicies(prev => prev.filter(p => p.id !== confirmDeleteId));
    } catch (err) {
      // Error is set by fetchData
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, fetchData]);

  const openCreateModal = () => {
    setEditingPolicy(null);
    setShowFormModal(true);
  };

  const openEditModal = useCallback((policy) => {
    setEditingPolicy(policy);
    setShowFormModal(true);
  }, []);

  const showDeleteConfirmation = useCallback((id) => {
    setConfirmDeleteId(id);
  }, []);

  const openDetailsModal = useCallback((policy) => {
    setDetailsPolicy(policy);
  }, []);

  const openPdfViewer = useCallback((policy) => {
    setPdfViewerPolicy(policy);
  }, []);

  const toggleRoleFilter = useCallback((level) => {
    setRoleFilters(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setActiveFilter('all');
    setCategoryFilter('all');
    setRoleFilters([]);
    setHasPdfOnly(false);
  }, []);


  // --- RENDER LOGIC ---
  return (
    <div className="min-h-screen bg-blue-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="px-2 py-2 rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="Back"
                title="Back"
              >
                <ArrowLeft />
              </button>
              <div className="ml-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">Policy Management</h1>
                <p className="text-gray-600">Create, manage, and distribute company policies.</p>
              </div>
            </div>
            <div className="hidden md:block bg-blue-50 p-3 rounded-lg"><FileText className="h-8 w-8 text-blue-600" /></div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1"><p className="text-red-700 font-medium">{error}</p><button onClick={() => setError('')} className="mt-2 text-red-600 hover:text-red-800 underline text-sm font-medium">Dismiss</button></div>
          </div>
        )}

        {/* Search, Filters and Add Button */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* Top bar: Search, Departments, Actions */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input type="text" placeholder="Search policies by name, department or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowFilters((s) => !s)} className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                  <FilterIcon className="h-4 w-4" /> Filters {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                  <Plus className="h-5 w-5" />Create New Policy
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <button key={dept} onClick={() => setActiveFilter(dept)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === dept ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {dept === 'all' ? 'All Departments' : dept}
                </button>
              ))}
            </div>

            {/* Active filter chips */}
            {(categoryFilter !== 'all' || roleFilters.length > 0 || hasPdfOnly) && (
              <div className="flex flex-wrap items-center gap-2">
                {categoryFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Category: {categoryFilter}
                    <button onClick={() => setCategoryFilter('all')} className="ml-1 text-purple-700 hover:text-purple-900"><X className="h-3 w-3"/></button>
                  </span>
                )}
                {roleFilters.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Role: {r}
                    <button onClick={() => toggleRoleFilter(r)} className="ml-1 text-green-700 hover:text-green-900"><X className="h-3 w-3"/></button>
                  </span>
                ))}
                {hasPdfOnly && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    With PDF
                    <button onClick={() => setHasPdfOnly(false)} className="ml-1 text-blue-700 hover:text-blue-900"><X className="h-3 w-3"/></button>
                  </span>
                )}
                <button type="button" onClick={clearAllFilters} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700">
                  <XCircle className="h-4 w-4"/> Clear all
                </button>
              </div>
            )}

            {/* Collapsible advanced filters */}
            {showFilters && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><FilterIcon className="h-4 w-4 text-gray-400"/>Category</label>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[44px] bg-white">
                      {availableRoles.map(r => (
                        <button
                          type="button"
                          key={r.level}
                          onClick={() => toggleRoleFilter(r.level)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${roleFilters.includes(r.level) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {r.level}
                        </button>
                      ))}
                      {roleFilters.length === 0 && (
                        <span className="text-sm text-gray-400">Select one or more roles</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={hasPdfOnly} onChange={(e) => setHasPdfOnly(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded"/>
                      Only with PDF
                    </label>
                    <button type="button" onClick={clearAllFilters} className="ml-auto inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                      <XCircle className="h-4 w-4"/> Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Policies List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading && policies.length === 0 ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600 font-medium">Loading policies...</p></div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">{searchTerm || activeFilter !== 'all' ? 'No policies found matching your criteria' : 'No policies have been created yet'}</p>
              <p className="text-gray-400 mt-2 max-w-md mx-auto">{searchTerm || activeFilter !== 'all' ? 'Try adjusting your search or filter' : 'Click the "Create New Policy" button to get started'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category & Roles</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Department & Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedPolicies.map((policy) => (
                    <PolicyListItem key={policy.id} policy={policy} onEdit={openEditModal} onDelete={showDeleteConfirmation} onView={openDetailsModal} onViewPdf={openPdfViewer} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* View More Button */}
          {!loading && hasMorePolicies && (
            <div className="flex justify-center items-center py-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setDisplayLimit(prev => prev + 5)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <span>View More</span>
                <span className="text-sm opacity-90">({filteredPolicies.length - displayLimit} more)</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Modals are now cleaner components */}
        <ConfirmationModal 
          isOpen={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={handleDeletePolicy}
          title="Delete Policy"
          message="Are you sure you want to delete this policy? This action cannot be undone."
        />

        <PolicyFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSave={handleSavePolicy}
          editingPolicy={editingPolicy}
          loading={loading}
          availableRoles={availableRoles}
        />

        <PolicyDetailsModal
          isOpen={!!detailsPolicy}
          onClose={() => setDetailsPolicy(null)}
          policy={detailsPolicy}
        />

        <PdfViewerModal
          isOpen={!!pdfViewerPolicy}
          onClose={() => setPdfViewerPolicy(null)}
          policy={pdfViewerPolicy}
        />
      </div>
    </div>
  );
};

export default PolicyManagement;