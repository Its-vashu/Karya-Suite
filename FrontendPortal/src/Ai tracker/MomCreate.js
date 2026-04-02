import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext'; 
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const MomCreate = () => {
  const { currentTime, currentdate,user_id } = useUser();
  //console.log(user_id)
  
  const convertTimeToInputFormat = (timeStr) => {
    if (!timeStr) return '';
    const [time] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  };

  // Helper function to add one hour
  const addOneHour = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalHours = hours + (period === 'PM' && hours !== 12 ? 12 : 0);
    
    totalHours = (totalHours + 1) % 24;
    const newPeriod = totalHours >= 12 ? 'PM' : 'AM';
    const displayHours = totalHours % 12 || 12;
    
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${newPeriod}`;
  };

  // Initialize form data with the passed time
  const [formData, setFormData] = useState(() => {
    const localStorageKey = `momFormData_${user_id}`;
    const savedData = user_id ? localStorage.getItem(localStorageKey) : null;
    
    let initialData = {
      date: currentdate,
      startTime: convertTimeToInputFormat(currentTime),
      endTime: convertTimeToInputFormat(addOneHour(currentTime)),
      attendees: '',
      Absent: '',
      otherAttendees: '',
      project: '',
      customProject: '',
      meetingType: 'Online',
      information: [],
      decision: [],
      actionItems: [],
      location: '',
      dueDate: currentdate,
    };
    
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);

        initialData = {
          ...parsedData,
          date: currentdate,
          startTime: convertTimeToInputFormat(currentTime),
          endTime: convertTimeToInputFormat(addOneHour(currentTime)),
          dueDate: currentdate
        };
        // console.log('📋 Restored form data with updated date/time:', initialData);
      } catch (error) {
        // console.error('Error parsing saved form data:', error);
        alert('Error parsing saved form data: '+error.message);
      }
    }
    
    // console.log('🚀 Final initial form data:', initialData);
    return initialData;
  });

  // Update form when time changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      startTime: convertTimeToInputFormat(currentTime),
      endTime: convertTimeToInputFormat(addOneHour(currentTime))
    }));
  }, [currentTime]);

  // Fetch projects when component mounts
  useEffect(() => {
    fetchProjects();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (user_id) {
      const localStorageKey = `momFormData_${user_id}`;
      localStorage.setItem(localStorageKey, JSON.stringify(formData));
    }
  }, [formData]);

  const [selectedType, setSelectedType] = useState('');
  const [currentEntry, setCurrentEntry] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // New state for projects and employees
  const [projects, setProjects] = useState([]);
  const [projectEmployees, setProjectEmployees] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Add new state for action item details
  const [actionItemDetails, setActionItemDetails] = useState({
    text: '',
    dueDate: currentdate, // Set initial dueDate to currentdate
    assignedTo: ''
  });

  // Add new state for all users
  const [allUsers, setAllUsers] = useState([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Function to fetch all projects
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`${API_BASE}/project/names`);
      if (response.ok) {
        const data = await response.json();
        // console.log('📋 Fetched projects:', data);
        setProjects(data || []);
      } else {
        // console.error('Failed to fetch projects');
        alert('Failed to fetch projects');
      }
    } catch (error) {
      // console.error('Error fetching projects:', error);
      alert('Error fetching projects: '+error.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Function to fetch employees by project name
  const fetchProjectEmployees = async (projectName) => {
    if (!projectName) {
      setProjectEmployees([]);
      return;
    }
    
    setLoadingEmployees(true);
    try {
      const response = await fetch(`${API_BASE}/user-details/project/${encodeURIComponent(projectName)}`);
      if (response.ok) {
        const data = await response.json();
        setProjectEmployees(data.users || []);
      } else {
        // console.error('Failed to fetch project employees');
        alert('Failed to fetch project employees');
        setProjectEmployees([]);
      }
    } catch (error) {
      // console.error('Error fetching project employees:', error);
      alert('Error fetching project employees: '+error.message);
      setProjectEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Add new function to fetch all users
  const fetchAllUsers = async () => {
    setLoadingAllUsers(true);
    try {
      const response = await fetch(`${API_BASE}/users/basic`);
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      } else {
        // console.error('Failed to fetch all users');
        alert('Failed to fetch all users');
        setAllUsers([]);
      }
    } catch (error) {
      // console.error('Error fetching all users:', error);
      alert('Error fetching all users: '+error.message);
      setAllUsers([]);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // Handle project change - Simplified
  const handleProjectChange = (e) => {
    const selectedProject = e.target.value;
    
    //console.log('🎯 Project changed to:', selectedProject); // Debug log
    
    // Clear attendees and absent when changing project
    setFormData(prev => ({ 
      ...prev, 
      project: selectedProject,
      attendees: '', 
      Absent: '',
      // Reset custom project when switching away from Other
      ...(selectedProject !== 'Other' && { customProject: '' })
    }));
    
    // Fetch employees only if it's not "Other" and not empty
    if (selectedProject && selectedProject !== 'Other') {
      fetchProjectEmployees(selectedProject);
    } else {
      setProjectEmployees([]); // Clear project employees for "Other"
      // Ensure all users are loaded for "Other" option
      if (selectedProject === 'Other' && allUsers.length === 0) {
        fetchAllUsers();
      }
    }
  };

  // Handle attendee selection
  const handleAttendeeSelection = (employeeName) => {
    const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
    
    if (!currentAttendees.includes(employeeName)) {
      const newAttendees = [...currentAttendees, employeeName].filter(name => name !== '').join(', ');
      setFormData({ ...formData, attendees: newAttendees });
    }
  };

  // Handle absent selection
  const handleAbsentSelection = (employeeName) => {
    const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
    
    if (!currentAbsent.includes(employeeName)) {
      const newAbsent = [...currentAbsent, employeeName].filter(name => name !== '').join(', ');
      setFormData({ ...formData, Absent: newAbsent });
    }
  };

  // MomCreate.js में handleSubmit function को update करें
const handleSubmit = async (type) => {
  setLoading(true);
  setMessage('');

  try {
    // console.log('Form data before validation:', formData);
    // console.log('User ID:', user_id);

    // Check if user_id is available
    if (!user_id) {
      setMessage('User not logged in. Please refresh the page.');
      setLoading(false);
      return;
    }

    // Enhanced validation
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.project) {
      setMessage('Please fill in all required fields (Date, Start Time, End Time, Project)');
      setLoading(false);
      return;
    }
    
    // 🆕 Add this validation for custom project
    if (formData.project === 'Other' && (!formData.customProject || formData.customProject.trim() === '')) {
      setMessage('Please enter a custom project name');
      setLoading(false);
      return;
    }

    // Validate time range
    if (formData.startTime >= formData.endTime) {
      setMessage('End time must be after start time');
      setLoading(false);
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today && type === 'send') {
      setMessage('Cannot send MoM for past dates. You can only save them.');
      setLoading(false);
      return;
    }

    // Helper function to convert comma-separated string to array
    const stringToArray = (str) => {
      if (!str || str.trim() === '') return [];
      return str.split(',').map(item => item.trim()).filter(item => item !== '');
    };

    // Helper function to convert time to HH:MM:SS format
    const timeToFullFormat = (timeStr) => {
      if (!timeStr) return '00:00:00';
      // If already has seconds, return as is
      if (timeStr.split(':').length === 3) return timeStr;
      // Add seconds if missing
      return `${timeStr}:00`;
    };

    // Ensure attendees array has at least one element if empty
    const attendeesArray = stringToArray(formData.attendees);
    const outerAttendeesArray = stringToArray(formData.otherAttendees);

    // Debug logging to see exact values
    // console.log('📋 Form meetingType value:', formData.meetingType);
    // console.log('📋 Type of meetingType:', typeof formData.meetingType);

    // First create the main MoM
    const momPayload = {
      meeting_date: formData.date,
      start_time: timeToFullFormat(formData.startTime),
      end_time: timeToFullFormat(formData.endTime),
      attendees: attendeesArray.length > 0 ? attendeesArray : ["Default User"],
      absent: formData.Absent ? stringToArray(formData.Absent) : [],
      outer_attendees: outerAttendeesArray,
      project: formData.project === 'Other' ? formData.customProject : formData.project,
      meeting_type: formData.meetingType, // This should be "Online", "Offline", or "Hybrid"
      location_link: formData.location || "",
      created_by: parseInt(user_id)
    };

    // Debug the exact payload being sent
    // console.log('📤 Complete MoM Payload:', JSON.stringify(momPayload, null, 2));
    // console.log('📤 meeting_type value being sent:', momPayload.meeting_type);
    
    // Get authentication token
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }
    
    const momResponse = await fetch(`${API_BASE}/mom/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(momPayload)
    });

    if (!momResponse.ok) {
      const errorData = await momResponse.json();
      throw new Error(errorData.detail || 'Failed to create MoM');
    }

    const momData = await momResponse.json();
    const momId = momData.id;
    //console.log('✅ MoM created with ID:', momId);

    // 🔧 === CREATE INFORMATION ENTRIES ===
    if (formData.information.length > 0) {
      //console.log('📝 Creating information entries:', formData.information);
      
      for (const info of formData.information) {
        try {
          // 🔧 Fixed endpoint - remove "/mom" prefix since it's already in router
          const infoResponse = await fetch(`${API_BASE}/mom/mom-information/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              mom_id: momId,  // 🔧 Add mom_id field
              information: info.trim()
            })
          });

          if (!infoResponse.ok) {
            const errorData = await infoResponse.json();
            //console.error('❌ Failed to create information entry:', errorData);
            alert('Failed to create information entry: ' + errorData.detail );
          } else {
            //console.log('✅ Information entry created successfully');
          }
        } catch (error) {
          //console.error('❌ Error creating information entry:', error);
          alert('Error creating information entry: ' + error.message);
        }
      }
    }

    // 🔧 === CREATE DECISION ENTRIES ===
    if (formData.decision.length > 0) {
      //console.log('✅ Creating decision entries:', formData.decision);
      
      for (const decision of formData.decision) {
        try {
          // 🔧 Endpoint already correct
          const decisionResponse = await fetch(`${API_BASE}/mom-decision/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              mom_id: momId,
              decision: decision.trim()
            })
          });

          if (!decisionResponse.ok) {
            const errorData = await decisionResponse.json();
            //console.error('❌ Failed to create decision entry:', errorData);
            alert('Failed to create decision entry: ' + (errorData.detail || 'Unknown error'));
          } else {
            //console.log('✅ Decision entry created successfully');
          }
        } catch (error) {
          //console.error('❌ Error creating decision entry:', error);
          alert('Error creating decision entry: ' + error.message);
        }
      }
    }

    // 🔧 === CREATE ACTION ITEMS ===
    if (formData.actionItems.length > 0) {
      //console.log('🎯 Creating action items:', formData.actionItems);
      
      for (const actionItem of formData.actionItems) {
        try {
          const actionItemPayload = {
            mom_id: momId,
            action_item: actionItem.text.trim(),
            assigned_to: actionItem.assignedTo,
            due_date: actionItem.dueDate,
            status: 'Pending',
            project: formData.project === 'Other' ? formData.customProject : formData.project,
            meeting_date: formData.date
          };

          //console.log('🎯 Action item payload:', actionItemPayload);

          // 🔧 Fixed endpoint - use the correct router prefix
          const actionResponse = await fetch(`${API_BASE}/mom/action-items/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(actionItemPayload)
          });

          if (!actionResponse.ok) {
            const errorData = await actionResponse.json();
            //console.error('❌ Failed to create action item:', errorData);
            alert('Failed to create action item: ' + (errorData.detail || 'Unknown error'));
          } else {
            //console.log('✅ Action item created successfully');
          }
        } catch (error) {
          //console.error('❌ Error creating action item:', error);
          alert('Error creating action item: ' + error.message);
        }
      }
    }

    // === 📧 PDF SEND LOGIC ===
    if (type.toLowerCase() === 'send') {
      try {
        const attendees = formData.attendees.split(',').map(u => u.trim()).filter(Boolean);
        
        if (attendees.length > 0) {
          //console.log('📧 Sending PDF to attendees:', attendees);
          
          // Wait a bit for all data to be saved
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const pdfResponse = await fetch(
            `${API_BASE}/mom/${momId}/generate-and-send-pdf?usernames=${attendees.join(',')}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (pdfResponse.ok) {
            const result = await pdfResponse.json();
            toast.success(`✅ PDF sent to ${result.recipients.length} attendees!`);
            //console.log('📧 PDF sent successfully:', result);
          } else {
            const error = await pdfResponse.json();
            //console.error('PDF send error:', error);
            throw new Error(error.detail || 'Failed to send PDF');
          }
        } else {
          //console.log('⚠️ No attendees found to send PDF');
          toast.warning('No attendees found to send PDF');
        }
        
      } catch (error) {
        //console.error('Error sending PDF:', error);
        toast.error('Failed to send PDF: ' + error.message);
        // Don't throw the error - let the MOM creation succeed even if email fails
      }
    }

    // Set different success messages based on type
    if (type.toLowerCase() === 'save') {
      setMessage('MoM saved successfully!');
      toast.success("MoM saved to database and email sent successfully!");
    } else if (type.toLowerCase() === 'send') {
      setMessage('MoM saved and email sent successfully!');
      toast.success("MoM saved and email sent successfully!");
    }
    
    // Clear form after successful submission
    setFormData({
      date: currentdate,
      startTime: convertTimeToInputFormat(currentTime),
      endTime: convertTimeToInputFormat(addOneHour(currentTime)),
      attendees: '',
      Absent: '',
      otherAttendees: '',
      project: '',
      customProject: '',
      meetingType: 'Online',
      information: [],
      decision: [],
      actionItems: [],
      location: '',
      dueDate: currentdate,
    });

    // Reset other states
    setActionItemDetails({
      text: '',
      dueDate: currentdate,
      assignedTo: ''
    });
    setSelectedType('');
    setCurrentEntry('');

    toast.success("MoM created successfully with all details!");
    
  
    const localStorageKey = `momFormData_${user_id}`;
    localStorage.removeItem(localStorageKey);

  } catch (error) {
    //console.error('Error creating MoM:', error);
    setMessage('Error: ' + error.message);
    toast.error('Failed to create MoM: ' + error.message);
  } finally {
    setLoading(false);
  }
};
  const removeEntry = (type, idx) => {
    setFormData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  };

  return (
    <div className="min-h-screen bg-blue-900 ">
      <div className="">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded mb-6 text-center ${message.includes('Error') || message.includes('Failed') ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
        {/* Main Form Container */}
        <div className="bg-blue-100 rounded-md border-2 space-x-1 border-gray-200 p-4">
          {/* Top Row */}
          <div className="grid grid-cols-2 gap-6 mb-3">
            <div>
              <label className="block text-black font-semibold mb-2 text-center">
                Meeting Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center font-medium"
                placeholder="Meeting Date - Date Picker"
                required
              />
            </div>
            <div>
              <div className="flex space-x-2 items-end">
                <div className="flex-1">
                  <label className="block text-black font-semibold mb-2 text-center">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center font-medium"
                    placeholder="Start Time"
                    required
                  />
                </div>
                <span className="self-center mb-[-30px] font-semibold">to</span>
                <div className="flex-1">
                  <label className="block text-black font-semibold mb-2 text-center">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center font-medium"
                    placeholder="End Time"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Second Row - Simple Fix */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="flex flex-col">
              <label className="block text-black font-semibold mb-2 text-center">
                Project <span className="text-red-500">*</span>
              </label>
              
              <div className="flex-1">
                <select
                  name="project"
                  value={formData.project}
                  onChange={handleProjectChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loadingProjects}
                >
                  <option value="">
                    {loadingProjects ? '⏳ Loading...' : '📋 Select project'}
                  </option>
                  {projects.map((project, index) => (
                    <option key={index} value={project}>
                      {project}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {formData.project === 'Other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.customProject || ''}
                      onChange={(e) => {
                        const customValue = e.target.value;
                        //console.log('✏️ Custom project input:', customValue);
                        
                        // 🆕 Simple update - don't change project field while typing
                        setFormData(prev => ({ 
                          ...prev, 
                          customProject: customValue
                        }));
                      }}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-full text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter custom project name"
                      required
                      autoFocus // 🆕 Auto focus when input appears
                    />
                    <div className="text-center mt-1">
                      <span className="text-xs text-blue-600 font-medium">
                        💡 Type your custom project name above
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block text-black font-semibold mb-2 text-center">
                Meeting Type
              </label>
              <div className="flex-1 flex justify-center items-start">
                <select
                  name="meetingType"
                  value={formData.meetingType}
                  onChange={handleChange}
                  className="w-2/3 px-1 py-3 border-2 border-gray-300 rounded-full text-center font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block text-black font-semibold mb-2 text-center">
                Location/ Meeting Link <span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center"
                  placeholder="Enter location or meeting link"
                />
              </div>
            </div>
          </div>
          {/* third row  */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-black font-semibold mb-2 text-center">
                Attendees
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  name="attendees"
                  value={formData.attendees}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center"
                  placeholder="Enter attendees names (comma-separated: John, Jane, Bob)"
                />
                
                {/* Employee Dropdown - Show project employees OR all users based on project selection */}
                {formData.project && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-1/2"> {/* Changed from w-3/4 to w-1/2 */}
                      <label className="block text-sm text-gray-600 mb-2 text-center font-medium">
                        {formData.project === 'Other' || (!projects.includes(formData.project) && formData.project !== '')
                          ? '👥 Add from all users'
                          : `👥 Add employees from ${formData.project}`
                        }
                      </label>
                      <select
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-full text-center text-xs hover:border-blue-400 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAttendeeSelection(e.target.value);
                            e.target.value = ''; // Reset dropdown
                          }
                        }}
                        disabled={
                          (formData.project === 'Other' || !projects.includes(formData.project)) 
                            ? loadingAllUsers 
                            : loadingEmployees
                        }
                      >
                        <option value="">
                          {(formData.project === 'Other' || !projects.includes(formData.project))
                            ? (loadingAllUsers ? '⏳ Loading...' : '➕ Select user')
                            : (loadingEmployees ? '⏳ Loading...' : '➕ Select employee')
                          }
                        </option>
                        {(formData.project === 'Other' || !projects.includes(formData.project))
                          ? // Show all users for "Other" or custom projects
                            allUsers
                              .filter(user => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(user.username) && !currentAbsent.includes(user.username);
                              })
                              .map((user, index) => (
                                <option key={index} value={user.username}>
                                  {user.full_name} ({user.username})
                                </option>
                              ))
                          : // Show project employees for existing projects
                            projectEmployees
                              .filter(employee => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(employee.username) && !currentAbsent.includes(employee.username);
                              })
                              .map((employee, index) => (
                                <option key={index} value={employee.username}>
                                  {employee.user_id} ({employee.email})
                                </option>
                              ))
                        }
                      </select>
                      
                      {/* Count display with smaller styling */}
                      {(formData.project === 'Other' || !projects.includes(formData.project)) ? (
                        allUsers.length > 0 && (
                          <div className="text-center mt-1">
                            <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                              👥 {allUsers.filter(user => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(user.username) && !currentAbsent.includes(user.username);
                              }).length} available
                            </span>
                          </div>
                        )
                      ) : (
                        projectEmployees.length > 0 && (
                          <div className="text-center mt-1">
                            <span className="inline-block bg-blue-100 text-black px-2 py-1 rounded-full text-xs font-medium">
                              👥 {projectEmployees.filter(employee => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(employee.username) && !currentAbsent.includes(employee.username);
                              }).length} available
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-black font-semibold mb-2 text-center">
                Absent
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  name="Absent"
                  value={formData.Absent}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center"
                  placeholder="Enter absent attendees Alice, Charlie"
                />
                
                {/* Employee Dropdown for Absent Selection */}
                {formData.project && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-1/2"> {/* Changed from w-3/4 to w-1/2 */}
                      <label className="block text-sm text-gray-600 mb-2 text-center font-medium">
                        {formData.project === 'Other' || (!projects.includes(formData.project) && formData.project !== '')
                          ? '❌ Add absent from all users'
                          : `❌ Add absent from ${formData.project}`
                        }
                      </label>
                      <select
                        className="w-full px-3 py-2 border-2 border-red-300 rounded-full text-center text-xs hover:border-red-400 focus:border-red-500 focus:ring focus:ring-red-200 transition-all"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAbsentSelection(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        disabled={
                          (formData.project === 'Other' || !projects.includes(formData.project)) 
                            ? loadingAllUsers 
                            : loadingEmployees
                        }
                      >
                        <option value="">
                          {(formData.project === 'Other' || !projects.includes(formData.project))
                            ? (loadingAllUsers ? '⏳ Loading...' : '➕ Select absent')
                            : (loadingEmployees ? '⏳ Loading...' : '➕ Select absent')
                          }
                        </option>
                        {(formData.project === 'Other' || !projects.includes(formData.project))
                          ? // Show all users for "Other" or custom projects
                            allUsers
                              .filter(user => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(user.username) && !currentAbsent.includes(user.username);
                              })
                              .map((user, index) => (
                                <option key={index} value={user.username}>
                                  {user.full_name} ({user.username})
                                </option>
                              ))
                          : // Show project employees for existing projects
                            projectEmployees
                              .filter(employee => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(employee.username) && !currentAbsent.includes(employee.username);
                              })
                              .map((employee, index) => (
                                <option key={index} value={employee.username}>
                                  {employee.user_id} ({employee.email})
                                </option>
                              ))
                        }
                      </select>
                      
                      {/* Smaller count display */}
                      {(formData.project === 'Other' || !projects.includes(formData.project)) ? (
                        allUsers.length > 0 && (
                          <div className="text-center mt-1">
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                              👥 {allUsers.filter(user => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(user.username) && !currentAbsent.includes(user.username);
                              }).length} available
                            </span>
                          </div>
                        )
                      ) : (
                        projectEmployees.length > 0 && (
                          <div className="text-center mt-1">
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                              👥 {projectEmployees.filter(employee => {
                                const currentAttendees = formData.attendees ? formData.attendees.split(',').map(name => name.trim()) : [];
                                const currentAbsent = formData.Absent ? formData.Absent.split(',').map(name => name.trim()) : [];
                                return !currentAttendees.includes(employee.username) && !currentAbsent.includes(employee.username);
                              }).length} available
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* forth row */}
          <div className="grid grid-cols-1 gap-8 mb-6">
            <div>
              <label className="block text-black font-semibold mb-2 text-center">
                Other Attendees
              </label>
              <input
                type="text"
                name="otherAttendees"
                value={formData.otherAttendees}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-full text-center"
                placeholder="Enter external emails email1@example.com"
              />
            </div>
          </div>
          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            
            {/* Information Section */}
            <div className="bg-blue-50 rounded-lg border-2 border-blue-300 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-blue-800 text-xl">ℹ</span>
                  <h3 className="text-lg font-semibold text-blue-700">Information</h3>
                </div>
                <button
                  onClick={() => {
                    if (currentEntry.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        information: [...prev.information, currentEntry.trim()]
                      }));
                      setCurrentEntry('');
                      setSelectedType('');
                    }
                  }}
                  disabled={selectedType !== 'information'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Information
                </button>
              </div>

              {selectedType === 'information' && (
                <div className="mb-4">
                  <textarea
                    value={currentEntry}
                    onChange={(e) => setCurrentEntry(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg resize-none focus:border-blue-500 focus:ring focus:ring-blue-200"
                    rows="3"
                    placeholder="Enter information details..."
                  />
                </div>
              )}

              {!selectedType || selectedType !== 'information' ? (
                <button
                  onClick={() => {
                    setSelectedType('information');
                    setCurrentEntry('');
                  }}
                  className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-900 hover:bg-blue-50 transition-colors"
                >
                  Click to add information
                </button>
              ) : null}

              {/* Display Information entries */}
              {formData.information.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-gray-700">Information Entries:</h4>
                  {formData.information.map((entry, index) => (
                    <div key={index} className="flex border-2 border-blue-300 items-center gap-2 bg-blue-50 p-3 rounded-lg">
                      <p className="flex-1">{entry}</p>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            information: prev.information.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decision Section */}
            <div className="bg-green-50 rounded-lg border-2 border-green-300 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-xl">✅</span>
                  <h3 className="text-lg font-semibold text-green-700">Decision</h3>
                </div>
                <button
                  onClick={() => {
                    if (currentEntry.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        decision: [...prev.decision, currentEntry.trim()]
                      }));
                      setCurrentEntry('');
                      setSelectedType('');
                    }
                  }}
                  disabled={selectedType !== 'decision'}
                  className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Decision
                </button>
              </div>

              {selectedType === 'decision' && (
                <div className="mb-4">
                  <textarea
                    value={currentEntry}
                    onChange={(e) => setCurrentEntry(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg resize-none focus:border-green-500 focus:ring focus:ring-green-200"
                    rows="3"
                    placeholder="Enter decision details..."
                  />
                </div>
              )}

              {!selectedType || selectedType !== 'decision' ? (
                <button
                  onClick={() => {
                    setSelectedType('decision');
                    setCurrentEntry('');
                  }}
                  className="w-full py-3 border-2 border-dashed border-green-300 rounded-lg text-green-800 hover:bg-green-50 transition-colors"
                >
                  Click to add decision
                </button>
              ) : null}

              {/* Display Decision entries */}
              {formData.decision.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-gray-700">Decision Entries:</h4>
                  {formData.decision.map((entry, index) => (
                    <div key={index} className="flex border-2 border-green-300 items-center gap-2 bg-green-50 p-3 rounded-lg">
                      <p className="flex-1">{entry}</p>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            decision: prev.decision.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Items Section */}
            <div className="bg-orange-50 rounded-lg border-2 border-orange-300 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 text-xl">🎯</span>
                  <h3 className="text-lg font-semibold text-orange-700">Action Items</h3>
                </div>
                <button
                  onClick={() => {
                    // 🆕 Add validation for required fields
                    if (!actionItemDetails.text.trim()) {
                      alert('⚠️ Please enter action item details');
                      return;
                    }
                    
                    if (!actionItemDetails.assignedTo) {
                      alert('⚠️ Please select who this action item is assigned to');
                      return;
                    }
                    
                    if (!actionItemDetails.dueDate) {
                      alert('⚠️ Please select a due date');
                      return;
                    }
                    
                    // All validations passed, add the action item
                    setFormData(prev => ({
                      ...prev,
                      actionItems: [...prev.actionItems, {
                        text: actionItemDetails.text.trim(),
                        dueDate: actionItemDetails.dueDate || currentdate,
                        assignedTo: actionItemDetails.assignedTo
                      }]
                    }));
                    
                    // Reset form
                    setActionItemDetails({
                      text: '',
                      dueDate: currentdate,
                      assignedTo: ''
                    });
                    setSelectedType('');
                  }}
                  disabled={
                    selectedType !== 'actionItems' || 
                    !actionItemDetails.text.trim() || 
                    !actionItemDetails.assignedTo ||
                    !actionItemDetails.dueDate
                  }
                  className="px-4 py-2 bg-orange-600 text-white rounded-full text-sm font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Action Item
                </button>
              </div>

              {selectedType === 'actionItems' && (
                <div className="mb-4 space-y-4">
                  <textarea
                    value={actionItemDetails.text}
                    onChange={(e) => setActionItemDetails(prev => ({
                      ...prev,
                      text: e.target.value
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg resize-none focus:border-orange-500 focus:ring focus:ring-orange-200"
                    rows="3"
                    placeholder="Enter action item details..."
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={actionItemDetails.dueDate}
                        onChange={(e) => setActionItemDetails(prev => ({
                          ...prev,
                          dueDate: e.target.value
                        }))}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring focus:ring-orange-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                      <select
                        value={actionItemDetails.assignedTo}
                        onChange={(e) => setActionItemDetails(prev => ({
                          ...prev,
                          assignedTo: e.target.value
                        }))}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring focus:ring-orange-200"
                        disabled={
                          !formData.project || 
                          ((formData.project === 'Other' || !projects.includes(formData.project)) 
                            ? loadingAllUsers 
                            : loadingEmployees)
                        }
                      >
                        <option value="">
                          {!formData.project 
                            ? 'Select project first' 
                            : (formData.project === 'Other' || !projects.includes(formData.project))
                            ? (loadingAllUsers ? 'Loading all users...' : 'Select user')
                            : (loadingEmployees ? 'Loading employees...' : 'Select employee')
                          }
                        </option>
                        {(formData.project === 'Other' || !projects.includes(formData.project))
                          ? // Show all users for "Other" or custom projects
                            allUsers.map((user, index) => (
                              <option key={index} value={user.username}>
                                {user.full_name} ({user.username})
                              </option>
                            ))
                          : // Show project employees for existing projects
                            projectEmployees.map((employee, index) => (
                              <option key={index} value={employee.username}>
                                {employee.user_id} ({employee.username})
                              </option>
                            ))
                        }
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {!selectedType || selectedType !== 'actionItems' ? (
                <button
                  onClick={() => {
                    setSelectedType('actionItems');
                    setActionItemDetails({ 
                      text: '', 
                      dueDate: currentdate, // Make sure to set it here too
                      assignedTo: '' 
                    });
                  }}
                  className="w-full py-3 border-2 border-dashed border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  Click to add action item
                </button>
              ) : null}

              {/* Display Action Items entries */}
              {formData.actionItems.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-gray-700">Action Item Entries:</h4>
                  {formData.actionItems.map((item, index) => (
                    <div key={index} className="flex border-2 border-orange-300 items-center gap-2 bg-orange-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <p>{item.text}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.dueDate && <span className="mr-4">Due: {item.dueDate}</span>}
                          {item.assignedTo && (
                            <span>
                              Assigned to: {
                                // Find user by username and display full name
                                (() => {
                                  const user = [...allUsers, ...projectEmployees].find(u => u.username === item.assignedTo);
                                  return user ? `${user.user_id} (${user.username})` : item.assignedTo;
                                })()
                              }
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            actionItems: prev.actionItems.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Submit Buttons */}
          <div className="flex justify-center space-x-8">
            <button
              onClick={() => handleSubmit('save')}
              disabled={loading}
              className="px-5 py-3 border-2 border-gray-300 bg-blue-100 text-black rounded-full font-medium hover:bg-blue-500 disabled:opacity-100"
            >
              {loading ? 'Saving & Sending...' : '📧 Save and send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MomCreate;