import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import {useUser} from '../context/UserContext';
import ShowThought from '../utils/ShowThought';
import Appreciation from '../appreciation/Appreciation';
// const API_BASE = process.env.FAST_API_BASE_URL;

const Dashboard = () => {
  const {role,username } = useUser();
  const userRole = role || localStorage.getItem('user_role');
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState({ temp: 22, condition: 'Sunny' });

  const token = localStorage.getItem('access_token');
  if(!token){
    // Redirect to login or show a message
    navigate('/login');
  }
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div>
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="greeting-section">
            <h2>{getGreeting()}, {username} 👋</h2>
            <div className="user-info">
              <span className="user-role">{userRole}</span>
              <span className="role-separator">•</span>
              <span className="date-time">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </span>
            </div>
          </div>
          <div className="weather-widget">
            <div className="weather-info">
              <span className="weather-temp">{weatherData.temp}°C</span>
              <span className="weather-condition">{weatherData.condition}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <ShowThought />
        <Appreciation />
      </div>

      
    </div>
  );
};

export default Dashboard;