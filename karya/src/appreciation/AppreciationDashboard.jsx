import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StyleSheet, 
  FlatList,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataAPI } from '../api';
import { useAuth } from '../AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;
const CARD_MARGIN = 10;
// We want to show up to 3 data cards and then a 4th 'View All' card when applicable
const MAX_VISIBLE_DATA_CARDS = 3;

const AppreciationDashboard = ({ navigation }) => {
  const [dashboardAppreciations, setDashboardAppreciations] = useState([]);
  const [loadingAppreciations, setLoadingAppreciations] = useState(false);
  const [appreciationsError, setAppreciationsError] = useState(null);
  const { user, setUser } = useAuth();

  const resolveUserId = async () => {
    const direct = user?.id || user?.user_id || user?.employee_id;
    if (direct) return direct;
    try {
      const raw = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
      if (raw) {
        const parsed = JSON.parse(raw);
        const parsedId = parsed?.id || parsed?.user_id || parsed?.employee_id;
        if (parsedId) {
          try { if (typeof setUser === 'function') setUser(parsed); } catch (e) {}
          return parsedId;
        }
      }
    } catch (e) {
      console.warn('resolveUserId (dashboard): failed to read stored user', e);
    }
    return null;
  };
  const [heroLiked, setHeroLiked] = useState(false);

  // helper to robustly extract counts from various payload shapes
  // Always prefer likes_count/comments_count from item or item.raw, fallback to 0
  const getCount = (it, keys = []) => {
    if (!it) return 0;
    // Try direct field
    if (typeof it.likes_count === 'number') return it.likes_count;
    if (typeof it.comments_count === 'number') return it.comments_count;
    // Try raw field
    if (it.raw && typeof it.raw.likes_count === 'number') return it.raw.likes_count;
    if (it.raw && typeof it.raw.comments_count === 'number') return it.raw.comments_count;
    // Fallback to 0
    return 0;
  };
  const [likedMap, setLikedMap] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroLikes, setHeroLikes] = useState(0);
  const [heroComments, setHeroComments] = useState(0);
  
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  const loadDashboardAppreciations = async (limit = 10) => {
    setLoadingAppreciations(true);
    setAppreciationsError(null);
    try {
      const items = await dataAPI.fetchDashboardAppreciations(limit);
      console.log('🔍 Fetched appreciations:', items?.length || 0, items);
      setDashboardAppreciations(items || []);
    } catch (err) {
      setAppreciationsError(err?.message || 'Failed to load appreciations');
    } finally {
      setLoadingAppreciations(false);
    }

    // ...existing code...
  };
  useEffect(() => {
    loadDashboardAppreciations();
  }, []);

  // Start a subtle pulsing animation for the active card glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // When we have a hero item, fetch its engagement counts from the employee endpoint
  useEffect(() => {
    let mounted = true;
    const fetchHeroEngagements = async () => {
      if (!hero) return;
      console.log('Hero raw payload for debugging counts:', hero.raw || hero);
      try {
        // If dashboard item already contains normalized counts and they're non-zero, use them.
        // If counts are missing or zero, proactively fetch more accurate counts from per-employee or per-item endpoints.
        const hasNonZeroCounts = (n) => (n != null && Number(n) > 0);
        if (hasNonZeroCounts(hero.likes_count) || hasNonZeroCounts(hero.comments_count)) {
          if (mounted) {
            setHeroLikes(hero.likes_count ?? getCount(hero, ['like_count','likes','likes_count']));
            setHeroComments(hero.comments_count ?? getCount(hero, ['comment_count','comments','comments_count']));
          }
          return;
        }

        // Try to fetch detailed employee appreciations and locate this specific appreciation
        try {
          const list = await dataAPI.get(`/appreciation/${hero.employee_id}`);
          if (list && Array.isArray(list)) {
            const match = list.find(a => String(a.id) === String(hero.id));
            if (match) {
              const likesVal = match.likes_count ?? match.like_count ?? match.total_likes ?? getCount(match, ['like_count','likes','likes_count']);
              const commentsVal = match.comments_count ?? match.comment_count ?? match.total_comments ?? getCount(match, ['comment_count','comments','comments_count']);
              if (mounted) {
                setHeroLikes(likesVal || 0);
                setHeroComments(commentsVal || 0);
                // update dashboardAppreciations so UI reads the filled counts next render
                setDashboardAppreciations(prev => (prev || []).map(it => it && String(it.id) === String(hero.id) ? ({ ...it, likes_count: likesVal || 0, comments_count: commentsVal || 0 }) : it));
              }
              return;
            }
          }
        } catch (e) {
          // ignore and fallback to per-item endpoints
          console.warn('Failed to fetch per-employee appreciations for hero, will try per-item endpoints', e?.message || e);
        }

        // As a last resort, fetch per-item likes and comments endpoints directly for this appreciation id
        try {
          const likesResp = await dataAPI.get(`/appreciation/${hero.id}/likes`);
          const likesList = Array.isArray(likesResp) ? likesResp : (likesResp?.likes || likesResp?.data || likesResp?.results || []);
          const likesCount = Array.isArray(likesList) ? likesList.length : (Number(likesList) || 0);

          const commentsResp = await dataAPI.get(`/appreciation/${hero.id}/comments`);
          const commentsList = Array.isArray(commentsResp) ? commentsResp : (commentsResp?.comments || commentsResp?.data || commentsResp?.results || []);
          const commentsCount = Array.isArray(commentsList) ? commentsList.length : (Number(commentsList) || 0);

          if (mounted) {
            setHeroLikes(likesCount);
            setHeroComments(commentsCount);
            setDashboardAppreciations(prev => (prev || []).map(it => it && String(it.id) === String(hero.id) ? ({ ...it, likes_count: likesCount, comments_count: commentsCount }) : it));
          }
        } catch (e) {
          // fallback to best-effort extraction from hero.raw
          if (mounted) {
            setHeroLikes(getCount(hero, ['like_count','likes','likes_count']));
            setHeroComments(getCount(hero, ['comment_count','comments','comments_count']));
          }
        }
      } catch (e) {
        // fallback silently
        if (mounted) {
          setHeroLikes(getCount(hero, ['like_count','likes','likes_count']));
          setHeroComments(getCount(hero, ['comment_count','comments','comments_count']));
        }
      }
    };

    fetchHeroEngagements();
    return () => { mounted = false; };
  }, [hero]);

  // Pending like queue helpers (component scope)
  const PENDING_LIKES_KEY = '@pending_appreciation_likes_v1';

  const enqueuePendingLike = async (payload) => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_LIKES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.push(payload);
      await AsyncStorage.setItem(PENDING_LIKES_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to enqueue pending like', e);
    }
  };

  const flushPendingLikes = async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_LIKES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!list || list.length === 0) return;
      const remaining = [];
      for (const item of list) {
        try {
          await dataAPI.post(`/appreciation/${item.id}/like`, { user_id: item.user_id });
        } catch (err) {
          // keep on list for next flush
          remaining.push(item);
        }
      }
      await AsyncStorage.setItem(PENDING_LIKES_KEY, JSON.stringify(remaining));
    } catch (e) {
      console.error('Failed to flush pending likes', e);
    }
  };

  // attempt to flush queued likes when component mounts
  useEffect(() => {
    flushPendingLikes();
  }, []);

  // Hero: choose the latest Appreciation for the current month/year (if any)
  const now = new Date();
  const monthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  const currentMonthName = monthNames[now.getMonth()];
  const currentYearStr = String(now.getFullYear());

  const heroCandidates = (dashboardAppreciations || []).filter(item => {
    try {
      const itemMonth = (item.month || '').toString().trim();
      const itemYear = (item.year || (item.timestamp ? String(new Date(item.timestamp).getFullYear()) : '')).toString();
      if (!itemMonth) return false;
      return itemMonth.toLowerCase() === currentMonthName.toLowerCase() && itemYear === currentYearStr;
    } catch (e) {
      return false;
    }
  });

  // Prefer the most recent by timestamp (fallback to highest id)
  const hero = (heroCandidates.sort((a, b) => {
    const ta = Number(a.timestamp) || (a.raw && a.raw.created_at ? Date.parse(a.raw.created_at) : 0) || 0;
    const tb = Number(b.timestamp) || (b.raw && b.raw.created_at ? Date.parse(b.raw.created_at) : 0) || 0;
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  })[0]) || null;

  // Filter appreciations for the slider (exclude hero if showing)
  const sliderAppreciations = dashboardAppreciations.filter(item => item.id !== hero?.id);
  console.log('🎯 Slider appreciations:', sliderAppreciations?.length || 0, 'Hero:', hero?.id);
  
  // Prepare slider data: show up to MAX_VISIBLE_DATA_CARDS data cards then a View All card when more than one item exists
  const getSliderData = () => {
    if (!sliderAppreciations || sliderAppreciations.length === 0) return [];

    const dataCards = sliderAppreciations.slice(0, Math.min(MAX_VISIBLE_DATA_CARDS, sliderAppreciations.length));

    // If there are more than one appreciation, provide a 'View All' card as the last slot.
    // This ensures when we have >=3 items we show 3 data cards + View All (4th card).
    if (sliderAppreciations.length > 1) {
      return [...dataCards, { isViewAll: true, totalCount: sliderAppreciations.length }];
    }

    return dataCards;
  };

  const sliderData = getSliderData();
  console.log('📊 Final slider data:', sliderData?.length || 0, sliderData);

  const toggleHeroLike = async () => {
    if (!hero || hero._liking) return;
    const id = hero.id;
    // Optimistic update
    setHeroLiked(v => !v);
    setLikedMap(m => ({ ...m, [id]: !m[id] }));
    // mark hero as pending to avoid double taps
    hero._liking = true;
    try {
  const uid = await resolveUserId();
  if (!uid) throw new Error('Missing user id');
  await dataAPI.post(`/appreciation/${id}/like`, { user_id: uid });
    } catch (err) {
      // rollback optimistic update
      setHeroLiked(v => !v);
      setLikedMap(m => ({ ...m, [id]: !!m[id] }));
      console.error('Like failed:', err);
      // keep UX quiet; use alert only if needed
    } finally {
      hero._liking = false;
    }
  };

  const handleLike = async (id) => {
    // prevent duplicate request for same id
    if (!id) return;
    // read current optimistic state
    setLikedMap(prev => {
      // flip immediately
      const next = { ...prev, [id]: !prev[id] };
      return next;
    });

    // send like to backend with one retry for 5xx
    const doPost = async () => {
      const uid = await resolveUserId();
      if (!uid) throw new Error('Missing user id');
      return dataAPI.post(`/appreciation/${id}/like`, { user_id: uid });
    };
    try {
      await doPost();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('Like failed:', { message: err.message, status, data });
      // retry once for server errors (5xx)
      if (status && status >= 500 && status < 600) {
        // enqueue for background retry and keep optimistic UI silently
        await enqueuePendingLike({ id, user_id: user?.id, ts: Date.now() });
        console.warn('Enqueued like for background retry', id);
      } else {
        // client errors or unknown - rollback and inform user
        setLikedMap(prev => ({ ...prev, [id]: !!prev[id] }));
        Alert.alert('Error', 'Failed to like appreciation. Please try again.');
      }
    }
  };

  const renderAppreciationCard = ({ item, index }) => {
    if (item.isViewAll) {
      return (
        <TouchableOpacity
          style={[styles.sliderCard, styles.viewAllCard]}
          onPress={() => navigation.navigate('Appreciation', { screen: 'ViewAllAppreciation' })}
          activeOpacity={0.8}
        >
          <View style={styles.viewAllContent}>
            <MaterialCommunityIcons name="apps" size={32} color="#1976D2" />
            <Text style={styles.viewAllTitle}>View All</Text>
            <Text style={styles.viewAllSubtitle}>{item.totalCount} Appreciations</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#1976D2" />
          </View>
        </TouchableOpacity>
      );
    }

    const badgeColor = item.badge_level === 'gold' ? '#FFD54F' : 
                       item.badge_level === 'silver' ? '#E0E0E0' : '#FFCC80';

    return (
      <TouchableOpacity
        style={styles.sliderCard}
        onPress={() => navigation.navigate('Appreciation', { screen: 'ViewAllAppreciation', params: { appreciationId: item.id } })}
        activeOpacity={0.9}
      >
        {/* Subtle pulsing halo for the active card */}
        {currentIndex === index && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.rotatingGlow,
              {
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }),
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.04] }) }]
              }
            ]}
          />
        )}
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.labelText}>Name : <Text style={styles.employeeName} numberOfLines={1}>{item.employee_username}</Text></Text>
            <Text style={styles.labelText}>Award Type : <Text style={styles.awardType} numberOfLines={1}>{item.award_type}</Text></Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{(item.badge_level || '').toUpperCase()}</Text>
          </View>
        </View>
        
        {/* compute counts from raw payload (supports number or array shapes) */}
        <View style={styles.cardFooter}>
          {(() => {
            const raw = item.raw || {};
            const likesRaw = raw.like_count ?? raw.likes ?? raw.likes_count ?? raw.likeCount ?? 0;
            const likesCount = Array.isArray(likesRaw) ? likesRaw.length : (typeof likesRaw === 'number' ? likesRaw : Number(likesRaw) || 0);
            const commentsRaw = raw.comment_count ?? raw.comments ?? raw.comments_count ?? raw.commentCount ?? 0;
            const commentsCount = Array.isArray(commentsRaw) ? commentsRaw.length : (typeof commentsRaw === 'number' ? commentsRaw : Number(commentsRaw) || 0);

            // For the dashboard card we intentionally hide likes/comments to keep the UI minimal.
            return (
              <View style={styles.cardActionsMinimal}>
                <Text style={styles.labelText}>Date : <Text style={styles.monthText}>{`${item.month} / ${item.year}`}</Text></Text>
              </View>
            );
          })()}
        </View>
      </TouchableOpacity>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const renderPaginationDots = () => {
    if (sliderData.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {sliderData.map((_, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_MARGIN),
            index * (CARD_WIDTH + CARD_MARGIN),
            (index + 1) * (CARD_WIDTH + CARD_MARGIN),
          ];

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const dotScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                {
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hero Card for Current Month (always render box) */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleContainer}>
            <MaterialCommunityIcons name="crown" size={22} color="#F9A825" />
            <Text style={styles.heroTitle} numberOfLines={1}>Appreciation of the Month</Text>
          </View>
          <Text style={styles.heroMonth}>{hero ? (hero.month || currentMonthName) : currentMonthName}</Text>
        </View>

        {hero ? (
          // Render the hero appreciation details when available
          <>
            <Text style={styles.heroCongrat}>Congratulations {hero.employee_username || hero.employee_name || hero.employee_display_name || user?.firstName || user?.username || 'You'}!</Text>
            <Text style={styles.heroDescription}>
              <Text style={styles.labelText}>Award: </Text>
              <Text style={styles.boldText}>{hero.award_type}</Text>
              {'  '}
              <Text style={styles.labelText}>Badge: </Text>
              <Text style={styles.boldText}>{(hero.badge_level || '').toUpperCase()}</Text>
            </Text>
            <Text style={[styles.heroDescription, { marginTop: 8 }]}>
              <Text style={styles.labelText}>Date: </Text>
              <Text style={styles.monthText}>{`${hero.month} / ${hero.year}`}</Text>
            </Text>
            <View style={[styles.heroActions, { marginTop: 12 }]}> 
              {/* show non-interactive counts like the web */}
              <View style={styles.countsRow}>
                <View style={styles.countPill}>
                  <MaterialCommunityIcons name="thumb-up-outline" size={18} color="#424242" />
                  <Text style={styles.countText}>{typeof hero.likes_count === 'number' ? hero.likes_count : (hero.raw && typeof hero.raw.likes_count === 'number' ? hero.raw.likes_count : 0)} {((typeof hero.likes_count === 'number' ? hero.likes_count : (hero.raw && typeof hero.raw.likes_count === 'number' ? hero.raw.likes_count : 0)) === 1 ? 'Like' : 'Likes')}</Text>
                </View>
                <View style={styles.countPill}>
                  <MaterialCommunityIcons name="comment-outline" size={18} color="#424242" />
                  <Text style={styles.countText}>{typeof hero.comments_count === 'number' ? hero.comments_count : (hero.raw && typeof hero.raw.comments_count === 'number' ? hero.raw.comments_count : 0)} {((typeof hero.comments_count === 'number' ? hero.comments_count : (hero.raw && typeof hero.raw.comments_count === 'number' ? hero.raw.comments_count : 0)) === 1 ? 'Comment' : 'Comments')}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          // In-card empty state when there is no appreciation for current month
          <View style={styles.emptyHeroBody}>
            <MaterialCommunityIcons name="medal-outline" size={36} color="#BDBDBD" />
            <Text style={styles.emptyHeroTitle}>No appreciations this month yet.</Text>
            <TouchableOpacity style={styles.heroRefreshBtn} onPress={() => loadDashboardAppreciations()}>
              <Text style={styles.heroRefreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Latest Appreciations Slider */}
      <Text style={styles.sectionTitle}>Latest Employee Appreciations</Text>

      {loadingAppreciations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1976D2" />
          <Text style={styles.loadingText}>Loading appreciations...</Text>
        </View>
      ) : appreciationsError ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#D32F2F" />
          <Text style={styles.errorText}>{appreciationsError}</Text>
        </View>
      ) : sliderData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="medal-outline" size={48} color="#BDBDBD" />
          <Text style={styles.emptyText}>No recent appreciations</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={sliderData}
            renderItem={renderAppreciationCard}
            keyExtractor={(item, index) => item.isViewAll ? 'viewAll' : String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            snapToInterval={CARD_WIDTH + CARD_MARGIN}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.sliderContainer}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              viewAreaCoveragePercentThreshold: 50,
            }}
          />
          {renderPaginationDots()}
        </>
      )}
    </View>
  );
};

