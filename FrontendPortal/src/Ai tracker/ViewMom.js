import React, { useState, useEffect } from 'react';
import { ViewDownloadMom } from './ViewDownloadMom';
import {useUser} from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

// fetch Projects by user ID
const fetchProjectsByUserId = async (user_id) => {
  try {
    const response = await fetch(`${API_BASE}/user-details/user/${user_id}/project-name`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    const data = await response.json();
    //console.log('Fetched user project name:', data);
    return data;
  } catch (error) {
    //console.error('Error fetching projects:', error);
    throw error;
  }
};
// Fetch Information by MOM ID
const fetchMomInformation = async (momId) => {
  try {
    const response = await fetch(`${API_BASE}/mom/mom-information/mom/${momId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch MOM information');
    }

    const data = await response.json();
    return data; // Returns array of information items
  } catch (error) {
    console.error('Error fetching MOM information:', error);
    throw error;
  }
};

// Fetch Decisions by MOM ID
const fetchMomDecisions = async (momId) => {
  try {
    const response = await fetch(`${API_BASE}/mom-decision/mom/${momId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch MOM decisions');
    }

    const data = await response.json();
    return data; // Returns array of decision items
  } catch (error) {
    //console.error('Error fetching MOM decisions:', error);
    throw error;
  }
};

// Fetch Action Items by MOM ID
const fetchMomActionItems = async (momId) => {
  try {
    //console.log(`🎯 Fetching action items for MOM ID: ${momId}`);
    
    const response = await fetch(`${API_BASE}/mom/action-items/mom/${momId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch MOM action items');
    }

    const data = await response.json();
    //console.log('📋 Raw action items data:', data);
    
    // 🆕 Process and validate each action item
    const processedActionItems = data.map((item, index) => {
      //console.log(`📦 Processing action item ${index + 1}:`, item);
      
      // Parse remark if it's a string
      let processedRemark = item.remark;
      if (typeof item.remark === 'string') {
        try {
          processedRemark = JSON.parse(item.remark);
        } catch (e) {
          //console.warn('⚠️ Failed to parse remark JSON:', item.remark);
          processedRemark = [];
        }
      }
      
      //console.log(`📝 Processed remark for item ${item.id}:`, processedRemark);
      //console.log(`📅 Meeting date for item ${item.id}:`, item.meeting_date);
      //console.log(`📁 Project for item ${item.id}:`, item.project);
      
      return {
        ...item,
        remark: processedRemark || [],
        meeting_date: item.meeting_date,
        project: item.project
      };
    });
    
    //console.log('✅ Processed action items:', processedActionItems);
    return processedActionItems;
    
  } catch (error) {
    //console.error('❌ Error fetching MOM action items:', error);
    throw error;
  }
};

// Combined function to fetch all details
const fetchAllMomDetails = async (momId) => {
  try {
    const [information, decisions, actionItems] = await Promise.all([
      fetchMomInformation(momId),
      fetchMomDecisions(momId),
      fetchMomActionItems(momId)
    ]);

    return {
      information,
      decisions,
      actionItems
    };
  } catch (error) {
    //console.error('Error fetching all MOM details:', error);
    throw error;
  }
};

const ViewMom = () => {
  const {user_id,role } = useUser();
  //console.log('User role:', user_id,role);
  const [moms, setMoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMom, setSelectedMom] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMomDetails, setSelectedMomDetails] = useState(null);

  useEffect(() => {
    if (!role) return;

    (async () => {
      setLoading(true);
      try {
        if (role === 'employee') {
          if (!user_id) return;
          const projectData = await fetchProjectsByUserId(user_id).catch(err => {
            //console.warn('Could not fetch project for user:', err);
            alert('Could not fetch project for user'+ err.message);
            return null;
          });
          //console.log('Project data for user:', projectData);
          if(projectData == null) {
            setProjectName(null);
            //console.log('You are not included in any project');
            return;
          }
          const name = projectData && (projectData.project_name || projectData.project) || null;
          //console.log('Employee project name:', name);
          setProjectName(name);
          await fetchMomsForEmployee(name);
        } else {
          // non-employee: fetch all MOMs
          await fetchMoms();
        }
      } catch (err) {
        //console.error('Error during initial data load:', err);
        setError(err.message || String(err));
        setMoms([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user_id, role]);

  const fetchMomsForEmployee = async (project = null) => {
    try {
      let url = `${API_BASE}/mom/?skip=0&limit=10`;
      if (project) {
        url += `&project=${encodeURIComponent(project)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view MOMs.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      //console.log('Fetched MOMs data:', data); // Debug log

      if (data.moms) {
        const sortedMoms = data.moms.sort((a, b) => b.id - a.id);
        setMoms(sortedMoms);
      } else if (Array.isArray(data)) {
        const sortedMoms = data.sort((a, b) => b.id - a.id);
        setMoms(sortedMoms);
      } else {
        //console.warn('Unexpected data format:', data);
        setMoms([]);
      }
    } catch (error) {
      //console.error('Fetch error:', error);
      setError(error.message);
      setMoms([]);
    }
  };

  const fetchMoms = async () => {
    // Reuse the employee fetcher without a project filter
    await fetchMomsForEmployee(null);
  };
  
  

  // Update the fetchMomDetails function with more debug logs:
  const fetchMomDetails = async (momId) => {
    try {
      //console.log('🔍 Starting fetchMomDetails for MOM:', momId);
      
      // Test with just basic data first
      const response = await fetch(`${API_BASE}/mom/${momId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const basicData = await response.json();
      //console.log('✅ Basic data received:', basicData);

      // Set basic data first to test if modal opens
      const initialData = {
        ...basicData,
        information: [],
        decisions: [],
        actionItems: []
      };
      
      //console.log('📦 Setting selectedMomDetails:', initialData);
      setSelectedMomDetails(initialData);
      
      //console.log('🔄 Setting showDetails to true');
      setShowDetails(true);
      
      // Add a small delay to see if state is set
      setTimeout(() => {
        //console.log('⏰ After timeout - showDetails:', showDetails);
        //  console.log('⏰ After timeout - selectedMomDetails:', selectedMomDetails);
      }, 100);

      // Then fetch additional data
      try {
        //console.log('🔍 Fetching additional data...');
        const [information, decisions, actionItems] = await Promise.all([
          fetchMomInformation(momId).catch(err => {
            //console.warn('⚠️ Information fetch failed:', err);
            return [];
          }),
          fetchMomDecisions(momId).catch(err => {
            //console.warn('⚠️ Decisions fetch failed:', err);
            return [];
          }),
          fetchMomActionItems(momId).catch(err => {
            //console.warn('⚠️ Action items fetch failed:', err);
            return [];
          })
        ]);

        //console.log('✅ Additional data fetched:', { information, decisions, actionItems });

        // Update with complete data
        const completeData = {
          ...basicData,
          information,
          decisions,
          actionItems
        };
        
        //console.log('📦 Updating with complete data:', completeData);
        setSelectedMomDetails(completeData);

      } catch (additionalError) {
        //console.warn('⚠️ Additional data fetch failed:', additionalError);
        // Modal will still show with basic data
      }

    } catch (error) {
      //console.error('❌ Failed to fetch MOM details:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 rounded-md p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Minutes of Meeting (MoM)</h1>
          <p className="text-gray-600">View and manage all meeting records</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-blue-100 border-gray-300 border-2 rounded-md shadow-md p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading MOMs...</p>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-8">
              <p className="text-lg font-semibold">Error: {error}</p>
              <button 
                onClick={fetchMomsForEmployee}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Header with count */}
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  All MOMs ({moms.length})
                </h2>
              </div>

              {/* Table */}
              {moms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">No MOMs found</p>
                  <p className="text-gray-400">Create your first MoM to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto border-gray-300 border-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 ">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          MoM ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Meeting Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {moms.map((mom) => (
                        <tr 
                          key={mom.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedMom?.id === mom.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedMom(mom)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{mom.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(mom.meeting_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mom.start_time} - {mom.end_time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mom.project}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              mom.meeting_type === 'Online' 
                                ? 'bg-blue-100 text-blue-900' 
                                : mom.meeting_type === 'Offline' 
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-500 text-green-800'
                            }`}>
                              {mom.meeting_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  fetchMomDetails(mom.id);
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700 transition-colors"
                              >
                                📋 View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MOM Details Panel */}
      {showDetails && (
        <ViewDownloadMom
          details={selectedMomDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedMomDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default ViewMom;
