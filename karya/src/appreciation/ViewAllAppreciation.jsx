/**
 * ViewAllAppreciation Component
 * Displays a history of appreciations sent and received
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataAPI } from '../api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const ViewAllAppreciation = ({ route }) => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const extraBottomInset = (insets && insets.bottom) ? insets.bottom : (Platform.OS === 'android' ? 24 : 34);
  const [appreciations, setAppreciations] = useState([]);
  const [commentsInput, setCommentsInput] = useState({});
  const [commentsVisible, setCommentsVisible] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentsModalId, setCommentsModalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, gold: '-', silver: '-', bronze: '-' });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getCurrentMonthName = () => {
    const currentMonth = new Date().getMonth();
    return monthNames[currentMonth];
  };

  // Default to empty month/year so "All" is shown by default (avoids filtering out results unexpectedly)
  const [filter, setFilter] = useState({
    badge_level: '',
    award_type: '',
    month: '',
    year: ''
  });

  // Load data on mount and poll for real-time updates
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await fetchAppreciations();
      if (!cancelled) await fetchStats();
    };

    load();

    // Poll every 30s for updates
    const interval = setInterval(() => {
      fetchAppreciations();
      fetchStats();
    }, 30000);

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // If the screen is opened with a route param to open comments for a specific appreciation,
  // ensure we fetch and display them immediately.
  useEffect(() => {
    // route.params may contain { appreciationId, openComments }
    try {
      const { appreciationId, openComments, onlyThis } = (route && route.params) ? route.params : {};
      if (appreciationId && onlyThis) {
        // Ensure comments are fetched when opening the dedicated view for a single appreciation
        (async () => {
          try {
            await fetchAppreciations();
            if (openComments) {
              await fetchCommentsFor(appreciationId);
              setCommentsVisible(prev => ({ ...prev, [appreciationId]: true }));
            }
            // filter local state to only this appreciation
            setAppreciations(prev => (prev || []).filter(a => String(a.id) === String(appreciationId)));
          } catch (e) {
            console.warn('Route param handling failed', e);
          }
        })();
      } else if (openComments && appreciationId) {
        // Fetch comments for the target appreciation and show them
        (async () => {
          await fetchCommentsFor(appreciationId);
          setCommentsVisible(prev => ({ ...prev, [appreciationId]: true }));
        })();
      }
    } catch (e) {
      // ignore
    }
  }, [route?.params]);

  const fetchAppreciations = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      // Get all appreciations like the web app
      console.log('fetchAppreciations: requesting /appreciation');
      const data = await dataAPI.get('/appreciation');
      console.log('fetchAppreciations: raw response', data);
      
      // Normalize common shapes: array | { data: [...] } | { results: [...] }
      let payload = Array.isArray(data) ? data : (data?.data || data?.results || []);

      // If no data, fallback to dashboard items
      if (!Array.isArray(payload) || payload.length === 0) {
        const dash = await dataAPI.fetchDashboardAppreciations(10);
        payload = Array.isArray(dash) ? dash : (dash?.data || dash || []);
      }

  // Defensive normalization of each item so UI doesn't break
      const normalized = (Array.isArray(payload) ? payload : []).map((it, idx) => ({
        id: it.id ?? it._id ?? it.appreciation_id ?? idx,
        award_type: it.award_type || it.award || it.type || it.awardType || '',
        description: it.description || it.appreciation_message || it.message || it.note || '',
        employee_name: it.employee_name || it.employee_username || it.employee?.username || it.employee?.full_name || it.sender_name || it.from_name || 'Unknown',
        employee_id: it.employee_id || it.employee?.id || it.employee?.employee_id || '',
        month: it.month || (it.date ? new Date(it.date).toLocaleString('default', { month: 'long' }) : ''),
        year: it.year || (it.date ? new Date(it.date).getFullYear() : ''),
        badge_level: it.badge_level || (it.badge ? String(it.badge).toLowerCase() : ''),
        raw: it,
      }));

      console.log('fetchAppreciations: normalized count', normalized.length);
      setAppreciations(normalized);
    } catch (error) {
      console.error('Failed to fetch appreciations:', error);
      setError('Failed to load appreciations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch aggregated stats from the API, fallback to counting local items
  const fetchStats = async () => {
    try {
      // Try server stats endpoint - same as web
      const res = await dataAPI.get('/appreciation/stats');
      console.log('Stats API response:', res); // Debug log
      
      // Web uses response.data directly, so match that structure
      const statsData = res || {};
      const serverStats = {
        total: statsData.total_appreciations ?? statsData.total ?? 0,
        gold: statsData.badge_distribution?.gold ?? statsData.gold ?? 0,
        silver: statsData.badge_distribution?.silver ?? statsData.silver ?? 0,
        bronze: statsData.badge_distribution?.bronze ?? statsData.bronze ?? 0,
      };
      console.log('Processed stats:', serverStats); // Debug log
      setStats(serverStats);
    } catch (err) {
      // If stats endpoint not available, compute from current loaded appreciations
      console.warn('fetchStats failed, computing fallback stats:', err?.message || err);
      const total = Array.isArray(appreciations) ? appreciations.length : 0;
      const gold = Array.isArray(appreciations) ? appreciations.filter(a => String(a.badge_level || '').toLowerCase() === 'gold').length : 0;
      const silver = Array.isArray(appreciations) ? appreciations.filter(a => String(a.badge_level || '').toLowerCase() === 'silver').length : 0;
      const bronze = Array.isArray(appreciations) ? appreciations.filter(a => String(a.badge_level || '').toLowerCase() === 'bronze').length : 0;
      console.log('Fallback stats:', { total, gold, silver, bronze }); // Debug log
      setStats({ total, gold, silver, bronze });
    }
  };

  const fetchCommentsFor = async (appreciationId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [appreciationId]: true }));
      const data = await dataAPI.get(`/appreciation/${appreciationId}/comments`);
      // data is expected to be an array of CommentResponse
      setCommentsData(prev => ({ ...prev, [appreciationId]: Array.isArray(data) ? data : (data?.data || []) }));
    } catch (err) {
      console.warn('Failed to fetch comments for', appreciationId, err);
      setCommentsData(prev => ({ ...prev, [appreciationId]: [] }));
    } finally {
      setCommentsLoading(prev => ({ ...prev, [appreciationId]: false }));
    }
  };

  // Try to resolve a user id from multiple client-side sources so we don't
  // need to touch the backend. This checks in-memory AuthContext first,
  // then falls back to AsyncStorage keys commonly used across the app.
  const resolveUserId = async () => {
    // 1) In-memory user from AuthContext
    const direct = user?.id || user?.user_id || user?.employee_id;
    if (direct) return direct;

    // 2) Try persisted user keys (some screens use 'user', others use 'userData')
    try {
      const raw = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
      if (raw) {
        const parsed = JSON.parse(raw);
        const parsedId = parsed?.id || parsed?.user_id || parsed?.employee_id;
        if (parsedId) {
          // update in-memory user so other UI areas work as expected
          try { if (typeof setUser === 'function') setUser(parsed); } catch (e) { /* ignore */ }
          return parsedId;
        }
      }
    } catch (e) {
      console.warn('resolveUserId: failed to read stored user', e);
    }

    // 3) Give up — caller will handle missing id
    return null;
  };

  const toggleCommentsVisible = async (appreciationId) => {
    const currently = !!commentsVisible[appreciationId];
    if (currently) {
      setCommentsVisible(prev => ({ ...prev, [appreciationId]: false }));
      return;
    }

    // If we already have comments cached, just show them
    if (commentsData[appreciationId] && commentsData[appreciationId].length >= 0) {
      setCommentsVisible(prev => ({ ...prev, [appreciationId]: true }));
      // If empty, still attempt a fresh fetch to ensure latest
      if (!commentsData[appreciationId] || commentsData[appreciationId].length === 0) {
        await fetchCommentsFor(appreciationId);
      }
      return;
    }

    // Otherwise fetch then show
    await fetchCommentsFor(appreciationId);
    setCommentsVisible(prev => ({ ...prev, [appreciationId]: true }));
  };

  // Filter handling functions
  const handleFilterChange = (name, value) => {
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilter({
      badge_level: '',
      award_type: '',
      month: '',
      year: ''
    });
  };

  const filteredAppreciations = appreciations.filter(appreciation => {
    return (
      (!filter.badge_level || appreciation.badge_level === filter.badge_level) &&
      (!filter.award_type || appreciation.award_type === filter.award_type) &&
      (!filter.month || appreciation.month === filter.month) &&
      (!filter.year || parseInt(appreciation.year) === parseInt(filter.year))
    );
  });

  // Custom Dropdown Component
  const CustomDropdown = ({ label, value, onSelect, options, placeholder }) => {
    const [modalVisible, setModalVisible] = useState(false);

    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.dropdownButton} 
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {value || placeholder}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <ScrollView style={styles.optionsList}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionItem,
                      value === option.value && styles.selectedOption
                    ]}
                    onPress={() => {
                      onSelect(option.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      value === option.value && styles.selectedOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  // Bottom sheet helpers for comments (device-aware height)
  // Ensure the sheet is at least 50% of the device height to give enough space on mobile
  const getSheetHeight = () => Math.round(Dimensions.get('window').height * 0.5) + extraBottomInset; // 50% height + safe-area inset
  const commentsTranslateY = useRef(new Animated.Value(getSheetHeight())).current;

  const commentsPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // require a larger vertical movement and that vertical movement dominates horizontal
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
    onPanResponderMove: (_, g) => {
      const sheetH = getSheetHeight();
      if (g.dy > 0) {
        // apply slight damping so small drags don't move the sheet too much
        const damped = Math.min(g.dy * 0.8, sheetH);
        commentsTranslateY.setValue(damped);
      }
    },
    onPanResponderRelease: (_, g) => {
      const sheetH = getSheetHeight();
      // require larger fraction or faster swipe to close
      const shouldClose = (g.dy > sheetH * 0.5) || (g.vy > 1.0);
      if (shouldClose) {
        Animated.timing(commentsTranslateY, { toValue: sheetH, duration: 200, useNativeDriver: true }).start(() => {
          commentsTranslateY.setValue(sheetH);
          setCommentsModalVisible(false);
        });
      } else {
        Animated.timing(commentsTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    }
  })).current;

  const openCommentsModal = async (appreciationId) => {
    setCommentsModalId(appreciationId);
    const sheetH = getSheetHeight();
    commentsTranslateY.setValue(sheetH);
    setCommentsModalVisible(true);
    Animated.timing(commentsTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    if (!commentsData[appreciationId] || commentsData[appreciationId].length === 0) await fetchCommentsFor(appreciationId);
  };

  const closeCommentsModal = () => {
    const sheetH = getSheetHeight();
    Animated.timing(commentsTranslateY, { toValue: sheetH, duration: 180, useNativeDriver: true }).start(() => {
      commentsTranslateY.setValue(sheetH);
      setCommentsModalVisible(false);
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppreciations();
  };

  const getBadgeColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'gold': return '#FFC107';
      case 'silver': return '#9E9E9E';
      case 'bronze': return '#FF9800';
      default: return '#757575';
    }
  };

  const getBadgeTextColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'gold': return '#F57F17';
      case 'silver': return '#424242';
      case 'bronze': return '#E65100';
      default: return '#424242';
    }
  };

  const StatCard = ({ color, emoji, count, label }) => (
    <View style={styles.statCardWrapper}>
      <View style={[styles.statAccent, { backgroundColor: color }]} />
      <View style={styles.statInner}>
        <View style={styles.statContent}>
          <Text style={styles.emojiIcon}>{emoji}</Text>
          <Text style={styles.statNumber}>{count}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );

  const renderAppreciationItem = ({ item }) => {
    const displayName = item.employee_name || 'Unknown Employee';
    const givenBy = item.raw?.given_by_username || item.raw?.given_by_name || item.raw?.sender_name || '';
    const extraRole = item.raw?.employee_role || item.raw?.designation || item.raw?.title || '';
    
    return (
      <View style={styles.appreciationCard}>
        {/* Gradient Header like web */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeAndDate}>
            <View style={[styles.badgeChip, { backgroundColor: getBadgeColor(item.badge_level) }]}>
              <Text style={[styles.badgeChipText, { color: getBadgeTextColor(item.badge_level) }]}>
                {(item.badge_level || 'unknown').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.headerDate}>
              {item.month} / {item.year}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.profileSection}>
            {/* Profile Picture */}
            {(item.raw?.employee_avatar || item.raw?.sender_avatar || item.raw?.avatar || item.raw?.profile_image) ? (
              <Image 
                source={{ uri: item.raw?.employee_avatar || item.raw?.sender_avatar || item.raw?.avatar || item.raw?.profile_image }} 
                style={styles.profilePicture} 
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <MaterialIcons name="person" size={32} color="#546E7A" />
              </View>
            )}
            
            {/* Employee Info */}
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{displayName}</Text>
              <Text style={styles.awardType}>{item.award_type}</Text>
              {extraRole ? <Text style={styles.employeeRole}>{extraRole}</Text> : null}
            </View>
          </View>

          {/* Description */}
          <Text style={styles.appreciationMessage}>"{item.description}"</Text>

          {/* Given By and Employee ID footer like web */}
          <View style={styles.cardFooter}>
            {givenBy && (
              <View style={styles.givenBySection}>
                <Text style={styles.givenByText}>By: {givenBy}</Text>
              </View>
            )}
            {/* Employee ID removed per UX request */}
          </View>

          {/* Action row: likes and comments (counts computed from raw payload) */}
          <View style={styles.actionRow}>
            {(() => {
              const raw = item.raw || {};
              const likesRaw = raw.like_count ?? raw.likes ?? raw.likes_count ?? raw.likeCount ?? 0;
              const likesCount = Array.isArray(likesRaw) ? likesRaw.length : (typeof likesRaw === 'number' ? likesRaw : Number(likesRaw) || 0);
              const commentsRaw = raw.comment_count ?? raw.comments ?? raw.comments_count ?? raw.commentCount ?? 0;
              const commentsCount = Array.isArray(commentsRaw) ? commentsRaw.length : (typeof commentsRaw === 'number' ? commentsRaw : Number(commentsRaw) || 0);

              return (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={async () => {
                    try {
                      const uid = await resolveUserId();
                      if (!uid) {
                        console.warn('Cannot like appreciation: missing user id');
                        return;
                      }
                      await dataAPI.post(`/appreciation/${item.id}/like`, { user_id: uid });
                      fetchAppreciations();
                    } catch (err) {
                      console.warn('Like failed:', err);
                    }
                  }}>
                    <MaterialIcons name="thumb-up" size={18} color="#1976D2" />
                    <Text style={styles.actionBtnText}>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={() => {
                    // open comments bottom sheet modal
                    openCommentsModal(item.id);
                  }}>
                    <MaterialIcons name="comment" size={18} color="#1976D2" />
                    <Text style={styles.actionBtnText}>{commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>

          {/* Comment composer: show only when comments are opened or the user has started typing */}
          { (commentsVisible[item.id] || (commentsInput[item.id] && String(commentsInput[item.id]).trim() !== '')) ? (
            <View style={styles.commentComposerWrapper}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentsInput[item.id] || ''}
                onChangeText={(text) => setCommentsInput(prev => ({ ...prev, [item.id]: text }))}
              />
              <TouchableOpacity
                style={styles.postButton}
                onPress={async () => {
                  const text = (commentsInput[item.id] || '').trim();
                  if (!text) return;
                  try {
                    // Backend expects { text: string, user_id: int }
                    const uid = await resolveUserId();
                    if (!uid) {
                      console.warn('Cannot post comment: missing user id');
                      return;
                    }
                    const resp = await dataAPI.post(`/appreciation/${item.id}/comments`, { user_id: uid, text });
                    // clear input
                    setCommentsInput(prev => ({ ...prev, [item.id]: '' }));
                    // refetch appreciations and refresh comments for this appreciation if visible
                    try {
                      await fetchAppreciations();
                      if (commentsVisible[item.id]) {
                        await fetchCommentsFor(item.id);
                      }
                    } catch (e) {
                      console.warn('Refetch after posting comment failed:', e);
                    }
                  } catch (err) {
                    console.warn('Post comment failed:', err);
                  }
                }}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          ) : null }
          {/* Render comments list when visible */}
          {commentsVisible[item.id] ? (
            <View style={styles.commentsList}>
              {commentsLoading[item.id] ? (
                <ActivityIndicator size="small" color="#1976D2" />
              ) : (
                  (commentsData[item.id] || []).map(c => (
                  <View key={c.id} style={styles.commentRow}>
                    <View style={styles.commentHeaderRow}>
                      <Text style={styles.commentAuthor}>{c.username}</Text>
                      <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="emoji-events" size={48} color="#BDBDBD" />
      <Text style={styles.emptyTitle}>No Appreciations</Text>
      <Text style={styles.emptyText}>
        No appreciations found matching your filters.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" translucent={true} />
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      
      {/* Navigation Header with Back Button */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Appreciations</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Page content: keep nav header fixed, make stats/filters part of the scrolling list header */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading appreciations...</Text>
        </View>
      ) : ( <>
        <FlatList
          data={filteredAppreciations}
          renderItem={renderAppreciationItem}
          keyExtractor={(item, idx) => (item && (item.id ?? item._id) ? String(item.id ?? item._id) : String(idx))}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={() => (
            <>
              {/* Page subtitle */}
              <View style={styles.pageSubtitleContainer}>
                <Text style={styles.pageSubtitle}>Recent recognitions and awards</Text>
              </View>

              <View style={styles.statsContainer}>
                <StatCard color="#1976D2" emoji="🏆" count={stats.total ?? (appreciations.length || 0)} label="Total Appreciations" />
                <StatCard color="#FFC107" emoji="🥇" count={stats.gold ?? 0} label="Gold Badges" />
                <StatCard color="#9E9E9E" emoji="🥈" count={stats.silver ?? 0} label="Silver Badges" />
                <StatCard color="#FF9800" emoji="🥉" count={stats.bronze ?? 0} label="Bronze Badges" />
              </View>

              <View style={styles.filterContainer}>
                <View style={styles.filterRow}>
                  <CustomDropdown
                    placeholder="All Badge Levels"
                    value={filter.badge_level}
                    onSelect={(value) => handleFilterChange('badge_level', value)}
                    options={[
                      { label: 'All Badge Levels', value: '' },
                      { label: 'Gold', value: 'gold' },
                      { label: 'Silver', value: 'silver' },
                      { label: 'Bronze', value: 'bronze' }
                    ]}
                  />
                  
                  <CustomDropdown
                    placeholder="All Award Types"
                    value={filter.award_type}
                    onSelect={(value) => handleFilterChange('award_type', value)}
                    options={[
                      { label: 'All Award Types', value: '' },
                      { label: 'Employee of the Month', value: 'Employee of the Month' },
                      { label: 'Best Performer', value: 'Best Performer' },
                      { label: 'Innovation Champion', value: 'Innovation Champion' },
                      { label: 'Team Player', value: 'Team Player' },
                      { label: 'Customer Excellence', value: 'Customer Excellence' },
                      { label: 'Leadership Excellence', value: 'Leadership Excellence' }
                    ]}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <CustomDropdown
                    placeholder="All Months"
                    value={filter.month}
                    onSelect={(value) => handleFilterChange('month', value)}
                    options={[
                      { label: 'All Months', value: '' },
                      ...monthNames.map(month => ({ label: month, value: month }))
                    ]}
                  />
                  
                  <CustomDropdown
                    placeholder="All Years"
                    value={filter.year}
                    onSelect={(value) => handleFilterChange('year', value)}
                    options={[
                      { label: 'All Years', value: '' },
                      ...Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return { label: String(year), value: year };
                      })
                    ]}
                  />
                </View>
                
                <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                  <Text style={styles.clearButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color="#D32F2F" />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={fetchAppreciations}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}
            />

            {/* Comments bottom-sheet modal (overlay) */}
            <Modal visible={commentsModalVisible} transparent animationType="fade" onRequestClose={() => closeCommentsModal()}>
              <View style={styles.modalOverlay}>
                {/* backdrop: only the area above the sheet should close */}
                <TouchableOpacity style={{ flex: 1 }} onPress={() => closeCommentsModal()} />
                <View style={{ justifyContent: 'flex-end' }}>
                  <TouchableWithoutFeedback>
                    <Animated.View style={[styles.commentsModal, { position: 'absolute', left: 0, right: 0, bottom: 0, height: getSheetHeight(), transform: [{ translateY: commentsTranslateY }] }]}> 
                    <View style={styles.sheetHandle} {...commentsPanResponder.panHandlers} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700' }}>Comments</Text>
                      <TouchableOpacity onPress={() => closeCommentsModal()}>
                        <MaterialIcons name="close" size={20} color="#374151" />
                      </TouchableOpacity>
                    </View>

                    {/* Composer (YouTube-like at top) */}
                    {((() => {
                      const app = appreciations.find(a => String(a.id) === String(commentsModalId));
                      return !(app && String(app.employee_id) === String(user?.id || user?.user_id || user?.employee_id));
                    })()) ? (
                      <View style={{ paddingBottom: 8 }}>
                        <View style={styles.commentComposerTop}>
                          <View style={styles.avatarPlaceholderSmall}><MaterialIcons name="person" size={20} color="#9CA3AF" /></View>
                          <TextInput
                            style={styles.commentInputTop}
                            placeholder={"Add a public comment..."}
                            value={commentsInput[commentsModalId] || ''}
                            onChangeText={(text) => setCommentsInput(prev => ({ ...prev, [commentsModalId]: text }))}
                            multiline={true}
                            numberOfLines={2}
                          />
                          <TouchableOpacity
                            style={styles.postButtonTop}
                            onPress={async () => {
                              const text = (commentsInput[commentsModalId] || '').trim();
                              if (!text) return;
                              try {
                                const uid = await resolveUserId();
                                if (!uid) return;
                                await dataAPI.post(`/appreciation/${commentsModalId}/comments`, { user_id: uid, text });
                                setCommentsInput(prev => ({ ...prev, [commentsModalId]: '' }));
                                await fetchCommentsFor(commentsModalId);
                                try { await fetchAppreciations(); } catch (e) { }
                              } catch (e) {
                                console.warn('Post comment failed:', e);
                              }
                            }}
                          >
                            <Text style={styles.postButtonText}>Post</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {commentsLoading[commentsModalId] ? (
                      <ActivityIndicator size="small" color="#1976D2" />
                    ) : (
                      <ScrollView style={styles.commentsScroll} contentContainerStyle={{ paddingBottom: 12 }}>
                        {(commentsData[commentsModalId] || []).map(c => (
                          <View key={c.id || c._id || Math.random()} style={styles.commentRow}>
                            <View style={styles.commentHeaderRow}>
                              <Text style={styles.commentAuthor}>{c.username || c.user_name || c.full_name || c.name}</Text>
                              <Text style={styles.commentDate}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</Text>
                            </View>
                            <Text style={styles.commentText}>{c.text || c.comment || c.body}</Text>
                          </View>
                        ))}
                        {!(commentsData[commentsModalId] || []).length && (
                          <Text style={{ color: '#666', marginTop: 8 }}>No comments yet</Text>
                        )}
                      </ScrollView>
                    )}
                  </Animated.View>
                  </TouchableWithoutFeedback>
                </View>
              </View>
            </Modal>
            </>
          )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  pageSubtitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  pageHeader: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: '#7F8C8D',
    fontSize: 16,
    fontWeight: '400',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 6,
    alignItems: 'center',
    elevation: 2,
  },
  statCardWrapper: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    minHeight: 100,
    maxHeight: 120,
  },
  statAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  statInner: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  statTextColumn: {
    marginLeft: 8,
    flex: 1,
  },
  statContainerRight: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 6,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#2C3E50', marginBottom: 2 },
  statLabel: { color: '#7F8C8D', fontSize: 10, textAlign: 'center', fontWeight: '500', lineHeight: 12 },
  filterContainer: {
    backgroundColor: 'white',
    marginHorizontal: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  dropdownButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 300,
    width: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  optionsList: {
    maxHeight: 280,
  },
  commentsModal: { backgroundColor: '#FFFFFF', width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, elevation: 8 },
  commentsScroll: { flex: 1 },
  sheetHandle: { width: 40, height: 6, borderRadius: 4, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 8 },
  commentComposerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  avatarPlaceholderSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  commentInputTop: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#FFFFFF' },
  postButtonTop: { marginLeft: 8, backgroundColor: '#1976D2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'center' },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 14,
    color: '#212121',
  },
  selectedOptionText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#D32F2F',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#616161',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  appreciationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#8E24AA', // Purple gradient like web
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badgeAndDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
  },
  badgeChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerDate: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  cardBody: {
    padding: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  profilePicturePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  awardType: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  appreciationMessage: {
    fontSize: 14,
    color: '#424242',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 8,
  },
  givenBySection: {
    flex: 1,
  },
  givenByText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  employeeId: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#616161',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionBtnText: {
    marginLeft: 8,
    color: '#1976D2',
    fontWeight: '600',
  },
  commentComposerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
  postButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  commentsList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  commentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
    paddingHorizontal: 4,
  },
  commentAuthor: {
    fontWeight: '700',
    color: '#263238',
    marginBottom: 0,
  },
  commentDate: {
    fontSize: 12,
    color: '#90A4AE',
    marginLeft: 8,
    textAlign: 'right'
  },
  commentText: {
    color: '#37474F',
    fontSize: 14,
    lineHeight: 18,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#1976D2', // Match header color
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
});

export default ViewAllAppreciation;
