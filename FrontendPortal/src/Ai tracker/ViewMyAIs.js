import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import ReassignActionItem from './ReassingActionItem';
import ViewEmploActItem from './ViewEmploActItem';
const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ViewMyAIs = () => {
  //console.log('ViewMyAIs component is mounting');
  const { user_id, username, role, loading: userLoading } = useUser();
  //console.log('User context:', { user_id, username, role, userLoading });

  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSort, setCurrentSort] = useState('default'); 
  const [showRemarkInput, setShowRemarkInput] = useState({}); 
  const [remarks, setRemarks] = useState({});       
  const [showAllRemarks, setShowAllRemarks] = useState({});    
  const [showReassignInput, setShowReassignInput] = useState({}); // Track re-assign input
  const [reassignTo, setReassignTo] = useState({}); // 🆕 Track reassign values
  const [reassignedCount, setReassignedCount] = useState(0);
  const [showReassignedTasks, setShowReassignedTasks] = useState(false);
  const [showEmployeeItems, setShowEmployeeItems] = useState(false); // New state for employee items

  useEffect(() => {
    //console.log('🔄 Effect triggered:', { username, user_id });

    if (username && username.trim() !== '') {
      //console.log('✅ Valid username found, fetching data...');
      fetchUserActionItems();
    } else {
      //console.log('⏳ Waiting for username to be available...');
    }
  }, [username, user_id]); // Add user_id as dependency too


