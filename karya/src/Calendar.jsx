import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { API_BASE_URL_EXPORT as API_BASE_URL } from './api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

// Calendar Modal Component
const CalendarModal = ({ 
  visible, 
  onClose, 
  onSelectDate, 
  initialDate = new Date(),
  minDate = null,
  maxDate = null
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    initialDate ? new Date(initialDate) : new Date()
  );
  
  useEffect(() => {
    if (initialDate && visible) {
      const newDate = new Date(initialDate);
      if (newDate.getMonth() !== currentMonth.getMonth() || 
          newDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(newDate);
      }
    }
  }, [initialDate, visible]);

  const renderHeader = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return (
      <View style={modalStyles.header}>
        <TouchableOpacity 
          style={modalStyles.navButton} 
          onPress={() => navigateMonth(-1)}
        >
          <Text style={modalStyles.navButtonText}>◀</Text>
        </TouchableOpacity>
        
        <Text style={modalStyles.headerTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        
        <TouchableOpacity 
          style={modalStyles.navButton} 
          onPress={() => navigateMonth(1)}
        >
          <Text style={modalStyles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <View style={modalStyles.daysOfWeek}>
        {days.map(day => (
          <Text key={day} style={modalStyles.dayOfWeekText}>
            {day}
          </Text>
        ))}
      </View>
    );
  };
  
  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newDate);
  };
  
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };
  
  const isDateSelectable = (date) => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };
  
  const renderDay = ({ item: date }) => {
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isToday = date.toDateString() === new Date().toDateString();
    const isSelectable = isDateSelectable(date);
    
    return (
      <TouchableOpacity
        style={[
          modalStyles.day,
          !isCurrentMonth && modalStyles.otherMonthDay,
          isToday && modalStyles.today,
          !isSelectable && modalStyles.disabledDay
        ]}
        onPress={() => isSelectable && handleDateSelect(date)}
        disabled={!isSelectable}
      >
        <Text
          style={[
            modalStyles.dayText,
            !isCurrentMonth && modalStyles.otherMonthDayText,
            isToday && modalStyles.todayText,
            !isSelectable && modalStyles.disabledDayText
          ]}
        >
          {date.getDate()}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const handleDateSelect = (date) => {
    onSelectDate && onSelectDate(date);
    onClose();
  };
  
  const renderCalendarGrid = () => {
    const days = generateCalendarDays();
    
    return (
      <View style={modalStyles.calendarGrid}>
        <FlatList
          data={days}
          renderItem={renderDay}
          keyExtractor={(item) => item.toISOString()}
          numColumns={7}
          scrollEnabled={false}
        />
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={modalStyles.modalContainer}>
        <View style={modalStyles.modalContent}>
          <View style={modalStyles.calendarContainer}>
            {renderHeader()}
            {renderDaysOfWeek()}
            {renderCalendarGrid()}
            
            <View style={modalStyles.buttonContainer}>
              <TouchableOpacity 
                style={modalStyles.cancelButton} 
                onPress={onClose}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={modalStyles.todayButton} 
                onPress={() => handleDateSelect(new Date())}
              >
                <Text style={modalStyles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calendarContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a2850',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    color: '#0a2850',
    fontWeight: 'bold',
  },
  daysOfWeek: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    marginBottom: 16,
  },
  day: {
    width: (width * 0.9 - 32) / 7,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    color: '#1F2937',
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  otherMonthDayText: {
    color: '#9CA3AF',
  },
  today: {
    backgroundColor: '#0a2850',
  },
  todayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#9CA3AF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  todayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0a2850',
  },
  todayButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});

// Export CalendarModal as a named export
export { CalendarModal };

const Calendar = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState({});
  const [leaveDays, setLeaveDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'year'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [region, setRegion] = useState(0); // 0 means use the default public holidays

  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const dayNames = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

  // Fetch holidays from API
  const fetchHolidays = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // URL depends on whether we're fetching public holidays or region-specific
      let url = '';
      if (region === 0) {
        url = `${API_BASE_URL}/holidays/calendar?year=${year}&month=${month}`;
      } else {
        url = `${API_BASE_URL}/holidays/region-calendar/${region}?year=${year}&month=${month}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedHolidays = (data.holidays || []).map(holiday => ({
          ...holiday,
          localName: holiday.name, // Map the name to localName for proper display
          name: holiday.name
        }));
        setHolidays(prev => ({
          ...prev,
          'IN': formattedHolidays
        }));
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  }, [currentDate, user?.token, region]);

  // Fetch user leave days
  const fetchLeaveDays = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/leave-applications/?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Convert leave applications to calendar format
          const leaveCalendarDays = [];
          data.forEach(leave => {
            const startDate = new Date(leave.start_date);
            const endDate = new Date(leave.end_date);
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              leaveCalendarDays.push({
                date: dateStr,
                isLeave: true,
                status: leave.status,
                reason: leave.reason,
                leaveType: leave.leave_type
              });
            }
          });
          setLeaveDays(leaveCalendarDays);
        }
      }
    } catch (error) {
      console.error('Error fetching leave days:', error);
    }
  }, [user?.id, user?.token]);

  // Get holidays for a specific date
  const getHolidaysForDate = useCallback((date) => {
    const pad = n => n.toString().padStart(2, '0');
    const formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const dayHolidays = [];

    // Add holidays
    const countryHolidays = holidays['IN'] || [];
    const holiday = countryHolidays.find(h => h.date === formattedDate);
    if (holiday) {
      dayHolidays.push({
        ...holiday,
        countryCode: "IN",
        countryName: "India",
        flag: "🇮🇳",
        localName: holiday.localName || holiday.name // Ensure localName is available
      });
    }

    // Add leave days
    const leaveForDay = leaveDays.find(ld => ld.date === formattedDate);
    if (leaveForDay) {
      dayHolidays.push({
        ...leaveForDay,
        localName: `${leaveForDay.leaveType} Leave`,
        flag: leaveForDay.status?.toLowerCase() === 'approved' ? '✅' : '⏳'
      });
    }

    return dayHolidays;
  }, [holidays, leaveDays]);

  // Check if date is weekend
  const isWeekend = useCallback((date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  }, []);

  // Get days in month
  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startingDayOfWeek = firstDay.getDay();

    // Create a 6x7 grid (42 cells) for the calendar
    // This ensures we have enough rows for all possible month layouts
    const calendarGrid = Array(42).fill(null);
    
    // Fill in the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Calculate the position in the grid (startingDayOfWeek is the offset)
      const index = startingDayOfWeek + day - 1;
      calendarGrid[index] = new Date(year, month, day);
    }
    
    // We only need as many rows as required to fit all days
    // Calculate how many rows we actually need
    const rowsNeeded = Math.ceil((startingDayOfWeek + daysInMonth) / 7);
    
    // Return only the cells that are needed (trim excess rows)
    return calendarGrid.slice(0, rowsNeeded * 7);
  }, []);

  // Navigation
  const navigate = useCallback((direction) => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() + direction, 0, 1));
    }
  }, [viewMode, currentDate]);

  // Handle date selection
  const handleDateClick = useCallback((clickedDate) => {
    if (clickedDate) {
      setSelectedDate(clickedDate);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHolidays(), fetchLeaveDays()]);
    setRefreshing(false);
  }, [fetchHolidays, fetchLeaveDays]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHolidays(), fetchLeaveDays()]);
      setLoading(false);
    };
    loadData();
  }, [fetchHolidays, fetchLeaveDays, region]);

  // Render calendar day
  const renderDay = useCallback((day, index) => {
    // Ensure empty days maintain the same size and layout
    if (!day) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayHolidays = getHolidaysForDate(day);
    const isToday = day.toDateString() === new Date().toDateString();
    const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
    const isWeekendDay = isWeekend(day);
    const leaveObj = dayHolidays.find(h => h.isLeave);
    const hasHoliday = dayHolidays.some(h => !h.isLeave);

    let dayStyle = [styles.dayButton];
    let textStyle = [styles.dayText];

    if (isSelected) {
      dayStyle.push(styles.selectedDay);
      textStyle.push(styles.selectedDayText);
    } else if (leaveObj) {
      if (leaveObj.status?.toLowerCase() === 'approved') {
        dayStyle.push(styles.approvedLeaveDay);
      } else {
        dayStyle.push(styles.pendingLeaveDay);
      }
    } else if (hasHoliday) {
      dayStyle.push(styles.holidayDay);
    } else if (isWeekendDay) {
      dayStyle.push(styles.weekendDay);
    }

    if (isToday) {
      dayStyle.push(styles.todayBorder);
    }

    return (
      <TouchableOpacity
        key={index}
        style={dayStyle}
        onPress={() => handleDateClick(day)}
        activeOpacity={0.7}
      >
        <Text style={textStyle}>{day.getDate()}</Text>
        {leaveObj && (
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              {leaveObj.status?.toLowerCase() === 'approved' ? '✓' : '⏳'}
            </Text>
          </View>
        )}
        {hasHoliday && !leaveObj && (
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>★</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [getHolidaysForDate, selectedDate, handleDateClick, isWeekend]);

  // Render month view
  const renderMonthView = useCallback(() => {
    const days = getDaysInMonth(currentDate);
    const rows = [];
    
    // Split days into rows (7 days per row)
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }

    // Make sure we have exactly 7 days per row
    rows.forEach(row => {
      while (row.length < 7) {
        row.push(null);
      }
    });

    return (
      <View style={styles.monthContainer}>
        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {dayNames.map((day, index) => (
            <Text key={index} style={styles.dayHeader}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarRows}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.calendarRow}>
              {row.map((day, dayIndex) => renderDay(day, rowIndex * 7 + dayIndex))}
            </View>
          ))}
        </View>
      </View>
    );
  }, [currentDate, getDaysInMonth, renderDay, dayNames]);

  // Render year view
  const renderYearView = useCallback(() => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      months.push(new Date(currentDate.getFullYear(), month, 1));
    }

    return (
      <ScrollView style={styles.yearContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.yearGrid}>
          {months.map((monthDate, monthIndex) => (
            <TouchableOpacity
              key={monthIndex}
              style={styles.monthTile}
              onPress={() => {
                setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
                setViewMode('month');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.monthTileTitle}>
                {monthNames[monthIndex]}
              </Text>
              <View style={styles.miniCalendar}>
                {/* Mini Day Headers */}
                <View style={styles.miniDayHeaders}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={styles.miniDayHeader}>{d}</Text>
                  ))}
                </View>
                
                {/* Mini Calendar Grid */}
                <View style={styles.miniCalendarGrid}>
                  {(() => {
                    const days = getDaysInMonth(monthDate);
                    const rows = [];
                    
                    for (let i = 0; i < days.length; i += 7) {
                      rows.push(days.slice(i, i + 7));
                    }
                    
                    return rows.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.miniCalendarRow}>
                        {row.map((day, dayIndex) => {
                          if (!day) return <View key={`empty-${rowIndex}-${dayIndex}`} style={styles.miniEmptyDay} />;
                          
                          const dayHolidays = getHolidaysForDate(day);
                          const hasEvent = dayHolidays.length > 0;
                          
                          return (
                            <View
                              key={`day-${rowIndex}-${dayIndex}`}
                              style={[
                                styles.miniDay,
                                hasEvent && styles.miniDayWithEvent
                              ]}
                            >
                              <Text style={[
                                styles.miniDayText,
                                hasEvent && styles.miniDayWithEventText
                              ]}>
                                {day.getDate()}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }, [currentDate, monthNames, getDaysInMonth, getHolidaysForDate]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Navigation Controls */}
        <View style={styles.navContainer}>
          <View style={styles.navLeft}>
            <TouchableOpacity style={styles.navButton} onPress={() => navigate(-1)}>
              <MaterialIcons name="chevron-left" size={24} color="#1976D2" />
            </TouchableOpacity>
            <Text style={styles.currentPeriod}>
              {viewMode === 'month' 
                ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `${currentDate.getFullYear()}`
              }
            </Text>
            <TouchableOpacity style={styles.navButton} onPress={() => navigate(1)}>
              <MaterialIcons name="chevron-right" size={24} color="#1976D2" />
            </TouchableOpacity>
          </View>

          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'month' && styles.activeToggle]}
              onPress={() => setViewMode('month')}
            >
              <Text style={[styles.toggleText, viewMode === 'month' && styles.activeToggleText]}>
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'year' && styles.activeToggle]}
              onPress={() => setViewMode('year')}
            >
              <Text style={[styles.toggleText, viewMode === 'year' && styles.activeToggleText]}>
                Year
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar View */}
        {viewMode === 'month' ? renderMonthView() : renderYearView()}

        {/* Selected Date Info */}
        {selectedDate && (
          <View style={styles.selectedDateInfo}>
            <Text style={styles.selectedDateTitle}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              {isWeekend(selectedDate) && ' 🏖️'}
            </Text>
            
            {(() => {
              const holidaysForDate = getHolidaysForDate(selectedDate);
              return holidaysForDate.length > 0 ? (
                <View style={styles.holidaysList}>
                  {holidaysForDate.map((holiday, index) => (
                    <View key={index} style={styles.holidayItem}>
                      <Text style={styles.holidayFlag}>{holiday.flag}</Text>
                      <View style={styles.holidayInfo}>
                        <Text style={styles.holidayName}>{holiday.localName || holiday.name}</Text>
                        <Text style={styles.holidayDetails}>
                          {holiday.isLeave 
                            ? `Status: ${holiday.status}`
                            : holiday.countryName
                          }
                        </Text>
                        {holiday.reason && (
                          <Text style={styles.holidayReason}>Reason: {holiday.reason}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noHolidays}>No holidays or leaves on this date</Text>
              );
            })()}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendLabel}>Approved Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendLabel}>Pending Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendLabel}>Holiday</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#9E9E9E' }]} />
              <Text style={styles.legendLabel}>Weekend</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  navContainer: {
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPeriod: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  activeToggle: {
    backgroundColor: '#1976D2',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeToggleText: {
    color: 'white',
  },
  monthContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
    width: '100%',
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  calendarRows: {
    width: '100%',
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  emptyDay: {
    flex: 1,
    height: 40,
    margin: 1,
  },
  dayButton: {
    flex: 1,
    height: 40,
    margin: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedDay: {
    backgroundColor: '#1976D2',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  approvedLeaveDay: {
    backgroundColor: '#4CAF50',
  },
  pendingLeaveDay: {
    backgroundColor: '#FF9800',
  },
  holidayDay: {
    backgroundColor: '#F44336',
  },
  weekendDay: {
    backgroundColor: '#F0F0F0',
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: 8,
    color: 'white',
  },
  yearContainer: {
    flex: 1,
    padding: 16,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthTile: {
    width: width / 2 - 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  monthTileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  miniCalendar: {
    width: '100%',
  },
  miniDayHeaders: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  miniDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
  miniCalendarGrid: {
    width: '100%',
  },
  miniCalendarRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  miniEmptyDay: {
    flex: 1,
    height: 18,
  },
  miniDay: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDayText: {
    fontSize: 10,
    color: '#666',
  },
  miniDayWithEvent: {
    backgroundColor: '#1976D2',
    borderRadius: 2,
  },
  miniDayWithEventText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedDateInfo: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  holidaysList: {
    marginTop: 8,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  holidayFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  holidayDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  holidayReason: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noHolidays: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  legend: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default Calendar;