import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ReassignActionItem = ({ onClose }) => {
  const { username, role } = useUser();
  const [reassignedItems, setReassignedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRemarkInput, setShowRemarkInput] = useState({});
  const [remarks, setRemarks] = useState({});
  const [showAllRemarks, setShowAllRemarks] = useState({});
  const [currentSort, setCurrentSort] = useState('due_date_asc');
  const [reassignedCount, setReassignedCount] = useState(0);
  const [actionItems, setActionItems] = useState([]); 

  useEffect(() => {
    if (username) {
      fetchReassignedItems(currentSort);
    }
  }, [username, currentSort]);

  useEffect(() => {
    // Calculate how many tasks are reassigned to current user
    if (actionItems.length > 0 && username) {
      const count = actionItems.filter(item => item.re_assigned_to === username).length;
      setReassignedCount(count);
    }
  }, [actionItems, username]);

  // fetchReassignedItems function में संशोधन करें
  const fetchReassignedItems = async (sortOrder = 'due_date_asc') => {
    try {
      setLoading(true);
      
      // API endpoint से split करें sort order
      const [sortBy, order] = sortOrder.split('_');
      
      // Standard endpoint - आपके backend API के अनुसार adjust करें
      const response = await fetch(`${API_BASE}/mom/action-items/reassigned/${username}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch action items: ${response.status}`);
      }

      // Parse JSON response
      const data = await response.json();
      //console.log("Full API response:", data);
      //console.log("Reassigned item sample:", data.action_items?.[0]);

      // Properly extract items from the API response structure
      let items = [];
      if (data && data.action_items && Array.isArray(data.action_items)) {
        // API returns {action_items: [...]} format
        items = data.action_items;
      } else if (Array.isArray(data)) {
        // Direct array format
        items = data;
      } else if (data && typeof data === 'object') {
        // Try to find any array in the response
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          items = possibleArrays[0];
        }
      }
      
      // Filter for items that are re-assigned to the current user
      const reassignedToUser = items.filter(item => 
        item.re_assigned_to === username
      );
      
      //console.log(`Found ${reassignedToUser.length} items re-assigned to ${username}`);
      
      // Convert remarks_by_user to remark format for compatibility
      const transformedItems = reassignedToUser.map(item => {
        // If we have remarks_by_user but not remark
        if (item.remarks_by_user && !item.remark) {
          // Flatten the remarks structure to match ViewMyAIs format
          let allRemarks = [];
          
          // Process each user's remarks array
          Object.keys(item.remarks_by_user).forEach(username => {
            if (Array.isArray(item.remarks_by_user[username])) {
              // Add each remark from this user to our array
              allRemarks = [...allRemarks, ...item.remarks_by_user[username]];
            }
          });
          
          // Sort by date if needed
          allRemarks.sort((a, b) => new Date(a.remark_date) - new Date(b.remark_date));
          
          // Convert to JSON string as expected by ViewMyAIs
          return {...item, remark: JSON.stringify(allRemarks)};
        }
        return item;
      });

      // Update with transformed items
      setReassignedItems(transformedItems);
      setLoading(false);
    } catch (error) {
      //console.error('Error fetching re-assigned items:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Status update handler
  const updateActionItemStatus = async (itemId, newStatus) => {
    try {
      // First find the item to check if it's completed
      const item = reassignedItems.find(item => item.id === itemId);
      
      // Prevent employees from updating completed items
      if (role === 'employee' && item && item.status === 'Completed') {
        alert('Completed tasks cannot be modified. Please contact HR or Admin for any changes.');
        return;
      }
      
      const response = await fetch(`${API_BASE}/mom/action-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          updated_at: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        // Update local state
        setReassignedItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? { ...item, status: newStatus, updated_at: new Date().toISOString().split('T')[0] } : item
          )
        );
        
        // Show remark input for status changes
        if (newStatus !== 'Pending') {
          setShowRemarkInput(prev => ({ ...prev, [itemId]: true }));
        }
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      //console.error('Error updating action item:', error);
      alert('Error updating action item: ' + error.message);
    }
  };

  // Add remark handler
  const addRemarkToActionItem = async (itemId, remarkText) => {
    if (!remarkText?.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/mom/action-items/${itemId}/remark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ 
          text: remarkText.trim(),
          username: username
        })
      });

      if (response.ok) {
        const updatedItem = await response.json();
        
        // Update local state
        setReassignedItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? updatedItem : item
          )
        );
        
        // Clear input and hide
        setRemarks(prev => ({ ...prev, [itemId]: '' }));
        setShowRemarkInput(prev => ({ ...prev, [itemId]: false }));
      } else {
        alert('Failed to add remark. Please try again.');
      }
    } catch (error) {
      //console.error('Error adding remark:', error);
      alert('Error adding remark: ' + error.message);
    }
  };

  // Helper functions
  // parseRemarks function को अधिक flexible बनाएं
  const parseRemarks = (remarkData) => {
    if (!remarkData) return [];
    
    try {
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
      
      return [];
    } catch (e) {
      //console.error('Failed to parse remarks:', e);
      return [];
    }
  };

  const getLatestRemark = (remarkData) => {
    const remarks = parseRemarks(remarkData);
    if (!remarks || remarks.length === 0) return null;
    
    // Return the last remark (most recent)
    return remarks[remarks.length - 1];
  };

  // getRemarksCount में भी protection जोड़ें
  const getRemarksCount = (remarkString) => {
    if (!remarkString) return 0;
    const remarks = parseRemarks(remarkString);
    return Array.isArray(remarks) ? remarks.length : 0;
  };

  const formatDate = (dateString, status) => {
    if (!dateString) return '';

    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (status === 'Completed' || status === 'Cancelled') {
      return 'Completed';
    }
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return `Due in ${Math.floor(diffDays / 7)} weeks`;
    }
  };

  const getPriorityColor = (dateString, status) => {
    if (status === 'Completed' || status === 'Cancelled') {
      return 'bg-green-50 border-green-200';
    }

    if (!dateString) return 'bg-white';

    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'bg-red-50 border-red-300'; // Overdue
    } else if (diffDays === 0) {
      return 'bg-orange-50 border-orange-300'; // Due today
    } else if (diffDays <= 7) {
      return 'bg-yellow-50 border-yellow-300'; // Due within a week
    } else {
      return 'bg-white border-gray-200'; // Due later
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getRemarkStyle = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: 'bg-green-50', text: 'text-green-700', icon: '✅', label: 'Completion Notes' };
      case 'In Progress':
        return { bg: 'bg-blue-50', text: 'text-blue-700', icon: '🚀', label: 'Progress Update' };
      case 'Cancelled':
        return { bg: 'bg-gray-50', text: 'text-gray-700', icon: '⚠️', label: 'Cancellation Reason' };
      case 'Pending':
      default:
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '📝', label: 'Remarks' };
    }
  };

  // Check if user can edit items and remarks
  const canEditItem = (item, userRole) => {
    // Admins and HR can edit anything
    if (userRole === 'admin' || userRole === 'hr') return true;
    
    // Employees cannot edit completed items - IMPORTANT FIX
    if (userRole === 'employee' && item.status === 'Completed') return false;
    
    // For employees, they can only edit if they are the assigned or re-assigned person
    return item.assigned_to === username || item.re_assigned_to === username;
  };

  const canEditRemark = (item, userRole) => {
    if (item.status === 'Completed' && userRole !== 'admin' && userRole !== 'hr') {
      return false;
    }
    return canEditItem(item, userRole);
  };

  // Sorting handler
  const handleSort = (sortValue) => {
    setCurrentSort(sortValue);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-purple-800 flex items-center">
          <span className="text-xl mr-2">🔄</span> 
          Re-assigned Tasks ({reassignedItems.length})
        </h2>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="text-sm text-gray-600 font-medium mr-2">Sort:</span>
            <select
              value={currentSort}
              onChange={(e) => handleSort(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="due_date_asc">📆 Due Date (Earliest)</option>
              <option value="due_date_desc">📆 Due Date (Latest)</option>
              <option value="status_asc">📊 Status (A-Z)</option>
              <option value="meeting_date_desc">📅 Assignment Date (Latest)</option>
            </select>
          </div>
          
          <button
            onClick={onClose}
            className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
          >
            ← Back to All Tasks
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-purple-600"></div>
          <p className="mt-3 text-gray-600">Loading re-assigned tasks...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => fetchReassignedItems()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : reassignedItems.length === 0 ? (
        <div className="text-center py-12 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-purple-500 text-6xl mb-4">🔄</div>
          <p className="text-gray-700 text-lg">No tasks have been re-assigned to you</p>
          <p className="text-gray-500 text-sm mt-2">When someone re-assigns a task to you, it will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reassignedItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPriorityColor(item.due_date, item.status)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Re-assigned Banner */}
                  <div className="mb-3 -mt-1 -mx-4 px-4 py-2 bg-purple-100 border-b border-purple-300 rounded-t-lg">
                    <div className="flex items-center">
                      <span className="text-purple-800 mr-2 text-xl">🔄</span>
                      <div>
                        <p className="font-medium text-purple-900">Task re-assigned to you</p>
                        <p className="text-xs text-purple-700">Originally assigned to: <b>{item.assigned_to}</b></p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Task Title */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-semibold text-gray-900 flex-1 pr-3 ${item.status === 'Completed' ? 'line-through decoration-gray-400 decoration-1' : ''}`}>
                      {item.action_item} {item.project && <span className="text-Bold text-gray-700 ml-1">({item.project})</span>}
                    </h3>
                    <span className={`px-2 py-1 text-xs text-gray-900 font-semibold rounded-full whitespace-nowrap ${getStatusBadgeColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  {/* Task Details */}
                  <div className="text-md text-gray-900 space-y-1">
                    {/* Dates */}
                    <div className="flex items-center space-x-4">
                      <p className="flex items-center">
                        📅 <span className="ml-1">Due: {new Date(item.due_date).toLocaleDateString()}</span>
                      </p>
                      <p className="flex items-center font-medium">
                        ⏰ <span className="ml-1">{formatDate(item.due_date, item.status)}</span>
                      </p>
                    </div>
                    
                    {/* MoM and Assignment Info */}
                    <div className="flex items-center space-x-4 text-gray-900">
                      <p className="flex items-center">
                        📋 <span className="ml-1">MoM ID: #{item.mom_id}</span>
                      </p>
                      <p className="flex items-center text-medium text-gray-900">
                        👤 <span className="ml-1">Originally: {item.assigned_to}</span>
                      </p>
                      {item.meeting_date && (
                        <p className="flex items-center text-xs text-gray-600">
                          📅 <span className="ml-1">Created: {new Date(item.meeting_date).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                    
                    {/* Remarks Display - Fix for displaying remarks */}
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
                                onClick={() => setShowAllRemarks(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className="mt-2 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {showAllRemarks[item.id] ? '🔼 Hide all remarks' : '🔽 Show all remarks'}
                              </button>
                            )}
                          </div>
                          
                          {/* Add remark button */}
                          {canEditRemark(item, role) && (
                            <button
                              onClick={() => setShowRemarkInput(prev => ({ ...prev, [item.id]: true }))}
                              className="text-xs text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 ml-2"
                              title="Add new remark"
                            >
                              ➕
                            </button>
                          )}
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
                                    <span>📅 {remark.remark_date ? new Date(remark.remark_date).toLocaleDateString() : ''}</span>
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
                
                {/* Actions Column */}
                <div className="ml-4 flex flex-col space-y-2">
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
                  
                  {/* Add Remark Button */}
                  {canEditRemark(item, role) && !showRemarkInput[item.id] && (
                    <button
                      onClick={() => setShowRemarkInput(prev => ({ ...prev, [item.id]: true }))}
                      className="w-full px-3 py-1 border border-blue-500 bg-blue-50 text-sm rounded-md hover:bg-blue-100 text-blue-700 transition-colors"
                      title="Add remarks or progress updates"
                    >
                      📝 Add Remark
                    </button>
                  )}
                  
                  {/* Cannot Edit Message */}
                  {!canEditItem(item, role) && (
                    <div className="text-xs text-gray-700 mt-1 text-center bg-gray-50 p-2 rounded">
                      <p className="text-xs">Contact HR or Admin for changes</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Remark Input */}
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
                      onClick={() => addRemarkToActionItem(item.id, remarks[item.id])}
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
              
              {/* Remark Restriction Message */}
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

              {/* Status Completed Warning for Employees - Add after line ~527 */}
              {role === 'employee' && item.status === 'Completed' && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    <div>
                      <p className="text-sm font-medium text-green-800">Task Completed</p>
                      <p className="text-xs text-green-600">This task is marked as completed and cannot be modified.</p>
                      <p className="text-xs text-green-600 mt-1">Contact HR or Admin for any changes.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Statistics Footer */}
      {reassignedItems.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {reassignedItems.filter(item => {
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
                {reassignedItems.filter(item => item.status === 'Pending').length}
              </div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {reassignedItems.filter(item => item.status === 'In Progress').length}
              </div>
              <div className="text-xs text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {reassignedItems.filter(item => item.status === 'Completed').length}
              </div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-400">
            <p>Last refreshed: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReassignActionItem;