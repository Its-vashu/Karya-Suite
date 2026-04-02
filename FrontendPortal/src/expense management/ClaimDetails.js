import React, { useState, useEffect } from 'react';
// import { useUser } from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL

const ClaimDetails = ({ claim, onBack, formatAmount, getStatusColor, getStatusIcon }) => {

  const [claimItems, setClaimItems] = useState([]);
  const [claimDocuments, setClaimDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reimbursementDetails, setReimbursementDetails] = useState(null);
  const [showReimbursementModal, setShowReimbursementModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API Service functions
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

     

      const response = await fetch(`${this.BASE}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || `Error ${response.status}`);
      }
      
      return data;
    },

    async getExpenseItems(claimId) {
      return await this.request(`/api/expense/claims/${claimId}/items?t=${Date.now()}`);
    },

    async getExpenseCategories() {
      return await this.request('/api/expense/categories');
    },

    async getReimbursementDetails(claimId) {
      return await this.request(`/api/expense/reimbursements?claim_id=${claimId}`);
    },

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
    }
  };

  useEffect(() => {
    if (claim?.id) {
      loadClaimDetails();
    }
  }, [claim?.id, loadClaimDetails]);

  const loadClaimDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load categories first
      const categoriesData = await API_SERVICE.getExpenseCategories().catch(() => []);
      //console.log('Loaded categories:', categoriesData);
      
      let items = [];
      items = await API_SERVICE.getExpenseItems(claim.id);
      // console.log('Fetched items with documents:', items);
      // console.log('First item documents:', items[0]?.documents);
      // console.log('First item has_documents:', items[0]?.has_documents);
      
      // Try to load documents, but it's optional
      let documents = [];
      try {
        documents = await API_SERVICE.getClaimDocuments(claim.id);
      } catch (docError) {
        //console.log('No documents found or error loading documents:', docError);
        alert('No documents found or error loading documents:', docError);
      }
      
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setClaimItems(Array.isArray(items) ? items : []);
      setClaimDocuments(Array.isArray(documents) ? documents : []);
    } catch (error) {
      //console.error('Failed to load claim details:', error);
      setError(`Failed to load claim details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId, item = null) => {
    if (item && item.category_name) {
      return item.category_name;
    }
    
    // Fallback to categories lookup
    if (categories.length) {
      const category = categories.find(cat => cat.id === categoryId);
      if (category) return category.category_name;
    }
    
    return `Category ${categoryId}`;
  };

  const getPaymentMethodName = (method) => {
    const methods = {
      'personal_card': 'Personal Card',
      'cash': 'Cash',
      'company_card': 'Company Card',
      'bank_transfer': 'Bank Transfer'
    };
    return methods[method] || method;
  };

  const handleDownloadDocument = async (documentId, filename = null) => {
    try {
      setLoading(true);
      const result = await API_SERVICE.downloadDocument(documentId);
      //console.log(`Document downloaded successfully: ${result.filename}`);
    } catch (error) {
      setError(`Failed to download document: ${error.message}`);
      //console.error('Download error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReimbursementDetails = async (claimId) => {
    try {
      setLoading(true);
      const reimbursementData = await API_SERVICE.getReimbursementDetails(claimId);
      //console.log('Reimbursement details:', reimbursementData);
      setReimbursementDetails(reimbursementData);
      setShowReimbursementModal(true);
    } catch (error) {
      //console.error('Failed to load reimbursement details:', error);
      setError(`Failed to load reimbursement details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!claim) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          No claim selected
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header with Back Button */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 flex border p-2 border-gray-200 bg-gray-100 hover:bg-blue-200 rounded-md items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Claims</span>
          </button>
        </div>
        <h2 className="text-lg font-medium text-gray-900">Claim Details- #{claim.id}</h2>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(claim.status)}`}>
          {getStatusIcon(claim.status)} {claim.status}
        </span>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Claim Information */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">{claim.title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Claim Date</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {new Date(claim.claim_date).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Amount</div>
              <div className="mt-1 text-lg font-semibold text-green-600">
                {formatAmount ? formatAmount(claim.total_amount) : claim.total_amount} {claim.currency || 'INR'}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Submitted</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {claim.submission_date ? 
                  new Date(claim.submission_date).toLocaleDateString('en-IN') : 
                  'Not available'
                }
              </div>
            </div>
            
            {claim.status !== 'pending' && claim.approved_amount && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-700 uppercase tracking-wide">Approved Amount</div>
                <div className="mt-1 text-lg font-semibold text-green-600">
                  {formatAmount ? formatAmount(claim.approved_amount) : claim.approved_amount} {claim.currency || 'INR'}
                </div>
                {claim.approval_date && (
                  <div className="mt-1 text-xs text-green-600">
                    Approved on: {new Date(claim.approval_date).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            )}
          </div>

          {claim.rejection_reason && (
            <div className="mt-6 bg-red-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-red-800 uppercase tracking-wide">Rejection Reason</div>
              <div className="mt-1 text-red-700">{claim.rejection_reason}</div>
            </div>
          )}
        </div>

        {/* Expense Items */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Expense Items ({claimItems.length})</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading items...</p>
            </div>
          ) : claimItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No expense items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {claimItems.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.item_description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryName(item.category_id, item)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.expense_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatAmount ? formatAmount(item.amount) : item.amount}
                        {item.approved_amount && item.approved_amount !== item.amount && (
                          <div className="text-xs text-blue-600">
                            Approved: {formatAmount ? formatAmount(item.approved_amount) : item.approved_amount}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.vendor_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.documents && item.documents.length > 0 ? (
                          <div className="space-y-1">
                            {item.documents.map((doc, docIndex) => (
                              <div key={doc.id || docIndex} className="flex items-center space-x-2 p-2 bg-gray-50 rounded text-xs">
                                <div className="text-sm">
                                  {doc.mime_type?.includes('pdf') ? '📄' : '🖼️'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-800 truncate">{doc.file_name}</div>
                                  <div className="text-xs text-gray-500">
                                    {doc.document_type} • {Math.round(doc.file_size / 1024)} KB
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleDownloadDocument(doc.id, doc.file_name)}
                                    className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded border border-green-300 hover:bg-green-50"
                                    title="Download document"
                                    disabled={loading}
                                  >
                                    📥 Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No documents</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reimbursement Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">💰 Reimbursement Status</h3>
            <button
              onClick={() => handleViewReimbursementDetails(claim.id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
          </div>
          {claim.status === 'rejected' && (
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="text-md text-red-700">
                Your claim has been rejected.
              </div>
            </div>
          )}
          {claim.status === 'pending' && (
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="text-sm text-orange-700">
                Your claim has been submitted and is awaiting approval.
              </div>
            </div>
          )}

          {claim.status === 'approved' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-700">
                This claim has been approved and is ready for reimbursement processing.
              </div>
            </div>
          )}
          
          {claim.status === 'reimbursed' && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-700">
                ✅ This claim has been reimbursed successfully.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Reimbursement Details Modal */}
      {showReimbursementModal && reimbursementDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">💰 Reimbursement Details</h3>
                <button
                  onClick={() => setShowReimbursementModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {Array.isArray(reimbursementDetails) && reimbursementDetails.length > 0 ? (
                <div className="space-y-4">
                  {reimbursementDetails.map((reimbursement, index) => (
                    <div key={reimbursement.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">Reimbursement ID:</span>
                          <span className="ml-2 text-gray-900">#{reimbursement.id}</span>
                        </div>
                        
                        <div>
                          <span className="font-semibold text-gray-700">Amount:</span>
                          <span className="ml-2 text-green-600 font-semibold">
                            {formatAmount ? formatAmount(reimbursement.reimbursement_amount) : reimbursement.reimbursement_amount}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-semibold text-gray-700">Payment Method:</span>
                          <span className="ml-2 text-gray-900">{getPaymentMethodName(reimbursement.payment_method)}</span>
                        </div>
                        
                        <div>
                          <span className="font-semibold text-gray-700">Status:</span>
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reimbursement.status)}`}>
                            {reimbursement.status}
                          </span>
                        </div>
                        
                        {reimbursement.payment_reference && (
                          <div>
                            <span className="font-semibold text-gray-700">Payment Reference:</span>
                            <span className="ml-2 text-gray-900">{reimbursement.payment_reference}</span>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-semibold text-gray-700">Processed Date:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(reimbursement.processed_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {reimbursement.payment_date && (
                          <div>
                            <span className="font-semibold text-gray-700">Payment Date:</span>
                            <span className="ml-2 text-gray-900">
                              {new Date(reimbursement.payment_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        
                        {reimbursement.notes && (
                          <div>
                            <span className="font-semibold text-gray-700">Notes:</span>
                            <span className="ml-2 text-gray-900">{reimbursement.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">💸</div>
                  <p className="text-sm mt-2">This claim may not have been processed for reimbursement yet.</p>
                   <p>Contact Your Manager/HR for more information.</p>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowReimbursementModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimDetails;
