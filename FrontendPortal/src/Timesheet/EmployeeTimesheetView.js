import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, User, Clock, BarChart3, X, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

// Simple toast notification
const showToast = (msg, type = 'info') => {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = `fixed top-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white text-sm transition-all duration-300 ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-indigo-600'}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 2200);
};

const EmployeeTimesheetView = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('weekly'); // Default to weekly
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(true); // Show filters by default
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // all, submitted, missing
  
  // Stats
  const [overallStats, setOverallStats] = useState({
    totalEmployees: 0,
    submittedCount: 0,
    missingCount: 0,
    totalHours: 0
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // 10 rows per page for table view

  // Employee attendance data
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  
  // Date-wise attendance tracking
  const [dateWiseAttendance, setDateWiseAttendance] = useState([]);
  const [showDateWiseView, setShowDateWiseView] = useState(false);

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      
      case '6month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      
      case 'custom':
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
        break;
      
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  // Generate date range for date-wise tracking (excluding weekends)
  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      const dayOfWeek = start.getDay(); // 0 = Sunday, 6 = Saturday
      // Only include weekdays (Monday to Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(new Date(start).toISOString().split('T')[0]);
      }
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  // Fetch employee attendance summary
  const fetchEmployeeAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      // const { startDate, endDate } = getDateRange();
      
      // First get all employees
      const employeesResponse = await fetch(`${API_BASE}/user-details/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const employeesData = await employeesResponse.json();
      const employeeList = Array.isArray(employeesData)
        ? employeesData.filter(emp => {
            const role = (emp.role || '').toLowerCase();
            return role !== 'admin' && role !== 'hr';
          })
        : [];
      
      setEmployees(employeeList);
      
      // Extract unique projects
      const uniqueProjects = [...new Set(employeeList.map(emp => emp.project_name).filter(Boolean))];
      setProjects(uniqueProjects);
      
      // Get timesheet data for all employees
      const attendanceData = [];
      const dateWiseData = [];
      let totalHours = 0;
      let submittedCount = 0;
      
      // Generate expected date range for date-wise tracking
      const { startDate: rangeStart, endDate: rangeEnd } = getDateRange();
      let expectedDates = [];
      if (rangeStart && rangeEnd) {
        expectedDates = generateDateRange(rangeStart, rangeEnd);
      }
      
      for (const emp of employeeList) {
        const empId = emp.id || emp.user_id;
        let url = `${API_BASE}/timesheets/?user_id=${empId}`;
        
        if (rangeStart && rangeEnd) {
          url += `&start_date=${rangeStart}&end_date=${rangeEnd}`;
        }
        
        try {
          const timesheetResponse = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          let timesheetEntries = [];
          if (timesheetResponse.ok) {
            const data = await timesheetResponse.json();
            timesheetEntries = Array.isArray(data) ? data : [];
            
            // Filter by project if selected
            if (projectFilter) {
              timesheetEntries = timesheetEntries.filter(entry => 
                (entry.project_name || '').toLowerCase().includes(projectFilter.toLowerCase())
              );
            }
            
            // Client-side date filtering if needed
            if (dateFilter !== 'all' && dateFilter !== 'custom') {
              const { startDate: filterStart, endDate: filterEnd } = getDateRange();
              if (filterStart && filterEnd) {
                timesheetEntries = timesheetEntries.filter(entry => {
                  const entryDate = entry.sheet_date;
                  return entryDate >= filterStart && entryDate <= filterEnd;
                });
              }
            }
          }
          
          const empHours = timesheetEntries.reduce((sum, entry) => sum + (entry.time_hour || 0), 0);
          const hasSubmitted = timesheetEntries.length > 0;
          
          if (hasSubmitted) {
            submittedCount++;
            totalHours += empHours;
          }
          
          // Create date-wise attendance for this employee
          const empDateWise = {
            id: empId,
            name: emp.full_name || emp.name || emp.username || 'Unknown',
            email: emp.email || 'N/A',
            project: emp.project_name || 'N/A',
            dateWiseStatus: {}
          };
          
          // Mark submitted dates
          timesheetEntries.forEach(entry => {
            empDateWise.dateWiseStatus[entry.sheet_date] = {
              submitted: true,
              hours: entry.time_hour || 0,
              project: entry.project_name || '',
              task: entry.task_name || ''
            };
          });
          
          // Mark missing dates (only for expected date range - weekdays only)
          expectedDates.forEach(date => {
            if (!empDateWise.dateWiseStatus[date]) {
              empDateWise.dateWiseStatus[date] = {
                submitted: false,
                hours: 0,
                project: '',
                task: '',
                date: date
              };
            }
          });
          
          dateWiseData.push(empDateWise);
          
          attendanceData.push({
            id: empId,
            name: emp.full_name || emp.name || emp.username || 'Unknown',
            email: emp.email || 'N/A',
            project: emp.Project_name || 'N/A',
            role: emp.role || 'N/A',
            hasSubmitted,
            totalHours: empHours,
            totalEntries: timesheetEntries.length,
            lastEntry: timesheetEntries.length > 0 
              ? Math.max(...timesheetEntries.map(e => new Date(e.sheet_date).getTime()))
              : null,
            entries: timesheetEntries,
            missingDates: expectedDates.filter(date => !timesheetEntries.some(entry => entry.sheet_date === date)),
            expectedWorkingDays: expectedDates.length
          });
        } catch (error) {
          // console.error(`Error fetching timesheet for employee ${empId}:`, error);
          attendanceData.push({
            id: empId,
            name: emp.full_name || emp.name || emp.username || 'Unknown',
            email: emp.email || 'N/A',
            project: emp.Project_name || 'N/A',
            role: emp.role || 'N/A',
            hasSubmitted: false,
            totalHours: 0,
            totalEntries: 0,
            lastEntry: null,
            entries: []
          });
        }
      }
      
      setEmployeeAttendance(attendanceData);
      setDateWiseAttendance(dateWiseData);
      setOverallStats({
        totalEmployees: employeeList.length,
        submittedCount,
        missingCount: employeeList.length - submittedCount,
        totalHours
      });
      
    } catch (error) {
      // console.error('Error fetching employee attendance:', error);
      showToast('Error loading employee data', 'error');
      setEmployees([]);
      setEmployeeAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when filters change
  useEffect(() => {
    fetchEmployeeAttendance();
  }, [dateFilter, projectFilter, customDateRange]);

  // Filter employees based on search and attendance filter
  useEffect(() => {
    let filtered = employeeAttendance.filter(emp => {
      const name = emp.name.toLowerCase();
      const email = emp.email.toLowerCase();
      const project = emp.project.toLowerCase();
      const id = String(emp.id).toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = name.includes(search) || 
                           email.includes(search) || 
                           project.includes(search) || 
                           id.includes(search);
      
      const matchesAttendance = attendanceFilter === 'all' || 
                               (attendanceFilter === 'submitted' && emp.hasSubmitted) ||
                               (attendanceFilter === 'missing' && !emp.hasSubmitted);
      
      return matchesSearch && matchesAttendance;
    });
    
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, employeeAttendance, attendanceFilter]);

  // View employee timesheet details
  const viewEmployeeDetails = (emp) => {
    setSelectedUserId(emp.id);
    setSelectedUserName(emp.name);
    setEntries(emp.entries);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedUserId('');
    setSelectedUserName('');
    setEntries([]);
  };

  // Export attendance summary to CSV
  const exportAttendanceCSV = () => {
    if (filteredEmployees.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    
    try {
      const { startDate, endDate } = getDateRange();
      const headers = ['Employee ID', 'Name', 'Email', 'Project', 'Status', 'Total Hours', 'Total Entries', 'Last Submission'];
      const csvData = [
        headers.join(','),
        ...filteredEmployees.map(emp => [
          emp.id,
          `"${emp.name}"`,
          `"${emp.email}"`,
          `"${emp.project}"`,
          emp.hasSubmitted ? 'Submitted' : 'Missing',
          emp.totalHours,
          emp.totalEntries,
          emp.lastEntry ? new Date(emp.lastEntry).toLocaleDateString('en-GB') : 'Never'
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_summary_${startDate || 'all'}_to_${endDate || 'now'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Attendance summary exported successfully', 'success');
    } catch {
      showToast('Failed to export CSV', 'error');
    }
  };

  // Export individual timesheet to CSV
  const exportTimesheetCSV = () => {
    if (entries.length === 0) {
      showToast('No timesheet entries to export', 'error');
      return;
    }
    try {
      const headers = ['Date', 'Project', 'Task', 'Hours', 'Description'];
      const csvData = [
        headers.join(','),
        ...entries.map(entry => [
          entry.sheet_date || '',
          `"${entry.project_name || ''}"`,
          `"${entry.task_name || ''}"`,
          entry.time_hour || 0,
          `"${entry.task_description || ''}"`
        ].join(','))
      ].join('\n');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedUserName}_timesheet_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Timesheet exported successfully', 'success');
    } catch {
      showToast('Failed to export CSV', 'error');
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  // Pagination logic
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.ceil(totalEmployees / pageSize);
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-blue-200 rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-500 p-3 rounded-full">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Employee Timesheet Dashboard</h2>
            <p className="text-gray-700">Monitor employee timesheet submissions and attendance</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={() => setShowDateWiseView(!showDateWiseView)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>{showDateWiseView ? 'Summary View' : 'Date-wise View'}</span>
          </button>
          <button
            onClick={exportAttendanceCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Summary</span>
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{overallStats.totalEmployees}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{overallStats.submittedCount}</div>
              <div className="text-sm text-gray-600">Timesheet Submitted</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{overallStats.missingCount}</div>
              <div className="text-sm text-gray-600">Missing Submissions</div>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-purple-600">{overallStats.totalHours.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Total Hours Logged</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium text-gray-800 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="quarterly">This Quarter</option>
                <option value="6month">Last 6 Months</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.project_name} value={project.project_name}>{project.project_name}</option>
                ))}
              </select>
            </div>
            
            {/* Attendance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Status
              </label>
              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Employees</option>
                <option value="submitted">Submitted Only</option>
                <option value="missing">Missing Only</option>
              </select>
            </div>
            
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          
          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Attendance Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading employee attendance data...</div>
        </div>
      ) : showDateWiseView ? (
        // Date-wise Attendance View
        <div className="mb-4 ">
          <h3 className="text-lg  font-semibold text-gray-800 mb-4">Date-wise Attendance Tracking</h3>
          
          {(() => {
            const { startDate, endDate } = getDateRange();
            if (!startDate || !endDate) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-900" />
                  <div className="text-lg font-medium mb-2">Please Select a Date Range</div>
                  <div>Date-wise view requires a specific time period selection</div>
                </div>
              );
            }
            
            const expectedDates = generateDateRange(startDate, endDate);
            const filteredDateWise = dateWiseAttendance.filter(emp => {
              const name = emp.name.toLowerCase();
              const email = emp.email.toLowerCase();
              const project = emp.project.toLowerCase();
              const id = String(emp.id).toLowerCase();
              const search = searchTerm.toLowerCase();
              
              return name.includes(search) || 
                     email.includes(search) || 
                     project.includes(search) || 
                     id.includes(search);
            });
            
            return (
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full  text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Employee
                      </th>
                      {expectedDates.map(date => (
                        <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                          <div>{new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</div>
                          <div className="text-xs text-gray-400">{new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Missing
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDateWise.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((emp) => {
                      const missingDates = expectedDates.filter(date => !emp.dateWiseStatus[date]?.submitted).length;
                      
                      return (
                        <tr key={emp.id} className="hover:bg-blue-50">
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                                <User className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                <div className="text-xs text-gray-500">{emp.project_name}</div>
                              </div>
                            </div>
                          </td>
                          {expectedDates.map(date => {
                            const dayStatus = emp.dateWiseStatus[date];
                            const isSubmitted = dayStatus?.submitted;
                            
                            return (
                              <td key={date} className="px-2 py-3 text-center">
                                <div className="flex flex-col items-center">
                                  {isSubmitted ? (
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center" title={`Submitted: ${dayStatus.hours} hrs`}>
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center" title="Not submitted">
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    </div>
                                  )}
                                  {isSubmitted && (
                                    <div className="text-xs text-gray-500 mt-1">{dayStatus.hours}h</div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              missingDates === 0 
                                ? 'bg-green-100 text-green-800' 
                                : missingDates <= 2 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : ' text-red-800'
                            }`}>
                              {missingDates} Missing
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      ) : (
        // Summary View (existing table)
        <>
          <div className="overflow-x-auto mb-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Submission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                          <div className="text-xs text-gray-400">ID: {emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {emp.project}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.hasSubmitted ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Submitted</span>
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Missing</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">
                      {emp.totalHours.toFixed(1)} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {emp.totalEntries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.lastEntry ? formatDate(new Date(emp.lastEntry)) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewEmployeeDetails(emp)}
                        className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEmployees)} of {totalEmployees} employees
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border ${currentPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
                >Previous</button>
                
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  const pageNum = currentPage <= 3 ? idx + 1 : currentPage - 2 + idx;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded border ${currentPage === pageNum ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
                    >{pageNum}</button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
                >Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Selected Employee Timesheet Details */}
      {selectedUserId && (
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Timesheet Details: {selectedUserName}
            </h3>
            <div className="flex items-center space-x-3">
              {entries.length > 0 && (
                <button
                  onClick={exportTimesheetCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              )}
              <button
                onClick={clearSelection}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {(() => {
            const selectedEmp = employeeAttendance.find(emp => emp.id === selectedUserId);
            if (!selectedEmp) return null;

            return (
              <div className="mb-6">
                {/* Employee Summary */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Working Days</div>
                      <div className="text-2xl font-bold text-blue-600">{selectedEmp.expectedWorkingDays}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Submitted Days</div>
                      <div className="text-2xl font-bold text-green-600">{selectedEmp.totalEntries}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Missing Days</div>
                      <div className="text-2xl font-bold text-red-600">{selectedEmp.missingDates?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Hours</div>
                      <div className="text-2xl font-bold text-purple-600">{selectedEmp.totalHours.toFixed(1)}</div>
                    </div>
                  </div>
                </div>

                {/* Missing Dates Alert */}
                {selectedEmp.missingDates && selectedEmp.missingDates.length > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <h4 className="text-lg font-semibold text-red-800">Missing Timesheet Dates</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {selectedEmp.missingDates.map(date => (
                        <div key={date} className="bg-red-100 px-3 py-2 rounded text-sm text-red-800 font-medium">
                          {formatDate(date)} ({new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })})
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-red-700">
                      <strong>Action Required:</strong> Follow up with employee for missing timesheet submissions on above dates.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium mb-2">No Timesheet Entries</div>
              <div>This employee has not submitted any timesheet entries for the selected period</div>
              {(() => {
                const selectedEmp = employeeAttendance.find(emp => emp.id === selectedUserId);
                return selectedEmp?.missingDates?.length > 0 ? (
                  <div className="mt-4 text-red-600">
                    <strong>{selectedEmp.missingDates.length} working days</strong> without timesheet submission
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => {
                    // Color logic: <8 red, 8-9 amber, >=9 green
                    let colorClass = '';
                    if (entry.time_hour == null || entry.time_hour < 8) {
                      colorClass = 'bg-red-100 text-red-800';
                    } else if (entry.time_hour >= 8 && entry.time_hour < 9) {
                      colorClass = 'bg-yellow-100 text-yellow-800';
                    } else if (entry.time_hour >= 9) {
                      colorClass = 'bg-green-100 text-green-800';
                    }
                    return (
                      <tr key={entry.id || entry._id || Math.random()} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(entry.sheet_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.sheet_date).toLocaleDateString('en-GB', { weekday: 'long' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {entry.project_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.task_name || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold rounded ${colorClass}`}>
                          {entry.time_hour != null ? `${entry.time_hour} hrs` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {entry.task_description || 'No description'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeTimesheetView;