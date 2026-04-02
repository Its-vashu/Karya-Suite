import React, { useEffect, useState, useMemo, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TouchableWithoutFeedback, TextInput, ScrollView, Image, Modal, Platform, StatusBar, Animated, PanResponder, Dimensions } from 'react-native';
import { useAuth } from '../AuthContext';
import { dataAPI } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const MyAppreciations = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [awardTypes, setAwardTypes] = useState(['All Badges', 'GOLD', 'SILVER', 'BRONZE']);
  const [badgeFilter, setBadgeFilter] = useState('All Badges');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [commentsInput, setCommentsInput] = useState({});
  const [commentsVisible, setCommentsVisible] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [likesVisible, setLikesVisible] = useState({});
  const [likesData, setLikesData] = useState({});
  const [likesLoading, setLikesLoading] = useState({});
  const [rawVisible, setRawVisible] = useState({});
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [likesModalId, setLikesModalId] = useState(null);
  const [likesCount, setLikesCount] = useState({});
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentsModalId, setCommentsModalId] = useState(null);
  const [commentsCount, setCommentsCount] = useState({});
  // compute sheet visible height dynamically as a percentage of screen height
  const getSheetHeight = () => Math.round(Dimensions.get('window').height * 0.85); // 85% of screen by default
  const sheetTranslateY = useRef(new Animated.Value(getSheetHeight())).current;
  const likesTranslateY = useRef(new Animated.Value(getSheetHeight())).current;

  // PanResponder for draggable sheet
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // start responding when user drags vertically
      return Math.abs(gestureState.dy) > 6;
    },
    onPanResponderMove: (_, gestureState) => {
      // compute sheet visible height dynamically and clamp drag
      const sheetH = getSheetHeight();
      // only allow dragging downwards and clamp to sheet height
      if (gestureState.dy > 0) {
        const v = Math.min(gestureState.dy, sheetH);
        sheetTranslateY.setValue(v);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const sheetH = getSheetHeight();
      // use a fraction of sheet height as the close threshold
      const shouldClose = (gestureState.dy > sheetH * 0.4) || (gestureState.vy > 0.8);
      if (shouldClose) {
        Animated.timing(sheetTranslateY, { toValue: sheetH, duration: 180, useNativeDriver: true }).start(() => {
          sheetTranslateY.setValue(sheetH);
          setCommentsModalVisible(false);
        });
      } else {
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }
    }
  })).current;

  // separate panResponder for likes sheet (reuse same behavior)
  const likesPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
    onPanResponderMove: (_, gestureState) => {
      const sheetH = getSheetHeight();
      if (gestureState.dy > 0) {
        likesTranslateY.setValue(Math.min(gestureState.dy, sheetH));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const sheetH = getSheetHeight();
      const shouldClose = (gestureState.dy > sheetH * 0.4) || (gestureState.vy > 0.8);
      if (shouldClose) {
        Animated.timing(likesTranslateY, { toValue: sheetH, duration: 180, useNativeDriver: true }).start(() => { likesTranslateY.setValue(sheetH); setLikesModalVisible(false); });
      } else {
        Animated.timing(likesTranslateY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }
    }
  })).current;

  useEffect(() => {
    let mounted = true;
    const fetchMy = async () => {
      try {
        setLoading(true);
        if (!user?.id) return;
        const resp = await dataAPI.get(`/appreciation/${user.id}`);
        // Expecting an array of appreciations
        if (mounted) setItems(Array.isArray(resp) ? resp : (resp?.data || []));
      } catch (e) {
        console.warn('Failed to load my appreciations', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchAwardTypes = async () => {
      try {
        const at = await dataAPI.fetchAwardTypes();
        // dataAPI.fetchAwardTypes returns object or array; be defensive
        if (at) {
          // Try to map to a list of badge level strings
          const list = Array.isArray(at) ? at : (at.award_types || at.badge_levels || []);
          if (Array.isArray(list) && list.length > 0) {
            // helper to extract a readable label from various shapes
            const extractLabel = (x) => {
              if (x == null) return '';
              if (typeof x === 'string') return x.trim();
              if (typeof x === 'number') return String(x);
              if (typeof x === 'object') {
                // common keys that may contain the badge name
                const keys = ['badge_level', 'level', 'name', 'label', 'value', 'award_type', 'title'];
                for (const k of keys) {
                  if (x[k] != null) return String(x[k]).trim();
                }
                // fallback: try to find the first string-valued property
                for (const prop in x) {
                  if (typeof x[prop] === 'string' && x[prop].trim()) return x[prop].trim();
                }
                // final fallback: JSON stringify (shortened)
                try { return JSON.stringify(x); } catch (e) { return String(x); }
              }
              return String(x);
            };

            const normalized = ['All Badges', ...list.map(x => (extractLabel(x) || '').toUpperCase())];
            setAwardTypes(normalized);
            // keep badgeFilter if valid
            if (!normalized.includes(badgeFilter)) setBadgeFilter('All Badges');
          }
        }
      } catch (e) {
        // ignore
      }
    };

    fetchMy();
      fetchAwardTypes();
    return () => { mounted = false; };
  }, [user?.id]);

  const filteredItems = useMemo(() => {
    return (items || []).filter(i => {
      // badge filter
      if (badgeFilter && badgeFilter !== 'All Badges') {
        const b = (i.badge_level || i.badge || i.award_type || '').toString().toUpperCase();
        if (!b.includes(badgeFilter.toString().toUpperCase())) return false;
      }
      // year filter
      if (yearFilter) {
        const y = i.year || (i.created_at ? new Date(i.created_at).getFullYear() : null);
        if (y && Number(y) !== Number(yearFilter)) return false;
      }
      return true;
    });
  }, [items, badgeFilter, yearFilter]);

  const years = useMemo(() => {
    const set = new Set();
    (items || []).forEach(i => {
      const y = i.year || (i.created_at ? new Date(i.created_at).getFullYear() : null);
      if (y) set.add(Number(y));
    });
    const arr = Array.from(set).sort((a,b)=>b-a);
    if (arr.length === 0) return [new Date().getFullYear()];
    return arr;
  }, [items]);

  // Format a timestamp as a relative time string (YouTube-like)
  // Accepts Date, numeric ms/seconds, numeric-string, or common DB datetime strings like 'YYYY-MM-DD HH:MM:SS'
  const formatRelativeTime = (timeInput) => {
    if (!timeInput) return '';

    const parseToDate = (input) => {
      if (!input) return null;
      if (input instanceof Date) return input;
      // numbers (ms or seconds)
      if (typeof input === 'number') {
        // treat 10-digit as seconds
        if (String(Math.abs(input)).length <= 10) return new Date(input * 1000);
        return new Date(input);
      }
      if (typeof input === 'string') {
        const s = input.trim();
        if (!s) return null;
        // pure numeric string
        if (/^\d+$/.test(s)) {
          const n = Number(s);
          if (s.length <= 10) return new Date(n * 1000);
          return new Date(n);
        }
        // common MySQL datetime 'YYYY-MM-DD HH:MM:SS' -> convert to ISO
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
          // append Z (UTC) to avoid timezone ambiguities
          return new Date(s.replace(' ', 'T') + 'Z');
        }
        // replace space between date and time with T (if present) and try parse
        let candidate = s;
        if (/^\d{4}-\d{2}-\d{2}T?\d{2}:\d{2}/.test(s) && !s.includes('T')) candidate = s.replace(' ', 'T');
        const parsed = new Date(candidate);
        if (!isNaN(parsed)) return parsed;
        const parsed2 = new Date(Date.parse(s));
        if (!isNaN(parsed2)) return parsed2;
      }
      return null;
    };

    const d = parseToDate(timeInput);
    if (!(d instanceof Date) || isNaN(d)) return '';

    const now = Date.now();
    const diffMs = now - d.getTime();
    // If future date, show formatted absolute date instead
    if (diffMs < 0) return d.toLocaleDateString();

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
  };

  // Lightweight CustomDropdown to match web behavior
  const CustomDropdown = ({ label, value, onSelect, options = [], placeholder }) => {
    const [modalVisible, setModalVisible] = useState(false);
    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.dropdownButtonText}>{
            (value === '' || value == null) ? (placeholder || label) : String(value)
          }</Text>
          <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
        </TouchableOpacity>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent}>
              <ScrollView style={styles.optionsList}>
                {options.map((opt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionItem, (String(value) === String(opt.value)) && styles.selectedOption]}
                    onPress={() => { onSelect(opt.value); setModalVisible(false); }}
                  >
                    <Text style={[styles.optionText, (String(value) === String(opt.value)) && styles.selectedOptionText]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderCard = ({ item }) => {
    const title = item.employee_username || item.given_by_name || item.from_name || item.title || 'Appreciation';
    const message = item.appreciation_message || item.message || item.body || '';
    // Robust probing of possible shapes for likes/comments (including nested raw payload)
    const probeCount = (obj, keys) => {
      if (!obj) return null;
      for (const k of keys) {
        const v = obj[k];
        if (v == null) continue;
        if (Array.isArray(v)) return v.length;
        if (typeof v === 'number') return v;
        // sometimes backend returns object with data/likes etc
        if (typeof v === 'object') {
          if (Array.isArray(v.data)) return v.data.length;
          if (Array.isArray(v.likes)) return v.likes.length;
        }
      }
      return null;
    };

    const likes = probeCount(item, ['likes_count', 'like_count', 'total_likes', 'likes'])
      ?? probeCount(item.raw, ['likes_count', 'like_count', 'total_likes', 'likes'])
      ?? 0;

    const comments = probeCount(item, ['comments_count', 'comment_count', 'total_comments', 'comments'])
      ?? probeCount(item.raw, ['comments_count', 'comment_count', 'total_comments', 'comments'])
      ?? 0;
    const badge = (item.badge_level || item.badge || item.award_type || '').toString().toUpperCase();
  const monthYear = item.created_at ? formatRelativeTime(item.created_at) : (item.month && item.year ? `${item.month} / ${item.year}` : '');
    // Normalize giver info (who gave the appreciation)
    const giverName = item.given_by_username || item.given_by_name || item.sender_name || item.from_name || item.giver_name || item.giver?.username || '';
    const giverAvatar = item.given_by_avatar || item.giver_avatar || item.from_avatar || item.avatar || null;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.badgePill}><Text style={styles.badgePillText}>{badge || 'APPRECIATION'}</Text></View>
          <Text style={styles.dateText}>{monthYear}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={{flex:1}}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardMessage}>{message}</Text>
          </View>

          {/* optional author avatar / byline if present */}
          {(giverAvatar || giverName) ? (
            <View style={styles.bylineWrap}>
              {giverAvatar ? (
                <Image source={{ uri: giverAvatar }} style={styles.bylineAvatar} />
              ) : (
                <View style={styles.avatarWrap}><MaterialIcons name="person" size={20} color="#546E7A" /></View>
              )}
              {giverName ? <Text style={styles.bylineText}>By: {giverName}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openLikesModal(item.id)}>
              <MaterialIcons name="thumb-up-off-alt" size={18} color="#374151" />
              <Text style={styles.actionText}>{likes} Like{likes !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { marginLeft: 12 }]} onPress={() => openCommentsModal(item.id)}>
              <MaterialIcons name="comment" size={18} color="#374151" />
              <Text style={styles.actionText}>{comments} Comment{comments !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>
        </View>
        {/* Inline comments area */}
        {likesVisible[item.id] ? (
          <View style={styles.likesSection}>
            {likesLoading[item.id] ? (
              <ActivityIndicator size="small" color="#1976D2" />
            ) : (
              (likesData[item.id] || []).map(u => (
                <View key={u.id || u.user_id || u.likes_id || Math.random()} style={styles.likeRow}>
                  {(u.avatar || u.profile_image || u.photo) ? (
                    <Image source={{ uri: u.avatar || u.profile_image || u.photo }} style={styles.likerAvatar} />
                  ) : (
                    <View style={styles.likerAvatarPlaceholder}><MaterialIcons name="person" size={16} color="#546E7A" /></View>
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.likerName}>{u.username || u.full_name || u.name || u.display_name || 'User'}</Text>
                    {u.role ? <Text style={styles.likerSub}>{u.role}</Text> : null}
                    {/* Show when the like was created if backend provides a timestamp */}
                    { (u.created_at || u.liked_at || u.timestamp || u.createdAt) ? (
                      <Text style={styles.likerSub}>{formatRelativeTime(u.created_at || u.liked_at || u.timestamp || u.createdAt)}</Text>
                    ) : null }
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* Likes modal: shows list of users who liked the appreciation */}
        <Modal visible={likesModalVisible} transparent animationType="fade" onRequestClose={() => animateCloseLikes()}>
          <TouchableWithoutFeedback onPress={() => animateCloseLikes()}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => { /* swallow taps inside modal */ }}>
                <Animated.View style={[styles.likesModal, { transform: [{ translateY: likesTranslateY }] }]} {...likesPanResponder.panHandlers}>
                  <View style={styles.sheetHandle} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontWeight: '700' }}>Likes</Text>
                    <TouchableOpacity onPress={() => animateCloseLikes()}>
                      <MaterialIcons name="close" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 320 }}>
                    {/* If we have liker details, show them; otherwise show a count message if available */}
                    {Array.isArray(likesData[likesModalId]) && likesData[likesModalId].length > 0 ? (
                      (likesData[likesModalId] || []).map(u => (
                        <View key={u.id || u.user_id || Math.random()} style={styles.likerRow}>
                          {(u.avatar || u.profile_image || u.photo) ? (
                            <Image source={{ uri: u.avatar || u.profile_image || u.photo }} style={styles.likerAvatar} />
                          ) : (
                            <View style={styles.likerAvatarPlaceholder}><MaterialIcons name="person" size={16} color="#546E7A" /></View>
                          )}
                          <View style={{ marginLeft: 8 }}>
                            <Text style={styles.likerName}>{u.username || u.full_name || u.name || u.display_name || 'User'}</Text>
                            {u.role ? <Text style={styles.likerSub}>{u.role}</Text> : null}
                            { (u.created_at || u.liked_at || u.timestamp || u.createdAt) ? (
                              <Text style={styles.likerSub}>{formatRelativeTime(u.created_at || u.liked_at || u.timestamp || u.createdAt)}</Text>
                            ) : null }
                          </View>
                        </View>
                      ))
                    ) : (
                      <View>
                        {likesCount[likesModalId] != null ? (
                          <Text style={{ color: '#666', marginTop: 8 }}>{likesCount[likesModalId]} like{likesCount[likesModalId] !== 1 ? 's' : ''} — details not available</Text>
                        ) : (
                          <Text style={{ color: '#666', marginTop: 8 }}>No likes yet</Text>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Comments modal - bottom sheet style */}
        <Modal visible={commentsModalVisible} transparent animationType="fade" onRequestClose={() => animateCloseComments()}>
          <TouchableWithoutFeedback onPress={() => animateCloseComments()}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <Animated.View style={[styles.commentsModal, { transform: [{ translateY: sheetTranslateY }] }]} {...panResponder.panHandlers}>
                  <View style={styles.sheetHandle} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontWeight: '700' }}>Comments</Text>
                    <TouchableOpacity onPress={() => animateCloseComments()}>
                      <MaterialIcons name="close" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  {commentsLoading[commentsModalId] ? (
                    <ActivityIndicator size="small" color="#1976D2" />
                  ) : (
                    <ScrollView style={styles.commentsScroll} contentContainerStyle={{ paddingBottom: 12 }}>
                        {(commentsData[commentsModalId] || []).map(c => (
                        <View key={c.id || c._id || Math.random()} style={styles.commentRow}>
                          <Text style={styles.commentAuthor}>{c.username || c.user_name || c.full_name || c.name}</Text>
                          <Text style={styles.commentDate}>{c.created_at ? formatRelativeTime(c.created_at) : ''}</Text>
                          <Text style={styles.commentText}>{c.text || c.comment || c.body}</Text>
                        </View>
                      ))}
                      {!(commentsData[commentsModalId] || []).length && (
                        <Text style={{ color: '#666', marginTop: 8 }}>No comments yet</Text>
                      )}
                    </ScrollView>
                  )}

                  {/* Composer (fixed at bottom of sheet) */}
                  {!isOwnAppreciation(commentsModalId) ? (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#F1F3F4', paddingTop: 8, marginTop: 8 }}>
                      <View style={styles.commentComposerWrapperInline}>
                        <TextInput
                          style={styles.commentInputInline}
                          placeholder={"Write a comment..."}
                          value={commentsInput[commentsModalId] || ''}
                          onChangeText={(text) => setCommentsInput(prev => ({ ...prev, [commentsModalId]: text }))}
                        />
                        <TouchableOpacity
                          style={styles.postButtonInline}
                          onPress={async () => {
                            const text = (commentsInput[commentsModalId] || '').trim();
                            if (!text) return;
                            try {
                              const uid = await resolveUserId();
                              if (!uid) return;
                              await dataAPI.post(`/appreciation/${commentsModalId}/comments`, { user_id: uid, text });
                              setCommentsInput(prev => ({ ...prev, [commentsModalId]: '' }));
                              await fetchCommentsFor(commentsModalId);
                              try { const resp = await dataAPI.get(`/appreciation/${user?.id}`); if (resp) setItems(Array.isArray(resp) ? resp : (resp?.data || [])); } catch (e) { }
                            } catch (err) {
                              console.warn('Post comment failed:', err);
                            }
                          }}
                        >
                          <Text style={styles.postButtonTextInline}>Post</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {commentsVisible[item.id] ? (
          <View style={styles.commentsSection}>
            {commentsLoading[item.id] ? (
              <ActivityIndicator size="small" color="#1976D2" />
            ) : (
              <View>
                {(commentsData[item.id] || []).map(c => (
                  <View key={c.id || c._id || Math.random()} style={styles.commentRow}>
                    <Text style={styles.commentAuthor}>{c.username || c.user_name || c.full_name || c.name}</Text>
                    <Text style={styles.commentDate}>{c.created_at ? formatRelativeTime(c.created_at) : ''}</Text>
                    <Text style={styles.commentText}>{c.text || c.comment || c.body}</Text>
                  </View>
                ))}
              </View>
            )}

            {(commentsVisible[item.id] || (commentsInput[item.id] && String(commentsInput[item.id]).trim() !== '')) ? (
              <View style={styles.commentComposerWrapperInline}>
                <TextInput
                  style={styles.commentInputInline}
                  placeholder="Write a comment..."
                  value={commentsInput[item.id] || ''}
                  onChangeText={(text) => setCommentsInput(prev => ({ ...prev, [item.id]: text }))}
                />
                <TouchableOpacity
                  style={styles.postButtonInline}
                  onPress={async () => {
                    const text = (commentsInput[item.id] || '').trim();
                    if (!text) return;
                    try {
                      const uid = await resolveUserId();
                      if (!uid) {
                        console.warn('Cannot post comment: missing user id');
                        return;
                      }
                      await dataAPI.post(`/appreciation/${item.id}/comments`, { user_id: uid, text });
                      setCommentsInput(prev => ({ ...prev, [item.id]: '' }));
                      // refresh comments and items
                      await fetchCommentsFor(item.id);
                      try { const resp = await dataAPI.get(`/appreciation/${user?.id}`); if (resp) setItems(Array.isArray(resp) ? resp : (resp?.data || [])); } catch (e) { /* ignore */ }
                    } catch (err) {
                      console.warn('Post comment failed:', err);
                    }
                  }}
                >
                  <Text style={styles.postButtonTextInline}>Post</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {rawVisible[item.id] ? (
          <View style={styles.rawSection}>
            <ScrollView horizontal>
              <Text style={styles.rawText}>{JSON.stringify(item.raw || item, null, 2)}</Text>
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

    // Resolve user id from context or storage (defensive)
    const resolveUserId = async () => {
      const direct = user?.id || user?.user_id || user?.employee_id;
      if (direct) return direct;
      try {
        const raw = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed?.id || parsed?.user_id || parsed?.employee_id || null;
        }
      } catch (e) {
        console.warn('resolveUserId: failed to read stored user', e);
      }
      return null;
    };

    const fetchCommentsFor = async (appreciationId) => {
      try {
        setCommentsLoading(prev => ({ ...prev, [appreciationId]: true }));
        const data = await dataAPI.get(`/appreciation/${appreciationId}/comments`);
        // Defensive parsing: allow array, or object with data/comments/results
        let list = [];
        if (data == null) list = [];
        else if (Array.isArray(data)) list = data;
        else if (typeof data === 'object') list = data.data || data.comments || data.results || data.rows || [];
        setCommentsData(prev => ({ ...prev, [appreciationId]: Array.isArray(list) ? list : [] }));
        setCommentsCount(prev => ({ ...prev, [appreciationId]: Array.isArray(list) ? list.length : (Number(data?.total_comments ?? data?.count ?? data?.total) || 0) }));
      } catch (err) {
        console.warn('Failed to fetch comments for', appreciationId, err);
        setCommentsData(prev => ({ ...prev, [appreciationId]: [] }));
        setCommentsCount(prev => ({ ...prev, [appreciationId]: 0 }));
      } finally {
        setCommentsLoading(prev => ({ ...prev, [appreciationId]: false }));
      }
    };

  // After items load, try to fill likes_count for items that show 0 by calling the per-item likes endpoint.
  useEffect(() => {
    let mounted = true;
    const fillLikesCounts = async () => {
      try {
        const toCheck = (items || []).filter(it => it && it.id && ((it.likes_count == null) || Number(it.likes_count) === 0));
        if (!toCheck || toCheck.length === 0) return;
        // Limit concurrent requests to avoid spamming the backend; process sequentially
        for (const it of toCheck) {
          if (!mounted) break;
          try {
            console.log('Checking likes for appreciation id:', it.id);
            const res = await dataAPI.get(`/appreciation/${it.id}/likes`);
            const list = Array.isArray(res) ? res : (res?.likes || res?.data || res?.results || []);
            const count = Array.isArray(list) ? list.length : (Number(list) || 0);
            if (mounted && typeof count === 'number' && count > 0) {
              setItems(prev => (prev || []).map(p => p && p.id === it.id ? ({ ...p, likes_count: count }) : p));
              console.log('Updated likes_count for', it.id, '=>', count);
            }
          } catch (e) {
            console.warn('Failed to fetch likes for', it.id, e?.message || e);
            // ignore per-item failures
          }
        }
      } catch (e) {
        // ignore
      }
    };

    fillLikesCounts();
    return () => { mounted = false; };
  }, [items]);

    const toggleCommentsVisible = async (appreciationId) => {
      const currently = !!commentsVisible[appreciationId];
      if (currently) {
        setCommentsVisible(prev => ({ ...prev, [appreciationId]: false }));
        return;
      }
      // If cached, just show; otherwise fetch then show
      if (commentsData[appreciationId] && commentsData[appreciationId].length >= 0) {
        setCommentsVisible(prev => ({ ...prev, [appreciationId]: true }));
        if (!commentsData[appreciationId] || commentsData[appreciationId].length === 0) {
          await fetchCommentsFor(appreciationId);
        }
        return;
      }
      await fetchCommentsFor(appreciationId);
      setCommentsVisible(prev => ({ ...prev, [appreciationId]: true }));
    };

    const fetchLikesFor = async (appreciationId) => {
      try {
        setLikesLoading(prev => ({ ...prev, [appreciationId]: true }));
        const res = await dataAPI.get(`/appreciation/${appreciationId}/likes`);
        const list = Array.isArray(res) ? res : (res?.likes || res?.data || res?.results || []);
        setLikesData(prev => ({ ...prev, [appreciationId]: Array.isArray(list) ? list : [] }));
      } catch (err) {
        console.warn('Failed to fetch likes for', appreciationId, err);
        setLikesData(prev => ({ ...prev, [appreciationId]: [] }));
      } finally {
        setLikesLoading(prev => ({ ...prev, [appreciationId]: false }));
      }
    };

    const toggleLikesVisible = async (appreciationId) => {
      const currently = !!likesVisible[appreciationId];
      if (currently) {
        setLikesVisible(prev => ({ ...prev, [appreciationId]: false }));
        return;
      }
      if (likesData[appreciationId] && likesData[appreciationId].length >= 0) {
        setLikesVisible(prev => ({ ...prev, [appreciationId]: true }));
        if (!likesData[appreciationId] || likesData[appreciationId].length === 0) {
          await fetchLikesFor(appreciationId);
        }
        return;
      }
      await fetchLikesFor(appreciationId);
      setLikesVisible(prev => ({ ...prev, [appreciationId]: true }));
    };

    const openCommentsModal = async (appreciationId) => {
      setCommentsModalId(appreciationId);
        // set initial sheet offscreen then animate up
        const sheetH = getSheetHeight();
        sheetTranslateY.setValue(sheetH);
        setCommentsModalVisible(true);
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
        if ((commentsData[appreciationId] && commentsData[appreciationId].length >= 0) || (commentsCount[appreciationId] != null)) return;
        await fetchCommentsFor(appreciationId);
    };

    const animateCloseComments = () => {
      const sheetH = getSheetHeight();
      Animated.timing(sheetTranslateY, { toValue: sheetH, duration: 180, useNativeDriver: true }).start(() => {
          sheetTranslateY.setValue(sheetH);
          setCommentsModalVisible(false);
        });
    };

    const toggleRawVisible = (appreciationId) => {
      setRawVisible(prev => ({ ...prev, [appreciationId]: !prev[appreciationId] }));
    };

  const openLikesModal = async (appreciationId) => {
    setLikesModalId(appreciationId);
    // position offscreen and animate in
  const sheetH = getSheetHeight();
  likesTranslateY.setValue(sheetH);
  setLikesModalVisible(true);
  Animated.timing(likesTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    // if we already have data cached (either list or count), don't refetch
    if ((likesData[appreciationId] && likesData[appreciationId].length >= 0) || (likesCount[appreciationId] != null)) return;
    try {
      setLikesLoading(prev => ({ ...prev, [appreciationId]: true }));
      const res = await dataAPI.get(`/appreciation/${appreciationId}/likes`);

      // Defensive parsing: backend may return an array of user objects, or an object
      // that contains an array under several possible keys, or only a numeric count.
      let list = [];
      let count = null;

      if (res == null) {
        list = [];
      } else if (Array.isArray(res)) {
        list = res;
        count = res.length;
      } else if (typeof res === 'number') {
        count = res;
      } else if (typeof res === 'object') {
        // try common keys
        list = Array.isArray(res.likes) ? res.likes : (Array.isArray(res.liked_users) ? res.liked_users : (Array.isArray(res.data) ? res.data : (Array.isArray(res.results) ? res.results : [])));
        if (list.length === 0) {
          // try to extract a numeric count
          const n = Number(res.total_likes ?? res.totalLikes ?? res.count ?? res.total ?? res.like_count ?? res.likes_count);
          if (!isNaN(n)) count = n;
        } else {
          count = list.length;
        }
      }

      setLikesData(prev => ({ ...prev, [appreciationId]: Array.isArray(list) ? list : [] }));
      if (count != null) setLikesCount(prev => ({ ...prev, [appreciationId]: Number(count) }));
    } catch (e) {
      console.warn('Failed to fetch likes for', appreciationId, e?.message || e);
      setLikesData(prev => ({ ...prev, [appreciationId]: [] }));
    } finally {
      setLikesLoading(prev => ({ ...prev, [appreciationId]: false }));
    }
  };

  const animateCloseLikes = () => {
    const sheetH = getSheetHeight();
    Animated.timing(likesTranslateY, { toValue: sheetH, duration: 180, useNativeDriver: true }).start(() => {
      likesTranslateY.setValue(sheetH);
      setLikesModalVisible(false);
    });
  };

  const isOwnAppreciation = (appreciationId) => {
    try {
      const app = (items || []).find(it => String(it.id) === String(appreciationId));
      if (!app) return false;
      return String(app.employee_id || app.employeeId || app.employee_id) === String(user?.id || user?.user_id || user?.employee_id);
    } catch (e) {
      return false;
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.safeArea}><View style={[styles.loading, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 8 } : null]}><ActivityIndicator size="large" color="#4051B5" /></View></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
  <View style={styles.container}>
  <View style={[styles.header, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 8 } : null]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><MaterialIcons name="arrow-back" size={22} color="#FFFFFF"/></TouchableOpacity>
        <Text style={styles.headerTitle}>My Appreciations</Text>
        <View style={{width:36}} />
      </View>

      {/* Filters row with dropdowns */}
      <View style={styles.filtersRow}>
        <CustomDropdown
          label="Badge Level"
          placeholder="All Badges"
          value={badgeFilter === 'All Badges' ? '' : badgeFilter}
          onSelect={(v) => setBadgeFilter((v === '' || v == null) ? 'All Badges' : v)}
          options={[
            { label: 'All Badges', value: '' },
            ...awardTypes.filter(a => a && a !== 'All Badges').map(a => ({ label: a[0] === '"' ? a.replace(/"/g,'') : a, value: a }))
          ]}
        />

        <CustomDropdown
          label="Year"
          placeholder="All Years"
          value={yearFilter || ''}
          onSelect={(v) => setYearFilter(v)}
          options={[
            { label: 'All Years', value: '' },
            ...years.map(y => ({ label: String(y), value: y }))
          ]}
        />

        <TouchableOpacity style={styles.clearBtn} onPress={() => { setBadgeFilter('All Badges'); setYearFilter(''); }}>
          <Text style={styles.clearText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(i) => String(i.id || i._id || Math.random())}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ListEmptyComponent={() => (<View style={styles.empty}><Text style={styles.emptyText}>No appreciations found for the selected filters.</Text></View>)}
      />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#2149B6', borderBottomWidth: 0 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgePill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgePillText: { fontWeight: '700', color: '#374151' },
  dateText: { color: '#2149B6', fontWeight: '600' },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardMessage: { fontSize: 14, color: '#374151' },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8EEF8', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  avatarLetter: { fontWeight: '700', color: '#0a2850' },
  cardFooter: { flexDirection: 'column', alignItems: 'flex-start', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionText: { marginLeft: 8, color: '#374151', fontWeight: '600' },
  employeeId: { color: '#6B7280', fontSize: 12 },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#9CA3AF' }
  ,
  filtersRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF' , justifyContent: 'flex-start', gap: 8},
  filterPill: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  filterText: { color: '#111827', fontWeight: '600' },
  dropdownContainer: { flex: 1, marginRight: 8 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  dropdownButtonText: { color: '#495057', fontSize: 14, fontWeight: '500', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'stretch', paddingTop: 0, paddingHorizontal: 0 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, maxHeight: 300, width: '80%', elevation: 5, paddingVertical: 8 },
  optionsList: { maxHeight: 280 },
  optionItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F3F4' },
  selectedOption: { backgroundColor: '#E3F2FD' },
  optionText: { fontSize: 14, color: '#212121' },
  selectedOptionText: { color: '#1976D2', fontWeight: '600' },
  clearBtn: { backgroundColor: '#FF6B6B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  clearText: { color: '#FFFFFF', fontWeight: '700' },
  commentsSection: { backgroundColor: '#FFFFFF', padding: 12, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F1F3F4' },
  commentRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  commentAuthor: { fontWeight: '700', color: '#263238', marginBottom: 2 },
  commentDate: { fontSize: 11, color: '#90A4AE', marginBottom: 6 },
  commentText: { color: '#37474F', fontSize: 14, lineHeight: 18 },
  commentComposerWrapperInline: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  commentInputInline: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, fontSize: 14 },
  postButtonInline: { backgroundColor: '#1976D2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  postButtonTextInline: { color: '#FFFFFF', fontWeight: '700' },
  likesSection: { backgroundColor: '#FFFFFF', padding: 12, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F1F3F4' },
  likeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  likerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  likesModal: { backgroundColor: '#FFFFFF', width: '100%', height: '50%', paddingVertical: 12, paddingHorizontal: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, elevation: 8 },
  likerAvatar: { width: 36, height: 36, borderRadius: 18 },
  likerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center' },
  likerName: { fontWeight: '700', color: '#263238' },
  likerSub: { fontSize: 12, color: '#90A4AE' },
  bylineWrap: { alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  bylineAvatar: { width: 46, height: 46, borderRadius: 23, marginBottom: 6 },
  bylineText: { fontStyle: 'italic', color: '#374151', marginTop: 4 },
  rawSection: { backgroundColor: '#0f172a', padding: 12, marginTop: 8, borderRadius: 8 },
  commentsModal: { backgroundColor: '#FFFFFF', width: '100%', height: '50%', paddingVertical: 12, paddingHorizontal: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, elevation: 8 },
  commentsScroll: { flex: 1 },
  sheetHandle: { width: 40, height: 6, borderRadius: 4, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 8 },
  rawText: { color: '#E6EEF8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 },
});

export default MyAppreciations;
