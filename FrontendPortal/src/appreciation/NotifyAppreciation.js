import React, { useState, useEffect } from 'react';
import { Award, Star, Crown, ThumbsUp, MessageCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const NotifyAppreciation = () => {

  const { user_id, full_name } = useUser();
  const [monthlyAppreciation, setMonthlyAppreciation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    fetchMonthlyAppreciation();
  }, [user_id]);


  const fetchMonthlyAppreciation = async () => {
    try {
      setError(null);
      setLoading(true);

      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); 
      const currentYear = now.getFullYear();

      const apiUrl = `${API_BASE}/appreciation/${user_id}`;
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const textResponse = await response.text();
        if (textResponse && textResponse.length > 0) {
          try {
            const data = JSON.parse(textResponse);
            if (Array.isArray(data) && data.length > 0) {
              const found = data.find(app => {
                const appMonth = String(app.month).toLowerCase();
                const appYear = String(app.year);
                const isMonthMatch = appMonth === now.toLocaleString('default', { month: 'long' }).toLowerCase()
                  || appMonth === currentMonth
                  || appMonth === `${currentYear}-${currentMonth}`
                  || appMonth.includes(now.toLocaleString('default', { month: 'long' }).toLowerCase())
                  || appMonth.includes(currentMonth)
                  || appMonth.includes(`${currentYear}-${currentMonth}`);
                return isMonthMatch && appYear === String(currentYear);
              });
              if (found) {
                setMonthlyAppreciation(found);
              } else {
                setMonthlyAppreciation(null);
              }
            } else {
              setMonthlyAppreciation(null);
            }
          } catch (parseError) {
            setError('Invalid response format');
            setMonthlyAppreciation(null);
          }
        } else {
          setMonthlyAppreciation(null);
        }
      } else {
        let errorMessage = `Request failed with status ${response.status}`;
        if (response.status === 401) {
          errorMessage = 'Unauthorized - Please check your login status';
          localStorage.removeItem('access_token');
        } else if (response.status === 404) {
          errorMessage = 'Appreciation endpoint not found';
        } else if (response.status === 500) {
          errorMessage = 'Server error - Please try again later';
        }
        setError(errorMessage);
        setMonthlyAppreciation(null);
      }
    } catch (error) {
      let errorMessage = 'Failed to load appreciation data';
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Connection failed. Please check your backend server.';
      }
      setError(errorMessage);
      setMonthlyAppreciation(null);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badgeLevel) => {
    switch (badgeLevel?.toLowerCase()) {
      case 'gold':
        return <Crown className="w-6 h-6 animation-jump text-yellow-600" />;
      case 'silver':
        return <Award className="w-6 h-6 animation-jump text-gray-600" />;
      case 'bronze':
        return <Star className="w-6 h-6 animation-jump text-orange-600" />;
      default:
        return <Award className="w-6 h-6 animation-jump text-blue-600" />;
    }
  };

  const handleLike = async () => {
    if (!monthlyAppreciation) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/appreciation/${monthlyAppreciation.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user_id 
        })
      });
      
      if (response.ok) {
        alert(`You liked ${monthlyAppreciation.employee_name}'s award!`);
      } else {
        alert('Failed to like appreciation');
      }
    } catch (error) {
      //console.error('Error liking appreciation:', error);
      alert('Failed to like appreciation');
    }
  };

  const handleComment = () => {
    if (!monthlyAppreciation) return;
    //console.log(`Comment on appreciation ID: ${monthlyAppreciation.id}`);
    alert(`Leaving a comment for ${monthlyAppreciation.employee_name}.`);
  };

  const handleRetry = () => {
    fetchMonthlyAppreciation();
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-auto border-b-2 border-purple-500"></div>
          <span className="ml-2 text-gray-600">Loading appreciation...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-400">
        <div className="flex items-center mb-2">
          <MessageCircle className="w-auto h-5 text-red-500 mr-2" />
          <h3 className="text-red-700 font-medium">Failed to Load Appreciation</h3>
        </div>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <div className="space-x-2">
          <button 
            onClick={handleRetry}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!monthlyAppreciation) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center">
        <Award className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <h3 className="text-gray-600 font-medium mb-2">Appreciation of the Month</h3>
        <p className="text-gray-500 text-sm mb-3">No appreciations this month yet.</p>
        <div className="space-x-2">
          <button 
            onClick={handleRetry}
            className="text-purple-500 hover:text-purple-700 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Success state - display appreciation
  return (
    <div className="bg-gray-100 w-full text-black p-4 rounded-lg shadow-lg">
      <div className="flex items-center mb-1">
        {getBadgeIcon(monthlyAppreciation.badge_level)}
        <h3 className="ml-2 text-lg font-bold">Appreciation of the Month</h3>
      </div>
      {/* <Personal_details userId={monthlyAppreciation.employee_id}  />  */}
      <div className="mb-3">
        <h4 className="text-xl font-bold mb-1">
          Congratulations {full_name} ! 
        </h4>
        <p className="mb-1">For being <strong>{monthlyAppreciation.award_type}</strong> Awarded with <strong>{monthlyAppreciation.badge_level?.toUpperCase()} </strong> in the Company.</p>
        <p className="text-sm opacity-75 mt-1">
          {monthlyAppreciation.month} {monthlyAppreciation.year}
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleLike}
          className="flex items-center space-x-2 bg-gray-200 border-2 border-gray-300 bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all text-sm"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{monthlyAppreciation.likes_count} Like</span>
        </button>
        <button
          onClick={handleComment}
          className="flex items-center space-x-2 bg-gray-200 border-2 border-gray-300 bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{monthlyAppreciation.comments_count} Comment</span>
        </button>
      </div>
    </div>
  );
};

export default NotifyAppreciation;