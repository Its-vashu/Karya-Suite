import React, { useState, useCallback, useMemo, useEffect } from 'react';
import useLeaveDays from '../leavemanagement/useLeaveDays';
import { ArrowLeft,Plus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import UploadHoliday from '../calendar/UploadHoliday';

const API_BASE = process.env.REACT_APP_API_BASE_URL

// Define availableCountries at the top
const availableCountries = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  // Add more countries if needed
];

const HolidayCalendar = () => {
  const { user_id, role } = useUser();
  const userId = user_id; 
  const { leaveDays, loading: leaveLoading, error: leaveError } = useLeaveDays(userId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  // For year view: which month to preview below the grid
  const [yearViewSelectedMonth, setYearViewSelectedMonth] = useState(null);
  const [selectedCountries, setSelectedCountries] = useState(['IN']);
  const [uploadingHoliday, setUploadingHoliday] = useState(false);

  const getHolidaysForDate = useCallback((date) => {
    // Format date as YYYY-MM-DD in local time (not UTC)
    const pad = n => n.toString().padStart(2, '0');
    const formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const dayHolidays = [];

    const countryHolidays = holidays['IN'] || [];
    const holiday = countryHolidays.find(h => h.date === formattedDate);
    if (holiday) {
      dayHolidays.push({
        ...holiday,
        countryCode: "IN",
        countryName: "India",
        flag: "🇮🇳"
      });
    }

    // Add leave days for this user (pending/approved only)
    if (leaveDays && Array.isArray(leaveDays)) {
      const leaveForDay = leaveDays.find(ld => ld.date === formattedDate);
      if (leaveForDay) {
        dayHolidays.push({
          ...leaveForDay,
          isLeave: true,
          localName: leaveForDay.status === 'Approved' ? 'Your Approved Leave' : 'Your Pending Leave',
          flag: '🟦',
          countryName: 'You'
        });
      }
    }

    return dayHolidays;
  }, [holidays]);

  const isWeekend = useCallback((date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }, []);



  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, []);

  const getMonthsForYear = useCallback(() => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      months.push(new Date(currentDate.getFullYear(), month, 1));
    }
    return months;
  }, [currentDate]);
