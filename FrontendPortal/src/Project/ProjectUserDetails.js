import React, { useState, useMemo, useEffect } from 'react';
import {useNavigate} from 'react-router-dom';
import { Search, Plus,Folder,Calendar,User,Code,ArrowLeft } from 'lucide-react';
import axios from "axios";
import AssignProject from './AssignProject';
import AddProject from './AddProject';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

// API Service
const API_SERVICE = {
  BASE: API_BASE,
  
  getToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('access_token');
        return null;
      }
      return token;
    } catch {
      localStorage.removeItem('access_token');
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Authentication token missing or expired');

    const response = await fetch(`${this.BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  },
  async getAllUsers() {
    return await this.request('/users/basic');
  },

  async getAllProjects() {
    return await this.request('/project/');
  },
  
  async getProjectDetails(project_name) {
    return await this.request(`/project/${project_name}/`);
  },

  async addNewProject(projectData) {
    return await this.request('/project/', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },
  
};

export default function ProjectUserDetails() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);


  const [formData, setFormData] = useState({
    user_id: "",
    project_name: "",
  });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE}/users/${formData.user_id}/details`)
      .then((res) => setUsers(res.data))
      .catch((err) => 
        // console.error(err)
        alert('Error fetching users'+err.message)
    );
  }, [formData.user_id]);

  const toLocaleDateString = (dateStr) => {
    if (!dateStr) return 'Not specified';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // console.log('🔄 Loading data from API...');
      
      // Load projects and users separately with individual error handling
      let projects = [];
      let users = [];
      
      try {
        projects = await API_SERVICE.getAllProjects();
        // console.log('✅ Projects loaded:', projects);
      } catch (projectError) {
        // console.error('❌ Failed to load projects:', projectError);
      }
      
      try {
        users = await API_SERVICE.getAllUsers();
        // console.log('✅ Users loaded:', users);
      } catch (userError) {
        // console.error('❌ Failed to load users:', userError);
      }

      // Ensure projects have type field and status
      const projectsWithType = Array.isArray(projects) ? 
        projects.map(project => ({
          ...project,
          type: project.type || 'project',
          status: project.status || 'Unknown',
        })) : [];
      
      // Log project data for debugging
      // console.log('Projects after processing:', projectsWithType);
      
      // Ensure users have type field  
      const usersWithType = Array.isArray(users) ? 
        users.map(user => ({ ...user, type: user.type || 'user' })) : [];

      // Combine projects and users into single array
      const combinedData = [...projectsWithType, ...usersWithType];
      
      // console.log('✅ Combined data:', combinedData);
      setProjectsData(combinedData);
      
      if (combinedData.length === 0) {
        // console.log('⚠️ No data from API, using fallback data');
        setProjectsData([]);
        setError('Backend connection may not be available. Please try again later.');
      }
      
    } catch (err) {
      // console.error('❌ Failed to load data:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!projectsData || projectsData.length === 0) return [];
    if (!searchQuery.trim()) return projectsData;

    return projectsData.filter(item => {
      if (!item || !item.name) return false;
      
      const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (searchType === 'all') return matchesQuery;
      return matchesQuery && item.type === searchType;
    });
  }, [searchQuery, searchType, projectsData]);

  const ProjectCard = ({ project }) => {
    if (!project) return null;
    
    return (
      <div 
        className="bg-gray-100 min-h-[200px] min-w-[350px] border border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col"
        onClick={() => setSelectedItem(project)}
      >
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Folder className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">{project.project_name || 'Unnamed Project'}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  !project.status ? 'bg-gray-100 text-gray-700' :
                  project.status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' :
                  project.status.toLowerCase() === 'in progress' ? 'bg-yellow-100 text-yellow-700' :
                  project.status.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-700' :
                  project.status.toLowerCase() === 'on hold' ? 'bg-gray-300 text-gray-800' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            {(project.description?.trim()?.substring(0, 100) + (project.description?.length > 100 ? ' ...' : ' ..')) || 'No description available'}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{project.end_date ? toLocaleDateString(project.end_date) : 'No specified date'}</span>
          </div>
          { project.client_name && (
            <div>
              <p>~ {project.client_name || 'No specified client'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const UserCard = ({ user }) => {
    if (!user) return null;
    
    return (
      <div 
        className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
        onClick={() => setSelectedItem(user)}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-purple-500 p-2 rounded-lg">
            <User className="text-white w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-800">{user.name || 'Unknown User'}</h3>
            <p className="text-purple-600 font-medium">{user.role || 'No role'}</p>
            <p className="text-gray-600 text-sm">{user.department || 'No department'}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Folder className="w-4 h-4" />
            <span>{user.projects?.length || 0} Projects</span>
          </div>
          <div className="flex items-center gap-1">
            <Code className="w-4 h-4" />
            <span>{user.skills?.length || 0} Skills</span>
          </div>
        </div>
      </div>
    );
  };

  const DetailModal = ({ item, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-40">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-2xl">
          <div className="flex items-start w-full">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.type === 'project' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {item.type === 'project' ? 
                  <Folder className="text-white w-6 h-6" /> : 
                  <User className="text-white w-6 h-6" />
                }
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{item.project_name}</h2>
                <p className="text-gray-600">
                  {item.type === 'project' ? 'Project Details' : 'User Profile'}
                </p>
              </div>
            </div>
            <div className="flex-1 flex justify-end items-start mr-9 mt-3">
              <div className="text-right">
                <p className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  !item.status ? 'bg-gray-100 text-gray-700' :
                  item.status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' :
                  item.status.toLowerCase() === 'in progress' ? 'bg-yellow-100 text-yellow-700' :
                  item.status.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-700' :
                  item.status.toLowerCase() === 'on hold' ? 'bg-gray-300 text-gray-800' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.status || 'Unknown'}
                </p>
                { item.client_name && (
                <p className="text-right text-sm text-gray-600">~ {item.client_name}</p>
              )}
              </div>
              
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {item.type === 'project' ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Start Date:
                  <span className="text-gray-600 ml-2">
                    {item.start_date ? toLocaleDateString(item.start_date) : 'Not specified'}
                  </span></h3>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Deadline:
                  <span className="text-gray-600 ml-2">
                    {item.end_date ? toLocaleDateString(item.end_date) : 'Not specified'}
                  </span></h3>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Team Members</h3>
                <div className="flex flex-wrap gap-2">
                  {item.teamMembers && item.teamMembers.length > 0 ? 
                    item.teamMembers.map((member, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {member}
                      </span>
                    )) : 
                    <span className="text-gray-500 italic">No team members assigned</span>
                  }
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  {item.technologies && item.technologies.length > 0 ? 
                    item.technologies.map((tech, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {tech}
                      </span>
                    )) : 
                    <span className="text-gray-500 italic">No technologies specified</span>
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Role</h3>
                  <p className="text-purple-600 font-medium">{item.role}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Department</h3>
                  <p className="text-gray-600">{item.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Email</h3>
                  <p className="text-gray-600">{item.email}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Phone</h3>
                  <p className="text-gray-600">{item.phone}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Projects</h3>
                <div className="flex flex-wrap gap-2">
                  {item.projects && item.projects.length > 0 ? 
                    item.projects.map((project, index) => (
                      <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                        {project}
                      </span>
                    )) : 
                    <span className="text-gray-500 italic">No projects assigned</span>
                  }
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {item.skills && item.skills.length > 0 ? 
                    item.skills.map((skill, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    )) : 
                    <span className="text-gray-500 italic">No skills listed</span>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects and users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-800 p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        
        <div className="flex align-center mb-4 space-x-2 text-gray-100">
          <div className='mt-3'>
            <button
              onClick={() => navigate(-1)} 
              className="p-2 text-gray-100 hover:bg-gray-300 hover:text-gray-700 rounded-md"
              text = "Back"
            > 
              <ArrowLeft />
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold">
              Project & User Details
            </h1>
            <p className="">Search for projects or users to view detailed information</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
            <button 
              onClick={loadAllData}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-3">
          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by project name or user name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div>
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="all">All</option>
                <option value="project">Projects Only</option>
                <option value="user">Users Only</option>
              </select>
            </div>
            <div>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  <span>Add new Project</span>
                </span>
              </button>
            </div>
            {
              showAddProjectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <AddProject 
                    onClose={() => setShowAddProjectModal(false)} 
                    onProjectAdded={loadAllData} 
                  />
                </div>
              )
            }
            <div>
              <button
                onClick={() => setShowAssignProjectModal(true)}
                className="inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  <span>Assign Project</span>
                </span>
              </button>
            </div>
          </div>
           {
              showAssignProjectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <AssignProject 
                    onClose={() => setShowAssignProjectModal(false)}  
                  />
                </div>
              )
            }
          
          <div className="text-sm text-gray-500">
            Found {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map(item => (
            <div key={item.id}>
              {item.type === 'project' ? 
                <ProjectCard project={item} /> : 
                <UserCard user={item} />
              }
            </div>
          ))}
        </div>

        {filteredData.length === 0 && searchQuery && (
          <div className="text-center py-1">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No results found</h3>
            <p className="text-gray-500">Try searching with different keywords</p>
          </div>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <DetailModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}
      </div>
    </div>
  );
}