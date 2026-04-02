import React from 'react';


export const ClaimDetailsByHr = ({ 
  selectedClaim, 
  onBack, 
  onApproval, 
  approvalData, 
  setApprovalData, 
  loading, 
  formatCurrency, 
  getStatusColor, 
  getStatusIcon 
}) => {
  
  if (!selectedClaim) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No claim selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ← Back to Claims
            </button>
            <h2 className="text-lg font-medium text-gray-900">
              Claim Details #{selectedClaim.id}
            </h2>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedClaim.status)}`}>
              {getStatusIcon(selectedClaim.status)} {selectedClaim.status?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Claim Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Claim Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Title:</span>
                <p className="text-gray-900 font-semibold">{selectedClaim.title}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Employee username :</span>
                <p className="text-blue-900 font-semibold"> @{selectedClaim.user_email || selectedClaim.employee_name || 'N/A'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                <p className="font-bold text-xl text-green-600">
                  {formatCurrency(selectedClaim.total_amount)}
                </p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600">Claim Date:</span>
                <p className="text-gray-900">
                  {new Date(selectedClaim.claim_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Submitted On :</span>
                <p className="text-gray-900">
                  {new Date(selectedClaim.created_at || selectedClaim.submission_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {(selectedClaim.approved_amount > 0) && (
                  <div className="mt-2 pt-2 border-t border-green-200 bg-green-50 border rounded p-2 w-[200px]">
                    <span className="text-md  font-semibold text-green-900">Approved Amount:</span>
                    <p className="text-green-900 text-lg font-semibold mt-2">{formatCurrency(selectedClaim.approved_amount)}</p>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Expense Items */}
      {selectedClaim.items && selectedClaim.items.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Expense Items ({selectedClaim.items.length})</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClaim.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{item.item_description || item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category_name || item.category || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.expense_date || item.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.documents && item.documents.length > 0 ? (
                          <div className="space-y-1">
                            {item.documents.map((doc, docIndex) => (
                              <div key={doc.id || docIndex} className="flex items-center space-x-2 p-1 bg-gray-50 rounded text-xs">
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
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = `${process.env.REACT_APP_API_BASE_URL}/api/expense/documents/${doc.id}/download`;
                                      link.download = doc.file_name;
                                      link.click();
                                    }}
                                    className="text-green-600 hover:text-green-800 text-xs px-1 py-0.5 rounded border border-green-300 hover:bg-green-50"
                                    title="Download document"
                                  >
                                    Download
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
            
            {/* Total Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedClaim.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Section - Only show if claim is pending */}
      {selectedClaim.status?.toLowerCase() === 'pending' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Approval Decision</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action *</label>
                <select
                  value={approvalData.action}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approve">✅ Approve</option>
                  <option value="reject">❌ Reject</option>
                </select>
              </div>
              
              {approvalData.action === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Approved Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={approvalData.approved_amount}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, approved_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter approved amount"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalData.action === 'approve' ? 'Comments (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={approvalData.comments}
                onChange={(e) => setApprovalData(prev => ({ ...prev, comments: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={approvalData.action === 'approve' ? 'Optional comments...' : 'Please provide reason for rejection...'}
              />
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => onApproval(selectedClaim.id)}
                disabled={loading}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  approvalData.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Processing...' : 
                 approvalData.action === 'approve' ? '✅ Approve Claim' : '❌ Reject Claim'}
              </button>
              
              <button
                onClick={onBack}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval History - Show if claim is approved/rejected/reimbursed */}
      {(selectedClaim.status?.toLowerCase() === 'approved' || 
        selectedClaim.status?.toLowerCase() === 'rejected' || 
        selectedClaim.status?.toLowerCase() === 'reimbursed') && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedClaim.status?.toLowerCase() === 'reimbursed' ? 'Reimbursement Details' : 'Approval History'}
            </h3>
          </div>
          <div className="p-6">
            <div className={`p-4 rounded-lg ${
              selectedClaim.status?.toLowerCase() === 'approved' 
                ? 'bg-green-50 border border-green-200' 
                : selectedClaim.status?.toLowerCase() === 'rejected'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">
                  {selectedClaim.status?.toLowerCase() === 'approved' ? '✅' : 
                   selectedClaim.status?.toLowerCase() === 'rejected' ? '❌' : '💰'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      selectedClaim.status?.toLowerCase() === 'approved' ? 'text-green-800' : 
                      selectedClaim.status?.toLowerCase() === 'rejected' ? 'text-red-800' :
                      'text-blue-800'
                    }`}>
                      Claim {selectedClaim.status?.toLowerCase() === 'approved' ? 'Approved' : 
                              selectedClaim.status?.toLowerCase() === 'rejected' ? 'Rejected' : 'Reimbursed'}
                    </h4>
                    <span className="text-sm text-gray-600">
                      <p className='font-semibold'>{selectedClaim.status?.toUpperCase()} ON :</p>
                      {selectedClaim.approval_date && new Date(selectedClaim.approval_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {/* Show approved/reimbursed amount */}
                  {(selectedClaim.approved_amount || selectedClaim.reimbursed_amount) && (
                    <p className={`font-semibold ${
                      selectedClaim.status?.toLowerCase() === 'reimbursed' ? 'text-blue-700' : 'text-green-700'
                    }`}>
                      {selectedClaim.status?.toLowerCase() === 'reimbursed' ? 'Reimbursed' : 'Approved'} Amount: {' '}
                      {formatCurrency(selectedClaim.reimbursed_amount || selectedClaim.approved_amount)}
                    </p>
                  )}
                  
                  {/* Show reimbursement details for reimbursed claims */}
                  {selectedClaim.status?.toLowerCase() === 'reimbursed' && (
                    <div className="mt-3 space-y-2">
                      {selectedClaim.payment_method && (
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">Payment Method:</span> {selectedClaim.payment_method}
                        </p>
                      )}
                      {selectedClaim.payment_reference && (
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">Payment Reference:</span> {selectedClaim.payment_reference}
                        </p>
                      )}
                      {selectedClaim.payment_date && (
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">Payment Date:</span> {' '}
                          {new Date(selectedClaim.payment_date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                      {selectedClaim.processed_by && (
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">Processed By:</span> {selectedClaim.processed_by}
                        </p>
                      )}
                      {selectedClaim.reimbursement_notes && (
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">Notes:</span> {selectedClaim.reimbursement_notes}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Show approver details for approved/rejected claims */}
                  {selectedClaim.status?.toLowerCase() !== 'reimbursed' && selectedClaim.approver_email && (
                    <p className="text-gray-600 text-sm">
                      {selectedClaim.status?.toLowerCase() === 'approved' ? 'Approved' : 'Rejected'} by: {selectedClaim.approver_email}
                    </p>
                  )}
                  
                  {/* Show comments */}
                  {selectedClaim.approval_comments && (
                    <p className="text-gray-700 text-sm mt-2">
                      <span className="font-medium">Comments:</span> {selectedClaim.approval_comments}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