export default AppreciationDashboard;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  
  // Hero Card Styles
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginLeft: 8,
    flexShrink: 1,
  },
  heroMonth: {
    color: '#616161',
    fontSize: 13,
    marginLeft: 12,
  },
  heroCongrat: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  heroDescription: {
    color: '#424242',
    marginTop: 6,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginRight: 12,
  },
  heroActionText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 6,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },

  // Slider Styles
  sliderContainer: {
    paddingLeft: 0,
    paddingRight: 16,
  },
  sliderCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
  },
  rotatingGlow: {
    position: 'absolute',
    left: -18,
    top: -12,
    width: CARD_WIDTH + 36,
    height: CARD_WIDTH + 36,
    borderRadius: (CARD_WIDTH + 36) / 2,
    borderWidth: 8,
    borderColor: 'rgba(96,125,139,0.12)', // subtle slate-blue/gray
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  employeeInfo: {
    flex: 1,
    paddingRight: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  awardType: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 12,
    color: '#616161',
  },
  likeButton: {
    padding: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionsMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  countText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#424242',
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#424242',
    fontWeight: '600',
  },

  // View All Card
  viewAllCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E3F2FD',
    borderStyle: 'dashed',
    backgroundColor: '#FAFBFF',
  },
  viewAllContent: {
    alignItems: 'center',
  },
  viewAllTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginTop: 8,
  },
  viewAllSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    marginBottom: 8,
  },

  // Badge Styles
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
  },

  // Pagination Dots
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    marginHorizontal: 4,
  },

  // Loading/Error/Empty States
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#757575',
    fontSize: 14,
  },
  errorContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#757575',
    fontSize: 14,
  },
  labelText: {
    color: '#616161',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  emptyHeroBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  emptyHeroTitle: {
    color: '#757575',
    marginTop: 8,
    fontSize: 14,
  },
  heroRefreshBtn: {
    marginTop: 10,
  },
  heroRefreshText: {
    color: '#7B1FA2',
    fontSize: 14,
  },
});
