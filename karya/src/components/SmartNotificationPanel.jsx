/**
 * Smart Notification Panel Component
 * Professional notification panel with appreciation badges
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  PanResponder,
  Platform
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight } = Dimensions.get('window');

const SmartNotificationPanel = ({ 
  isVisible, 
  notifications = [], 
  unreadCount = 0,
  onClose, 
  onRefresh,
  onNotificationPress,
  onMarkAllRead 
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Safe time formatter: prefer preformatted notification.time, else build from timestamp/created_at
  const formatNotificationTime = (notification) => {
    try {
      if (!notification) return '';
      if (notification.time && typeof notification.time === 'string' && notification.time.trim()) return notification.time;

      const ts = notification.timestamp || (notification.created_at ? Date.parse(notification.created_at) : null);
      if (!ts || isNaN(ts)) return '';

      const diffMs = Date.now() - ts;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      if (diffHours < 48) return 'Yesterday';

      const d = new Date(ts);
      return d.toLocaleDateString();
    } catch (err) {
      return '';
    }
  };

  // Animation when panel opens/closes
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible]);

  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Render notification badge
  const renderBadge = (notification) => {
    if (notification.type === 'appreciation' && notification.badge) {
      const { color, level, textColor } = notification.badge;
      return (
        <View style={[styles.appreciationBadge, { backgroundColor: color }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>
            {level?.substring(0, 1).toUpperCase()}
          </Text>
        </View>
      );
    }
    
    if (notification.icon) {
      return (
        <View style={[styles.iconBadge, { backgroundColor: `${notification.iconColor}20` }]}>
          <MaterialIcons 
            name={notification.icon} 
            size={16} 
            color={notification.iconColor} 
          />
        </View>
      );
    }
    
    // If avatar looks like a remote URL, render it as an image for authenticity
    const avatar = notification.avatar;
    if (avatar && typeof avatar === 'string' && avatar.startsWith && avatar.startsWith('http')) {
      return (
        <Image source={{ uri: avatar }} style={styles.avatarImage} />
      );
    }

    return (
      <View style={[styles.avatarBadge]}>
        <Text style={styles.avatarText}>{avatar || '📱'}</Text>
      </View>
    );
  };

  // Render individual notification
  const renderNotification = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification
      ]}
      activeOpacity={0.7}
      onPress={() => onNotificationPress?.(notification)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          {renderBadge(notification)}
          <View style={styles.notificationText}>
            <Text style={[
              styles.notificationTitle,
              !notification.isRead && styles.unreadTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            {notification.subMessage && (
              <Text style={styles.notificationSubMessage} numberOfLines={1}>
                {notification.subMessage}
              </Text>
            )}
          </View>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTime}>{formatNotificationTime(notification)}</Text>
            {!notification.isRead && <View style={styles.unreadDot} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity 
          style={styles.backdropTouch} 
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      
      <Animated.View
        style={[
          styles.panel,
          {
            paddingBottom: insets.bottom + 20,
            transform: [{ translateY }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
              <MaterialIcons name="notifications" size={24} color="#1976D2" />
              <View style={styles.titleContainer}>
                <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                  Notifications
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.countWrapper}>
                    <Text style={styles.unreadCount}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity 
                style={styles.markAllReadBtn}
                onPress={onMarkAllRead}
              >
                <Text style={styles.markAllReadText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications List */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-sleep" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                <MaterialIcons name="refresh" size={20} color="#1976D2" />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            notifications.map(renderNotification)
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 0,
  },
  countWrapper: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#1976D2',
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllReadBtn: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  backgroundColor: '#E3F2FD',
  borderRadius: 16,
  marginRight: 12,
  minWidth: 80,
  alignItems: 'center',
  },
  markAllReadText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  unreadNotification: {
    borderColor: '#E3F2FD',
    backgroundColor: '#FAFBFF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  appreciationBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
  },
  notificationText: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#1976D2',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notificationSubMessage: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  refreshText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default SmartNotificationPanel;