useEffect(() => {
  const year = currentDate.getFullYear();
  if (viewMode === 'year') {
    // Fetch all months for the year
    Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        fetch(`${API_BASE}/holidays/calendar?year=${year}&month=${i + 1}`)
          .then(res => res.json())
          .then(data => data.holidays || [])
      )
    ).then(monthsHolidays => {
      // Flatten and merge all months
      const allHolidays = monthsHolidays.flat();
      setHolidays({
        IN: allHolidays.map(h => ({
          date: h.date,
          localName: h.name,
          name: h.name
        }))
      });
    }).catch(err => {
      //console.error("Error fetching holidays (year view):", err);
      alert("Error fetching holidays (year view): " + err.message);
    });
  } else {
    // Month view: fetch only current month
    const month = currentDate.getMonth() + 1;
    fetch(`${API_BASE}/holidays/calendar?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(data => {
        const backendHolidays = data.holidays || [];
        setHolidays({
          IN: backendHolidays.map(h => ({
            date: h.date,
            localName: h.name,
            name: h.name
          }))
        });
      })
      .catch(err => {
        //console.error("Error fetching holidays (month view):", err);
        alert("Error fetching holidays (month view): " + err.message);
      });
  }
}, [currentDate, viewMode]);


  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const dayNames = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

  const navigateCalendar = useCallback((direction) => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() + direction, 0, 1));
    }
  }, [viewMode, currentDate]);

  const handleDateClick = useCallback((clickedDate) => {
    if (clickedDate) {
      setSelectedDate(clickedDate);
    }
  }, []);

 
  // Month view for a given date (used for both normal and year preview)
  const renderMonthView = useCallback((dateForMonthView = currentDate) => (
    <div className="bg-blue-300 rounded-lg p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-blue-900 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {getDaysInMonth(dateForMonthView).map((day, index) => {
          if (!day) {
            return <div key={index} className="h-12"></div>;
          }

          const dayHolidays = getHolidaysForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
          const isWeekendDay = isWeekend(day);
          const leaveObj = dayHolidays.find(h => h.isLeave);

          // Professional color palette
          let bgClass = '', textClass = '', borderClass = '', hoverClass = '';
          if (isSelected) {
            // Check if selected date is a holiday/leave
            if (dayHolidays.length > 0) {
              // For holidays or approved leaves
              const approvedLeave = dayHolidays.find(h => h.isLeave && h.status && h.status.toLowerCase() === 'approved');
              const pendingLeave = dayHolidays.find(h => h.isLeave && h.status && h.status.toLowerCase() === 'pending');
              const isHoliday = dayHolidays.some(h => !h.isLeave);
              
              if (approvedLeave || isHoliday) {
                bgClass = 'bg-green-500';
                textClass = 'text-white';
                hoverClass = 'hover:bg-green-600';
              } else if (pendingLeave) {
                bgClass = 'bg-yellow-600';
                textClass = 'text-white';
                hoverClass = 'hover:bg-yellow-700';
              }
            } else {
              // Regular day that is selected - show in red
              bgClass = 'bg-red-500';
              textClass = 'text-white';
              hoverClass = 'hover:bg-red-600';
            }
          } else if (leaveObj) {
            if (leaveObj.status && leaveObj.status.toLowerCase() === 'approved') {
              bgClass = 'bg-green-300';
              borderClass = 'border-2 border-blue-600';
              textClass = 'text-blue-700 font-bold';
              hoverClass = 'hover:bg-blue-50';
            } else {
              bgClass = 'bg-yellow-50';
              borderClass = 'border border-yellow-400';
              textClass = 'text-yellow-700 font-semibold';
              hoverClass = 'hover:bg-yellow-100';
            }
          } else if (dayHolidays.length > 0) {
            bgClass = 'bg-red-50';
            borderClass = 'border border-red-300';
            textClass = 'text-red-700 font-semibold';
            hoverClass = 'hover:bg-red-100';
          } else if (isWeekendDay) {
            bgClass = 'bg-yellow-400';
            borderClass = '';
            textClass = 'text-blue-800 font-bold';
            // hoverClass = 'hover:bg-gray-500';
          } else {
            bgClass = 'bg-white';
            borderClass = 'border border-gray-200';
            textClass = 'text-gray-700';
            hoverClass = 'hover:bg-blue-50';
          }

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              className={`h-12 w-full rounded-lg text-sm transition-all duration-200 relative ${bgClass} ${borderClass} ${textClass} ${hoverClass} shadow-sm ${isToday ? 'ring-2 ring-blue-400' : ''} hover:scale-105`}
              title={`${isWeekendDay ? '🏖 Weekend\n' : ''}${dayHolidays.map(h => `${h.flag} ${h.localName}`).join('\n')}`}
            >
              {day.getDate()}
              {leaveObj && leaveObj.status && leaveObj.status.toLowerCase() === 'approved' && (
                <span className="absolute top-1 right-1 text-green-500 text-xs">✔️</span>
              )}
              {leaveObj && leaveObj.status && leaveObj.status.toLowerCase() === 'pending' && (
                <span className="absolute top-1 right-1 text-yellow-500 text-xs">⏳</span>
              )}
              {dayHolidays.length > 0 && !leaveObj && (
                <span className="absolute top-1 right-1 text-red-400 text-xs">★</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  ), [getDaysInMonth, getHolidaysForDate, selectedDate, handleDateClick, isWeekend, dayNames]);

  const renderYearView = useCallback(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {getMonthsForYear().map((monthDate, monthIndex) => (
        <div key={monthIndex} className="bg-blue-300 rounded-lg  p-4 hover:shadow-lg transition-shadow">
          <button
            className={`text-lg font-semibold text-center mb-3 w-full py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 text-blue-800`}
            onClick={() => {
              setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
              setViewMode('month');
            }}
            style={{marginBottom: '12px'}}
          >
            {monthNames[monthIndex]}
          </button>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-blue-800 font-medium py-2">
                {day}
              </div>
            ))}
            {getDaysInMonth(monthDate).map((day, dayIndex) => {
              if (!day) {
                return <div key={dayIndex} className="h-8"></div>;
              }
              const dayHolidays = getHolidaysForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
              const isWeekendDay = isWeekend(day);
              // Year view color logic
              let bgClass, textClass, hoverClass;
              if (isSelected) {
                // Check if selected date is a holiday/leave
                if (dayHolidays.length > 0) {
                  // For holidays or approved leaves
                  const approvedLeave = dayHolidays.find(h => h.isLeave && h.status && h.status.toLowerCase() === 'approved');
                  const pendingLeave = dayHolidays.find(h => h.isLeave && h.status && h.status.toLowerCase() === 'pending');
                  const isHoliday = dayHolidays.some(h => !h.isLeave);
                  
                  if (approvedLeave || isHoliday) {
                    bgClass = 'bg-green-500';
                    textClass = 'text-white';
                    hoverClass = 'hover:bg-green-600';
                  } else if (pendingLeave) {
                    bgClass = 'bg-yellow-600';
                    textClass = 'text-white';
                    hoverClass = 'hover:bg-yellow-700';
                  }
                } else {
                  // Regular day that is selected - show in red
                  bgClass = 'bg-red-500';
                  textClass = 'text-white';
                }
              } else if (dayHolidays.length > 0) {
                bgClass = 'bg-green-500';
                textClass = 'text-white';
                hoverClass = 'hover:bg-green-600';
              } else if (isWeekendDay) {
                bgClass = 'bg-yellow-400';
                textClass = 'text-blue-700';
              } else {
                bgClass = 'bg-white';
                textClass = 'text-gray-700';
                hoverClass = 'hover:bg-blue-100';
              }
              return (
                <button
                  key={dayIndex}
                  onClick={() => handleDateClick(day)}
                  className={`
                    h-8 w-full rounded text-xs font-medium transition-all
                    ${bgClass} ${textClass} ${hoverClass}
                    ${isToday ? 'ring-2 ring-blue-400' : ''}
                  `}
                  title={`${isWeekendDay ? '🏖 Weekend\n' : ''}${dayHolidays.map(h => `${h.flag} ${h.localName}`).join('\n')}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {(() => {
              const monthHolidays = selectedCountries.reduce((total, countryCode) => {
                const countryHolidays = holidays[countryCode] || [];
                return total + countryHolidays.filter(h => new Date(h.date).getMonth() === monthIndex).length;
              }, 0);
              return `${monthHolidays} holidays`;
            })()}
          </div>
        </div>
      ))}
    </div>
  ), [getMonthsForYear, monthNames, getDaysInMonth, getHolidaysForDate, handleDateClick, selectedCountries, holidays, selectedDate, isWeekend, yearViewSelectedMonth]);

  const getAllHolidaysForCurrentPeriod = useCallback(() => {
    const allHolidays = [];
    
    selectedCountries.forEach(countryCode => {
      const countryHolidays = holidays[countryCode] || [];
      countryHolidays.forEach(holiday => {
        const holidayDate = new Date(holiday.date);
        const shouldInclude = viewMode === 'year' || 
          (holidayDate.getMonth() === currentDate.getMonth() && 
           holidayDate.getFullYear() === currentDate.getFullYear());
        
        if (shouldInclude) {
          allHolidays.push({
            ...holiday,
            countryCode,
            countryName: availableCountries.find(c => c.code === countryCode)?.name || countryCode,
            flag: availableCountries.find(c => c.code === countryCode)?.flag || '🏳'
          });
        }
      });
    });
    
    return allHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedCountries, holidays, viewMode, currentDate, availableCountries]);

  return (
    <div className="max-w-full mx-auto px-16 py-4 bg-blue-900 min-h-screen">
      <div className='flex align-center mt-2 pb-3 text-gray-100'>
        <div>
          <button
            onClick={() => window.history.back()}
            className="px-2 py-2 mt-2 rounded-lg  hover:text-gray-600 hover:bg-gray-300"
          >
            <ArrowLeft />
          </button>
        </div>
        
        <div className="mb-2 align-between flex justify-between w-full"> 
          <h1 className="text-4xl font-bold">
            📅 Holiday Calendar
          </h1>
          {
            role === 'hr' && (
              <button
                className='mt-2 pr-3 mr-3 flex items-center gap-2 rounded-lg bg-blue-400 hover:bg-blue-600 text-gray-200 px-4 py-2 font-medium'
                onClick={() => setUploadingHoliday(true)}
                > 
                  <Plus size={20} />
                  <span>Add Holiday</span>
              </button>
            )
          }
          
        </div>

      </div>

      {/* Upload Holiday Modal */}
      {uploadingHoliday && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <UploadHoliday onClose={() => setUploadingHoliday(false)} />
        </div>
      )}

      {/* View Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateCalendar(-1)}
              className="p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              ←
            </button>
            
            <h2 className="text-2xl font-bold text-gray-800">
              {viewMode === 'month' 
                ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `${currentDate.getFullYear()}`
              }
            </h2>
            
            <button
              onClick={() => navigateCalendar(1)}
              className="p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              →
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'year'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Year View
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'year' ? (
        <>
          <div className="mb-8">{renderYearView()}</div>
          {yearViewSelectedMonth !== null && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
                {monthNames[yearViewSelectedMonth]} {currentDate.getFullYear()}
              </h3>
              {renderMonthView(new Date(currentDate.getFullYear(), yearViewSelectedMonth, 1))}
            </div>
          )}
        </>
      ) : (
        <div className="mb-8">
          {renderMonthView()}
        </div>
      )}

      {/* Selected Date Info */}
    
