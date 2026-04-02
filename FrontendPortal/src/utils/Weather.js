import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';

const Weather = () => {
  const [weatherData, setWeatherData] = useState(() => {
    try {
      const cached = localStorage.getItem('weatherData');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        if (cacheAge < 1800000) { // 30 minutes
          return { ...parsed.data, _isLoading: false };
        }
      }
    } catch (error) {
      // console.warn('🔴 Weather cache read failed:', error);
    }
    return { temp: '--', condition: 'Loading...', city: '', _isLoading: true };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🌡️ ENHANCED WEATHER UPDATE WITH ERROR RECOVERY
  const updateWeather = useCallback(async (lat, lon) => {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      // console.warn('Invalid latitude or longitude for weather update.');
      toast.warning('Invalid latitude or longitude for weather update.');
      setWeatherData({ temp: '--', condition: 'N/A', city: '', _isLoading: false });
      return;
    }

    setWeatherData(prev => ({ ...prev, _isLoading: true })); // Indicate loading state for weather
    try {
      const [weatherResponsePromise, geoResponsePromise] = await Promise.allSettled([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      ]);

      let weatherInfo = { temp: '--', condition: 'N/A', city: '', _isLoading: false };

      if (weatherResponsePromise.status === 'fulfilled' && weatherResponsePromise.value.ok) {
        const weatherDataFetched = await weatherResponsePromise.value.json();
        if (weatherDataFetched.current_weather) {
          weatherInfo.temp = Math.round(weatherDataFetched.current_weather.temperature);
          // Simplified condition mapping
          const weathercode = weatherDataFetched.current_weather.weathercode;
          if (weathercode === 0) weatherInfo.condition = 'Clear sky';
          else if (weathercode >= 1 && weathercode <= 3) weatherInfo.condition = 'Mainly clear to cloudy';
          else if (weathercode >= 45 && weathercode <= 48) weatherInfo.condition = 'Fog';
          else if (weathercode >= 51 && weathercode <= 57) weatherInfo.condition = 'Drizzle';
          else if (weathercode >= 61 && weathercode <= 67) weatherInfo.condition = 'Rain';
          else if (weathercode >= 71 && weathercode <= 77) weatherInfo.condition = 'Snow fall';
          else if (weathercode >= 80 && weathercode <= 82) weatherInfo.condition = 'Rain showers';
          else if (weathercode >= 85 && weathercode <= 86) weatherInfo.condition = 'Snow showers';
          else if (weathercode >= 95 && weathercode <= 99) weatherInfo.condition = 'Thunderstorm';
          else weatherInfo.condition = 'N/A';
        }
      } else if (weatherResponsePromise.status === 'rejected') {
        // console.error('🔴 Weather API request failed:', weatherResponsePromise.reason);
        toast.warning('Error fetching weather data: '+weatherResponsePromise.reason);
      }

      if (geoResponsePromise.status === 'fulfilled' && geoResponsePromise.value.ok) {
        const geoData = await geoResponsePromise.value.json();
        weatherInfo.city = geoData.address?.city || geoData.address?.town || geoData.address?.village || '';
      } else if (geoResponsePromise.status === 'rejected') {
        // console.error('🔴 Geocoding API request failed:', geoResponsePromise.reason);
        toast.warning('Error fetching geocoding data: '+geoResponsePromise.reason);
      }

      setWeatherData(weatherInfo);
      localStorage.setItem('weatherData', JSON.stringify({ data: weatherInfo, timestamp: Date.now() }));

    } catch (error) {
      // console.error('🔴 Weather update failed:', error);
      toast.warn('Error updating weather: '+error.message);
      setWeatherData({ temp: '--', condition: 'Error', city: '', _isLoading: false });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 🌤️ WEATHER REFRESH WITH GEOLOCATION
  const refreshWeather = useCallback(() => {
    if (navigator.geolocation) {
      setWeatherData(prev => ({ ...prev, _isLoading: true })); // Indicate loading state
      setIsRefreshing(true); // Set overall refreshing to true

      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('🔴 Geolocation failed:', error);
          toast.error('please enable location: ');
          // console.log('Error obtaining location: '+error.message);
          setWeatherData({ temp: '--', condition: 'Location Error', city: '', _isLoading: false });
          setIsRefreshing(false); // Reset overall refreshing
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } else {
      setWeatherData({ temp: '--', condition: 'Not Supported', city: '', _isLoading: false });
      setIsRefreshing(false); // Reset overall refreshing
      toast.error('Geolocation is not supported by your browser or permission denied.');
      // alert('Geolocation is not supported by your browser or permission denied.');
    }
  }, [updateWeather]); // updateWeather is stable via useCallback

  // Initial weather fetch and then every 30 minutes
  useEffect(() => {
    let weatherIntervalId = null;

    const initializeWeatherAndInterval = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            updateWeather(latitude, longitude); // Initial fetch
            weatherIntervalId = setInterval(() => {
              updateWeather(latitude, longitude);
            }, 1800000); // 30 minutes
          },
          (error) => {
            toast.warning('please enable location: '+error.message);
            // console.warn('🔴 Geolocation permission denied or unavailable:', error);
            // alert('Error obtaining location: '+error.message);
            setWeatherData({ temp: '--', condition: 'Location N/A', city: '', _isLoading: false });
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        setWeatherData({ temp: '--', condition: 'Not Supported', city: '', _isLoading: false });
      }
    };

    initializeWeatherAndInterval();

    // Cleanup function
    return () => {
      if (weatherIntervalId) clearInterval(weatherIntervalId);
    };
  }, [updateWeather]);

  return (
    <div className="flex flex-col items-center md:items-end min-w-[120px] bg-blue-50/60 rounded-xl px-4 py-2 shadow-sm border border-blue-100 relative">
      {/* Refresh Weather Button */}
      <button
        onClick={refreshWeather}
        disabled={isRefreshing}
        className={`absolute -left-3 -top-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all text-blue-600 hover:text-blue-700 disabled:opacity-50 ${isRefreshing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        title={isRefreshing ? "Refreshing..." : "Refresh Weather"}
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
      
      {/* Label */}
      <span className="text-xs text-blue-700 font-semibold mb-1 tracking-wide">
        {weatherData.city ? `Today in ${weatherData.city}` : 'Today'}
      </span>
      
      {/* Weather Row */}
      <div className="flex items-center gap-2">
        {/* Weather Icon */}
        {weatherData.temp !== '--' && weatherData.condition !== 'Loading...' ? (
          <span>
            {weatherData.condition.includes('Clear') ? (
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" fill="#facc15" />
                <g stroke="#fbbf24" strokeWidth="2">
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                  <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                  <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                  <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                  <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
                </g>
              </svg>
            ) : weatherData.condition.includes('Cloudy') || weatherData.condition.includes('Fog') ? (
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <ellipse cx="12" cy="16" rx="8" ry="5" fill="#a5b4fc" />
                <ellipse cx="16" cy="14" rx="6" ry="4" fill="#818cf8" />
              </svg>
            ) : weatherData.condition.includes('Rain') || weatherData.condition.includes('Drizzle') || weatherData.condition.includes('Showers') ? (
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path fill="#60a5fa" d="M12 21a5 5 0 01-5-5c0-1.79.68-3.48 1.9-4.7L12 8l3.1 3.3C16.32 12.52 17 14.21 17 16a5 5 0 01-5 5z" />
                <path fill="#93c5fd" d="M17.8 13.8a6 6 0 00-11.6 0H5a7 7 0 0114 0h-1.2z" />
                <circle cx="12" cy="14" r="2" fill="#3b82f6" />
                <circle cx="8" cy="16" r="1.5" fill="#3b82f6" />
                <circle cx="16" cy="16" r="1.5" fill="#3b82f6" />
              </svg>
            ) : weatherData.condition.includes('Snow') ? (
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path fill="#a5b4fc" d="M12 21a5 5 0 01-5-5c0-1.79.68-3.48 1.9-4.7L12 8l3.1 3.3C16.32 12.52 17 14.21 17 16a5 5 0 01-5 5z" />
                <path fill="#c7d2fe" d="M17.8 13.8a6 6 0 00-11.6 0H5a7 7 0 0114 0h-1.2z" />
                <circle cx="12" cy="14" r="2" fill="#e0e7ff" />
                <circle cx="8" cy="16" r="1.5" fill="#e0e7ff" />
                <circle cx="16" cy="16" r="1.5" fill="#e0e7ff" />
              </svg>
            ) : weatherData.condition.includes('Thunderstorm') ? (
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path fill="#a5b4fc" d="M12 21a5 5 0 01-5-5c0-1.79.68-3.48 1.9-4.7L12 8l3.1 3.3C16.32 12.52 17 14.21 17 16a5 5 0 01-5 5z" />
                <path fill="#93c5fd" d="M17.8 13.8a6 6 0 00-11.6 0H5a7 7 0 0114 0h-1.2z" />
                <path stroke="#facc15" strokeWidth="2" d="M12 15l-3 4h6l-3-4z" />
              </svg>
            ) : (
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <ellipse cx="12" cy="16" rx="8" ry="5" fill="#d1d5db" />
              </svg>
            )}
          </span>
        ) : weatherData._isLoading ? (
          <span className="block w-7 h-7 rounded-full bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 animate-pulse"></span>
        ) : (
          <span className="block w-7 h-7 rounded-full bg-blue-100"></span>
        )}
        
        {/* Temperature */}
        {weatherData.temp !== '--' ? (
          <span className="text-3xl font-bold text-blue-600">{weatherData.temp}°C</span>
        ) : weatherData._isLoading ? (
          <span className="block w-12 h-8 rounded-lg bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 animate-pulse"></span>
        ) : (
          <span className="text-3xl font-bold text-blue-300">--</span>
        )}
      </div>
      
      {/* Condition */}
      {weatherData.temp !== '--' ? (
        <span className="text-gray-500 text-xs mt-1">{weatherData.condition}</span>
      ) : weatherData._isLoading ? (
        <span className="block w-20 h-3 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse mt-1"></span>
      ) : (
        <span className="text-gray-400 text-xs mt-1">--</span>
      )}
    </div>
  );
};

export default Weather;