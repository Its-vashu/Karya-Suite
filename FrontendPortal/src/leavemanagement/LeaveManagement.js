import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, AlertCircle, CheckCircle,Trash2, ArrowLeft } from 'lucide-react';
import {useNavigate} from 'react-router-dom'
import { useUser } from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const LEAVE_TYPES = {
  "Casual": { total: 12, color: "bg-blue-100 text-blue-800" },
  "Sick": { total: 10, color: "bg-red-100 text-red-800" },
  "Earned": { total: 18, color: "bg-green-100 text-green-800" },
  "Maternity": { total: 90, color: "bg-purple-100 text-purple-800" },
  "Paternity": { total: 15, color: "bg-indigo-100 text-indigo-800" },
  "Marriage": { total: 7, color: "bg-pink-100 text-pink-800" },
  "Bereavement": { total: 5, color: "bg-gray-100 text-gray-800" }
};


const LeaveManagement = () => {

  const { user_id, username } = useUser();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ type: 'Casual', from: '', to: '', reason: '' });
  const [leaveBalances, setLeaveBalances] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Calendar states
  const [showCalendar, setShowCalendar] = useState({
    from: false,
    to: false
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Please login first!');
      return;
    }

    fetchLeaveHistory();
    fetchLeaveBalances();

  }, [user_id]);

  // API Helper function with error handling
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('username');
          setError('Session expired. Please login again.');
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      // console.error('API Error:', err);
      throw err;
    }
  };

  const fetchLeaveHistory = async () => {
    setLoading(true);
    try {
      const data = await apiCall(`${API_BASE}/leave-applications/?user_id=${user_id}`);
      
      if (data) {
        // Map applied_on to applied_date from backend
        const formattedLeaves = data.map(leave => ({
          ...leave,
          start_date: formatDateForDisplay(leave.start_date),
          end_date: formatDateForDisplay(leave.end_date),
          applied_on: leave.applied_date // use applied_date for delete logic
        }));
        setLeaves(formattedLeaves);
      }
    } catch (error) {
      // console.error("Error fetching leave history:", error);
      setError('Failed to fetch leave history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalances = async () => {
    try {

      const data = await apiCall(`${API_BASE}/leave-applications/?user_id=${user_id}`);
      
      if (data) {
        const balances = { ...LEAVE_TYPES };
        // Reset used days to zero before calculation
        Object.keys(balances).forEach(type => {
          balances[type].used = 0;
        });

        // Calculate used leaves (use API dates, not formatted)
        data.forEach(leave => {
          // Count both Approved and Pending leaves as used (case-insensitive)
          if (
            leave.status &&
            (leave.status.toLowerCase() === 'approved' || leave.status.toLowerCase() === 'pending')
          ) {
            const days = calculateDaysAPI(leave.start_date, leave.end_date);
            const leaveType = leave.leave_type;
            if (balances[leaveType]) {
              balances[leaveType].used += days;
            }
          }
        });
        setLeaveBalances(balances);
      }
    } catch (error) {
      // console.error("Error calculating leave balances:", error);
      // Set default balances if API fails
      const defaultBalances = {};
      Object.keys(LEAVE_TYPES).forEach(type => {
        defaultBalances[type] = { ...LEAVE_TYPES[type], used: 0 };
      });
      setLeaveBalances(defaultBalances);
    }
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';    // Try to parse as YYYY-MM-DD or DD/MM/YYYY
    let day, month, year;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Format: YYYY-MM-DD
      [year, month, day] = dateStr.split('-');
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      // Format: DD/MM/YYYY
      [day, month, year] = dateStr.split('/');
    } else {
      // Fallback to JS Date
      const date = new Date(dateStr);
      day = String(date.getDate()).padStart(2, '0');
      month = String(date.getMonth() + 1).padStart(2, '0');
      year = date.getFullYear();
    }
    return `${day}/${month}/${year}`;
  };

  const formatDateForAPI = (dateStr) => {
    if (!dateStr) return '';
    const [dd, mm, yyyy] = dateStr.split('/');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    };

    const from = parseDate(fromDate);
    const to = parseDate(toDate);
    const diffTime = to - from;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateDaysAPI = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = to - from;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const validateLeave = (type, fromDate, toDate) => {
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    };

    const from = parseDate(fromDate);
    const to = parseDate(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return { valid: false, message: "Please enter valid dates in DD/MM/YYYY format." };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from < today) {
      return { valid: false, message: "Start date cannot be in the past." };
    }

    if (to < from) {
      return { valid: false, message: "End date must be after or equal to start date." };
    }

    const requestedDays = calculateDays(fromDate, toDate);
    const balance = leaveBalances[type];
    
    if (balance) {
      const availableDays = balance.total - (balance.used || 0);

      if (requestedDays > availableDays) {
        return {
          valid: false,
          message: `Insufficient ${type} leave balance. You have ${availableDays} days available, but requested ${requestedDays} days.`
        };
      }
    }

    if (requestedDays > 30 && type !== 'Maternity') {
      return { valid: false, message: `Cannot apply for more than 30 continuous days of ${type} leave.` };
    }

    return { valid: true, days: requestedDays };
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length >= 2 && cleanValue.length < 4) {
      cleanValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
    } else if (cleanValue.length >= 4) {
      cleanValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4) + '/' + cleanValue.slice(4, 8);
    }
    
    handleChange({
      target: { name, value: cleanValue }
    });
  };

  const handleDateSelect = (date, fieldName) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    handleChange({
      target: { name: fieldName, value: formattedDate }
    });
    
    setShowCalendar(prev => ({
      ...prev,
      [fieldName]: false
    }));
  };

  const toggleCalendar = (fieldName) => {
    setShowCalendar(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName],
      ...(fieldName === 'from' ? { to: false } : { from: false })
    }));
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0); // removed unused variable
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const dates = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!datePattern.test(form.from) || !datePattern.test(form.to)) {
      setError('Please enter dates in DD/MM/YYYY format');
      setSubmitting(false);
      return;
    }

    const validation = validateLeave(form.type, form.from, form.to);
    if (!validation.valid) {
      setError(validation.message);
      setSubmitting(false);
      return;
    }

    const payload = {
      user_id: user_id,
      employee_name: username,
      leave_type: form.type,
      start_date: formatDateForAPI(form.from),
      end_date: formatDateForAPI(form.to),
      reason: form.reason,
      status: 'Pending'
    };

    try {
      const data = await apiCall(`${API_BASE}/leave-applications/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data) {
        setSuccess(`Leave applied successfully! ${validation.days} days of ${form.type} leave requested.`);
        await fetchLeaveHistory();
        await fetchLeaveBalances();
        setForm({ type: 'Casual', from: '', to: '', reason: '' });
      }
    } catch (err) {
      // console.error("Apply leave error:", err);
      setError('Failed to apply leave. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canDeleteLeave = (leave) => {
    // console.log('DEBUG leave:', leave);
    if (!leave.status || leave.status.toLowerCase() !== 'pending') return false;
    if (!leave.applied_on) return false;
    let appliedDate;
    if (typeof leave.applied_on === 'number') {
      appliedDate = new Date(leave.applied_on);
    } else if (typeof leave.applied_on === 'string') {
      appliedDate = new Date(leave.applied_on);
      if (isNaN(appliedDate.getTime())) {
        const match = leave.applied_on.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          appliedDate = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
    const now = new Date();
    const hoursDiff = (now - appliedDate) / (1000 * 60 * 60);
    // console.log('DEBUG applied_on:', leave.applied_on, 'hoursDiff:', hoursDiff);
    return hoursDiff <= 24 && hoursDiff >= 0;
  };

  const handleDeleteLeave = async (leaveToDelete) => {
    if (!canDeleteLeave(leaveToDelete)) {
      setError('Cannot delete this leave. Only pending leaves can be deleted within 24 hours of application.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this leave application?')) {
      try {
        // Use correct API URL and method for FastAPI backend
        const response = await fetch(`${API_BASE}/leave-applications/${leaveToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            setError('Session expired. Please login again.');
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }
        setSuccess('Leave application deleted successfully!');
        await fetchLeaveHistory();
        await fetchLeaveBalances();
      } catch (err) {
        // console.error("Delete failed:", err);
        setError('Failed to delete leave application.');
      }
    }
  };

  // Removed unused getStatusIcon function

  return (
    <div className="max-w-full px-4 py-2 bg-blue-900">
      <div className='flex justify-start items-center gap-1 ml-7 mb-2'>
        <button
          onClick={() => navigate(-1)}
          className="px-2 py-2  text-gray-100 rounded-lg hover:text-gray-600 hover:bg-gray-300 transition-colors"
        >
          <ArrowLeft />
      </button>

      <div className="m-2">
        <h1 className="text-3xl font-bold text-white">Leave Management System</h1>
        <p className="text-white">Apply for leave and track your applications</p>
      </div>

      </div>
      

      {/* Leave Balance Overview */}
      <div className="my-2 ml-8 mr-8 px-5 py-4 bg-blue-100 rounded-lg  border-gray-300 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-black">Leave Balance Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(leaveBalances).map(([type, balance]) => (
            <div key={type} className="bg-blue-200 p-4 rounded-lg border border-gray-500">
              <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${LEAVE_TYPES[type]?.color || 'bg-gray-100 text-gray-800'}`}>
                {type}
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {(balance.total || 0) - (balance.used || 0)}/{balance.total || 0}
              </p>
              <p className="text-xs text-black">Available/Total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
          <CheckCircle size={20} className="mr-2 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Leave Application Form */}
      <div className="bg-blue-100 p-6 rounded-lg m-8">
        <h2 className="text-xl font-semibold mb-4 text-black">Apply for Leave</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Leave Type</label>
              <select 
                name="type" 
                value={form.type} 
                onChange={handleChange} 
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                {Object.keys(LEAVE_TYPES).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">Available Days</label>
              <div className="border border-gray-300 p-3 rounded-lg bg-white font-medium text-green-600">
                {leaveBalances[form.type] ? 
                  `${(leaveBalances[form.type].total || 0) - (leaveBalances[form.type].used || 0)} days` : 
                  'Loading...'
                }
              </div>
            </div>

            {/* From Date with Calendar */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2">From Date</label>
              <div className="relative">
                <input
                  type="text"
                  name="from"
                  value={form.from}
                  onChange={handleInputChange}
                  placeholder="DD/MM/YYYY"
                  maxLength="10"
                  className="border border-gray-300 p-3 pr-12 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleCalendar('from')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2  hover:text-blue-500 transition-colors"
                >
                  <Calendar size={20} />
                </button>
              </div>
              
              {showCalendar.from && (
                <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => navigateMonth(-1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-semibold text-gray-800">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigateMonth(1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendar().map((date, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDateSelect(date, 'from')}
                        className={`
                          p-2 text-sm rounded-lg hover:bg-blue-100 transition-colors
                          ${!isCurrentMonth(date) ? 'text-gray-300' : 'text-gray-700'}
                          ${isToday(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* To Date with Calendar */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2">To Date</label>
              <div className="relative">
                <input
                  type="text"
                  name="to"
                  value={form.to}
                  onChange={handleInputChange}
                  placeholder="DD/MM/YYYY"
                  maxLength="10"
                  className="border border-gray-300 p-3 pr-12 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleCalendar('to')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Calendar size={20} />
                </button>
              </div>
              
              {showCalendar.to && (
                <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => navigateMonth(-1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-semibold text-gray-800">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigateMonth(1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendar().map((date, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDateSelect(date, 'to')}
                        className={`
                          p-2 text-sm rounded-lg hover:bg-blue-100 transition-colors
                          ${!isCurrentMonth(date) ? 'text-gray-300' : 'text-gray-700'}
                          ${isToday(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Reason for Leave
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="reason"
                placeholder="Please provide a reason for your leave"
                value={form.reason}
                onChange={handleChange}
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {form.from && form.to && (
            <div className="mb-6 p-3 max-w-[180px] bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <span className="font-medium text-black">Requested Days: </span>
                  <span className="text-xl font-bold text-blue-600">{calculateDays(form.from, form.to)}</span>
                </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin mr-2" />
                Applying Leave...
              </>
            ) : (
              'Apply Leave'
            )}
          </button>
        </form>
      </div>

      {/* Leave History */}
      <div className='m-8 bg-blue-100 p-6 rounded-lg'>
        <div className=" flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Leave History</h2>
          {loading && <Loader2 size={20} className="animate-spin text-blue-600" />}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-200">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Leave ID</th>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium  uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      {loading ? 'Loading leave history...' : 'No leave applications found'}
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-blue-300 transition-colors text-center">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{leave.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${LEAVE_TYPES[leave.leave_type]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {leave.leave_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                      <div className="text-sm font-medium text-gray-900">{formatDateForDisplay(leave.start_date)}</div>
                      <div className="text-xs text-gray-900">to</div>
                      <div className="text-sm font-medium text-gray-900">{formatDateForDisplay(leave.end_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                      {calculateDays(leave.start_date, leave.end_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs text-center">
                      {leave.reason}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (leave.status && leave.status.toLowerCase() === 'approved')
                            ? 'bg-white border-2 border-blue-600 text-blue-700 font-bold'
                            : (leave.status && leave.status.toLowerCase() === 'pending')
                              ? 'bg-yellow-50 border border-yellow-400 text-yellow-700 font-semibold'
                              : 'bg-gray-100 border border-gray-300 text-gray-800'
                        }`}
                      >
                        {leave.status && leave.status.toLowerCase() === 'approved' && <span className="mr-1">✔️</span>}
                        {leave.status && leave.status.toLowerCase() === 'pending' && <span className="mr-1">⏳</span>}
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      <button
                        className={`inline-flex items-center justify-center rounded-full p-2 transition-colors ${canDeleteLeave(leave) ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        onClick={() => handleDeleteLeave(leave)}
                        disabled={!canDeleteLeave(leave)}
                        title={canDeleteLeave(leave) ? 'Delete this leave application' : 'Can only delete pending leaves within 24 hours'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaveManagement;