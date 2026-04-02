import React, { useState } from 'react';
import { isPast, differenceInDays, isToday, startOfWeek, endOfWeek } from 'date-fns';


const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ViewEmploActItem = ({ onClose }) => {
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [currentSort, setCurrentSort] = useState('due_date_asc');
  const [showAllRemarks, setShowAllRemarks] = useState({});
  const [manualUsername, setManualUsername] = useState('');
  
  
  
  // Fetch action items for selected employee
  const fetchEmployeeActionItems = async (employeeUsername) => {
    if (!employeeUsername) return;
    
    try {
      setLoading(true);
      
      // दोनों API endpoints के लिए Promise.all का उपयोग
      const [assignedResponse, reassignedResponse] = await Promise.all([
        // मूल असाइन्ड आइटम्स फेच करें
        fetch(`${API_BASE}/mom/action-items/user/${employeeUsername}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          }
        }),
        
        // रीअसाइन्ड आइटम्स फेच करें
        fetch(`${API_BASE}/mom/action-items/reassigned/${employeeUsername}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          }
        })
      ]);
      
      // चेक करें कि दोनों रिस्पांस OK हैं
      if (!assignedResponse.ok) {
        throw new Error(`Failed to fetch assigned items: ${assignedResponse.status}`);
      }
      
      if (!reassignedResponse.ok) {
        throw new Error(`Failed to fetch reassigned items: ${reassignedResponse.status}`);
      }
      
      // दोनों रिस्पांस का JSON पार्स करें
      const assignedData = await assignedResponse.json();
      const reassignedData = await reassignedResponse.json();
      
      //console.log("Assigned items data:", assignedData);
      //console.log("Reassigned items data:", reassignedData);
      
      // बेहतर डेटा एक्सट्रैक्शन - Assigned Items
      let assignedItems = [];
      if (assignedData && assignedData.action_items && Array.isArray(assignedData.action_items)) {
        assignedItems = assignedData.action_items;
      } else if (Array.isArray(assignedData)) {
        assignedItems = assignedData;
      } else if (typeof assignedData === 'object') {
        // Try to find items in different object structures
        if (assignedData.items && Array.isArray(assignedData.items)) {
          assignedItems = assignedData.items;
        } else {
          // Look for any array properties
          for (const key in assignedData) {
            if (Array.isArray(assignedData[key]) && assignedData[key].length > 0 && assignedData[key][0].action_item) {
              assignedItems = assignedData[key];
              break;
            }
          }
        }
      }
      
      // Add a flag to indicate these are assigned items (not reassigned)
      assignedItems = assignedItems.map(item => ({
        ...item,
        isReassigned: false
      }));
      
      // बेहतर डेटा एक्सट्रैक्शन - Reassigned Items
      let reassignedItems = [];
      if (reassignedData && reassignedData.action_items && Array.isArray(reassignedData.action_items)) {
        reassignedItems = reassignedData.action_items;
      } else if (Array.isArray(reassignedData)) {
        reassignedItems = reassignedData;
      } else if (typeof reassignedData === 'object') {
        // Try to find items in different object structures
        if (reassignedData.items && Array.isArray(reassignedData.items)) {
          reassignedItems = reassignedData.items;
        } else {
          // Look for any array properties
          for (const key in reassignedData) {
            if (Array.isArray(reassignedData[key]) && reassignedData[key].length > 0 && reassignedData[key][0].action_item) {
              reassignedItems = reassignedData[key];
              break;
            }
          }
        }
      }
      
      // Add a flag to indicate these are reassigned items
      reassignedItems = reassignedItems.map(item => ({
        ...item,
        isReassigned: true
      }));    
      
      let allItems = [...assignedItems, ...reassignedItems];
      
      const transformedItems = allItems.map(item => {
        // Check if we have remarks_by_user but no remark property
        if (item.remarks_by_user && !item.remark) {
          //console.log(`Item ${item.id} has remarks_by_user format, converting...`);
          
          // Convert remarks_by_user format to remark format
          let allRemarks = [];
          
          // Process each user's remarks
          Object.keys(item.remarks_by_user).forEach(username => {
            if (Array.isArray(item.remarks_by_user[username])) {
              // Add each remark to our combined array
              allRemarks = [...allRemarks, ...item.remarks_by_user[username]];
            }
          });
          
          // Sort remarks by date
          allRemarks.sort((a, b) => new Date(a.remark_date) - new Date(b.remark_date));
          
          // Store the original format
          const originalFormat = item.remarks_by_user;
          
          // Convert to the format expected by the UI
          return {
            ...item,
            remark: Array.isArray(allRemarks) ? allRemarks : [], // Keep as array, not JSON string
            originalRemarksFormat: originalFormat // Keep original for reference
          };
        }
        return item;
      });

      const sortedItems = sortActionItems(transformedItems, currentSort);
      setActionItems(sortedItems);
      setLoading(false);
    } catch (error) {
      //console.error('Error fetching items:', error);
      alert('Error fetching items: ' + error.message);
      setLoading(false);
    }
  };
  
  // Sort action items
  const sortActionItems = (items, sortOption) => {
    const [field, order] = sortOption.split('_');
    
    return [...items].sort((a, b) => {
      if (field === 'due_date') {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (field === 'status') {
        return order === 'asc' 
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      
      return 0;
    });
  };
  
  // Handle sort change
  const handleSort = (sortOption) => {
    setCurrentSort(sortOption);
    const sortedItems = sortActionItems(actionItems, sortOption);
    setActionItems(sortedItems);
  };
  
  // Helper functions for UI display
  const getPriorityColor = (dueDate, status) => {
    if (status === 'Completed') return 'border-green-300 bg-green-50';
    
    const today = new Date();
    const due = new Date(dueDate);
    
    if (isPast(due) && !isToday(due)) return 'border-red-400 bg-red-50';
    if (isToday(due)) return 'border-orange-400 bg-orange-50';
    
    const thisWeekStart = startOfWeek(today);
    const thisWeekEnd = endOfWeek(today);
    
    if (due >= thisWeekStart && due <= thisWeekEnd) {
      return 'border-yellow-400 bg-yellow-50';
    }
    
    return 'border-gray-300 bg-white';
  };
  
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString, status) => {
    if (status === 'Completed') return 'Completed';
    
    const dueDate = new Date(dateString);
    const today = new Date();
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      const days = Math.abs(differenceInDays(dueDate, today));
      return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
    }
    
    if (isToday(dueDate)) {
      return 'Due today';
    }
    
    const days = differenceInDays(dueDate, today);
    return `Due in ${days} ${days === 1 ? 'day' : 'days'}`;
  };
  
  // Parse remarks helper
  const parseRemarks = (remarkData) => {
    if (!remarkData) return [];
    
    // If already an array, return it
    if (Array.isArray(remarkData)) return remarkData;
    
    // If object with expected fields, wrap in array
    if (typeof remarkData === 'object' && remarkData.text) {
      return [remarkData];
    }
    
    // If string, try to parse
    if (typeof remarkData === 'string') {
      try {
        const parsed = JSON.parse(remarkData);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Plain text remark
        return [{ 
          text: remarkData,
          by: "Unknown", 
          remark_date: new Date().toISOString() 
        }];
      }
    }
    
    return [];
  };
  
  const getRemarkStyle = (status) => {
    switch (status) {
      case 'Completed': 
        return {
          bg: 'bg-green-50',
          text: 'text-green-800',
          icon: '✅',
          label: 'Completion Note'
        };
      case 'In Progress': 
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          icon: '🔄',
          label: 'Progress Update'
        };
      default: 
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-800',
          icon: '📝',
          label: 'Remark'
        };
    }
  };
  
  const getRemarksCount = (remarkString) => {
    const remarks = parseRemarks(remarkString);
    return remarks.length;
  };
  
  // updateActionItemStatus फंक्शन को अपडेट करें
  const updateActionItemStatus = async (itemId, newStatus) => {
    try {
      // API से update_action_item एंडपॉइंट का उपयोग (router.put)
      const updateData = { 
        status: newStatus,
        updated_by: manualUsername || 'admin'
      };
      
      const response = await fetch(`${API_BASE}/mom/action-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }
      
      //console.log(`Status updated successfully for item ${itemId}`);
      fetchEmployeeActionItems(selectedEmployee);
      return true;
    } catch (error) {
      //console.error('Error updating action item status:', error);
      setError(error.message);
      return false;
    }
  };
  
  const canEditEmployeeItems = () => {
    return true;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header section - Updated to show who is viewing */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-blue-800 flex items-center">
            <span className="text-xl mr-2">👥</span> 
            Employee Action Items
          </h2>
          <p className="text-xs text-gray-800 mt-1">
            Viewing as: <span className="font-medium">{manualUsername}</span>
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
        >
          ← Back to My Tasks
        </button>
      </div>
      
      {/* Employee selector */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">

        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter employee username : <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Type username..."
                />
          </div>
          
          <button
            onClick={() => {
              const usernameToFetch = manualUsername;
              if (usernameToFetch) {
                // Reset states first
                setActionItems([]);
                setError(null);
                //console.log("Fetching data for:", usernameToFetch);
                fetchEmployeeActionItems(usernameToFetch);
                setSelectedEmployee(usernameToFetch);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            View Tasks
          </button>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-3 text-gray-600">Loading data...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12 text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(false);
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Error
          </button>
        </div>
      )}
      
      {/* No employee selected */}
      {!selectedEmployee && !loading && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-500 text-6xl mb-4">👥</div>
          <p className="text-gray-700 text-lg">Select an employee to view their tasks</p>
          <p className="text-gray-500 text-sm mt-2">You can monitor and manage tasks assigned to your team members</p>
        </div>
      )}
      
      {/* Employee selected but no items */}
      {selectedEmployee && actionItems.length === 0 && !loading && !error && (
        <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-blue-500 text-6xl mb-4">📋</div>
          <p className="text-gray-700 text-lg">No action items found for {selectedEmployee}</p>
          <p className="text-gray-500 text-sm mt-2">This employee doesn't have any assigned tasks yet</p>
        </div>
      )}
      
      {/* Employee items display */}
      {selectedEmployee && actionItems.length > 0 && !loading && !error && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedEmployee}'s Action Items ({actionItems.length})
            </h2>
            
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 font-medium">Sort:</span>
                <select
                  value={currentSort}
                  onChange={(e) => handleSort(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="due_date_asc">📆 Due Date (Earliest)</option>
                  <option value="due_date_desc">📆 Due Date (Latest)</option>
                  <option value="status_asc">📊 Status (A-Z)</option>
                </select>
              </div>
              
              <button
                onClick={() => fetchEmployeeActionItems(selectedEmployee)}
                className="ml-2 px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                title="Refresh data"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          {/* Action items list */}
          <div className="space-y-4">
            {actionItems.map((item) => {
              // Check if item is reassigned or not
              const isReassigned = item.isReassigned;
              
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPriorityColor(item.due_date, item.status)} 
                  ${item.status === 'Completed' ? 'opacity-80' : ''}
                  ${isReassigned ? 'border-l-4 border-l-purple-500' : ''}`}
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

                      {/* Re-assigned indicator */}
                      {(isReassigned || item.re_assigned_to) && (
                        <div className="mb-3 -mt-1 px-3 py-2 bg-purple-100 border-b border-purple-300 rounded-md">
                          <div className="flex items-center">
                            <span className="text-purple-800 mr-2 text-xl">🔄</span>
                            <div>
                              <p className="font-medium text-purple-900">Task re-assigned</p>
                              {item.re_assigned_to && (
                                <p className="text-xs text-purple-700">From: <b>{item.assigned_to}</b> To: <b>{item.re_assigned_to}</b></p>
                              )}
                              {!item.re_assigned_to && isReassigned && (
                                <p className="text-xs text-purple-700">This task was re-assigned to <b>{manualUsername}</b></p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-md text-gray-900">
                        <p className="flex items-center">
                          📅 <span className="ml-2">Assigned date: {new Date(item.meeting_date).toLocaleDateString()}</span>
                        </p>
                      </div>
                      
                      <div className="text-md text-gray-900 space-y-1 mt-2">
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
                          <p className="flex items-center text-medium text-gray-900">
                            👤 <span className="ml-1">Assigned: {item.assigned_to}</span>
                          </p>
                          {item.status !== 'Completed' && item.updated_at && (
                            <p className="flex items-center text-xs text-blue-600">
                              🔄 <span className="ml-1">Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                        
                        {item.status === 'Completed' && item.updated_at && (
                          <p className="flex items-center text-xs text-green-800 font-medium">
                            ✅ <span className="ml-1">Completed on: {new Date(item.updated_at).toLocaleDateString()}</span>
                          </p>
                        )}
                        
                        {/* Enhanced Remarks Display - FIXED VERSION */}
                        {(item.all_remarks?.length > 0 || item.latest_remark || item.remarks_by_user || (item.remark && item.remark.length > 0)) && (
                          <div className={`mt-2 border rounded-md p-3 ${getRemarkStyle(item.status).bg}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`text-xs font-medium ${getRemarkStyle(item.status).text}`}>
                                    {getRemarkStyle(item.status).icon} {getRemarkStyle(item.status).label}:
                                    {((item.remark_count && item.remark_count > 1) || (item.all_remarks && item.all_remarks.length > 1)) && (
                                      <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                        {item.remark_count || (item.all_remarks ? item.all_remarks.length : 0)} remarks
                                      </span>
                                    )}
                                  </p>
                                </div>
                                
                                {/* Latest Remark Display - simplified */}
                                {item.latest_remark && (
                                  <div className="bg-white bg-opacity-70 p-2 rounded">
                                    <p className="text-xs text-gray-900">{item.latest_remark.text}</p>
                                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                                      <span>👤 {item.latest_remark.by}</span>
                                      <span>📅 {new Date(item.latest_remark.remark_date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Remarks display - for item.remark logic added */}
                                {!item.latest_remark && item.remark && item.remark.length > 0 && (
                                  <div className="bg-white bg-opacity-70 p-2 rounded">
                                    <p className="text-[15px] text-black">{Array.isArray(item.remark) ? item.remark[item.remark.length-1].text : ""}</p>
                                    <div className="flex items-center justify-between text-[15px] text-black mt-1">
                                      <span>👤 {Array.isArray(item.remark) ? item.remark[item.remark.length-1].by : ""}</span>
                                      <span>📅 {Array.isArray(item.remark) && item.remark[item.remark.length-1].remark_date ? 
                                        new Date(item.remark[item.remark.length-1].remark_date).toLocaleDateString() : ''}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* "Show all remarks" button - for item.remark */}
                                {item.remark && Array.isArray(item.remark) && item.remark.length > 1 && (
                                  <button
                                    className="mt-2 text-[15px] text-blue-600 hover:text-blue-900 font-medium"
                                    onClick={() => setShowAllRemarks(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                  >
                                    {showAllRemarks[item.id] ? '🔼 Hide all remarks' : '🔽 Show all remarks'} 
                                    ({item.remark.length})
                                  </button>
                                )}
                                
                                {/* All Remarks section - for item.remark */}
                                {showAllRemarks[item.id] && item.remark && Array.isArray(item.remark) && item.remark.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <h4 className="text-xs font-medium text-gray-700 mb-2">All Remarks:</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {item.remark.map((remark, index) => (
                                        <div key={index} className="bg-white bg-opacity-100 p-2 rounded border-l-2 border-gray-300">
                                          <p className="text-xs text-gray-900 font-medium">{remark.text}</p>
                                          <div className="flex items-center justify-between text-[10px] text-gray-900 font-medium mt-1">
                                            <span>👤 {remark.by}</span>
                                            <span>📅 {remark.remark_date ? new Date(remark.remark_date).toLocaleDateString() : ''}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Add Status Change Option for Admin */}
                  {canEditEmployeeItems() && (
                    <div className="ml-4 flex-shrink-0">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
                            // Show loading indicator
                            const updatingElement = document.getElementById(`updating-status-${item.id}`);
                            if (updatingElement) updatingElement.classList.remove('hidden');
                            
                            // Call API to update status
                            updateActionItemStatus(item.id, newStatus)
                              .then(success => {
                                if (success) {
                                  //console.log(`Status updated to ${newStatus}`);
                                }
                                // Hide loading indicator
                                if (updatingElement) updatingElement.classList.add('hidden');
                              });
                          }
                        }}
                        className={`px-3 py-1 border rounded-md text-sm w-32 font-medium ${getStatusBadgeColor(item.status)}`}
                      >
                        <option value="Pending" className='bg-white text-yellow-800'>Pending</option>
                        <option value="In Progress" className='bg-white text-blue-800'>In Progress</option>
                        <option value="Completed" className='bg-white text-green-800'>Completed</option>
                        <option value="Cancelled" className='bg-white text-gray-800'>Cancelled</option>
                      </select>
                      
                      <div id={`updating-status-${item.id}`} className="text-xs text-blue-600 mt-1 hidden">
                        <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent mr-1"></div>
                        Updating...
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Stats */}
          <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {actionItems.filter(item => {
                    const dueDate = new Date(item.due_date);
                    return isPast(dueDate) && !isToday(dueDate) && item.status !== 'Completed';
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
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {actionItems.filter(item => item.isReassigned).length}
                </div>
                <div className="text-xs text-gray-600">Reassigned</div>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-400">
              <p>Last refreshed: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ViewEmploActItem;