/**
 * NotifyAppreciation Component
 * Shows user's received appreciation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL_EXPORT as API_BASE_URL } from '../api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { dataAPI } from '../api';

const NotifyAppreciation = () => {
  const { user, setUser } = useAuth();
  const [monthlyAppreciation, setMonthlyAppreciation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMonthlyAppreciation();
  }, []);

  const fetchMonthlyAppreciation = async () => {
    try {
      setError(null);
      setLoading(true);

      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); 
      const currentYear = now.getFullYear();

      // Force refresh user data from AsyncStorage to ensure latest user info
      let userId = user?.id || user?.user_id || user?.employee_id;
      let currentUserData = user;
      
      if (!userId) {
        try {
          const raw = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
          if (raw) {
            const parsed = JSON.parse(raw);
            userId = parsed?.id || parsed?.user_id || parsed?.employee_id;
            currentUserData = parsed;
            // Update context with fresh data
            if (userId && typeof setUser === 'function') {
              setUser(parsed);
            }
          }
        } catch (e) {
          console.warn('NotifyAppreciation: failed to read stored user', e);
        }
      }
      
      if (!userId) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

  const data = await dataAPI.get(`/appreciation/${userId}`);
  // dataAPI.get returns response.data; normalize
  const payload = data?.data || data || null;
  setMonthlyAppreciation(payload);
    } catch (error) {
      console.error('Failed to fetch appreciation data:', error);
      setError('Failed to load appreciation data');
      setMonthlyAppreciation(null);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badgeLevel) => {
    switch (badgeLevel?.toLowerCase()) {
      case 'gold':
        return <MaterialIcons name="emoji-events" size={24} color="#FFC107" />;
      case 'silver':
        return <MaterialIcons name="stars" size={24} color="#9E9E9E" />;
      case 'bronze':
        return <MaterialIcons name="star" size={24} color="#CD7F32" />;
      default:
        return <MaterialIcons name="star" size={24} color="#1976D2" />;
    }
  };

  const handleLike = async () => {
    if (!monthlyAppreciation) return;
    
    try {
      // Resolve user id from context or storage
      let uid = user?.id || user?.user_id || user?.employee_id;
      if (!uid) {
        try {
          const raw = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
          if (raw) {
            const parsed = JSON.parse(raw);
            uid = parsed?.id || parsed?.user_id || parsed?.employee_id;
            try { if (uid && typeof setUser === 'function') setUser(parsed); } catch (e) {}
          }
        } catch (e) {
          console.warn('NotifyAppreciation: failed to read stored user', e);
        }
      }
      if (!uid) {
        alert('You need to be logged in to like');
        return;
      }
      await dataAPI.post(`/appreciation/${monthlyAppreciation.id}/like`, { user_id: uid });
      
      // Show success message
  alert(`You liked ${monthlyAppreciation.employee_name}'s award!`);
    } catch (error) {
      console.error('Error liking appreciation:', error);
      alert('Failed to like appreciation');
    }
  };

  const handleComment = () => {
    if (!monthlyAppreciation) return;
    console.log(`Comment on appreciation ID: ${monthlyAppreciation.id}`);
    alert(`Leaving a comment for ${monthlyAppreciation.employee_name}.`);
  };

  const handleRetry = () => {
    fetchMonthlyAppreciation();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1976D2" />
          <Text style={styles.loadingText}>Loading appreciation...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#D32F2F" />
          <Text style={styles.errorTitle}>Failed to Load Appreciation</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No data state
  if (!monthlyAppreciation) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="emoji-events" size={48} color="#BDBDBD" />
          <Text style={styles.emptyTitle}>Appreciation of the Month</Text>
          <Text style={styles.emptyText}>No appreciations this month yet.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRetry}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Success state - display appreciation
  return (
    <View style={styles.container}>
      <View style={styles.appreciationContainer}>
        <View style={styles.header}>
          {getBadgeIcon(monthlyAppreciation.badge_level)}
          <Text style={styles.headerText}>Appreciation of the Month</Text>
        </View>
        
        <Text style={styles.congratsText}>
          Congratulations {user?.full_name || user?.username}!
        </Text>
        
        <Text style={styles.awardText}>
          For being <Text style={styles.highlightText}>{monthlyAppreciation.award_type}</Text> 
          {' '}Awarded with <Text style={styles.highlightText}>{monthlyAppreciation.badge_level?.toUpperCase()}</Text> in the Company.
        </Text>
        
        <Text style={styles.dateText}>
          {monthlyAppreciation.month} {monthlyAppreciation.year}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <MaterialIcons name="thumb-up" size={20} color="#616161" />
            <Text style={styles.actionButtonText}>Like</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#616161" />
            <Text style={styles.actionButtonText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: '#616161',
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorTitle: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#616161',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
    marginBottom: 12,
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  appreciationContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#212121',
  },
  congratsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  awardText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 8,
    lineHeight: 22,
  },
  highlightText: {
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#616161',
    marginLeft: 6,
  },
});

export default NotifyAppreciation;
