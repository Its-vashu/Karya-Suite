import React, { useState, useEffect } from 'react';

const AdminAPIConfig = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  const [endpoints, setEndpoints] = useState([]);
  
  useEffect(() => {
    checkAPIConnection();
    fetchEndpoints();
  }, []);
  
  const checkAPIConnection = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/docs');
      setApiStatus(response.ok ? 'connected' : 'error');
    } catch (error) {
      setApiStatus('error');
    }
  };
  
  const fetchEndpoints = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/openapi.json');
      const openApiSpec = await response.json();
      const paths = Object.keys(openApiSpec.paths || {});
      setEndpoints(paths);
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
    }
  };
  
  return (
    <div className="api-config-panel">
      <h3>API Configuration</h3>
      <div className={`status-indicator ${apiStatus}`}>
        Status: {apiStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
      </div>
      
      <div className="api-docs-link">
        <a 
          href="http://127.0.0.1:8000/docs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="docs-button"
        >
          🔗 Open API Documentation
        </a>
      </div>
      
      <div className="endpoints-list">
        <h4>Available Endpoints:</h4>
        <ul>
          {endpoints.map((endpoint, index) => (
            <li key={index}>{endpoint}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminAPIConfig;
