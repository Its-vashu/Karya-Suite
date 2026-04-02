/**
 * Timesheet Component for Employee
 * @format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Image,
  Dimensions,
  Keyboard,
  Modal,
  FlatList
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import api from './api'; // CORRECT: Import the central api instance
import { CalendarModal } from './Calendar';
import { useTheme } from './theme/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

// Get device notch and bottom safe area
const STATUSBAR_HEIGHT = StatusBar.currentHeight || (Platform.OS === 'ios' ? 20 : 0);
const BOTTOM_SAFE_AREA = Platform.OS === 'ios' ? 20 : 10;

// Success Modal Component
const SuccessModal = ({ visible, message, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.successModalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={50} color="#4CAF50" />
          </View>
          <Text style={styles.successModalTitle}>Success!</Text>
          <Text style={styles.successModalMessage}>{message}</Text>
          <TouchableOpacity style={styles.successModalButton} onPress={onClose}>
            <Text style={styles.successModalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const TimesheetScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timesheetEntries, setTimesheetEntries] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const formatTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const [dateInput, setDateInput] = useState(formatTodayDate());
  const [showCalendar, setShowCalendar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Project info state
  const [projectInfo, setProjectInfo] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  // Fetch project info from backend when form loads
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        setProjectLoading(true);
        // Get user ID from auth context
        if (!user || !user.id) {
          console.error('User ID not available');
          setProjectLoading(false);
          return;
        }
        
        // Use the same endpoint as web version - CORRECT ENDPOINT
        const response = await api.get(
          `/user-details/${user.id}/company-project-details`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          }
        );
        console.log('✅ Project info loaded successfully:', response.data);
        
        // Map fields from response to projectInfo state (same as web portal)
        const data = response.data || {};
        const projectName = data.project_name || '';
        setProjectInfo({
          name: projectName,
          startDate: data.project_start_date || '',
          endDate: data.project_end_date || ''
        });
        
        // Set the project name in the newEntry state too
        setNewEntry(prev => ({
          ...prev,
          project_name: projectName
        }));
      } catch (err) {
        if (err?.response?.status === 404) {
          console.warn('⚠️ No project info found for user', user?.id);
          setProjectInfo({ name: 'No Project Assigned', startDate: '', endDate: '' });
        } else {
          console.error('❌ Error fetching project info:', err);
          setError('Failed to load project information. Please refresh the app.');
        }
      } finally {
        setProjectLoading(false);
      }
    };
    fetchProjectInfo();
  }, [user]);
  const [error, setError] = useState('');
  const [projectLoading, setProjectLoading] = useState(true); // Add loading state for project info
  const [activeTab, setActiveTab] = useState('log'); // 'log' or 'history'
  const [visibleEntries, setVisibleEntries] = useState(5); // Show initially 5 entries
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    dateFrom: '',
    dateTo: '',
    projectName: '',
    minHours: '',
    maxHours: ''
  });
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hoursInputVisible, setHoursInputVisible] = useState(false);
  const [tempHoursInput, setTempHoursInput] = useState('');
  // simple +/- hour picker (0-24)
  
  // Debug which tab is active
  useEffect(() => {
    console.log("Active Tab:", activeTab);
  }, [activeTab]);
  
  // (removed large hour options list; using +/- buttons 0..24)
  
  // Form state for adding a new entry
  const [newEntry, setNewEntry] = useState({
    project_name: '',  // Will be updated with projectInfo.name
    task_name: '',
    task_description: '',
    time_hour: 0,
    sheet_date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });

  // Debug: log key timesheet state when it changes to diagnose Expo vs APK differences
  useEffect(() => {
    try {
      console.log('TimesheetScreen state:', {
        time_hour: newEntry?.time_hour,
        time_hour_type: typeof newEntry?.time_hour,
        entries_count: Array.isArray(timesheetEntries) ? timesheetEntries.length : 0,
        projectInfo
      });
    } catch (e) {
      console.warn('Timesheet debug log failed:', e);
    }
  }, [newEntry?.time_hour, timesheetEntries, projectInfo]);

  // Handle date input formatting
  const handleDateInput = (text) => {
    // Only allow numbers
    const numbers = text.replace(/[^\d]/g, '');
    let formatted = dateInput;

    if (numbers.length === 0) {
      // If input is cleared, set to today's date
      formatted = formatTodayDate();
    } else if (numbers.length <= 2) {
      formatted = numbers;
    } else if (numbers.length <= 4) {
      formatted = numbers.slice(0, 2) + '-' + numbers.slice(2);
    } else if (numbers.length <= 8) {
      formatted = numbers.slice(0, 2) + '-' + numbers.slice(2, 4) + '-' + numbers.slice(4);
    }

    setDateInput(formatted);

    // Convert to ISO format only if we have a complete date
    if (numbers.length === 8) {
      const day = numbers.slice(0, 2);
      const month = numbers.slice(2, 4);
      const year = numbers.slice(4);
      
      // Validate date
      const date = new Date(year, month - 1, day);
      if (date.getDate() === parseInt(day) && 
          date.getMonth() === parseInt(month) - 1 && 
          date.getFullYear() === parseInt(year)) {
        handleInputChange('sheet_date', `${year}-${month}-${day}`);
      }
    }
  };

  // Reset form when switching to "log" tab
  useEffect(() => {
    if (activeTab === 'log' && !editingEntry) {
      setNewEntry({
        project_name: projectInfo.name, // Keep the project name from backend
        task_name: '',
        task_description: '',
        time_hour: 0,
        sheet_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [activeTab, projectInfo.name]);

  // Get the current week date range
  const getCurrentWeekDates = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate Monday of current week
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    
    // Calculate Sunday of current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  // Check if entry is within 24 hour edit window
  const isEntryEditable = (entryDate) => {
    const entryDateTime = new Date(entryDate);
    const now = new Date();
    const hoursDiff = (now - entryDateTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // Date formatter for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format date range for summary card (Mon, Aug 11 - Sun, Aug 17)
  const formatDateRange = (startDate, endDate) => {
    const startOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const endOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return `${new Date(startDate).toLocaleDateString(undefined, startOptions)} - ${new Date(endDate).toLocaleDateString(undefined, endOptions)}`;
  };

  // Return a display-friendly date (DD-MM-YYYY) from ISO (YYYY-MM-DD)
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return '';
    try {
      // if already in YYYY-MM-DD form
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      }
      // fallback to Date parsing
      const dt = new Date(isoDate);
      if (isNaN(dt)) return isoDate;
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = String(dt.getFullYear());
      return `${dd}-${mm}-${yyyy}`;
    } catch (e) {
      return isoDate;
    }
  };

  // Parse a user-typed display date (DD-MM-YYYY or DD/MM/YYYY or D-M-YY) into ISO YYYY-MM-DD
  const parseDisplayDateToISO = (display) => {
    if (!display) return '';
    const cleaned = display.trim().replace(/\//g, '-');
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2) {
        // assume 20xx for 2-digit years
        y = '20' + y;
      }
      // zero-pad
      d = d.padStart(2, '0');
      m = m.padStart(2, '0');
      // simple validity check
      const iso = `${y}-${m}-${d}`;
      const dt = new Date(iso);
      if (!isNaN(dt)) return iso;
    }
    // fallback: try to parse as Date and format
    const dt = new Date(display);
    if (!isNaN(dt)) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return display; // leave as-is if we can't parse
  };

  // Load timesheet entries for the current user
  useEffect(() => {
    if (user?.id) {
      fetchTimesheetEntries();
    }
  }, [user?.id]); // Add user.id as a dependency

  //  FIXED FUNCTION 
  const fetchTimesheetEntries = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // CORRECT: Use 'api' instance and only the path
      const response = await api.get(
        `/timesheets/?user_id=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      
      // Sort entries by date (newest first)
      const sortedEntries = (response.data || []).sort((a, b) => 
        new Date(b.sheet_date) - new Date(a.sheet_date)
      );
      
      setTimesheetEntries(sortedEntries);
    } catch (err) {
      console.error('Error fetching timesheet entries:', err);
      setError('Failed to load your timesheet entries.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    // For hours input, validate and process it differently
    if (name === 'time_hour') {
      // Allow only numeric input and proper range
      let numValue = value.replace(/[^0-9.]/g, '');
      
      // Handle decimal input correctly
      if (numValue.includes('.')) {
        const parts = numValue.split('.');
        if (parts.length > 2) {
          numValue = parts[0] + '.' + parts.slice(1).join('');
        }
        // Limit to 1 decimal place
        if (parts[1] && parts[1].length > 1) {
          numValue = parts[0] + '.' + parts[1].substring(0, 1);
        }
      }
      
      // Convert to number for validation
      let hours = numValue === '' ? 0 : parseFloat(numValue);
      
      // Ensure value is within range 0-24
      if (!isNaN(hours)) {
        hours = Math.min(Math.max(hours, 0), 24);
        numValue = hours.toString();
      }
      
      // Update state
      setNewEntry(prev => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
      // Handle other fields normally
      setNewEntry(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Increment/decrement hours (0-24)
  const incrementHours = () => {
    setNewEntry(prev => {
      const currentHours = parseInt(prev.time_hour, 10) || 0;
      return {
        ...prev,
        time_hour: Math.min(24, currentHours + 1)
      };
    });
  };

  const decrementHours = () => {
    setNewEntry(prev => {
      const currentHours = parseInt(prev.time_hour, 10) || 0;
      return {
        ...prev,
        time_hour: Math.max(0, currentHours - 1)
      };
    });
  };

  const validateEntry = useCallback(() => {
    // Clear any existing errors
    setError('');
    
    // Use either the entered project name or the project info name
    const projectName = newEntry.project_name.trim() || projectInfo.name.trim();
    if (!projectName || projectName === 'No Project Assigned') {
      setError('❌ Project information is not available. Please contact your manager.');
      Alert.alert('Validation Error', 'Project information is not available. Please contact your manager to assign you to a project.');
      return false;
    }
    
    if (!newEntry.task_name.trim()) {
      setError('❌ Please enter a task name');
      Alert.alert('Validation Error', 'Please enter a task name');
      return false;
    }
    
    // Validate hours (must be between 0-24)
    const hours = parseFloat(newEntry.time_hour);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setError('❌ Please enter valid hours (0.1-24)');
      Alert.alert('Validation Error', 'Please enter valid hours (0.1-24)');
      return false;
    }
    
    // Check if date is valid
    if (!newEntry.sheet_date) {
      setError('❌ Please select a valid date');
      Alert.alert('Validation Error', 'Please select a valid date');
      return false;
    }
    
    return true;
  }, [newEntry, projectInfo.name]);

  // Start editing an entry
  const handleEditEntry = (entry) => {
    // Check if entry is more than 24 hours old
    const entryDate = new Date(entry.sheet_date);
    const now = new Date();
    const hoursDiff = (now - entryDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      Alert.alert(
        "Cannot Edit Entry",
        "Timesheet entries cannot be edited after 24 hours.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setEditingEntry(entry);
    setNewEntry({
      project_name: entry.project_name,
      task_name: entry.task_name,
      task_description: entry.task_description || '',
      time_hour: entry.time_hour,
      sheet_date: entry.sheet_date
    });
    setActiveTab('log');
  };

  // Cancel editing and reset form
  const handleCancelEdit = () => {
    setEditingEntry(null);
    setNewEntry({
      project_name: projectInfo.name, // Keep the project name from backend
      task_name: '',
      task_description: '',
      time_hour: 0,
      sheet_date: new Date().toISOString().split('T')[0]
    });
  };

  // Update an existing entry
  const handleUpdateEntry = useCallback(async () => {
    if (!validateEntry()) return;
    
    Keyboard.dismiss();
    
    setSubmitting(true);
    setError('');
    
    try {
      const payload = {
        ...newEntry,
        project_name: newEntry.project_name.trim() || projectInfo.name.trim(),
        user_id: user.id,
        time_hour: parseFloat(newEntry.time_hour),
        status: 'pending'
      };
      
      const response = await api.put(
        `/timesheets/${editingEntry.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update the entry in the local state
      setTimesheetEntries(prev => 
        prev.map(entry => 
          entry.id === editingEntry.id ? response.data : entry
        )
      );
      
      // Reset form and editing state
      setNewEntry({
        project_name: '',
        task_name: '',
        task_description: '',
        time_hour: 0,
        sheet_date: new Date().toISOString().split('T')[0]
      });
      
      setEditingEntry(null);
      setActiveTab('history');
      
      showSuccessMessage('Timesheet entry updated successfully!');
    } catch (err) {
      console.error('Error updating timesheet entry:', err);
      setError('Failed to update timesheet entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [validateEntry, newEntry, projectInfo.name, user, editingEntry, showSuccessMessage]);

  // Delete an entry
  const confirmDeleteEntry = (entryId) => {
    // Find the entry
    const entryToDelete = timesheetEntries.find(entry => entry.id === entryId);
    if (!entryToDelete) return;
    
    // Check if entry is more than 24 hours old
    const entryDate = new Date(entryToDelete.sheet_date);
    const now = new Date();
    const hoursDiff = (now - entryDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      Alert.alert(
        "Cannot Delete Entry",
        "Timesheet entries cannot be deleted after 24 hours.",
        [{ text: "OK" }]
      );
      return;
    }
    
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this timesheet entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteEntry(entryId)
        }
      ]
    );
  };

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilterOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setIsFiltering(true);
    let filtered = [...timesheetEntries];
    
    // Filter by date range
    if (filterOptions.dateFrom) {
      filtered = filtered.filter(entry => entry.sheet_date >= filterOptions.dateFrom);
    }
    
    if (filterOptions.dateTo) {
      filtered = filtered.filter(entry => entry.sheet_date <= filterOptions.dateTo);
    }
    
    // Filter by project name
    if (filterOptions.projectName) {
      const searchTerm = filterOptions.projectName.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.project_name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by hours range
    if (filterOptions.minHours && !isNaN(parseInt(filterOptions.minHours))) {
      const minHours = parseInt(filterOptions.minHours);
      filtered = filtered.filter(entry => entry.time_hour >= minHours);
    }
    
    if (filterOptions.maxHours && !isNaN(parseInt(filterOptions.maxHours))) {
      const maxHours = parseInt(filterOptions.maxHours);
      filtered = filtered.filter(entry => entry.time_hour <= maxHours);
    }
    
    setFilteredEntries(filtered);
    setFilterVisible(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterOptions({
      dateFrom: '',
      dateTo: '',
      projectName: '',
      minHours: '',
      maxHours: ''
    });
    setIsFiltering(false);
    setFilteredEntries([]);
  };
  
  // Function to load more entries
  const loadMoreEntries = () => {
    setVisibleEntries(prevVisible => prevVisible + 5);
  };

  const handleDeleteEntry = async (entryId) => {
    setDeletingId(entryId);
    
    try {
      await api.delete(
        `/timesheets/${entryId}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      
      // Remove the entry from local state
      setTimesheetEntries(prev => 
        prev.filter(entry => entry.id !== entryId)
      );
      
      Alert.alert('Success', 'Timesheet entry deleted successfully!');
    } catch (err) {
      console.error('Error deleting timesheet entry:', err);
      Alert.alert('Error', 'Failed to delete timesheet entry. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Show success message function
  const showSuccessMessage = useCallback((message) => {
    setSuccessMessage(message);
    
    // Clear any existing timeout
    if (window.successMessageTimer) {
      clearTimeout(window.successMessageTimer);
    }
    
    // Hide success message after 3 seconds
    window.successMessageTimer = setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  }, []);

  //  FIXED FUNCTION 
  const handleSubmitEntry = useCallback(async () => {
    if (!validateEntry()) return;
    
    Keyboard.dismiss();
    
    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    // If we're editing, call the update function instead
    if (editingEntry) {
      return handleUpdateEntry();
    }
    
    try {
      // Ensure project name is included from projectInfo if not in newEntry
      const payload = {
        ...newEntry,
        project_name: newEntry.project_name.trim() || projectInfo.name.trim(),
        user_id: user.id,
        time_hour: parseFloat(newEntry.time_hour),
        status: 'pending'
      };
      
      // CORRECT: Use 'api' instance and only the path
      const response = await api.post(
        `/timesheets/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setTimesheetEntries(prev => [response.data, ...prev]);
      
      setNewEntry({
        project_name: projectInfo.name || '',
        task_name: '',
        task_description: '',
        time_hour: 0,
        sheet_date: new Date().toISOString().split('T')[0]
      });
      
      // Reset date input to today
      setDateInput(formatTodayDate());
      
      // Show success message in banner and switch to history tab
      showSuccessMessage('Timesheet entry added successfully!');
      setActiveTab('history'); // Switch to history tab to show the new entry
      
      // Show success overlay
      Alert.alert(
        "Success! ✓",
        "Your timesheet has been submitted.",
        [{ text: "OK", onPress: () => setSuccessMessage('') }],
        { cancelable: false }
      );
    } catch (err) {
      console.error('Error submitting timesheet entry:', err);
      setError('Failed to submit your timesheet entry. Please try again.');
      Alert.alert(
        "Error",
        "Failed to submit your timesheet entry. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
    } finally {
      setSubmitting(false);
    }
  }, [newEntry, projectInfo.name, user, editingEntry, validateEntry, showSuccessMessage]);

  // Calculate total hours for the current week
  const calculateWeeklyHours = () => {
    const { start, end } = getCurrentWeekDates();
    const weekEntries = timesheetEntries.filter(entry => 
      entry.sheet_date >= start && entry.sheet_date <= end
    );
    
    return weekEntries.reduce((total, entry) => total + entry.time_hour, 0);
  };
  
  // State for month selector in monthly summary
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Format month name for display
  const formatMonthName = (month, year) => {
    const date = new Date(year, month, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  // Navigate to previous month (limited to last 2 months)
  const goToPreviousMonth = () => {
    // Get current date for comparison
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate how many months back we're trying to go
    let monthsBack = 0;
    if (currentYear === selectedYear) {
      monthsBack = currentMonth - selectedMonth;
    } else if (currentYear - selectedYear === 1) {
      monthsBack = currentMonth + (12 - selectedMonth);
    }
    
    // Don't allow going back more than 2 months from current
    if (monthsBack >= 2) {
      return;
    }
    
    // Regular navigation logic
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const currentDate = new Date();
    const isCurrentMonthYear = selectedMonth === currentDate.getMonth() && 
                              selectedYear === currentDate.getFullYear();
    
    if (isCurrentMonthYear) {
      // Don't allow navigating past current month
      return;
    }
    
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  // Check if we're already at the 2-month back limit
  const isAtTwoMonthsBackLimit = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate how many months back we currently are
    let monthsBack = 0;
    if (currentYear === selectedYear) {
      monthsBack = currentMonth - selectedMonth;
    } else if (currentYear - selectedYear === 1) {
      monthsBack = currentMonth + (12 - selectedMonth);
    }
    
    // Return true if we're already at or beyond the 2-month limit
    return monthsBack >= 2;
  };
  
  // Calculate total hours for a specific month
  const calculateMonthlyHours = (specifiedMonth = selectedMonth, specifiedYear = selectedYear) => {
    // First day of specified month
    const firstDay = new Date(specifiedYear, specifiedMonth, 1).toISOString().split('T')[0];
    // Last day of specified month
    const lastDay = new Date(specifiedYear, specifiedMonth + 1, 0).toISOString().split('T')[0];
    
    const monthEntries = timesheetEntries.filter(entry => 
      entry.sheet_date >= firstDay && entry.sheet_date <= lastDay
    );
    
    return {
      totalEntries: monthEntries.length,
      totalHours: monthEntries.reduce((total, entry) => total + entry.time_hour, 0),
      avgHoursPerDay: monthEntries.length > 0 
        ? monthEntries.reduce((total, entry) => total + entry.time_hour, 0) / monthEntries.length
        : 0
    };
  };

  return (
    <View style={[styles.containerOuter, { backgroundColor: theme?.colors?.background || '#f0f2f5' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2850" />
      
      <View style={styles.safeAreaTop} />
      
  <View style={[styles.header, { backgroundColor: theme?.colors?.primary || '#0a2850' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timesheet</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchTimesheetEntries}>
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'log' && styles.activeTabButton]}
          onPress={() => setActiveTab('log')}
          activeOpacity={0.7}
        >
          <View style={[styles.tabIconContainer, activeTab === 'log' && styles.activeTabIconContainer]}>
            <Text style={[styles.tabButtonIcon, activeTab === 'log' && styles.activeTabIcon]}>+</Text>
          </View>
          <Text style={[styles.tabButtonText, activeTab === 'log' && styles.activeTabText]}>
            Add Entry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <View style={[styles.tabIconContainer, activeTab === 'history' && styles.activeTabIconContainer]}>
            <Text style={[styles.tabButtonIcon, activeTab === 'history' && styles.activeTabIcon]}>≡</Text>
          </View>
          <Text style={[styles.tabButtonText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
      
      <KeyboardAwareScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={70}
        enableResetScrollToCoords={false}
        keyboardOpeningTime={150}
        scrollEnabled={true}
        viewIsInsideTabBar={true}
        extraHeight={120}
      >
        {activeTab === 'log' ? (
          <View style={[styles.formCard, { backgroundColor: theme?.colors?.surface || 'white' }] }>
            <Text style={styles.formTitle}>
              {editingEntry ? 'Edit Timesheet Entry' : 'Add New Entry'}
            </Text>
            
            {/* Success message banner */}
            {successMessage ? (
              <View style={styles.successBanner}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}
            
            {/* Success banner for project info */}
            {!projectLoading && projectInfo.name && projectInfo.name !== 'No Project Assigned' && !successMessage && (
              <View style={styles.successBanner}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successText}>
                  Project information loaded successfully: {projectInfo.name}
                </Text>
              </View>
            )}
            
            {/* Error banner for project info */}
            {!projectLoading && (!projectInfo.name || projectInfo.name === 'No Project Assigned') && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorBannerText}>
                  No project assigned. Please contact your manager.
                </Text>
              </View>
            )}
            
            {/* Project Info - non-editable fields with loading states */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Project Name</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>⊞</Text>
                {projectLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0a2850" />
                    <Text style={styles.loadingText}>Loading project info...</Text>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.textInput, { 
                      color: projectInfo.name === 'No Project Assigned' ? '#EF4444' : '#A0AEC0' 
                    }]}
                    value={projectInfo.name || 'Loading...'}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                )}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Project Start Date</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📅</Text>
                {projectLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0a2850" />
                    <Text style={styles.loadingText}>Loading...</Text>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.textInput, { color: '#A0AEC0' }]}
                    value={projectInfo.startDate || 'Not available'}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                )}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Project End Date</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📅</Text>
                {projectLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0a2850" />
                    <Text style={styles.loadingText}>Loading...</Text>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.textInput, { color: '#A0AEC0' }]}
                    value={projectInfo.endDate || 'Not available'}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                )}
              </View>
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Task Name *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>✓</Text>
                <TextInput 
                  style={styles.textInput}
                  placeholder="Enter task name"
                  placeholderTextColor="#A0AEC0"
                  value={newEntry.task_name}
                  onChangeText={(text) => handleInputChange('task_name', text)}
                />
              </View>
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Text style={[styles.inputIcon, {alignSelf: 'flex-start', marginTop: 12}]}>✎</Text>
                <TextInput 
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter task description"
                  placeholderTextColor="#A0AEC0"
                  value={newEntry.task_description}
                  onChangeText={(text) => handleInputChange('task_description', text)}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            </View>
            
            <View style={styles.rowFields}>
              <View style={[styles.formField, {flex: 0.9, marginRight: 8}]}> 
                <Text style={styles.fieldLabel}>Hours *</Text>
                <View style={[styles.hoursContainer, {justifyContent: 'space-between'}]}>
                  <TouchableOpacity style={styles.hourButton} onPress={decrementHours}>
                    <Text style={styles.hourButtonTextMinus}>−</Text>
                  </TouchableOpacity>

                  <View style={styles.hourValueContainer}>
                    <Text style={styles.hourValueText}>{Number(newEntry.time_hour)}</Text>
                  </View>

                  <TouchableOpacity style={styles.hourButton} onPress={incrementHours}>
                    <Text style={styles.hourButtonTextPlus}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={[styles.formField, {flex: 1.2, marginLeft: 8}]}>
                <Text style={styles.fieldLabel}>Date *</Text>
                <TouchableOpacity 
                  style={[styles.inputContainer, styles.datePickerButton]} 
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={[styles.inputIcon, { color: '#0a2850' }]}>📅</Text>
                  <Text style={styles.datePickerText}>{dateInput}</Text>
                  <Text style={styles.datePickerArrow}>▼</Text>
                </TouchableOpacity>
                
                {/* Calendar Modal */}
                <CalendarModal
                  visible={showCalendar}
                  onClose={() => setShowCalendar(false)}
                  onSelectDate={(date) => {
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    const formattedDate = `${day}-${month}-${year}`;
                    setDateInput(formattedDate);
                    
                    // Update the newEntry state with ISO format
                    handleInputChange('sheet_date', `${year}-${month}-${day}`);
                  }}
                />
              </View>
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={editingEntry ? styles.buttonRow : {}}>
              {editingEntry && (
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.submitButton, editingEntry && styles.updateButton]} 
                onPress={handleSubmitEntry}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Text style={styles.submitButtonIcon}>{editingEntry ? '✎' : '💾'}</Text>
                    <Text style={styles.submitButtonText}>
                      {editingEntry ? 'Update Entry' : 'Save Entry'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.entriesContainer, { backgroundColor: theme?.colors?.surface || 'white' }]}>
            <Text style={styles.entriesTitle}>
              Your Timesheet Entries
              {isFiltering && (
                <Text style={styles.filterIndicator}>
                  {" "}(Filtered: {filteredEntries.length} results)
                </Text>
              )}
            </Text>
            
            <View style={styles.policyBanner}>
              <Text style={styles.policyIcon}>ⓘ</Text>
              <Text style={styles.policyText}>
                Timesheet entries can only be edited or deleted within 24 hours of creation.
              </Text>
            </View>
            
            {isFiltering && filteredEntries.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateTitle}>No matching entries</Text>
                <Text style={styles.emptyStateText}>
                  Try adjusting your filter criteria to see more results.
                </Text>
                <TouchableOpacity 
                  style={styles.clearFilterButton}
                  onPress={resetFilters}
                >
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {loading ? (
              <ActivityIndicator color="#0a2850" size="large" style={styles.loader} />
            ) : (!isFiltering && timesheetEntries.length === 0) ? (
              <View style={styles.emptyState}>
                <Icon name="chart-box" size={48} color="#cbd5e0" style={styles.emptyStateIcon} />
                <Text style={styles.emptyStateTitle}>No entries found</Text>
                <Text style={styles.emptyStateText}>
                  Your logged hours will appear here. Start by adding a new entry.
                </Text>
              </View>
            ) : (
              <>
                {(isFiltering ? filteredEntries : timesheetEntries).slice(0, visibleEntries).map((entry) => (
                  <View key={entry.id} style={[
                    styles.entryCard, 
                    !isEntryEditable(entry.sheet_date) && styles.lockedEntryCard
                  ]}>
                    <View style={styles.entryCardHeader}>
                      <View style={styles.entryHeaderLeft}>
                        <Text style={styles.entryDate}>{formatDate(entry.sheet_date)}</Text>
                        {entry.status === 'approved' && (
                          <View style={[styles.statusBadge, styles.approvedBadge]}>
                            <Text style={[styles.statusText, styles.approvedText]}>approved</Text>
                          </View>
                        )}
                        
                        {/* Show lock badge if entry is more than 24 hours old */}
                        {!isEntryEditable(entry.sheet_date) && (
                          <View style={styles.lockBadge}>
                            <Text style={styles.lockText}>LOCKED</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.entryCardActions}>
                        {isEntryEditable(entry.sheet_date) ? (
                          <>
                            <TouchableOpacity
                              style={styles.entryCardAction}
                              onPress={() => handleEditEntry(entry)}
                            >
                              <Text style={styles.entryCardActionIcon}>✎</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={[styles.entryCardAction, styles.deleteAction]}
                              onPress={() => confirmDeleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                            >
                              {deletingId === entry.id ? (
                                <ActivityIndicator size="small" color="#FF424F" />
                              ) : (
                                <Text style={styles.entryCardActionIconDelete}>×</Text>
                              )}
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity 
                            style={styles.lockedIcon}
                            onPress={() => Alert.alert("Locked Entry", "This entry is more than 24 hours old and cannot be modified.")}
                          >
                            <Icon name="lock" size={18} color="#718096" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.entryCardBody}>
                      <View style={styles.entryCardRow}>
                        <Text style={styles.entryCardLabel}>Project:</Text>
                        <Text style={styles.entryProject}>{entry.project_name}</Text>
                      </View>
                      
                      <View style={styles.entryCardRow}>
                        <Text style={styles.entryCardLabel}>Task:</Text>
                        <Text style={styles.entryTask}>{entry.task_name}</Text>
                      </View>
                      
                      <View style={styles.entryCardRow}>
                        <Text style={styles.entryCardLabel}>Hours:</Text>
                        <Text style={styles.entryHours}>{entry.time_hour} hrs</Text>
                      </View>
                      
                      {entry.task_description ? (
                        <View style={styles.entryDescriptionContainer}>
                          <Text style={styles.entryDescriptionLabel}>Description:</Text>
                          <Text style={styles.entryDescription}>{entry.task_description}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
                
                {/* View More Button */}
                {!isFiltering && timesheetEntries.length > visibleEntries && (
                  <TouchableOpacity 
                    style={styles.viewMoreButton}
                    onPress={loadMoreEntries}
                  >
                    <Text style={styles.viewMoreText}>View More</Text>
                  </TouchableOpacity>
                )}
                
                {/* Monthly Summary at bottom of history tab */}
                <View style={styles.monthlySummaryContainer}>
                  <View style={styles.monthlySummaryCard}>
                    <View style={styles.monthlySummaryHeader}>
                      <Icon name="chart-box" size={20} color="#0a2850" style={{ marginRight: 8 }} />
                      <Text style={styles.monthlySummaryTitle}>Monthly Summary</Text>
                    </View>
                    
                    {/* Month selector row */}
                    <View style={styles.monthSelectorContainer}>
                      <TouchableOpacity 
                        style={[
                          styles.monthNavButton,
                          // Disable button if already at 2 months back limit
                          isAtTwoMonthsBackLimit() && styles.monthNavButtonDisabled
                        ]} 
                        onPress={goToPreviousMonth}
                        disabled={isAtTwoMonthsBackLimit()}
                      >
                        <Text style={[
                          styles.monthNavButtonText,
                          isAtTwoMonthsBackLimit() && styles.monthNavButtonTextDisabled
                        ]}>←</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.selectedMonthText}>
                        {formatMonthName(selectedMonth, selectedYear)}
                      </Text>
                      
                      <TouchableOpacity 
                        style={[
                          styles.monthNavButton,
                          // Disable button if current month/year
                          selectedMonth === new Date().getMonth() && 
                          selectedYear === new Date().getFullYear() && 
                          styles.monthNavButtonDisabled
                        ]} 
                        onPress={goToNextMonth}
                        disabled={selectedMonth === new Date().getMonth() && 
                                 selectedYear === new Date().getFullYear()}
                      >
                        <Text style={[
                          styles.monthNavButtonText,
                          selectedMonth === new Date().getMonth() && 
                          selectedYear === new Date().getFullYear() && 
                          styles.monthNavButtonTextDisabled
                        ]}>→</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.monthlySummaryContent}>
                      {/* Total Entries */}
                      <View style={[styles.monthlySummaryItem, {backgroundColor: '#EBF5FF'}]}>
                        <Text style={[styles.monthlySummaryValue, {color: '#0066CC'}]}>
                          {calculateMonthlyHours().totalEntries}
                        </Text>
                        <Text style={styles.monthlySummaryLabel}>Total Entries</Text>
                      </View>
                      
                      {/* Total Hours */}
                      <View style={[styles.monthlySummaryItem, {backgroundColor: '#E6F7EE'}]}>
                        <Text style={[styles.monthlySummaryValue, {color: '#16A34A'}]}>
                          {calculateMonthlyHours().totalHours.toFixed(2)}
                        </Text>
                        <Text style={styles.monthlySummaryLabel}>Total Hours</Text>
                      </View>
                      
                      {/* Average Hours/Day */}
                      <View style={[styles.monthlySummaryItem, {backgroundColor: '#F3E8FF'}]}>
                        <Text style={[styles.monthlySummaryValue, {color: '#9333EA'}]}>
                          {calculateMonthlyHours().avgHoursPerDay.toFixed(2)}
                        </Text>
                        <Text style={styles.monthlySummaryLabel}>Avg Hours/Days</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </KeyboardAwareScrollView>
      
      <View style={styles.safeAreaBottom} />

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Entries</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Text style={styles.modalCloseIcon}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScrollView}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                
                <View style={styles.filterRow}>
                  <View style={styles.filterField}>
                    <Text style={styles.filterLabel}>From</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>📅</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#A0AEC0"
                        value={filterOptions.dateFrom}
                        onChangeText={(text) => handleFilterChange('dateFrom', text)}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.filterField}>
                    <Text style={styles.filterLabel}>To</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>📅</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#A0AEC0"
                        value={filterOptions.dateTo}
                        onChangeText={(text) => handleFilterChange('dateTo', text)}
                      />
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Project</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>⊞</Text>
                  <TextInput 
                    style={styles.textInput}
                    placeholder="Search by project name"
                    placeholderTextColor="#A0AEC0"
                    value={filterOptions.projectName}
                    onChangeText={(text) => handleFilterChange('projectName', text)}
                  />
                </View>
              </View>
              
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Hours Range</Text>
                
                <View style={styles.filterRow}>
                  <View style={styles.filterField}>
                    <Text style={styles.filterLabel}>Min</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>⏱</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Min hours"
                        placeholderTextColor="#A0AEC0"
                        keyboardType="numeric"
                        value={filterOptions.minHours}
                        onChangeText={(text) => handleFilterChange('minHours', text)}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.filterField}>
                    <Text style={styles.filterLabel}>Max</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>⏱</Text>
                      <TextInput 
                        style={styles.textInput}
                        placeholder="Max hours"
                        placeholderTextColor="#A0AEC0"
                        keyboardType="numeric"
                        value={filterOptions.maxHours}
                        onChangeText={(text) => handleFilterChange('maxHours', text)}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetFilterButton} 
                onPress={resetFilters}
              >
                <Text style={styles.resetFilterText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyFilterButton} 
                onPress={applyFilters}
              >
                <Text style={styles.applyFilterText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  containerOuter: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  safeAreaTop: {
    height: STATUSBAR_HEIGHT,
    backgroundColor: '#0a2850',
  },
  safeAreaBottom: {
    height: BOTTOM_SAFE_AREA,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a2850',
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  backButton: {
    padding: 12,
    marginLeft: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 12,
  },
  refreshIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Summary Card styles
  summaryCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a2850',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  weekRangeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryHoursContainer: {
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 80,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHours: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  summarySubtext: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'linear-gradient(90deg, #10B981, #059669)',
    borderRadius: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Tab Navigation styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeTabIconContainer: {
    backgroundColor: '#0a2850',
  },
  tabButtonIcon: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  activeTabIcon: {
    color: '#FFFFFF',
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#0a2850',
  },
  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  
  // Form Card styles
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a2850',
    marginBottom: 16,
  },
  successBanner: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  successText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    fontWeight: '500',
  },
  formField: {
    marginBottom: 14,
  },
  rowFields: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 48,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
    color: '#4A5568',
    fontWeight: '500',
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
    borderRadius: 20,
    paddingHorizontal: 1,
    height: 45,
  },
  hourPickerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  hourPickerValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  hourPickerUnit: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  hourPickerArrow: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  hourButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourButtonText: {
    fontSize: 22,
    color: '#0a2850',
    fontWeight: '600',
  },
  hourButtonTextMinus: {
    fontSize: 20,
    color: '#0a2850',
    fontWeight: '600',
  },
  hourButtonTextPlus: {
    fontSize: 20,
    color: '#0a2850',
    fontWeight: '600',
  },
  hourValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  hourValueText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  hourPickerUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  hourPickerContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
  },
  hourPickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#0a2850',
  },
  hourPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  hourPickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  hourPickerItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  hourPickerItemText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  hourPickerItemTextSelected: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  hourPickerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  hourPickerCancel: {
    padding: 8,
    marginRight: 8,
  },
  hourPickerCancelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  hourPickerConfirm: {
    padding: 8,
    marginRight: 8,
  },
  hourPickerConfirmText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    height: 'auto',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#0a2850',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    color: 'white',
    fontSize: 18,
    marginRight: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    flex: 0.48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButton: {
    flex: 0.48,
    backgroundColor: '#1E40AF',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
  },
  
  // Entry history styles
  entriesContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a2850',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: '80%',
  },
  loader: {
    marginVertical: 24,
  },
  
  // Entry card styles
  entryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
    marginRight: 8,
  },
  entryCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryCardAction: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 6,
    backgroundColor: '#E5E7EB',
  },
  deleteAction: {
    backgroundColor: '#FEE2E2',
  },
  entryCardActionIcon: {
    fontSize: 18,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  entryCardActionIconDelete: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  lockBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  lockText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  lockedEntryCard: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    opacity: 0.9,
  },
  lockedIcon: {
    padding: 8,
  },
  lockedIconText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pendingText: {
    color: '#92400E',
  },
  approvedText: {
    color: '#065F46',
  },
  entryCardBody: {
    padding: 16,
  },
  entryCardRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  entryCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 60,
  },
  entryProject: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  entryTask: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  entryHours: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a2850',
    flex: 1,
  },
  entryDescriptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  entryDescriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  
  // Modal styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
  },
  
  // Filter styles
  filterIndicator: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: 'normal',
  },
  policyBanner: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#0a2850',
  },
  policyIcon: {
    fontSize: 16,
    color: '#0a2850',
    fontWeight: 'bold',
    marginRight: 8,
  },
  policyText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  filterModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#0a2850',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalCloseIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  filterScrollView: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a2850',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterField: {
    width: '48%',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetFilterButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '45%',
    alignItems: 'center',
  },
  resetFilterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  applyFilterButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0a2850',
    width: '45%',
    alignItems: 'center',
  },
  applyFilterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  clearFilterButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  
  // Monthly Summary Styles
  monthlySummaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  monthlySummaryCard: {
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthlySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartIconText: {
    fontSize: 20,
    marginRight: 8,
  },
  monthlySummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  monthlySummaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthlySummaryItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  monthlySummaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthlySummaryLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#4B5563',
  },
  
  // Month selector styles
  monthSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthNavButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  monthNavButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  monthNavButtonTextDisabled: {
    color: '#9CA3AF',
  },
  selectedMonthText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  viewMoreButton: {
    backgroundColor: '#EBF2FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#D1E0FF',
  },
  viewMoreText: {
    color: '#0a2850',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default TimesheetScreen;

