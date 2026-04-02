import { dataAPI } from './api';

// Small expense-specific API wrapper to centralize endpoints used by Expense screens
const apiExpense = {
  getCategories: async () => {
    return dataAPI.get('/api/expense/categories');
  },

  getClaims: async (params = {}) => {
    return dataAPI.get('/api/expense/claims', { params });
  },

  getClaimById: async (claimId) => {
    return dataAPI.get(`/api/expense/claims/${claimId}`);
  },

  createClaim: async (payload) => {
    return dataAPI.post('/api/expense/claims', payload);
  },

  bulkCreateExpenseItems: async (claimId, itemsData) => {
    // backend expects shape: { items: [ { ...ExpenseItemCreate } ] }
    const payload = { items: itemsData };
    return dataAPI.post(`/api/expense/claims/${claimId}/items/bulk`, payload);
  },

  createExpenseItem: async (itemData) => {
    return dataAPI.post('/api/expense/items', itemData);
  },

  // Upload document (receipts). Accepts FormData. Uses axios instance via dataAPI to reuse interceptors.
  uploadDocument: async (formData, uploadedBy) => {
    // Backend expects `uploaded_by` as a Form field (see router). Ensure it's present in formData.
    try {
      if (uploadedBy !== undefined && uploadedBy !== null) {
        // Some callers may already append this; avoid duplicate by checking presence
        if (!formData.get || !formData.get('uploaded_by')) {
          formData.append('uploaded_by', String(uploadedBy));
        }
      }
    } catch (e) {
      // If formData is a plain object or doesn't support append/get, ignore and fall back to sending as-is
    }

    // Use canonical endpoint and multipart headers so axios can handle the upload and token refresh
    return dataAPI.post('/api/expense/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

export default apiExpense;
