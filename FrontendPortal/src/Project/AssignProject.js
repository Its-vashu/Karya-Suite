import React, { useState, useEffect } from 'react';
import { Search, User, FolderOpen, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function AssignUserToProject({ onClose }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [userSearch, setUserSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);


  // Fetch users
  useEffect(() => {
    fetch(`${API_BASE}/user-details`)
      .then(res => res.json())
      .then(data => {
        // Make sure data is an array before setting it
        // console.log('Fetched users data:', data);
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (data && typeof data === 'object') {
          // If data is an object, try to find the array property
          const usersArray = Object.values(data).find(Array.isArray) || [];
          setUsers(usersArray);
        } else {
          // console.error('Unexpected users data format:', data);
          setUsers([]);
        }
      })
      .catch(err => {
        // console.error('Error fetching users:', err);
        alert('Error fetching users'+err.message);
        setUsers([]);
      });
  }, []);

  // Fetch projects
  useEffect(() => {
    fetch(`${API_BASE}/project/names`)
      .then(res => res.json())
      .then(data => {
        // Make sure data is an array before setting it
        // console.log('Fetched projects data:', data);
        if (Array.isArray(data)) {
          setProjects(data);
        } else if (data && typeof data === 'object') {
          // If data is an object, try to find the array property
          const projectsArray = Object.values(data).find(Array.isArray) || [];
          setProjects(projectsArray);
        } else {
          // console.error('Unexpected projects data format:', data);
          setProjects([]);
        }
      })
      .catch(err => {
        // console.error('Error fetching projects:', err);
        alert('Error fetching projects'+err.message);
        setProjects([]);
      });
  }, []);

  // Filter users based on search
  const filteredUsers = Array.isArray(users) ? users.filter(user =>
    user?.full_name?.toLowerCase?.()?.includes(userSearch.toLowerCase()) ||
    user?.username?.toLowerCase?.()?.includes(userSearch.toLowerCase())
  ) : [];

  // Filter projects based on search
  const filteredProjects = Array.isArray(projects) ? projects.filter(project => {
    //console.log('Checking project:', project); // Debug log
    const projectName = typeof project === 'string' ? project : project?.project_name || project?.name;
    return projectName?.toLowerCase?.()?.includes(projectSearch.toLowerCase());
  }) : [];

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUserSearch(user.username);
    setShowUserDropdown(false);
  };

  // Handle project selection
  const handleProjectSelect = (project) => {
    const projectObj = typeof project === 'string' ? { project_name: project, id: project } : project;
    setSelectedProject(projectObj);
    setProjectSearch(typeof project === 'string' ? project : project.project_name);
    setShowProjectDropdown(false);
  };

  // Clear user selection
  const clearUserSelection = () => {
    setSelectedUser(null);
    setUserSearch('');
  };

  // Clear project selection
  const clearProjectSelection = () => {
    setSelectedProject(null);
    setProjectSearch('');
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedUser || !selectedProject) {
      toast.error('Please select both user and project');
      return;
    }
    // console.log('Assigning user to project:', {selectedUser, selectedProject});
    try {
      const response = await fetch(`${API_BASE}/user-details/${selectedUser.user_id}/project-assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({  
          user_id: selectedUser.user_id,
          project_name: selectedProject.project_name,
         
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${selectedUser.username} successfully assigned to ${selectedProject.project_name}!`);

        // Clear selections after 2 seconds
        setTimeout(() => {
          clearUserSelection();
          clearProjectSelection();
        }, 2000);
      } else {
        toast.error(data.detail || 'Error assigning user to project');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    }
  };

  return (
    <div className=" bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-auto">
        <div className='flex justify-between'>
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
            Assign User to Project
          </h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
        </div>
        

        <div className="space-y-6">
          {/* User Search Box */}
          <div className="relative">
            <label className="block text-gray-700 font-semibold mb-2">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Type to search users..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedUser && (
                <button
                  onClick={clearUserSelection}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* User Dropdown */}
            {showUserDropdown && userSearch && !selectedUser && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user.user_id}
                      onClick={() => handleUserSelect(user)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{user.user_id}</span>
                      <span className="text-sm text-gray-500">({user.username})</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No users found
                  </div>
                )}
              </div>
            )}

            {/* Selected User Display */}
            {selectedUser && (
              <div className="mt-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-800">{selectedUser.user_id}</span>
                  <span className="text-sm text-gray-500">({selectedUser.username})</span>
                </div>
              </div>
            )}
          </div>

          {/* Project Search Box */}
          <div className="relative">
            <label className="block text-gray-700 font-semibold mb-2">
              Search Project
            </label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => {
                  setProjectSearch(e.target.value);
                  setShowProjectDropdown(true);
                }}
                onFocus={() => setShowProjectDropdown(true)}
                placeholder="Type to search projects..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedProject && (
                <button
                  onClick={clearProjectSelection}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Project Dropdown */}
            {showProjectDropdown && projectSearch && !selectedProject && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium">{typeof project === 'string' ? project : project.project_name || project.name}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No projects found
                  </div>
                )}
              </div>
            )}

            {/* Selected Project Display */}
            {selectedProject && (
              <div className="mt-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-800">{selectedProject.project_name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Assign Button */}
          <button
            onClick={handleAssign}
            disabled={!selectedUser || !selectedProject}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
              selectedUser && selectedProject
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedUser && selectedProject
              ? `Assign ${selectedUser.username} to ${selectedProject.project_name}`
              : 'Select User and Project to Assign'}
          </button>
        </div>
    </div>
  );
}