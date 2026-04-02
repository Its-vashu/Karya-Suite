import { useState, useMemo, useEffect } from 'react';
import { Search, User, Folder, Calendar, Star, Users, Code, GitBranch } from 'lucide-react';

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

  async getProjectDetails(project_name) {
    return await this.request(`/user-details/project/${project_name}/`);
  },

  async getAllProjects() {
    return await this.request('/user-details/projects');
  },

  async getAllUsers() {
    return await this.request('/user-details/users');
  }
};

export default function ProjectUserDetails() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading data from API...');
      
      // Load projects and users separately with individual error handling
      let projects = [];
      let users = [];
      
      try {
        projects = await API_SERVICE.getAllProjects();
        console.log('✅ Projects loaded:', projects);
      } catch (projectError) {
        console.error('❌ Failed to load projects:', projectError);
      }
      
      try {
        users = await API_SERVICE.getAllUsers();
        console.log('✅ Users loaded:', users);
      } catch (userError) {
        console.error('❌ Failed to load users:', userError);
      }

      // Ensure projects have type field
      const projectsWithType = Array.isArray(projects) ? 
        projects.map(project => ({ ...project, type: project.type || 'project' })) : [];
      
      // Ensure users have type field  
      const usersWithType = Array.isArray(users) ? 
        users.map(user => ({ ...user, type: user.type || 'user' })) : [];

      // Combine projects and users into single array
      const combinedData = [...projectsWithType, ...usersWithType];
      
      console.log('✅ Combined data:', combinedData);
      setProjectsData(combinedData);
      
      if (combinedData.length === 0) {
        console.log('⚠️ No data from API, using fallback data');
        setProjectsData([]);
        setError('Using sample data. Backend connection may not be available.');
      }
      
    } catch (err) {
      console.error('❌ Failed to load data:', err);
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
        className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
        onClick={() => setSelectedItem(project)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Folder className="text-white w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800">{project.name || 'Unnamed Project'}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'Active' ? 'bg-green-100 text-green-700' :
                project.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{project.progress || 0}%</div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
        </div>
        
        <p className="text-gray-600 mb-4">{project.description || 'No description available'}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{project.teamMembers?.length || 0} Members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{project.endDate || 'No date'}</span>
          </div>
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
          {/* <div className="text-right">
            <div className="text-sm font-medium text-gray-700">{user.experience || 'N/A'}</div>
            <div className="text-xs text-gray-500">Experience</div>
          </div> */}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.type === 'project' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {item.type === 'project' ? 
                  <Folder className="text-white w-6 h-6" /> : 
                  <User className="text-white w-6 h-6" />
                }
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{item.name}</h2>
                <p className="text-gray-600">
                  {item.type === 'project' ? 'Project Details' : 'User Profile'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {item.type === 'project' ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Status</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    item.status === 'Active' ? 'bg-green-100 text-green-700' :
                    item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Progress</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{item.progress}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Start Date</h3>
                  <p className="text-gray-600">{item.startDate}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">End Date</h3>
                  <p className="text-gray-600">{item.endDate}</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Join Date</h3>
                  <p className="text-gray-600">{item.joinDate}</p>
                </div>
                {/* <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Experience</h3>
                  <p className="text-gray-600">{item.experience}</p>
                </div> */}
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Project & User Details
          </h1>
          <p className="text-gray-600">Search for projects or users to view detailed information</p>
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
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
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
          </div>
          
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
          <div className="text-center py-12">
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