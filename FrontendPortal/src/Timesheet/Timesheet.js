import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeTimesheetView from './EmployeeTimesheetView';
import { Calendar, ChevronLeft, ChevronRight,ArrowLeft  } from 'lucide-react';
import {useUser} from '../context/UserContext'
const API_BASE = process.env.REACT_APP_API_BASE_URL;

const TimesheetApp = () => {
  // Role-based view for HR/Admin
  const { role, user_id } = useUser();
  console.log({ role, user_id });

  const userRole = role;
  const [showEmployeeView, setShowEmployeeView] = useState(false);
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [projectInfo, setProjectInfo] = useState({
    project_name: '',
    project_start: '',
    project_end: ''
  });
  
  // Helper to get today's date in DD/MM/YYYY
  const getTodayDDMMYYYY = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [newEntry, setNewEntry] = useState({
    date: getTodayDDMMYYYY(),
    startDate: '',
    endDate: '',
    project: '',
    task: '',
    description: '',
    hours: 0
  });

  // Calendar states - only for date field
  const [showCalendar, setShowCalendar] = useState({
    date: false,
    startDate: false,
    endDate: false
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // useEffect to fetch project info and timesheet entries
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (user_id) {
      fetch(`${API_BASE}/project/user/${user_id}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          console.log("User data received:", data);
          
          // Backend returns array, take first element
          const projectData = Array.isArray(data) && data.length > 0 ? data[0] : data;
          
          console.log("Project Data:", projectData);
          console.log("Project Start Date:", projectData.project_start_date);
          console.log("Project End Date:", projectData.project_end_date);
          
          setProjectInfo({
            project_name: projectData.project_name || '',
            project_start: projectData.start_date || '',
            project_end: projectData.end_date || '',
            description: projectData.project_description || ''
          });
        })
        .catch(err => console.error("Error fetching project info:", err));
    }
  }, [user_id]);

  // Fetch timesheet entries for the user
  useEffect(() => {
    const token = localStorage.getItem("access_token");
   
    if (user_id) {
      fetch(`${API_BASE}/timesheets/?user_id=${user_id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          console.log("Timesheet entries received:", data);
          const formattedEntries = data.map(entry => ({
            id: entry.id,
            date: entry.sheet_date,
            project: entry.project_name,
            task: entry.task_name,
            hours: entry.time_hour,
            description: entry.task_description || ''
          }));
          setEntries(formattedEntries);
        })
        .catch(err => console.error("Error fetching timesheets:", err));
    }
  }, [user_id]);

  // Helper: get start and end of current week (Monday-Sunday)
  const getWeekRange = (date = new Date()) => {
    const day = date.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return { monday, sunday };
  };

  // Only allow date input within current week
  const handleDateInputChange = (e, fieldName) => {
    const { value } = e.target;
    let cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 2 && cleanValue.length < 4) {
      cleanValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
    } else if (cleanValue.length >= 4) {
      cleanValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4) + '/' + cleanValue.slice(4, 8);
    }
    // Validate if date is in current week
    if (cleanValue.length === 10) {
      const [dd, mm, yyyy] = cleanValue.split('/');
      const inputDate = new Date(`${yyyy}-${mm}-${dd}`);
      const { monday, sunday } = getWeekRange();
      if (inputDate < monday || inputDate > sunday) {
        alert('Please select a date within the current week (Monday to Sunday).');
        return;
      }
    }
    setNewEntry(prev => ({
      ...prev,
      [fieldName]: cleanValue
    }));
  };

  // Handle calendar date selection (limit to current week)
  const handleCalendarDateSelect = (date, field) => {
    const { monday, sunday } = getWeekRange();
    if (date < monday || date > sunday) {
      alert('Please select a date within the current week (Monday to Sunday).');
      return;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    setNewEntry(prev => ({
      ...prev,
      [field]: formattedDate
    }));
    setShowCalendar(prev => ({
      ...prev,
      [field]: false
    }));
  };

  // Navigate calendar months
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Calendar component (disable days outside current week)
  const CalendarComponent = ({ field }) => {
    const days = generateCalendarDays();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const { monday, sunday } = getWeekRange();
    return (
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 w-80">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const isInWeek = date >= monday && date <= sunday;
            return (
              <button
                key={index}
                type="button"
                onClick={() => isInWeek && handleCalendarDateSelect(date, field)}
                className={`p-2 text-sm rounded ${
                  isInWeek ? 'hover:bg-blue-100 cursor-pointer' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                } ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${isToday ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
                disabled={!isInWeek}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for API
  const convertToApiFormat = (ddmmyyyy) => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
    const [day, month, year] = ddmmyyyy.split('/');
    return `${year}-${month}-${day}`;
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const convertFromApiFormat = (yyyymmdd) => {
    if (!yyyymmdd) return '';
    try {
      // Handle different date formats
      if (yyyymmdd.includes('T')) {
        // ISO format like "2025-11-11T00:00:00"
        yyyymmdd = yyyymmdd.split('T')[0];
      }
      const [year, month, day] = yyyymmdd.split('-');
      if (!year || !month || !day) return '';
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date conversion error:', error);
      return '';
    }
  };

  // Calculate total hours for all entries
  const getTotalHours = () => {
    return entries.reduce((total, entry) => {
      return total + (entry.hours || 0);
    }, 0);
  };

  // Add new entry
  const handleAddEntry = () => {
    const token = localStorage.getItem("access_token");

    let user_id = null;
    if (token) {
      try {
        const base64Payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(base64Payload));
        user_id = decodedPayload.user_id;
      } catch (err) {
        console.error("Invalid token", err);
        return;
      }
    }

    const payload = {
      user_id: user_id,
      sheet_date: convertToApiFormat(newEntry.date),
      project_name: projectInfo.project_name,

      task_name: newEntry.task,
      time_hour: newEntry.hours,
      task_description: newEntry.description
    };

    fetch(`${API_BASE}/timesheets/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        const addedEntry = {
          id: data.id,
          date: data.sheet_date,
          project: data.project_name,
          task: data.task_name,
          hours: data.time_hour,
          description: data.task_description || ''
        };
        setEntries([...entries, addedEntry]);
        setNewEntry({
          date: '',
          startDate: '',
          endDate: '',
          project: "",
          task: "",
          description: "",
          hours: 0
        });
        setIsAddingEntry(false);
      })
      .catch((err) => console.error("Error adding timesheet:", err));
  };

  // Delete entry
  const handleDeleteEntry = (id) => {
    const token = localStorage.getItem("access_token");
    
    // Find the entry to check its date
    const entryToDelete = entries.find(entry => entry.id === id);
    
    // Prevent deletion if entry is older than 24 hours
    if (entryToDelete && isEntryOlderThan24Hours(entryToDelete.date)) {
      alert("Entries older than 24 hours cannot be deleted.");
      return;
    }

    fetch(`${API_BASE}/timesheets/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        if (res.ok) {
          setEntries(entries.filter(entry => entry.id !== id));
        } else {
          console.error("Failed to delete entry");
        }
      })
      .catch((err) => console.error("Error deleting entry:", err));
  };

  // Start editing
  const startEditing = (entry) => {
    // Prevent editing if entry is older than 24 hours
    if (isEntryOlderThan24Hours(entry.date)) {
      alert("Entries older than 24 hours cannot be edited.");
      return;
    }
    
    setEditingId(entry.id);
    setNewEntry({
      ...entry,
      date: convertFromApiFormat(entry.date),
      startDate: '',
      endDate: ''
    });
  };

  // Save edit
  const saveEdit = () => {
    const token = localStorage.getItem("access_token");

    let user_id = null;
    if (token) {
      try {
        const base64Payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(base64Payload));
        user_id = decodedPayload.user_id;
      } catch (err) {
        console.error("Invalid token", err);
        return;
      }
    }

    const payload = {
      user_id: user_id,
      sheet_date: convertToApiFormat(newEntry.date),
      project_name: projectInfo.project_name,
      task_name: newEntry.task,
      time_hour: newEntry.hours,
      task_description: newEntry.description || ''
    };

    fetch(`${API_BASE}/timesheets/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        const updatedEntry = {
          id: data.id,
          date: data.sheet_date,
          project: data.project_name,
          task: data.task_name,
          hours: data.time_hour,
          description: newEntry.description || ''
        };
        setEntries(entries.map(entry =>
          entry.id === editingId ? updatedEntry : entry
        ));
        setEditingId(null);
        setNewEntry({
          date: '',
          startDate: '',
          endDate: '',
          project: '',
          task: '',
          description: '',
          hours: 0
        });
      })
      .catch(err => console.error("Error updating timesheet:", err));
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingEntry(false);
    setNewEntry({
      date: '',
      startDate: '',
      endDate: '',
      project: '',
      task: '',
      description: '',
      hours: 0
    });
  };

  // Check if entry is older than 24 hours
  const isEntryOlderThan24Hours = (dateStr) => {
    if (!dateStr) return false;
    
    // Parse the API format (YYYY-MM-DD)
    const [year, month, day] = dateStr.split('-');
    const entryDate = new Date(year, month - 1, day);
    
    // Set entry date to end of day (23:59:59)
    entryDate.setHours(23, 59, 59, 999);
    
    const currentDate = new Date();
    
    // Calculate difference in milliseconds
    const diffTime = currentDate - entryDate;
    const diffHours = diffTime / (1000 * 60 * 60);
    
    return diffHours > 24;
  };

  return (
    <div className="min-h-screen bg-blue-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="px-2 py-2 mt-1 text-gray-600 rounded-lg  hover:text-gray-600 hover:bg-gray-300"
                >
                <ArrowLeft />
              </button>
              <div className="bg-blue-500 p-3 rounded-full">
                <span className="text-white text-2xl">⏰</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Timesheet</h1>
                <p className="text-green-700">Track your working hours</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {getTotalHours().toFixed(2)} hrs
              </div>
              <p className="text-gray-600">Total Hours</p>
            </div>
          </div>
        </div>


        {/* Add Entry Button & HR/Admin Employee View Button */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          {!((userRole === 'hr' || userRole === 'admin') && showEmployeeView) && (
            <button
              onClick={() => setIsAddingEntry(true)}
              className="bg-white hover:bg-blue-200 text-black px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <span className="text-lg">➕</span>
              <span>Add Time Entry</span>
            </button>
          )}
          {(userRole === 'hr' || userRole === 'admin') && (
            <button
              onClick={() => setShowEmployeeView(v => !v)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <span>{showEmployeeView ? <ArrowLeft /> : '👥 View Employee Timesheets'}</span>
            </button>
          )}
        </div>
        {/* Employee Timesheet View for HR/Admin */}
        {(userRole === 'hr' || userRole === 'admin') && showEmployeeView ? (
          <EmployeeTimesheetView />
        ) : (
          <>
            {/* Add/Edit Entry Form */}
            {(isAddingEntry || editingId) && (
          <div className="bg-blue-50 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Edit Entry' : 'Add New Entry'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Date Field - with calendar */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newEntry.date}
                    onChange={(e) => handleDateInputChange(e, 'date')}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalendar(prev => ({ ...prev, date: !prev.date }))}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <Calendar size={20} />
                  </button>
                </div>
                {showCalendar.date && <CalendarComponent field="date" />}
              </div>

              {/* Project Start Date - readonly, no calendar */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-green-400 to-blue-400 text-white mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5-5 5 5" />
                    </svg>
                  </span>
                  Project Start Date
                </label>
                <input
                  type="text"
                  value={convertFromApiFormat(projectInfo.project_start) || 'Not set'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  readOnly
                  placeholder="Not set"
                />
              </div>

              {/* Project End Date - readonly, no calendar */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 text-white mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12l-5 5-5-5" />
                    </svg>
                  </span>
                  Project End Date
                </label>
                <input
                  type="text"
                  value={convertFromApiFormat(projectInfo.project_end) || 'Not set'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  readOnly
                  placeholder="Not set"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📋 Project</label>
                <input
                  type="text"
                  value={projectInfo.project_name || 'Not assigned'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  readOnly
                  placeholder="Not assigned"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📝 Task</label>
                <input
                  type="text"
                  value={newEntry.task}
                  onChange={(e) => setNewEntry({...newEntry, task: e.target.value})}
                  placeholder="Task name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">⏱️ Hours</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="24"
                  value={newEntry.hours}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewEntry({
                      ...newEntry,
                      hours: value === '' ? '' : parseFloat(value)
                    });
                  }}
                  placeholder="Enter hours"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">📄 Description</label>
              <textarea
                value={newEntry.description}
                onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                placeholder="Task description (optional)"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingId ? saveEdit : handleAddEntry}
                disabled={!projectInfo.project_name || !newEntry.date || !newEntry.task || !newEntry.hours || newEntry.hours <= 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
              >
                <span>💾</span>
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
              <button
                onClick={cancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
              >
                <span>❌</span>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

            {/* Entries List */}
            <div className="bg-blue-50 rounded-lg  overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Time Entries</h2>
              </div>
              {entries.length === 0 ? (
                <div className="p-8 text-center text-blue-500">
                  <div className="text-6xl mb-4">⏰</div>
                  <p>No time entries yet. Add your first entry above!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-black bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className=" divide-y divide-gray-200 bg-blue-300">
                      {entries.map((entry) => (
                        <tr key={entry.id} className={`hover:bg-gray-50 ${
                          isEntryOlderThan24Hours(entry.date) ? "bg-blue-50" : ""
                        }`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {convertFromApiFormat(entry.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="bg-white text-black px-2 py-1 rounded-full text-xs font-medium">
                              {entry.project}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>{entry.task}</div>
                            {entry.description && (
                              <div className="text-xs text-gray-500 mt-1">{entry.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                            {entry.hours} hrs
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {isEntryOlderThan24Hours(entry.date) ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Editable
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditing(entry)}
                                disabled={isEntryOlderThan24Hours(entry.date)}
                                className={`group flex items-center justify-center w-9 h-9 rounded-full bg-white ${
                                  isEntryOlderThan24Hours(entry.date)
                                    ? "cursor-not-allowed opacity-50 bg-gray-100"
                                    : "hover:bg-blue-50"
                                } transition-all duration-150 focus:outline-none shadow-sm`}
                                title={isEntryOlderThan24Hours(entry.date) ? "Cannot edit entries older than 24 hours" : "Edit Entry"}
                                aria-label={isEntryOlderThan24Hours(entry.date) ? "Cannot edit entries older than 24 hours" : "Edit Entry"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                                  isEntryOlderThan24Hours(entry.date)
                                    ? "text-gray-400"
                                    : "text-blue-600 group-hover:text-blue-800"
                                } transition-colors duration-150`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                disabled={isEntryOlderThan24Hours(entry.date)}
                                className={`group flex items-center justify-center w-9 h-9 rounded-full bg-white ${
                                  isEntryOlderThan24Hours(entry.date)
                                    ? "cursor-not-allowed opacity-50 bg-gray-100"
                                    : "hover:bg-red-50"
                                } transition-all duration-150 focus:outline-none shadow-sm`}
                                title={isEntryOlderThan24Hours(entry.date) ? "Cannot delete entries older than 24 hours" : "Delete Entry"}
                                aria-label={isEntryOlderThan24Hours(entry.date) ? "Cannot delete entries older than 24 hours" : "Delete Entry"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                                  isEntryOlderThan24Hours(entry.date)
                                    ? "text-gray-400"
                                    : "text-red-500 group-hover:text-red-700"
                                } transition-colors duration-150`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{display:'block'}}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6m4-6v6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Summary */}
            {entries.length > 0 && (
              <div className="mt-6 bg-blue-300 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Monthly Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
                    <div className="text-gray-600">Total Entries</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{getTotalHours().toFixed(2)}</div>
                    <div className="text-gray-600">Total Hours</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {entries.length > 0 ? (getTotalHours() / entries.length).toFixed(2) : '0.00'}
                    </div>
                    <div className="text-gray-600">Avg Hours/Days</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TimesheetApp;