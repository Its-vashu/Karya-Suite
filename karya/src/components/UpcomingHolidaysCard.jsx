/**
 * UpcomingHolidaysCard Component
 * Displays upcoming holidays in a card format
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const UpcomingHolidaysCard = ({ holidays = [], onViewAll }) => {
  // If no holidays, don't render anything
  if (!holidays || holidays.length === 0) {
    return null;
  }
  
  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculate days remaining
  const getDaysRemaining = (dateString) => {
    try {
      const holidayDate = new Date(dateString);
      const today = new Date();
      
      // Reset time portion for accurate day calculation
      today.setHours(0, 0, 0, 0);
      holidayDate.setHours(0, 0, 0, 0);
      
      const diffTime = holidayDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 0) return 'Past';
      return `${diffDays} days`;
    } catch (e) {
      return '';
    }
  };
  
  // Get holiday icon based on name or type
  const getHolidayIcon = (holidayName, holidayType) => {
    const nameLower = (holidayName || '').toLowerCase();
    const typeLower = (holidayType || '').toLowerCase();
    
    if (nameLower.includes('christmas') || nameLower.includes('xmas')) 
      return 'card-giftcard';
    if (nameLower.includes('new year')) 
      return 'celebration';
    if (nameLower.includes('independence') || nameLower.includes('republic') || nameLower.includes('national'))
      return 'flag';
    if (nameLower.includes('thanksgiving')) 
      return 'fastfood';
    if (nameLower.includes('memorial') || nameLower.includes('remembrance')) 
      return 'outlined-flag';
    if (nameLower.includes('labor') || nameLower.includes('labour')) 
      return 'work';
    if (typeLower.includes('religious')) 
      return 'church';
    if (typeLower.includes('federal') || typeLower.includes('bank')) 
      return 'account-balance';
    
    // Default icon
    return 'event';
  };
  
  const renderHolidayItem = ({ item, index }) => {
    const daysRemaining = getDaysRemaining(item.date);
    const isPast = daysRemaining === 'Past';
    
    // Calculate status color
    let statusColor = '#4CAF50'; // Default green for upcoming
    if (daysRemaining === 'Today') {
      statusColor = '#FF9800'; // Orange for today
    } else if (isPast) {
      statusColor = '#9E9E9E'; // Grey for past
    } else if (daysRemaining === 'Tomorrow') {
      statusColor = '#2196F3'; // Blue for tomorrow
    }
    
    return (
      <View style={[styles.holidayItem, isPast && styles.pastHoliday]}>
        <View style={[styles.holidayIconContainer, { backgroundColor: `${statusColor}20` }]}>
          <MaterialIcons 
            name={getHolidayIcon(item.name, item.type)} 
            size={20} 
            color={statusColor} 
          />
        </View>
        
        <View style={styles.holidayInfo}>
          <Text style={[styles.holidayName, isPast && styles.pastHolidayText]}>
            {item.name}
          </Text>
          
          <Text style={[styles.holidayDate, isPast && styles.pastHolidayText]}>
            {formatDate(item.date)}
          </Text>
        </View>
        
        <View style={[styles.daysContainer, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.daysRemaining, { color: statusColor }]}>
            {daysRemaining}
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E0F7FA', '#B2EBF2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="event" size={22} color="#00ACC1" />
            <Text style={styles.title}>Upcoming Holidays</Text>
          </View>
          
          {onViewAll && (
            <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        <FlatList
          data={holidays}
          renderItem={renderHolidayItem}
          keyExtractor={(item) => item.id?.toString() || item.name}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  headerGradient: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ACC1',
    marginLeft: 8,
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#00ACC1',
    fontWeight: '500',
  },
  content: {
    padding: 12,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pastHoliday: {
    opacity: 0.7,
  },
  holidayIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  holidayDate: {
    fontSize: 12,
    color: '#616161',
  },
  pastHolidayText: {
    color: '#9E9E9E',
  },
  daysContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  daysRemaining: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 4,
  },
});

export default UpcomingHolidaysCard;
