/**
 * BirthdayCard Component
 * Displays employee birthdays in a beautiful card layout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const BirthdayCard = ({ birthdays = [], onViewAll }) => {
  const [expanded, setExpanded] = useState(false);
  
  // If no birthdays, don't render anything
  if (!birthdays || birthdays.length === 0) {
    return null;
  }
  
  // Only show at most 3 birthdays in collapsed view
  const displayLimit = expanded ? birthdays.length : Math.min(3, birthdays.length);
  const displayData = birthdays.slice(0, displayLimit);
  const hasMore = birthdays.length > 3;
  
  // Get formatted date
  const formatBirthdayDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        day: 'numeric', 
        month: 'long'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Get days remaining
  const getDaysRemaining = (dateString) => {
    try {
      const today = new Date();
      const birthDate = new Date(dateString);
      
      // Set birthday to current year
      birthDate.setFullYear(today.getFullYear());
      
      // If birthday already passed this year, set to next year
      if (birthDate < today) {
        birthDate.setFullYear(today.getFullYear() + 1);
      }
      
      // Calculate days remaining
      const diff = birthDate.getTime() - today.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return "Today!";
      if (days === 1) return "Tomorrow";
      return `in ${days} days`;
    } catch (e) {
      return "";
    }
  };
  
  // Generate placeholder image for employees without photos
  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  
  const renderBirthdayItem = ({ item, index }) => (
    <View style={styles.birthdayItem}>
      <View style={styles.avatarContainer}>
        {item.photo ? (
          <Image 
            source={{ uri: item.photo }} 
            style={styles.avatar} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.initialsContainer}>
            <Text style={styles.initialsText}>
              {getInitials(item.name)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.birthdayInfo}>
        <Text style={styles.nameText}>{item.name}</Text>
        <View style={styles.dateRow}>
          <MaterialIcons name="cake" size={14} color="#F06292" style={styles.cakeIcon} />
          <Text style={styles.dateText}>
            {formatBirthdayDate(item.date)} {getDaysRemaining(item.date)}
          </Text>
        </View>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFE0B2', '#FFCC80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="cake" size={22} color="#E65100" />
            <Text style={styles.title}>Upcoming Birthdays</Text>
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
          data={displayData}
          renderItem={renderBirthdayItem}
          keyExtractor={(item) => item.id?.toString() || item.name}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
        
        {hasMore && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.expandButtonText}>
              {expanded ? "Show Less" : "Show More"}
            </Text>
            <MaterialIcons 
              name={expanded ? "expand-less" : "expand-more"} 
              size={18} 
              color="#FF9800" 
            />
          </TouchableOpacity>
        )}
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
    color: '#E65100',
    marginLeft: 8,
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '500',
  },
  content: {
    padding: 12,
  },
  birthdayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#FFCC80',
  },
  initialsContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFCC80',
  },
  initialsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  birthdayInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cakeIcon: {
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#616161',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 4,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginRight: 4,
  },
});

export default BirthdayCard;