const fetchUserActionItems = async (username) => {
  try {
    setLoading(true);
    setCurrentSort('default');
    setError(null);

    // Use passed username or fallback
    const activeUserName = username || 
                          localStorage.getItem('username');

                          localStorage.getItem('username');

    // console.log('🚀 Fetching items for username:', activeUserName);
    // console.log('🔍 Debug info:', {
    //   passedUserName: username,
    //   contextUserName: username,
    //   localStorageUserName: localStorage.getItem('username'),
    //   finalUserName: activeUserName
    // });

    if (!activeUserName || activeUserName.trim() === '' || activeUserName === 'null') {
      throw new Error('User authentication required. Please refresh and login again.');
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication token missing. Please login again.');
    }

    const apiUrl = `${API_BASE}/mom/action-items/user/${activeUserName}?sort_by=due_date&order=asc`;
    //console.log('📡 API URL:', apiUrl);
    
    const itemsResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    //console.log('📊 Response status:', itemsResponse.status);
    
    if (itemsResponse.ok) {
      const itemsData = await itemsResponse.json();
      //console.log('✅ Received data:', itemsData);
      setActionItems(Array.isArray(itemsData) ? itemsData : []);
      setError(null);
    } else if (itemsResponse.status === 401) {
      throw new Error('Session expired. Please login again.');
    } else if (itemsResponse.status === 404) {
      //console.log('ℹ️ No action items found for user');
      setActionItems([]);
      setError(null);
    } else {
      const errorText = await itemsResponse.text();
      throw new Error(`Server error (${itemsResponse.status}): ${errorText}`);
    }
    
  } catch (error) {
    //console.error('❌ Error fetching action items:', error);
    setError(error.message);
    setActionItems([]);
  } finally {
    setLoading(false);
  }
};

  // Client-side sorting
  const handleClientSort = (criteria) => {
    setCurrentSort(criteria); // Update sort indicator
    
    const sorted = [...actionItems].sort((a, b) => {
      switch (criteria) {
        case 'due_date_asc':
          return new Date(a.due_date) - new Date(b.due_date);
        case 'due_date_desc':
          return new Date(b.due_date) - new Date(a.due_date);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'priority':
          // Custom priority logic: Overdue > Due Today > Due This Week > Upcoming > Completed
          const getPriority = (item) => {
            if (item.status === 'Completed') return 5;
            const today = new Date();
            const due = new Date(item.due_date);
            const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) return 1; // Overdue
            if (diffDays === 0) return 2; // Due today
            if (diffDays <= 7) return 3; // Due this week
            return 4; // Upcoming
          };
          return getPriority(a) - getPriority(b);
        case 'action_item':
          return a.action_item.localeCompare(b.action_item);
        default:
          return 0;
      }
    });
    setActionItems(sorted);
  };

  const formatDate = (dateString, status) => {
    // Don't show "overdue" for completed tasks
    if (status === 'Completed') {
      return 'Completed ✓';
    }
    
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getPriorityColor = (dueDate, status) => {
    if (status === 'Completed') return 'bg-green-100 border-green-300';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'bg-red-100 border-red-400'; // Overdue
    if (diffDays === 0) return 'bg-orange-100 border-orange-400'; // Due today
    if (diffDays <= 7) return 'bg-yellow-100 border-yellow-400'; // Due this week
    return 'bg-blue-100 border-blue-300'; // Upcoming
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Add this function after handleClientSort function (line ~84)
  const updateActionItemStatus = async (itemId, newStatus) => {
    try {
      //console.log(`Updating item ${itemId} status to ${newStatus}`);
      
      const response = await fetch(`${API_BASE}/mom/action-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          updated_at: new Date().toISOString().split('T')[0] // Today's date
        })
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        //console.log('Updated item:', updatedItem);
        
        // Update locally with response data
        setActionItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? updatedItem : item
          )
        );
      } else {
        const errorData = await response.text();
        //console.error('Failed to update status:', errorData);
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      //console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    }
  };
  // Helper function to parse and display remarks
const parseRemarks = (remarkData) => {
  if (!remarkData) return null;
  
  // If it's already an array
  if (Array.isArray(remarkData)) {
    return remarkData;
  }
  
  // If it's a string, try to parse JSON
  if (typeof remarkData === 'string') {
    try {
      const parsed = JSON.parse(remarkData);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      //console.warn('Could not parse remark JSON:', remarkData);
      return [{ text: remarkData, by: 'Unknown', remark_date: new Date().toISOString().split('T')[0] }];
    }
  }
  
  // If it's an object, convert to array
  if (typeof remarkData === 'object') {
    return [remarkData];
  }
  
  return null;
};

// Get latest remark from array
const getLatestRemark = (remarkData) => {
  const remarks = parseRemarks(remarkData);
  if (!remarks || remarks.length === 0) return null;
  
  // Return the last remark (most recent)
  return remarks[remarks.length - 1];
};

// Get all remarks count - more robust version
const getRemarksCount = (remarkData) => {
  // Check for empty strings or empty arrays in string form
  if (!remarkData || remarkData === '' || remarkData === '[]') return 0;
  
  const remarks = parseRemarks(remarkData);
  return remarks ? remarks.length : 0;
};

// Add this function for remark updates
const updateActionItemRemark = async (itemId, remark) => {
  try {
    //console.log(`Updating item ${itemId} remark to: ${remark}`);

      const response = await fetch(`${API_BASE}/mom/action-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ 
          remark: remark,
          updated_at: new Date().toISOString().split('T')[0] // Today's date
        })
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        //console.log('Updated item:', updatedItem);
        
        // Update locally with response data
        setActionItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? updatedItem : item
          )
        );
        
        // Hide input
        setShowRemarkInput(prev => ({ ...prev, [itemId]: false }));
        setRemarks(prev => ({ ...prev, [itemId]: '' }));
        
        alert('Remark saved successfully!');
      } else {
        const errorData = await response.text();
        console.error('Failed to update remark:', errorData);
        alert('Failed to save remark. Please try again.');
      }
    } catch (error) {
      //console.error('Error updating remark:', error);
      alert('Error saving remark: ' + error.message);
    }
  };

  const getRemarkStyle = (status) => {
    switch (status) {
      case 'Completed':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-700',
          content: 'text-green-800',
          icon: '✅',
          label: 'Completion Remark'
        };
      case 'In Progress':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          content: 'text-blue-800',
          icon: '🔄',
          label: 'Progress Remark'
        };
      case 'Pending':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-700',
          content: 'text-yellow-800',
          icon: '⏳',
          label: 'Pending Remark'
        };
      case 'Cancelled':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          content: 'text-red-800',
          icon: '❌',
          label: 'Cancelled Remark'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-700',
          content: 'text-gray-800',
          icon: '📝',
          label: 'Remark'
        };
    }
  };

  // Add helper function to check if item can be edited
  const canEditItem = (item, role) => {
    // Admin and HR can always edit
    if (role === 'admin' || role === 'hr') {
      return true;
    }
    
    // Employee can only edit if status is NOT completed
    return item.status !== 'Completed';
  };

  // Add helper function to check if remark can be edited
  const canEditRemark = (item, role = 'employee') => {
    // Add safety check for role
    if (!role) role = 'employee'; // Default to employee if role is undefined
  
    if (role === 'admin' || role === 'hr') {
      return true;
    }
    return item.status !== 'Completed';
  };
  // Add this function for reassigning tasks
