import React, { useState, useEffect, useCallback } from 'react';
import { X, Award, Mail, CheckCircle, AlertCircle, User, Calendar, Send } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

// API Service for Appreciation
const APPRECIATION_API = {
  async getToken() {
    return localStorage.getItem('access_token');
  },

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  },

  // Get all employees
  async fetchAllEmployees() {
    return this.request('/user-details/');
  },

  // Get award types
  async fetchAwardTypes() {
    return this.request('/appreciation/awards/types');
  },

  // Create appreciation
  async createAppreciation(appreciationData) {
    return this.request('/appreciation/', {
      method: 'POST',
      body: JSON.stringify(appreciationData)
    });
  },

  // Get employee details by ID
  async fetchEmployeeDetails(userId) {
    return this.request(`/users/${userId}/details`);
  },

  // Send appreciation email
  async sendAppreciationEmail(emailData) {
    return this.request('/appreciation/send-email', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  }
};

const Appreciation = ({ isOpen, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [awardTypes, setAwardTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    award_type: '',
    badge_level: 'bronze',
    appreciation_message: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    year: new Date().getFullYear(),
    send_email: true
  });

  // Get current HR user ID from token
  const getHRUserId = useCallback(() => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || payload.id || payload.sub;
    } catch (error) {
      console.error('Error extracting HR user ID:', error);
      return null;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [employeesData, awardTypesData] = await Promise.all([
        APPRECIATION_API.fetchAllEmployees(),
        APPRECIATION_API.fetchAwardTypes()
      ]);

      // Filter out HR and Admin users, keep only employees
      const filteredEmployees = employeesData.filter(emp => 
        emp.role && emp.role.toLowerCase() === 'employee'
      );

      setEmployees(filteredEmployees);
      setAwardTypes(awardTypesData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const hrUserId = getHRUserId();
      if (!hrUserId) {
        throw new Error('HR user not authenticated');
      }

      // Prepare appreciation data
      const appreciationData = {
        employee_id: parseInt(formData.employee_id),
        given_by_id: hrUserId,
        award_type: formData.award_type,
        badge_level: formData.badge_level,
        appreciation_message: formData.appreciation_message,
        month: formData.month,
        year: formData.year
      };

      // Create appreciation
      const appreciationResponse = await APPRECIATION_API.createAppreciation(appreciationData);

      // Send email if requested
      if (formData.send_email) {
        setSendingEmail(true);
        try {
          const selectedEmployee = employees.find(emp => emp.id === parseInt(formData.employee_id));
          
          const emailData = {
            recipient_email: selectedEmployee.email,
            recipient_name: selectedEmployee.full_name || selectedEmployee.username,
            award_type: formData.award_type,
            badge_level: formData.badge_level,
            appreciation_message: formData.appreciation_message,
            hr_name: hrUserId, // You might want to get actual HR name
            month: formData.month,
            year: formData.year
          };

          await APPRECIATION_API.sendAppreciationEmail(emailData);
        } catch (emailError) {
          console.warn('Email sending failed:', emailError);
          // Don't fail the entire process if email fails
        } finally {
          setSendingEmail(false);
        }
      }

      setSuccess(true);
      
      // Reset form
      setFormData({
        employee_id: '',
        award_type: '',
        badge_level: 'bronze',
        appreciation_message: '',
        month: new Date().toISOString().slice(0, 7),
        year: new Date().getFullYear(),
        send_email: true
      });

      // Call success callback
      if (onSuccess) onSuccess(appreciationResponse);

      // Auto close after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to create appreciation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900">Employee Appreciation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">
                  Appreciation created successfully! {formData.send_email && 'Email sent to employee.'}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee *
            </label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an employee...</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name || employee.username} ({employee.email})
                </option>
              ))}
            </select>
          </div>

          {/* Award Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Award Type *
            </label>
            <select
              name="award_type"
              value={formData.award_type}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select award type...</option>
              {awardTypes.award_types?.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Badge Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Badge Level *
            </label>
            <div className="flex gap-4">
              {awardTypes.badge_levels?.map(level => (
                <label key={level.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="badge_level"
                    value={level.value}
                    checked={formData.badge_level === level.value}
                    onChange={handleInputChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: level.color + '20', 
                      color: level.color,
                      border: `1px solid ${level.color}40`
                    }}
                  >
                    {level.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Appreciation Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appreciation Message *
            </label>
            <textarea
              name="appreciation_message"
              value={formData.appreciation_message}
              onChange={handleInputChange}
              required
              rows={4}
              placeholder="Write a heartfelt message of appreciation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Month and Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month *
              </label>
              <input
                type="month"
                name="month"
                value={formData.month}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year *
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
                min="2020"
                max="2030"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Send Email Option */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              name="send_email"
              checked={formData.send_email}
              onChange={handleInputChange}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-medium text-blue-900">
                Send appreciation email to employee
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || sendingEmail}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : sendingEmail ? (
                <>
                  <Send className="w-4 h-4" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  Create Appreciation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Appreciation;