{selectedDate && (() => {
  const holidaysForDate = getHolidaysForDate(selectedDate);
  let boxColor = 'bg-red-600'; // Default: No holiday/leave

  if (holidaysForDate.length > 0) {
    // Always compare status in lowercase
    const approvedLeave = holidaysForDate.find(
      h => h.isLeave && h.status && h.status.toLowerCase() === 'approved'
    );
    const pendingLeave = holidaysForDate.find(
      h => h.isLeave && h.status && h.status.toLowerCase() === 'pending'
    );
    const isHoliday = holidaysForDate.some(h => !h.isLeave);

    if (approvedLeave || isHoliday) {
      boxColor = 'bg-green-600';
    } else if (pendingLeave) {
      boxColor = 'bg-yellow-900'; // Brown shade
    }
  }

  return (
    <div className={`${boxColor} text-white rounded-xl p-6 mb-6`}>
      <h3 className="text-xl font-bold mb-3">
        📅 {selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
        {isWeekend(selectedDate) && <span className="ml-2">🏖 Weekend</span>}
      </h3>
      {holidaysForDate.length > 0 ? (
        <div className="space-y-2">
          {holidaysForDate.map((holiday, index) => (
            <div key={index} className={`flex items-center gap-3 bg-red-600 bg-opacity-20 rounded-lg p-3 ${
              holiday.isLeave
                ? (holiday.status && holiday.status.toLowerCase() === 'approved'
                    ? 'border-l-4 border-green-400'
                    : holiday.status && holiday.status.toLowerCase() === 'pending'
                    ? 'border-l-4 border-yellow-900'
                    : 'border-l-4 border-red-400')
                : ''
            }`}>
              <span className="text-2xl">{holiday.flag}</span>
              <div>
                <p className="font-semibold">{holiday.localName}</p>
                <p className="text-sm opacity-90">
                  {holiday.isLeave
                    ? (holiday.status ? `Your Leave are ${holiday.status}` : 'Your Leave')
                    : holiday.countryName}
                </p>
                {holiday.isLeave && holiday.reason && (
                  <p className="text-xs opacity-80 italic">Reason: {holiday.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-lg">No holidays or leaves on this date</p>
      )}
    </div>
  );
})()}


      {/* Holidays List */}
      <div className="bg-blue-300 rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="text-3xl mr-3">🎉</span>
          Holidays {viewMode === 'month' 
            ? `in ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            : `in ${currentDate.getFullYear()}`
          }
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getAllHolidaysForCurrentPeriod().map((holiday, index) => (
            <div key={index} className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border-l-4 border-red-500 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{holiday.flag}</span>
                    <span className="text-sm font-medium text-gray-600">{holiday.countryName}</span>
                  </div>
                  <p className="font-bold text-gray-800 mb-1">{holiday.localName}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(holiday.date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <span className="text-2xl">🎊</span>
              </div>
            </div>
          ))}
        </div>
        
        {getAllHolidaysForCurrentPeriod().length === 0 && (
          <p className="text-red-600 text-center py-8 text-lg">
            No holidays found for the selected countries and time period
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="mt-8 bg-white rounded-lg p-4 shadow-lg">
        <h4 className="font-semibold text-gray-800 mb-3">🎨 Color Legend:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Selected Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
            <span>Regular Day</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 bg-blue-300 rounded-lg p-4">
        <h4 className="font-semibold text-black mb-2">💡 Tips:</h4>
        <ul className="text-gray-900 text-sm space-y-1">
          <li>• Click on any date to see holiday details</li>
          <li>• Green dates show your selected date</li>
          <li>• Red dates indicate holidays from selected countries</li>
          <li>• Grey dates are weekends (Saturday & Sunday)</li>
          <li>• Switch between Month and Year views for different perspectives</li>
          <li>• Currently using sample holiday data - connect your FastAPI route later</li>
        </ul>
      </div>
    </div>
  );
};

export default HolidayCalendar;