const updateActionItemReassign = async (itemId, newAssignee) => {
  try {
    //console.log(`Re-assigning item ${itemId} to: ${newAssignee}`);
    
    const response = await fetch(`${API_BASE}/mom/action-items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ 
        re_assigned_to: newAssignee,
        updated_at: new Date().toISOString().split('T')[0] // Today's date
      })
    });
    
    if (response.ok) {
      const updatedItem = await response.json();
      //console.log('Re-assigned item:', updatedItem);
      
      // Update locally with response data
      setActionItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? updatedItem : item
        )
      );
      
      // Hide input
      setShowReassignInput(prev => ({ ...prev, [itemId]: false }));
      setReassignTo(prev => ({ ...prev, [itemId]: '' }));
      
      // 🔧 Enhanced success message based on role
      const successMessage = role === 'employee' 
        ? `Task successfully re-assigned to ${newAssignee}! (Note: As an employee, you cannot re-assign this task again)`
        : `Task successfully re-assigned to ${newAssignee}!`;
      
      alert(successMessage);
    } else {
      const errorData = await response.text();
      //console.error('Failed to re-assign task:', errorData);
      alert('Failed to re-assign task. Please try again.'+errorData.message);
    }
  } catch (error) {
    //console.error('Error re-assigning task:', error);
    alert('Error re-assigning task: ' + error.message);
  }
};

// 🆕 Add this new function here
const addNewRemark = async (itemId, remarkText) => {
  try {
    console.log(`🚀 Adding new remark to item ${itemId}: ${remarkText}`);  // 🔑 Specific item
    
    const response = await fetch(`${API_BASE}/mom/action-items/${itemId}/remark`, {  // 🔑 Item specific API
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ text: remarkText, username: username })
    });
    
    if (response.ok) {
      const updatedItem = await response.json();
      
      // Update only this specific item in state
      setActionItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? updatedItem : item  // 🔑 Only update matching item
        )
      );
      
      // Clear input for only this item
      setShowRemarkInput(prev => ({ ...prev, [itemId]: false }));  
      setRemarks(prev => ({ ...prev, [itemId]: '' }));            
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

  // Show loading if user context is loading OR data is loading
if (userLoading || loading) {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Action Items</h1>
        <p className="text-gray-600">Manage your assigned tasks and deadlines</p>
      </div>
      
      <div className="bg-white rounded-md shadow-md p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {userLoading ? 'Loading user information...' : 'Loading your action items...'}
          </p>
          
          {/* Debug info for troubleshooting */}
          <div className="mt-4 text-xs text-gray-500">
            <p>Debug: userLoading={userLoading ? 'true' : 'false'}, dataLoading={loading ? 'true' : 'false'}</p>
            <p>Context username: {username || 'null'}</p>
            <p>LocalStorage username: {localStorage.getItem('username') || 'null'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">
        <p className="text-lg font-semibold">Error: {error}</p>
        <button 
          onClick={fetchUserActionItems}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Action Items</h1>
        <p className="text-gray-600">Manage your assigned tasks and deadlines</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">

          {!showEmployeeItems && (
            <>
              <button 
                onClick={() => setShowReassignedTasks(prev => !prev)}
                className="flex items-center px-4 py-2 bg-purple-100 border border-purple-300 text-purple-800 rounded-md hover:bg-purple-200 transition-all"
              >
                <span className="mr-2">{showReassignedTasks ? "📋" : "🔄"}</span>
                {showReassignedTasks ? "View All Action Items" : "View Re-assigned Tasks"}
                {!showReassignedTasks && reassignedCount > 0 && (
                  <span className="ml-2 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {reassignedCount}
                  </span>
                )}
              </button>
            </>
          )}
          
          {/* HR/Admin Only: View Employee Action Items Button */}
          {(role === 'hr' || role === 'admin') && (
            <button 
              onClick={() => {
                // Toggle the view and reset other views
                setShowEmployeeItems(prev => !prev);
                setShowReassignedTasks(false);
              }}
              className="flex items-center px-4 py-2 bg-blue-100 border border-blue-300 text-blue-800 rounded-md hover:bg-blue-200 transition-all"
            >
              <span className="mr-2">👥</span>
              {showEmployeeItems ? "View My Tasks" : "View Employee Tasks"}
            </button>
          )}
        </div>
      </div>

      {/* Action Items List */}
      {showEmployeeItems ? (
        // New component for viewing employee action items
        <ViewEmploActItem onClose={() => setShowEmployeeItems(false)} />
      ) : showReassignedTasks ? (
        // ReassignActionItem component show करें
        <ReassignActionItem onClose={() => setShowReassignedTasks(false)} />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Sort Controls - Simplified */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900">
              All Action Items ({actionItems.length})
            </h2>
            
            {/* Only Quick Sort Dropdown */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 font-medium">Sort:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleClientSort(e.target.value);
                      // Reset after selection to show placeholder again
                      setTimeout(() => e.target.value = '', 100);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose sorting...</option>
                  <option value="due_date_desc">📆 Latest Due Date</option>
                  <option value="action_item">📝 Alphabetical</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Current Sort Indicator */}
          <div className="mb-4 text-xs text-gray-500 text-right">
            {actionItems.length > 0 && 
              <span>
                Sorted by: <span className="font-medium">
                  {currentSort === 'default' ? 'Due Date (Default)' :
                   currentSort === 'priority' ? 'Priority (Urgent First)' :
                   currentSort === 'due_date_asc' ? 'Nearest Due Date' :
                   currentSort === 'due_date_desc' ? 'Latest Due Date' :
                   currentSort === 'status' ? 'Status (A-Z)' :
                   currentSort === 'action_item' ? 'Alphabetical' : 'Custom'}
                </span>
              </span>
            }
          </div>

          {actionItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-700 text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">No action items assigned to you</p>
              <p className="text-gray-400 text-sm mt-2">Action items will appear here when they are assigned to you in MOMs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reassigned Tasks Special Section */}
              {actionItems.some(item => item.re_assigned_to === username) && (
                <div className="mb-6 border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
                  <h2 className="text-lg font-semibold text-purple-800 flex items-center mb-4">
                    <span className="text-xl mr-2">🔄</span> Tasks Reassigned To You
                  </h2>
                  
                  <div className="space-y-3">
                    {actionItems
                      .filter(item => item.re_assigned_to === username)
                      .map((item) => (
                        <div 
                          key={`reassigned-${item.id}`} 
                          className="bg-white rounded-lg border border-purple-200 p-3 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {item.action_item}
                              </h3>
                              
                              <div className="mt-2 text-sm">
                                <div className="flex items-center text-purple-800">
                                  <span className="text-sm mr-1">👤</span>
                                  <span>
                                    Originally assigned to: <span className="font-medium">{item.assigned_to}</span>
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mt-2 text-gray-700">
                                  <div className="flex items-center">
                                    <span className="text-sm mr-1">📅</span>
                                    <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <span className="text-sm mr-1">🏷️</span>
                                    <span>Status: {item.status}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(item.status)}`}>
                                {item.status}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                #{item.id}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex justify-end space-x-2">
                            <button 
                              onClick={() => {
                                // Scroll to the main item
                                document.getElementById(`item-${item.id}`)?.scrollIntoView({ behavior: 'smooth' });
                                // Highlight it temporarily
                                document.getElementById(`item-${item.id}`)?.classList.add('highlight-item');
                                setTimeout(() => {
                                  document.getElementById(`item-${item.id}`)?.classList.remove('highlight-item');
                                }, 2000);
                              }}
                              className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {actionItems.map((item) => (
                <div
                  key={item.id}
                  id={`item-${item.id}`}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPriorityColor(item.due_date, item.status)} 
                  ${item.status === 'Completed' ? 'opacity-80' : ''}
                  ${item.re_assigned_to === username ? 'border-l-4 border-l-purple-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-semibold text-gray-900 flex-1 pr-3 ${item.status === 'Completed' ? 'line-through decoration-gray-400 decoration-1' : ''}`}>
                          {item.action_item} {item.project && <span className="text-Bold text-gray-700 ml-1">({item.project})</span>}
                        </h3>
                        <span className={`px-2 py-1 text-xs text-gray-900 font-semibold rounded-full whitespace-nowrap ${getStatusBadgeColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-md text-gray-900">
                        <p className="flex items-center">
                            📅 <span className="ml-2">Assigned date: {new Date(item.meeting_date).toLocaleDateString()}</span>
                          </p>
                      </div>
                      <br />
                      <div className="text-md text-gray-900 space-y-1">
                        <div className="flex items-center space-x-4">
                          <p className="flex items-center">
                            📅 <span className="ml-1">Due: {new Date(item.due_date).toLocaleDateString()}</span>
                          </p>
                          <p className="flex items-center font-medium">
                            ⏰ <span className="ml-1">{formatDate(item.due_date, item.status)}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-gray-900">
                          <p className="flex items-center">
                            📋 <span className="ml-1">MoM ID: #{item.mom_id}</span>
                          </p>
                          {/* Show original assignee */}
                          <p className="flex items-center text-medium text-gray-900">
                            👤 <span className="ml-1">Assigned: {item.assigned_to}</span>
                          </p>
                          {/* Show last updated info for non-completed items */}
                          {item.status !== 'Completed' && item.updated_at && (
                            <p className="flex items-center text-xs text-blue-600">
                              🔄 <span className="ml-1">Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-gray-900">
                          {/* Show re-assigned info if exists */}
                          {item.re_assigned_to && (
                            <p className="flex items-center text-md text-purple-800 font-medium">
                              🔄 <span className="ml-1">Re-assigned to: {item.re_assigned_to}</span>
                            </p>
                          )}
                          {/* Show completion date for completed items */}
                          {item.status === 'Completed' && item.updated_at && (
                            <p className="flex items-center text-xs text-green-800 font-medium">
                              ✅ <span className="ml-1">Completed on: {new Date(item.updated_at).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                        
                        {/* 🆕 Enhanced Remarks Section - Restored with 10px font and gray-900 */}
                        {item.remark && getRemarksCount(item.remark) > 0 && !showRemarkInput[item.id] && (
                          <div className={`mt-2 border rounded-md p-3 ${getRemarkStyle(item.status).bg}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`text-xs font-medium ${getRemarkStyle(item.status).text}`}>
                                    {getRemarkStyle(item.status).icon} {getRemarkStyle(item.status).label}:
                                    {getRemarksCount(item.remark) > 1 && (
                                      <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                        {getRemarksCount(item.remark)} remarks
                                      </span>
                                    )}
                                  </p>
                                </div>
                                
                                {/* Latest Remark */}
                                {(() => {
                                  const latestRemark = getLatestRemark(item.remark);
                                  if (!latestRemark) return null;
                                  
                                  return (
                                    <div className="space-y-2">
                                      <p className="text-[10px] text-gray-900 font-medium">
                                        {latestRemark.text}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-gray-900 font-medium">
                                        <span>
                                          👤 By: <span className="font-semibold">{latestRemark.by}</span>
                                        </span>
                                        <span>
                                          📅 {new Date(latestRemark.remark_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                
                                {/* Show All Remarks Button */}
                                {getRemarksCount(item.remark) > 1 && (
                                  <button
                                    onClick={() => setShowAllRemarks(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                                    }
                                    className="mt-2 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    {showAllRemarks[item.id] ? '🔼 Hide all remarks' : '🔽 Show all remarks'}
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* All Remarks Expandable Section */}
                            {showAllRemarks[item.id] && getRemarksCount(item.remark) > 1 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <h4 className="text-xs font-medium text-gray-700 mb-2">All Remarks:</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {parseRemarks(item.remark).map((remark, index) => (
                                    <div key={index} className="bg-white bg-opacity-100 p-2 rounded border-l-2 border-gray-300">
                                      <p className="text-[10px] text-gray-900 font-medium">{remark.text}</p>
                                      <div className="flex items-center justify-between text-[10px] text-gray-900 font-medium mt-1">
                                        <span>👤 {remark.by}</span>
                                        <span>📅 {new Date(remark.remark_date).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col space-y-2">
                      {/* Status Dropdown */}
                      <select
                        value={item.status}
                        onChange={(e) => updateActionItemStatus(item.id, e.target.value)}
                        disabled={!canEditItem(item, role)}
                        className={`px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                        ${!canEditItem(item, role) ? 'opacity-80 cursor-not-allowed bg-gray-100' : ''}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      
                      {/* ADD THIS NEW "Add Remark" BUTTON - नया बटन जोड़ें */}
                      {(item.status !== 'Completed' || (role === 'hr' || role === 'admin')) && canEditRemark(item, role) && (
                        <button
                          onClick={() => setShowRemarkInput(prev => ({ ...prev, [item.id]: true }))}
                          className="w-full flex items-center justify-center px-3 py-1 border border-blue-500 bg-blue-50 text-sm rounded-md hover:bg-blue-100 text-blue-700 transition-colors"
                          title="Add new remark"
                        >
                          <span className="mr-1">➕</span> Add Remark
                        </button>
                      )}

                      {/* Re-assign Button - Enhanced logic for employee role */}
                      {canEditItem(item, role) && (
                        // 🔧 Employee can only re-assign once, Admin/HR can always re-assign
                        role === 'employee' ? 
                          // Employee: Show button only if not re-assigned yet
                          !item.re_assigned_to && (
                            <button
                              onClick={() => setShowReassignInput(prev => ({ ...prev, [item.id]: true }))}
                              className="w-full px-3 py-1 border border-purple-500 bg-purple-50 text-sm rounded-md hover:bg-purple-100 text-purple-700 transition-colors"
                              title="Re-assign this task to another person (one time only)"
                            >
                              🔄 Re-assign
                            </button>
                          )
                        :
                          // Admin/HR: Always show button (can re-assign multiple times)
                          <button
                            onClick={() => setShowReassignInput(prev => ({ ...prev, [item.id]: true }))}
                            className="w-full px-3 py-1 border border-purple-500 bg-purple-50 text-sm rounded-md hover:bg-purple-100 text-purple-700 transition-colors"
                            title={role === 'admin' || role === 'hr' ? "Re-assign this task (unlimited)" : "Re-assign this task"}
                          >
                            🔄 Re-assign
                          </button>
                      )}

                      {/* 🆕 Show message when employee has already re-assigned */}
                      {role === 'employee' && item.re_assigned_to && canEditItem(item, role) && (
                        <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 text-xs rounded-md text-center text-gray-600">
                          <div className="flex items-center justify-center space-x-1">
                            <span>✅</span>
                            <span>Already re-assigned</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">
                            To: {item.re_assigned_to}
                          </div>
                        </div>
                      )}
                      
                      {/* Show completed message - no lock icon, just clean info */}
                      {!canEditItem(item, role) && (
                        <div className="text-xs text-gray-700 mt-1 text-center bg-gray-50 p-2 rounded">
                          <p className="text-xs">Contact Hr or Admin for changes</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Remark Input Section - with enhanced permissions */}
                  {showRemarkInput[item.id] && canEditRemark(item, role) && (
                    <div className="mt-4">
                      <div className="mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          {getRemarkStyle(item.status).icon} {getRemarkStyle(item.status).label}:
                        </label>
                      </div>
                      <textarea
                        value={remarks[item.id] || ''}
                        onChange={(e) => setRemarks(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows="3"
                        placeholder={`Add a remark for this ${item.status.toLowerCase()} item...`}
                      />
                      
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            const remarkText = remarks[item.id] || '';
                            if (remarkText.trim()) {
                              // Use addNewRemark instead of updateActionItemRemark
                              addNewRemark(item.id, remarkText.trim());
                            } else {
                              alert('Please enter a remark before saving.');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-all"
                          disabled={!remarks[item.id]?.trim()}
                        >
                          💾 Add Remark
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowRemarkInput(prev => ({ ...prev, [item.id]: false }));
                            setRemarks(prev => ({ ...prev, [item.id]: '' }));
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 transition-all"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show message if remark input is blocked */}
                  {showRemarkInput[item.id] && !canEditRemark(item, role) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center">
                        <span className="text-red-500 mr-2">🔒</span>
                        <div>
                          <p className="text-sm font-medium text-red-800">Cannot Edit Remark</p>
                          <p className="text-xs text-red-600">This item is completed and can only be edited by HR or Admin.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Re-assign Input Section */}
                  {showReassignInput[item.id] && canEditItem(item, role) && (
                    <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="mb-2">
                        <label className="text-sm font-medium text-purple-700">
                          🔄 Re-assign Task To:
                        </label>
                        <p className="text-xs text-purple-600 mt-1">
                          Currently assigned to: <span className="font-medium">{item.assigned_to}</span>
                        </p>
                      </div>
                      
                      <input
                        type="text"
                        value={reassignTo[item.id] || ''}
                        onChange={(e) => setReassignTo(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full p-3 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter username or email of new assignee..."
                      />
                      
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            const newAssignee = reassignTo[item.id]?.trim();
                            if (newAssignee) {
                              updateActionItemReassign(item.id, newAssignee);
                            } else {
                              alert('Please enter a valid username or email.');
                            }
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all"
                        >
                          ✔️ Confirm Re-assign
                        </button>
                        
                        <button
                          onClick={() => setShowReassignInput(prev => ({ ...prev, [item.id]: false }))}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* 🆕 Footer Section - Restored */}
          <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
            {/* Priority Legend */}
            <div className="text-center mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Priority Color Guide</h4>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-red-100 border border-red-400 rounded"></span>
                  <span>🚨 Overdue</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-orange-100 border border-orange-400 rounded"></span>
                  <span>⚠️ Due Today</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></span>
                  <span>📅 Due This Week</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
                  <span>✅ Completed</span>
                </div>
              </div>
            </div>
            
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {actionItems.filter(item => {
                    if (item.status === 'Completed') return false;
                    const today = new Date();
                    const due = new Date(item.due_date);
                    return due < today;
                  }).length}
                </div>
                <div className="text-xs text-gray-600">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {actionItems.filter(item => item.status === 'Pending').length}
                </div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {actionItems.filter(item => item.status === 'In Progress').length}
                </div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {actionItems.filter(item => item.status === 'Completed').length}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
            </div>
            
            {/* Footer Info */}
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p>Last refreshed: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</p>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p>💡 <strong>Quick Tips:</strong> Sort by priority | Add progress remarks | Update status regularly</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMyAIs;