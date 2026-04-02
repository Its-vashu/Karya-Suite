import React, { useState, useEffect } from 'react';
import { ArrowLeft, SkipBack } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://192.168.29.133:5000';

const AssetManagement = () => {
  useEffect(() => {
    fetchAgents();
  }, []);
  const [agents, setAgents] = useState([]);
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agentDetails, setAgentDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  console.log(agents);
  
  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/agents`);
      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (data.status === 'success' && data.agents) {
        const agentsArray = Object.entries(data.agents).map(([id, agent]) => ({
          id,
          ...agent
        }));
        console.log('Processed agents:', agentsArray); // Debug log
        setAgents(agentsArray);
      } else {
        setError('Failed to fetch agents: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('API Error:', error); // Debug log
      setError('Error fetching agents: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentDetails = async (agentId) => {
    try {
      const response = await fetch(`${API_URL}/api/data/${agentId}`);
      const data = await response.json();
      console.log('Agent details response:', data); // Debug log

      if (data && data.latest_data) {
        console.log('Setting agent details:', data);
        setAgentDetails(data);
        setError(null);
      } else {
        console.error('Invalid data structure:', data);
        setError('Failed to fetch agent details: Invalid data structure');
      }
    } catch (error) {
      console.error('Error fetching agent details:', error);
      setError('Error fetching agent details: ' + error.message);
    }
  };

  const handleAgentDetails = async (agentId) => {
    setLoading(true);
    await fetchAgentDetails(agentId);
    setShowModal(true);
    setLoading(false);
  };
  const handleSearch = async () => {
    if (selectedAgent.trim() === '') {
      setError('Please enter a valid Agent ID');
      return;
    }
    setLoading(true);
    await fetchAgentDetails(selectedAgent);
    setShowModal(true);
    setLoading(false);
  };

  const formatUptime = (hours) => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return `${days} days, ${remainingHours} hours`;
  };

  const formatBytes = (mb) => {
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="px-2 py-2 mt-1 flex justify-center items-center text-gray-600 rounded-lg  hover:text-gray-600 hover:bg-blue-400 transition-colors"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🖥️ Asset Management</h1>
            <p className="text-gray-600 mt-2">Monitor and manage your connected devices</p>
          </div>
          
          {/* Actions Section */}
          <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Agent ID"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
              <button 
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <span className="material-icons-outlined text-xl">🔍</span>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            <button 
              onClick={fetchAgents}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              <span className="material-icons-outlined text-xl">🔄</span>
              {loading ? 'Loading...' : 'View All Agents'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      {agents.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Connected Agents
              <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {agents.length}
              </span>
            </h2>
            <span className="text-gray-500 text-sm">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {agent.hostname}
                    </h3>
                    <span className="inline-flex items-center bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full mt-2">
                      {agent.os}
                    </span>
                  </div>
                  <span className="text-2xl">
                    {agent.os.includes('Windows') ? '🪟' : '🖥️'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🕒</span>
                    Last Update: {new Date(agent.last_update || agent.last_Update).toLocaleString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">🔑</span>
                    ID: {agent.id}
                  </div>
                </div>

                <button
                  onClick={() => handleAgentDetails(agent.id)}
                  className="mt-4 w-full bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>View Details</span>
                  <span className="text-sm">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">⌛</div>
          <p className="text-gray-600 mb-6">Loading agents...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && agents.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 mb-6">No agents found. Try refreshing the data.</p>
          <button 
            onClick={fetchAgents}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <span> View All Agents</span>
            <span className="text-xl">🔄</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <h3 className="text-xl font-semibold text-gray-800 mt-4">Loading Agents...</h3>
          <p className="text-gray-600 mt-2">Please wait while we fetch the data</p>
        </div>
      )}

      {/* Agent Details Modal */}
      {showModal && agentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {agentDetails.latest_data.system.hostname}
                  </h2>
                  <p className="text-gray-600">Last Updated: {new Date(agentDetails.latest_data.timestamp).toLocaleString()}</p>
                  {
                    agentDetails.latest_data.location &&
                    <p className="absolute top-10 right-12 text-md text-gray-600">Public IP Address:<span className='text-blue-500'>({ agentDetails.latest_data.location.public_ipv4 || "NA"})</span></p>
                    
                  }
                   
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* System Location Address */}
              {
                agentDetails.latest_data.location &&
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">💻 System Location Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-600">latitude</p>
                      <p className="font-medium">{agentDetails.latest_data.location.latitude}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">longitude</p>
                      <p className="font-medium">{agentDetails.latest_data.location.longitude}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"> Public IP Address</p>
                      <p className="font-medium">{agentDetails.latest_data.location.public_ipv4}</p>
                    </div>
                  </div>
                </div>
              }
              

              {/* System Info */}
              {
                agentDetails.latest_data.system &&
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">💻 System Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-600">Operating System</p>
                      <p className="font-medium">{agentDetails.latest_data.system.os}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Processor</p>
                      <p className="font-medium">{agentDetails.latest_data.system.processor}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"> Last Boot Time</p>
                      <p className="font-medium">{new Date(agentDetails.latest_data.system.boot_time).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              }
              

              {/* Memory & CPU */}
              {
                agentDetails.latest_data.memory &&
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">🧠 Memory Usage</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>RAM Usage</span>
                          <span>{agentDetails.latest_data.memory.usage_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{width: `${agentDetails.latest_data.memory.usage_percent}%`}}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatBytes(agentDetails.latest_data.memory.used_gb * 1024)} / {formatBytes(agentDetails.latest_data.memory.total_gb * 1024)}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Swap Usage</span>
                          <span>{agentDetails.latest_data.memory.swap_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-400 h-2 rounded-full"
                            style={{width: `${agentDetails.latest_data.memory.swap_percent}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">⚡ CPU Information</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>CPU Usage</span>
                          <span>{agentDetails.latest_data.cpu.usage_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{width: `${agentDetails.latest_data.cpu.usage_percent}%`}}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600">Frequency</p>
                          <p className="font-medium">{(agentDetails.latest_data.cpu.current_frequency_mhz / 1000).toFixed(2)} GHz</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cores</p>
                          <p className="font-medium">{agentDetails.latest_data.cpu.physical_cores} Physical / {agentDetails.latest_data.cpu.total_cores} Logical</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
              
              {
                agentDetails.latest_data.browser_tabs && agentDetails.latest_data.browser_tabs.count > 0 &&
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">All Active Tabs ({agentDetails.latest_data.browser_tabs.count})</h3>
                  <div className="max-h-60 overflow-y-auto">
                    {agentDetails.latest_data.browser_tabs.tabs.map((tabs, index) => (
                      <div 
                        key={index}
                        className="p-2 hover:bg-indigo-100 rounded transition-colors border border-blue-300 mb-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-indigo-900">{tabs.browser}</h4>
                            <p className="text-sm text-gray-800">Title: {tabs.title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-indigo-600">PID: {tabs.pid}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }

              {/* Network */}
              {
                agentDetails.latest_data.network &&
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">🌐 Network Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-600">IP Address</p>
                      <p className="font-medium">{agentDetails.latest_data.network.local_ip}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Active Connections</p>
                      <p className="font-medium">{agentDetails.latest_data.network.active_connections}</p>
                    </div>
                  </div>
                </div>
              }
              

              {/* Storage */}
              {
                agentDetails.latest_data.disks && agentDetails.latest_data.disks.length > 0 &&
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">💾 Storage Information</h3>
                  <div className="space-y-4">
                    {agentDetails.latest_data.disks.map((disk, index) => (
                      <div key={index} className="border-b border-yellow-100 last:border-0 pb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Drive {disk.device}</span>
                          <span className="text-sm text-gray-500">{disk.fstype}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{width: `${disk.usage_percent}%`}}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="font-medium">{disk.total_gb.toFixed(2)} GB</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Used</p>
                            <p className="font-medium">{disk.used_gb.toFixed(2)} GB</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Free</p>
                            <p className="font-medium">{disk.free_gb.toFixed(2)} GB</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Usage</p>
                            <p className="font-medium">{disk.usage_percent}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }

              {/* Installed Software */}
              {
                agentDetails.latest_data.installed_software && agentDetails.latest_data.installed_software.software.length > 0 &&
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">📦 All Installed Software ({agentDetails.latest_data.installed_software.count})</h3>
                  <div className="max-h-60 overflow-y-auto">
                    {agentDetails.latest_data.installed_software.software.map((software, index) => (
                      <div 
                        key={index}
                        className="p-2 hover:bg-indigo-100 rounded transition-colors"
                      >
                        {software}
                      </div>
                    ))}
                  </div>
                </div>
              }
              
              {/* Recent Installed Software */}
              {
                agentDetails.latest_data.recent_installations && agentDetails.latest_data.recent_installations.recent_installations.length > 0 &&
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">📦 Recent Installed Software ({agentDetails.latest_data.recent_installations.count})</h3>
                  <div className="max-h-60 overflow-y-auto">
                    {agentDetails.latest_data.recent_installations.recent_installations.map((software, index) => (
                      <div 
                        key={index}
                        className="p-3 hover:bg-indigo-100 rounded transition-colors mb-2 border border-indigo-100"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-indigo-900">{software.name}</h4>
                            <p className="text-sm text-gray-800">Publisher: {software.publisher}</p>
                            <p className="text-sm text-gray-800">Version: {software.version}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-indigo-600">Installed/Updated: {software.install_date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
              
              {/* Security */}
              {
                agentDetails.latest_data.security &&
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">🔒 Security Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Windows Defender</p>
                      <p className={`font-medium ${
                        agentDetails.latest_data.security.windows_defender === "Enabled" 
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {agentDetails.latest_data.security.windows_defender}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Firewall Status</p>
                      <p className="font-medium">{agentDetails.latest_data.security.firewall}</p>
                    </div>
                  </div>
                </div>
              }

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;