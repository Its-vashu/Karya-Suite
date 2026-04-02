import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import NotifyBirthday from './NotifyBirthday';
import { Card, CardContent, CircularProgress,Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #EBF4FF 0%, #F5F7FF 100%)',
  marginBottom: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
  borderRadius: '16px',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
    background: 'linear-gradient(180deg, #3B82F6 0%, #60A5FA 100%)',
  },
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 48px rgba(59, 130, 246, 0.1)',
  }
}));



const API_SERVICE = {

  API_BASE: process.env.REACT_APP_API_BASE_URL,

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
    } catch (error) {
      localStorage.removeItem('access_token');
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      window.location.href = '/login';
      toast.error('You must be logged in to access this resource.');
      return;
    }

    const url = `${this.API_BASE}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || response.statusText);
    }

    return response.json();
  }
};


const ShowThought = () => {
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(window.innerWidth);
  const [hasBirthday, setHasBirthday] = useState(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Try to get from localStorage first
    const random_thought = localStorage.getItem('random_thought');
    let parsed = null;
    if (random_thought) {
      try {
        parsed = JSON.parse(random_thought);
      } catch (e) {
        parsed = null;
      }
    }
    if (parsed && parsed.thoughts) {
      setThoughts([parsed]);
      setLoading(false);
    } else {
      fetchThoughts();
    }
  }, []);

  const fetchThoughts = async () => {
    try {
      setLoading(true);
      const response = await API_SERVICE.request('thoughts/random');
      setThoughts([response]);
      localStorage.setItem('random_thought', JSON.stringify(response));
    } catch (error) {
      setError(error.message || '');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[160px]">
        <CircularProgress color="primary" />
      </div>
    );
  }

  return (
    <div className="p-8 rounded-2xl bg-white shadow-lg border border-gray-100">
      {error && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg text-red-600 border border-red-200">
          <Typography variant="body2">{error}</Typography>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Left side - Thoughts */}
        <div className={`flex-1 min-w-0 ${hasBirthday ? 'md:w-3/4' : 'w-full'}`}>
          <div className="flex items-center gap-3 mb-6">
            <span role="img" aria-label="thought" className="text-3xl">💭</span>
            <h5 className="text-xl font-bold text-gray-900 tracking-tight">
              Thought of the Day
            </h5>
          </div>

          {thoughts.length === 0 ? (
            <div className="bg-gray-100 text-center py-4 rounded-xl">
              <p className="text-gray-600">
                No thoughts found. Contact HR to get inspiration thoughts!
              </p>
            </div>
          ) : (
            <StyledCard>
              <CardContent>
                <div className="flex gap-4">
                  <span className="text-3xl text-yellow-400">💡</span>
                  <div>
                    {thoughts.map((thought) => (
                      <div key={thought.id || 'current-thought'}>
                        <p className="italic text-gray-800 font-medium mb-2">
                          "{thought.thoughts}" 
                          <span className="text-gray-600 font-normal"> - {thought.author}</span>
                        </p>
                        <span className="text-blue-600 text-xs font-medium uppercase tracking-wider">
                          Daily Inspiration
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </StyledCard>
          )}
        </div>

        {/* Right side - Birthday */}
        <div className="flex-1 md:w-1/4 min-w-0 md:border-l md:border-gray-200 md:pl-6 mt-8 md:mt-0">
          <NotifyBirthday onHasBirthday={(hasB) => {
            //console.log('Birthday status:', hasB); // Debug log
            setHasBirthday(hasB);
          }} />
        </div>
      </div>
    </div>
  );
};

export default ShowThought;