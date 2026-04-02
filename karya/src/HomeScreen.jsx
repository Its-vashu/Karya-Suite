/**
 * HomeScreen Component for Employee Dashboard
 * Modern Material You design implementation with premium UI elements
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Animated,
    Dimensions,
    Image,
    PanResponder,
    ImageBackground,
    Platform,
    PixelRatio,
    Modal,
    FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { dataAPI, API_BASE_URL_EXPORT } from './api';
import * as FileSystem from 'expo-file-system';
import AppreciationDashboard from './appreciation/AppreciationDashboard';
import NotificationService from './services/NotificationService';
import SmartNotificationPanel from './components/SmartNotificationPanel';
import ThoughtCard from './thought/ThoughtCard';
import { useTheme } from './theme/ThemeContext';
const { width } = Dimensions.get('window');
import { normalize } from './utils/scale';

    const HomeScreen = () => {
    const navigation = useNavigation();
    const { logout, user, setUser } = useAuth();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showNotification, setShowNotification] = useState(false);
    
    // Smart Notification System
    const [smartNotifications, setSmartNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    // Derived: prefer appreciation/recognition notifications for the compact home timeline
    const recognitionSource = (() => {
        try {
            const recognitions = (smartNotifications || []).filter(n => String(n.type).toLowerCase() === 'appreciation');
            return (recognitions.length > 0) ? recognitions.slice(0, 3) : (smartNotifications || []).slice(0, 3);
        } catch (e) {
            return (smartNotifications || []).slice(0, 3);
        }
    })();
    
    // Enhanced loading states for professional feel
    const [loadingStates, setLoadingStates] = useState({
        appreciations: false,
        overview: false,
        initialLoad: true
    });
    
    // Shimmer animation for loading
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    
    // Card animations for interactive feedback
    const statsCardScale = useRef(new Animated.Value(1)).current;
    const welcomeCardAnim = useRef(new Animated.Value(0)).current;
    const sectionsAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        );
        shimmer.start();
        
        // Animate welcome card entrance
        Animated.spring(welcomeCardAnim, {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
        }).start();
        
        // Staggered animation for sections
        Animated.stagger(150, [
            Animated.timing(sectionsAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();
        
        return () => shimmer.stop();
    }, []);
    
    // Network connectivity state
    const [isOffline, setIsOffline] = useState(false);
    
    // Error states for better UX
    const [errorStates, setErrorStates] = useState({
        appreciations: null,
        overview: null
    });
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);
    const [profilePicUri, setProfilePicUri] = useState(null);

    // Fetch profile picture from backend
    const fetchProfilePicture = async (userId) => {
        if (!userId) return;
        
        try {
            const token = await AsyncStorage.getItem('authToken');
            const apiUrl = `${API_BASE_URL_EXPORT}/users/${userId}/profile-pic`;
            const fileUri = FileSystem.cacheDirectory + `profile_${userId}.jpg`;
            
            const downloadResult = await FileSystem.downloadAsync(
                apiUrl,
                fileUri,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            if (downloadResult.status === 200) {
                const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setProfilePicUri(`data:image/jpeg;base64,${base64}`);
            } else if (downloadResult.status === 404) {
                setProfilePicUri(null);
            }
        } catch (error) {
            // 404 is normal if no profile pic
            if (!error.message?.includes('404')) {
                console.log('Failed to fetch profile picture in HomeScreen:', error);
            }
            setProfilePicUri(null);
        }
    };
    const [actionsModalVisible, setActionsModalVisible] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollEndTimer = useRef(null);
    const [lastLoginTime, setLastLoginTime] = useState(null);
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const flipAnim = useRef(new Animated.Value(0)).current;
    const [serverThought, setServerThought] = useState(null);
    const [thoughtLoading, setThoughtLoading] = useState(false);
    
    // Animated emoji wave feature
    const emojiScale = useRef(new Animated.Value(1)).current;
    const emojiRotate = useRef(new Animated.Value(0)).current;
    
    // Dashboard appreciations (recent recognitions)
    const [dashboardAppreciations, setDashboardAppreciations] = useState([]);
    const [loadingAppreciations, setLoadingAppreciations] = useState(false);
    const [appreciationsError, setAppreciationsError] = useState(null);
    // Hero item (Appreciation of the Month)
    const hero = (dashboardAppreciations && dashboardAppreciations.length > 0) ? dashboardAppreciations[0] : null;
    const [heroLiked, setHeroLiked] = useState(false);
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
                        console.warn('resolveUserId (home): failed to read stored user', e);
                    }
                return null;
        };

        const toggleHeroLike = async () => {
                if (!hero) return;
                // optimistic UI
                setHeroLiked(prev => !prev);
                try {
                        const uid = await resolveUserId();
                        if (!uid) throw new Error('Missing user id');
                        await dataAPI.post(`/appreciation/${hero.id}/like`, { user_id: uid });
                } catch (err) {
                        console.warn('Like failed, reverting', err);
                        setHeroLiked(prev => !prev);
                }
        };
    
    // Deadlines state (start empty; will be populated from API)
    const [deadlines, setDeadlines] = useState([]);
    // Overview state (ensure these exist to avoid ReferenceError)
    const [projectName, setProjectName] = useState('');
    const [hoursThisWeek, setHoursThisWeek] = useState(null);
    const [tasksCompleted, setTasksCompleted] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    // ...existing code...
    
    // (weather removed)

    // Load data on component mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Set last login time
                const mockLastLogin = new Date();
                mockLastLogin.setHours(mockLastLogin.getHours() - 2);
                setLastLoginTime(mockLastLogin);
                
                // weather removed

                // Fetch thought of the day without blocking the UI
                fetchThoughtOfTheDay();

                // Fetch recent appreciations for the dashboard
                loadDashboardAppreciations();

                // Fetch project deadline (timesheets first, then profile fallback)
                if (user && user.id) {
                    fetchProjectDeadline(user.id);
                    // Fetch weekly timesheet overview (hours / tasks / active project)
                    fetchTimesheetOverview(user.id);
                    // Try to fetch profile picture (regardless of flag)
                    fetchProfilePicture(user.id);
                }

                // Initialize Smart Notification Service
                initializeSmartNotifications();
            } catch (error) {
                console.error("Error in loadInitialData:", error);
            }
        };
        
        loadInitialData();
    }, []);

    // Initialize Smart Notification Service
    const initializeSmartNotifications = () => {
        try {
            console.log('🔔 Initializing smart notifications...');
            
            // Subscribe to notification updates
            NotificationService.subscribe((notifications, unreadCount) => {
                setSmartNotifications(notifications);
                setNotificationUnreadCount(unreadCount);
                console.log(`📱 Received ${notifications.length} notifications (${unreadCount} unread)`);
            });

            // Load initial notifications
            NotificationService.loadNotifications();
        } catch (error) {
            console.error('Error initializing smart notifications:', error);
        }
    };

    // Cleanup notification service on unmount
    useEffect(() => {
        return () => {
            try {
                // Cleanup notification subscriptions
                NotificationService.unsubscribe();
            } catch (error) {
                console.error('Error cleaning up notification service:', error);
            }
        };
    }, []);


    // Load dashboard appreciations
    const loadDashboardAppreciations = async (limit = 3) => {
        try {
            setLoadingAppreciations(true);
            setAppreciationsError(null);
            const items = await dataAPI.fetchDashboardAppreciations(limit);
            setDashboardAppreciations(items || []);
        } catch (err) {
            console.warn('Failed to load dashboard appreciations:', err?.message || err);
            setAppreciationsError('Could not load recent appreciations');
        } finally {
            setLoadingAppreciations(false);
        }
    };
    
    // Get location - try device GPS first, then IP-cache, then default
    const getLocation = async () => {
        try {
            console.log('Attempting to get device location...');

            // Request permission if we haven't already
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                // Try to get current position with a short timeout/accuracy compromise
                try {
                        // Try a higher-accuracy read but allow a slightly longer timeout (15s)
                        const pos = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.High,
                            maximumAge: 0,
                            timeout: 15000
                        });

                    if (pos && pos.coords) {
                        console.log('Device location obtained:', pos.coords);
                        return {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            city: null,
                            method: 'device'
                        };
                    }
                } catch (gpsError) {
                    console.warn('Failed to get device GPS position:', gpsError?.message || gpsError);
                    // fallthrough to other methods
                }
            } else {
                console.log('Location permission not granted, will try IP-based fallback');
            }

            // Try cached IP-based location
            const ipLoc = await getLocationByIP();
            if (ipLoc) {
                console.log('Using IP-based location:', ipLoc);
                return { ...ipLoc, method: 'ip' };
            }

            // Default fallback
            console.log('Using default location for weather');
            return {
                latitude: 28.6758,
                longitude: 77.5022,
                city: 'Ghaziabad',
                method: 'default'
            };
        } catch (error) {
            console.error('Error in getLocation:', error);
            return {
                latitude: 28.6758,
                longitude: 77.5022,
                city: 'Ghaziabad',
                method: 'default'
            };
        }
    };
    
    // Get location based on IP address (fallback)
    // Simplified: return default location to avoid external IP lookups
    const getLocationByIP = async () => {
        return {
            latitude: 28.6758,
            longitude: 77.5022,
            city: 'Ghaziabad',
            method: 'default'
        };
    };

    // Format the last login time
    const formatLastLogin = () => {
        if (!lastLoginTime) return "Today, --:--";
        
        const now = new Date();
        const isToday = lastLoginTime.getDate() === now.getDate() && 
                        lastLoginTime.getMonth() === now.getMonth() &&
                        lastLoginTime.getFullYear() === now.getFullYear();
                        
        if (isToday) {
            return `Today, ${lastLoginTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return lastLoginTime.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric' 
            }) + ", " + lastLoginTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    };

    // Format deadline into label, level and human readable date
    const formatDeadline = (dateStr) => {
        if (!dateStr) return { label: 'No deadline', level: 'none', formatted: '—' };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { label: 'No deadline', level: 'none', formatted: '—' };
        const diff = d - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        let label = 'On Track';
        let level = 'ontrack';
        if (days < 0) {
            label = 'Overdue';
            level = 'overdue';
        } else if (days <= 3) {
            label = 'Critical';
            level = 'critical';
        } else if (days <= 7) {
            label = 'Urgent';
            level = 'urgent';
        } else if (days <= 14) {
            label = 'Soon';
            level = 'soon';
        }
        const formatted = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        return { label, level, formatted };
    };

    // Fetch project deadline: prefer timesheets entries (project_end_date) then user profile company-project-details
    const fetchProjectDeadline = async (userId) => {
        try {
            let projectEnd = null;
            // Use the properly configured BASE_URL from api.js (includes forced live URL)
            const base = API_BASE_URL_EXPORT;
            const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};

            // Try timesheets endpoint first
            try {
                console.log('Fetching timesheets for user:', userId, 'from', `${base}/timesheets/?user_id=${userId}`);
                const timesheetResp = await axios.get(`${base}/timesheets/?user_id=${userId}`, { headers });
                if (Array.isArray(timesheetResp.data) && timesheetResp.data.length) {
                    const found = timesheetResp.data.find(t => t.project_end_date || t.project_end || t.projectEndDate);
                    projectEnd = found?.project_end_date || found?.project_end || found?.projectEndDate || null;
                    console.log('Found project end in timesheet:', projectEnd);
                }
            } catch (err) {
                console.warn('Error fetching timesheets:', err?.message || err);
            }

            // Fallback to profile/company-project-details
            if (!projectEnd) {
                try {
                    console.log('Fetching profile project details from', `${base}/user-details/${userId}/company-project-details`);
                    const profileResp = await axios.get(`${base}/user-details/${userId}/company-project-details`, { headers });
                    const p = profileResp.data;
                    projectEnd = p?.project_end_date || p?.project_end || p?.projectEndDate || null;
                    console.log('Profile project end:', projectEnd);
                } catch (err) {
                    console.warn('Error fetching profile project details:', err?.message || err);
                }
            }

            if (projectEnd) {
                setDeadlines([
                    { id: 1, title: 'Project Deadline', dueDate: projectEnd, status: 'Active' }
                ]);
            } else {
                setDeadlines([]);
            }
        } catch (error) {
            console.error('fetchProjectDeadline error:', error);
            setDeadlines([]);
        }
    };

    // Derived display name with multiple fallbacks. If full name missing, derive from email (before @).
    const extractNameFromEmail = (email) => {
        if (!email) return '';
        const local = email.split('@')[0] || '';
        // replace dots/underscores with space and capitalize words
        return local
            .replace(/[._]/g, ' ')
            .split(' ')
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ');
    };
    
    // Get full name and first name
    const rawName = user?.full_name || user?.name || user?.first_name || extractNameFromEmail(user?.email) || user?.username || '';
    const nameParts = rawName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Centralized animation values (keeps existing variable names for compatibility)
    const anim = useRef({
        fade: new Animated.Value(0),
        scale: new Animated.Value(0.95),
        translateY: new Animated.Value(20),
        notification: new Animated.Value(1000),
        profileMenu: new Animated.Value(100),
    }).current;

    // Backwards-compatible aliases used throughout the file
    const fadeAnim = anim.fade;
    const scaleAnim = anim.scale;
    const translateYAnim = anim.translateY;
    const notificationAnim = anim.notification;
    const profileMenuAnim = anim.profileMenu;

    // Simple in-memory cache for IP-based location fallback
    const ipLocationCache = useRef({ value: null, ts: 0 });
    
    // (weather cache removed)

    // Setup pan responder for swipe down to close notification
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to downward swipes
                return gestureState.dy > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward movement (positive dy)
                    if (gestureState.dy > 0) {
                        anim.notification.setValue(gestureState.dy);
                    }
            },
            onPanResponderRelease: (_, gestureState) => {
                // If swiped down more than 50px, close the panel
                if (gestureState.dy > 50) {
                    setShowNotification(false);
                    Animated.timing(anim.notification, {
                        toValue: 1000, // Move completely off-screen
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                } else {
                    // Otherwise snap back to open position
                    Animated.timing(anim.notification, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        // Run entrance animations
        Animated.parallel([
            Animated.timing(anim.fade, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }),
        ]).start();

        // Update time every minute
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, [fadeAnim, scaleAnim, translateYAnim]);
    
    // Auto-slide card between welcome and quote every 10 seconds
    useEffect(() => {
        const cardSlideInterval = setInterval(() => {
            slideCard();
        }, 10000);
        
        return () => clearInterval(cardSlideInterval);
    }, [isFlipped]);
    
    const slideCard = () => {
        // Start slide animation
        Animated.timing(flipAnim, {
            toValue: isFlipped ? 0 : 1,
            duration: 400,
            useNativeDriver: true,
        }).start(() => {
            // Toggle the content state
            setIsFlipped(prev => !prev);
            
            // If sliding to quote side, update the quote index
            if (!isFlipped) {
                setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % motivationalQuotes.length);
            }
        });
    };
    
    // Same function for when user manually taps to slide
    const flipToNextQuote = slideCard;

    // PanResponder to support horizontal swipe on the welcome/thought card
    const welcomeCardPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => {
                // Only start when horizontal movement is stronger than vertical
                return Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy);
            },
            onPanResponderMove: (_, gs) => {
                // Move flipAnim proportionally to horizontal drag (clamped)
                const progress = Math.max(Math.min(-gs.dx / (width * 0.6), 1), -1);
                // If dragging left (negative dx) we move toward 1, else toward 0
                const value = progress > 0 ? progress : 0;
                flipAnim.setValue(value);
            },
            onPanResponderRelease: (_, gs) => {
                const threshold = width * 0.18; // distance threshold for a swipe
                if (gs.dx < -threshold && !isFlipped) {
                    // left swipe -> show thought
                    slideCard();
                } else if (gs.dx > threshold && isFlipped) {
                    // right swipe -> show welcome
                    slideCard();
                } else {
                    // snap back
                    Animated.timing(flipAnim, {
                        toValue: isFlipped ? 1 : 0,
                        duration: 180,
                        useNativeDriver: true,
                    }).start();
                }
            }
        })
    ).current;

    // Fetch thought of the day from backend with safe fallback
    const fetchThoughtOfTheDay = async () => {
        try {
            setThoughtLoading(true);
            const data = await dataAPI.getThoughtOfTheDay();
            // Accept either an object {quote, author} or an array
            if (!data) return;
            if (Array.isArray(data) && data.length > 0) {
                setServerThought({ quote: data[0].quote || data[0].thoughts || data[0].thought, author: data[0].author || '' });
            } else if (data.quote) {
                setServerThought({ quote: data.quote, author: data.author || '' });
            } else if (data.thought) {
                setServerThought({ quote: data.thought, author: data.author || '' });
            } else {
                setServerThought({ quote: data.text || data.content || data.message || data.description || null, author: data.author || '' });
            }
        } catch (error) {
            console.warn('Could not load Thought of the Day, using local fallback.');
        } finally {
            setThoughtLoading(false);
        }
    };

    // Cleanup any pending scroll timers when component unmounts
    useEffect(() => {
        return () => {
            if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
        };
    }, []);

    // Toggle notification panel - improved for more reliable behavior
    const toggleNotification = () => {
        // First update the state
        const newState = !showNotification;
        setShowNotification(newState);

        // Then run the animation based on the new state
        Animated.timing(notificationAnim, {
            toValue: newState ? 0 : 1000, // 0 to show, 1000 to completely hide
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    // Smart Notification Handlers
    const handleNotificationPress = (notification) => {
        console.log('📱 Notification pressed:', notification.title);
        
        // Mark as read
        NotificationService.markAsRead(notification.id);
        
        // Handle different notification types
        if (notification.type === 'appreciation') {
            navigation.navigate('Appreciation', { 
                screen: 'ViewAllAppreciation',
                params: { appreciationId: notification.data?.id }
            });
        } else if (notification.type === 'timesheet') {
            // Navigate to Timesheet screen
            navigation.navigate('Timesheet');
        } else if (notification.type === 'policy' || notification.type === 'reminder') {
            // Policies view exists in nav as 'PoliciesView'
            navigation.navigate('PoliciesView');
        } else if (notification.type === 'leave') {
            navigation.navigate('LeaveManagement');
        }
        
        // Close panel
        setShowNotification(false);
    };

    const handleMarkAllRead = () => {
        NotificationService.markAllAsRead();
    };

    const handleNotificationRefresh = async () => {
        try {
            await NotificationService.refresh();
            console.log('🔄 Notifications refreshed');
        } catch (error) {
            console.error('Error refreshing notifications:', error);
        }
    };

    // Parse date string safely (tries multiple common fields)
    const safeParseDate = (val) => {
        if (!val) return null;
        try {
            if (val instanceof Date) return val;
            // Accept numeric timestamps
            if (typeof val === 'number') return new Date(val);
            // ISO or common formats
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d;
            // Try simple yyyy-mm-dd
            const maybe = Date.parse(val);
            if (!isNaN(maybe)) return new Date(maybe);
        } catch (e) {
            // ignore
        }
        return null;
    };

    // Compute current week range (Monday -> Sunday)
    const getWeekRange = (now = new Date()) => {
        const d = new Date(now);
        const day = d.getDay(); // 0 Sun .. 6 Sat
        const diffToMonday = day === 0 ? -6 : 1 - day; // shift so Monday is start
        const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
        monday.setHours(0,0,0,0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23,59,59,999);
        return { start: monday, end: sunday };
    };

    // Fetch timesheet entries and compute weekly totals
    const fetchTimesheetOverview = async (userId) => {
        try {
            setOverviewLoading(true);
            // Attempt to fetch timesheets from backend
            const resp = await dataAPI.get(`/timesheets/?user_id=${userId}`);
            // Debug: raw response from timesheet endpoint to aid debugging
            console.log('RAW timesheet response:', resp);
            // dataAPI.get returns response.data already; support both array and paginated shapes
            const entries = Array.isArray(resp) ? resp : (resp?.results || resp?.data || []);
            console.log('Timesheet entries fetched (overview):', entries?.length || 0);

            const { start, end } = getWeekRange(new Date());
            let totalHours = 0;
            let tasksCount = 0;
            const projectHours = {}; // projectName => hours

            entries.forEach(e => {
                // Prefer the sheet_date field that the Timesheet screen uses
                const date = safeParseDate(e.sheet_date || e.date || e.entry_date || e.created_at || e.week_ending || e.timestamp);
                if (!date) return; // skip if no date info

                // Only consider entries in current week
                if (date < start || date > end) return;

                // Hours field: Timesheet entries use time_hour
                const hours = Number(e.time_hour ?? e.hours ?? e.hours_worked ?? e.duration ?? e.total_hours ?? 0) || 0;
                totalHours += hours;

                // Project heuristics: prefer project_name used in timesheet UI
                // Prefer project_name/project if present. Do not inject a fake placeholder here
                // because that makes the UI look like there's an actual active project when
                // the user is not authenticated or when project info is missing.
                const project = (e.project_name && String(e.project_name).trim()) || (e.project && String(e.project).trim()) || null;
                // Only aggregate into named projects. Skip entries without a project name so the
                // Active Project is derived from the same dataset used for Hours/Tasks.
                if (project) {
                    projectHours[project] = (projectHours[project] || 0) + hours;
                }

                // Tasks heuristics: TimesheetScreen enforces a `task_name` per entry.
                // Count each timesheet entry that has a non-empty task_name as one completed task.
                if (e.task_name && String(e.task_name).trim().length > 0) {
                    tasksCount += 1;
                } else if (typeof e.task_count === 'number' && e.task_count > 0) {
                    tasksCount += e.task_count;
                } else if (Array.isArray(e.tasks)) {
                    e.tasks.forEach(t => {
                        if (!t) return;
                        const s = String(t.status || t.state || '').toLowerCase();
                        if (['done','completed','closed','resolved'].includes(s)) {
                            tasksCount += 1;
                        } else if (t.is_complete || t.completed) {
                            tasksCount += 1;
                        }
                    });
                } else if (e.is_complete || e.completed) {
                    tasksCount += 1;
                }
            });

            // Debug: count entries with task_name
            const entriesWithTaskName = entries.filter(en => {
                const d = safeParseDate(en.sheet_date || en.date || en.entry_date || en.created_at || en.week_ending || en.timestamp);
                return d && d >= start && d <= end && en.task_name && String(en.task_name).trim().length > 0;
            }).length;
            console.log(`Timesheet week entries considered: ${entries.length}, entries with task_name: ${entriesWithTaskName}`);

            // Choose project with most hours as active project
            const entriesProjects = Object.keys(projectHours || {});
            const topProject = entriesProjects.length ? entriesProjects.reduce((a,b) => projectHours[a] > projectHours[b] ? a : b) : null;

            setHoursThisWeek(totalHours);
            setTasksCompleted(tasksCount);
            // If user is authenticated, show top project or fallback to profile project details when none exist
            if (user && user.id) {
                if (topProject) {
                    setProjectName(topProject);
                } else {
                    // Try to fetch profile/company-project-details as a sensible fallback
                    try {
                        const profile = await dataAPI.fetchEmployeeDetails(user.id);
                        const profileProject = profile?.project_name || profile?.project || profile?.company_project || null;
                        setProjectName(profileProject ? String(profileProject) : 'No active project');
                    } catch (err) {
                        console.warn('Failed to fetch profile project fallback:', err?.message || err);
                        setProjectName('No active project');
                    }
                }
            } else {
                setProjectName('');
            }
            console.log('Overview computed:', { totalHours, tasksCount, topProject, entriesProjects });
        } catch (err) {
            console.warn('Failed to fetch timesheet overview:', err?.message || err);
            // Leave previous values if present
        } finally {
            setOverviewLoading(false);
        }
    };

    // Toggle profile menu with animation
    const toggleProfileMenu = () => {
        const newState = !profileMenuVisible;
        setProfileMenuVisible(newState);

        Animated.timing(profileMenuAnim, {
            toValue: newState ? 0 : 100, // 0 to show, 100 to hide (slide down)
            duration: 250,
            useNativeDriver: true,
        }).start();
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            // Call the logout function and wait for it
                            await logout();
                            // Reset navigation to the Login screen to prevent back navigation
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            console.error("Logout error:", error);
                            Alert.alert("Error", "Failed to logout. Please try again.");
                        } finally {
                            // Always reset loading state whether successful or not
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Enhanced refresh with better UX and parallel loading
    const onRefresh = async () => {
        console.log("🔄 Smart refresh initiated");
        
        // Visual feedback for premium feel
        console.log("💫 Refresh feedback triggered");
        
    setRefreshing(true);
    setErrorStates({ appreciations: null, overview: null });
        
        try {
            // Parallel loading for faster refresh
            const refreshPromises = [
                // weather refresh removed
                loadDashboardAppreciations().catch(err => {
                    console.warn("Appreciations refresh failed:", err);
                    setErrorStates(prev => ({ ...prev, appreciations: "Appreciations unavailable" }));
                }),
                NotificationService.refresh().catch(err => {
                    console.warn("Notifications refresh failed:", err);
                })
            ];

            // Add project deadline refresh if user exists
            if (user && user.id) {
                refreshPromises.push(
                    fetchProjectDeadline(user.id).catch(err => {
                        console.warn("Overview refresh failed:", err);
                        setErrorStates(prev => ({ ...prev, overview: "Overview unavailable" }));
                    })
                );
                refreshPromises.push(
                    fetchTimesheetOverview(user.id).catch(err => {
                        console.warn('Timesheet overview refresh failed:', err);
                        setErrorStates(prev => ({ ...prev, overview: 'Overview unavailable' }));
                    })
                );
            }

            await Promise.allSettled(refreshPromises);
            console.log("✅ Smart refresh completed");
            
            // Success feedback
            console.log("🎉 Refresh successful");
            
        } catch (error) {
            console.error("❌ Refresh error:", error);
            // Error feedback
            console.log("⚠️ Refresh failed");
        } finally {
            // Minimum refresh time for smooth UX
            setTimeout(() => {
                setRefreshing(false);
            }, 800);
        }
    };

    // Scroll handlers: disable Pressable ripples during quick scrolls/swipes
    const handleScrollBegin = () => {
        setIsScrolling(true);
        if (scrollEndTimer.current) {
            clearTimeout(scrollEndTimer.current);
            scrollEndTimer.current = null;
        }
    };

    const handleScrollEnd = () => {
        // Delay turning off scrolling state to avoid quick flicker
        if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
        scrollEndTimer.current = setTimeout(() => {
            setIsScrolling(false);
            scrollEndTimer.current = null;
        }, 120);
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const formatTime = () => {
        return currentTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = () => {
        return currentTime.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
    };

    // Material design card ripple effect
    const animateRipple = (callback) => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.98,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (callback) callback();
        });
    };

    // Menu items with Material icons and actions
    const menuItems = [
        { 
            id: 1, 
            title: 'Timesheet', 
            icon: 'event-note', 
            description: 'Log your work hours', 
            color: '#1976D2', 
            onPress: () => animateRipple(() => navigation.navigate('Timesheet')) 
        },
        { 
            id: 2, 
            title: 'Leave', 
            icon: 'event-busy', 
            description: 'Request time off', 
            color: '#7B1FA2', 
            onPress: () => animateRipple(() => navigation.navigate('LeaveManagement')) 
        },
        { 
            id: 3, 
            title: 'Calendar', 
            icon: 'date-range', 
            description: 'View schedule', 
            color: '#C2185B', 
            onPress: () => animateRipple(() => navigation.navigate('Calendar')) 
        },
        { 
            id: 4, 
            title: 'Background Check', 
            icon: 'assignment-ind', 
            description: 'Submit background form', 
            color: '#D32F2F', 
            onPress: () => animateRipple(() => navigation.navigate('BackgroundCheckForm')) 
        },
        { 
            id: 5,
            title: 'AI Tracker',
            icon: 'smart-toy', // Material icon name
            description: 'AI work insights',
            color: '#512DA8',
            onPress: () => animateRipple(() => navigation.navigate('AITracker'))
        },
        { 
            id: 6, 
            title: 'Policies', 
            icon: 'description', 
            description: 'Company guidelines', 
            color: '#F57C00', 
            onPress: () => animateRipple(() => navigation.navigate('PoliciesView')) 
        },
        { 
            id: 7, 
            title: 'Help & Support', 
            icon: 'help-outline', 
            description: 'Get help', 
            color: '#0097A7', 
            onPress: () => animateRipple(() => Alert.alert('Coming Soon', 'Support feature will be available soon!')) 
        },
    ];
    
    // Array of motivational quotes for the flippable card
    const motivationalQuotes = [
        {
            quote: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            quote: "The future belongs to those who believe in the beauty of their dreams.",
            author: "Eleanor Roosevelt"
        },
        {
            quote: "The only way to do great work is to love what you do.",
            author: "Steve Jobs"
        },
        {
            quote: "Believe you can and you're halfway there.",
            author: "Theodore Roosevelt"
        },
        {
            quote: "Don't watch the clock; do what it does. Keep going.",
            author: "Sam Levenson"
        },
        {
            quote: "The best way to predict the future is to create it.",
            author: "Peter Drucker"
        },
        {
            quote: "It does not matter how slowly you go as long as you do not stop.",
            author: "Confucius"
        },
        {
            quote: "Quality is not an act, it is a habit.",
            author: "Aristotle"
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['right', 'left']}>
            <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.primary} />

            {/* Material Design App Bar - with safe area top padding */}
            <View style={[styles.appBar, { paddingTop: 8 + insets.top, backgroundColor: theme.colors.primary }]}>
                <View style={styles.appBarContent}>
                    <View style={styles.logoSection}>
                        <Text style={styles.appBarTitle}>CONCIENTECH</Text>
                        <Text style={styles.appBarSubtitle}>Employee Portal</Text>
                    </View>
                    

                    <View style={styles.appBarActions}>
                        {/* Smart Notifications button - improved UI */}
                        <TouchableOpacity
                            accessibilityLabel={`Notifications, ${notificationUnreadCount} unread`}
                            accessibilityRole="button"
                            style={styles.notificationButton}
                            onPress={toggleNotification}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.notificationCircle,
                                notificationUnreadCount > 0 && styles.notificationCircleActive
                            ]}>
                                <MaterialIcons 
                                    name={notificationUnreadCount > 0 ? "notifications-active" : "notifications-none"} 
                                    size={24} 
                                    color="white" 
                                />
                            </View>

                            {notificationUnreadCount > 0 && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationBadgeText}>
                                        {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            

            {/* Smart Notification Panel */}
            <SmartNotificationPanel
                isVisible={showNotification}
                notifications={smartNotifications}
                unreadCount={notificationUnreadCount}
                onClose={() => setShowNotification(false)}
                onRefresh={handleNotificationRefresh}
                onNotificationPress={handleNotificationPress}
                onMarkAllRead={handleMarkAllRead}
            />

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1565C0"]} />
                }
                onScrollBeginDrag={handleScrollBegin}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollBegin={handleScrollBegin}
                onMomentumScrollEnd={handleScrollEnd}
                scrollEventThrottle={16}
            >
                {/* Sliding Welcome/Thought of the Day Card */}
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={flipToNextQuote}
                    {...welcomeCardPanResponder.panHandlers}
                    style={[styles.welcomeCard, {
                        opacity: fadeAnim,
                        transform: [
                            { translateY: translateYAnim },
                            { scale: scaleAnim }
                        ]
                    }]}
                >
                    <View style={{overflow: 'hidden', width: '100%', height: '100%', position: 'relative'}}>
                        {/* Welcome Card - Simple Style */}
                        <Animated.View style={{
                            position: 'absolute', 
                            top: 0, 
                            left: 0,
                            right: 0,
                            bottom: 0,
                            transform: [{
                                translateX: flipAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -width]  // Slide left
                                })
                            }]
                        }}>
                            <LinearGradient
                                colors={['#1976D2', '#0D47A1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.welcomeGradient}
                            >
                                <View style={{flex: 1, justifyContent: 'flex-start'}}>
                                    {/* Animated Emoji - Top Right */}
                                    <Pressable
                                        onPress={(e) => {
                                            // Stop event propagation to prevent card flip
                                            e?.stopPropagation?.();
                                            
                                            // Wiggle animation
                                            Animated.sequence([
                                                Animated.parallel([
                                                    Animated.spring(emojiScale, {
                                                        toValue: 1.3,
                                                        friction: 3,
                                                        tension: 40,
                                                        useNativeDriver: true,
                                                    }),
                                                    Animated.timing(emojiRotate, {
                                                        toValue: 1,
                                                        duration: 100,
                                                        useNativeDriver: true,
                                                    }),
                                                ]),
                                                Animated.parallel([
                                                    Animated.spring(emojiScale, {
                                                        toValue: 1,
                                                        friction: 3,
                                                        useNativeDriver: true,
                                                    }),
                                                    Animated.sequence([
                                                        Animated.timing(emojiRotate, {
                                                            toValue: -1,
                                                            duration: 100,
                                                            useNativeDriver: true,
                                                        }),
                                                        Animated.timing(emojiRotate, {
                                                            toValue: 0,
                                                            duration: 100,
                                                            useNativeDriver: true,
                                                        }),
                                                    ]),
                                                ]),
                                            ]).start();
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            padding: 8,
                                            zIndex: 10,
                                        }}
                                    >
                                        <Animated.Text
                                            style={{
                                                fontSize: 42,
                                                transform: [
                                                    { scale: emojiScale },
                                                    {
                                                        rotate: emojiRotate.interpolate({
                                                            inputRange: [-1, 0, 1],
                                                            outputRange: ['-15deg', '0deg', '15deg'],
                                                        }),
                                                    },
                                                ],
                                            }}
                                        >
                                            😊
                                        </Animated.Text>
                                    </Pressable>

                                    {/* Greeting Section */}
                                    <Text style={{
                                        fontSize: 22, 
                                        fontWeight: '700', 
                                        color: 'white',
                                        marginBottom: 4
                                    }}>
                                        {getGreeting()}
                                    </Text>
                                    <Text style={{
                                        fontSize: 18, 
                                        color: 'rgba(255,255,255,0.95)',
                                        fontWeight: '500',
                                        marginBottom: 16
                                    }}>
                                        {firstName} {lastName}
                                    </Text>
                                    
                                    {/* Time and Date - Compact */}
                                    <Text style={{
                                        fontSize: 18,
                                        color: 'white',
                                        fontWeight: '600',
                                        marginBottom: 3
                                    }}>
                                        {formatTime()}
                                    </Text>
                                    <Text style={{
                                        fontSize: 14,
                                        color: 'rgba(255,255,255,0.8)'
                                    }}>
                                        {formatDate()}
                                    </Text>

                                    

                                    {/* Spacer to push content up and dots down */}
                                    <View style={{marginTop: 'auto'}} />
                                    
                                    {/* Premium MNC-style pager dots at bottom of welcome card */}
                                    <View style={styles.quoteDots}> 
                                        {[0, 1].map((idx) => (
                                            <View
                                                key={`welcome-dot-${idx}`}
                                                style={[
                                                    styles.quoteDot,
                                                    idx === (isFlipped ? 1 : 0) && styles.activeQuoteDot
                                                ]}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                        
                        {/* Thought of the Day Card (moved to separate component) */}
                        <ThoughtCard
                            flipAnim={flipAnim}
                            isFlipped={isFlipped}
                            serverThought={serverThought}
                            thoughtLoading={thoughtLoading}
                            motivationalQuotes={motivationalQuotes}
                            currentQuoteIndex={currentQuoteIndex}
                            styles={styles}
                        />
                    </View>

                    {/* No shared footer needed anymore - moved dots inside each card */}
                </TouchableOpacity>

                {/* Stats Card */}
                <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }] }>
                    <View style={styles.overviewHeader}>
                        <Text style={styles.overviewTitle}>Today's Overview</Text>
                    </View>
                    {/* Active Project - full width card (themed) */}
                    <TouchableOpacity
                        style={[
                            styles.overviewCard,
                            {
                                backgroundColor: theme.colors.card || theme.colors.surface,
                                marginBottom: 12,
                                padding: 14,
                                borderRadius: 12,
                                shadowColor: theme.name === 'dark' ? '#000' : '#000',
                                shadowOpacity: 0.06,
                                shadowOffset: { width: 0, height: 2 },
                                shadowRadius: 8,
                                elevation: 2,
                            },
                        ]}
                        onPress={() => navigation.navigate('Timesheet')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.smallIcon, { backgroundColor: theme.name === 'dark' ? '#06202b' : '#E6F0FF' }]}>
                                <MaterialIcons name="insert-chart" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{ fontSize: 12, color: theme.colors.muted }}>Active Project</Text>
                                <Text style={{ fontSize: 20, color: theme.colors.primary, fontWeight: '700' }}>{projectName || (user && user.id ? 'Intranet portal' : 'Login to view')}</Text>
                                <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 4 }}>1 active</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* ...existing code... */}

                    

                    <View style={styles.overviewTwoColRow}>
                        {/* Hours This Week (left) - icon above, centered (non-interactive) */}
                        <View style={[styles.overviewCard, styles.overviewStatHalf, { backgroundColor: theme.name === 'dark' ? '#062217' : '#F4FFF5', marginRight: 8, borderRadius: 12 }] }>
                            <View style={styles.overviewStatCenter}>
                                <View style={[styles.overviewIconTop, { backgroundColor: '#EEFFF0' }]}>
                                    <MaterialIcons name="alarm" size={22} color="#22C55E" />
                                </View>
                                <Text style={{ fontSize: 12, color: '#757575', marginTop: 8 }}>Hours</Text>
                                <View style={styles.statNumberRow}>
                                    <Text style={styles.statNumber} numberOfLines={1} ellipsizeMode="tail">{hoursThisWeek != null ? hoursThisWeek.toFixed(1) : '0.0'}</Text>
                                    <Text style={styles.statUnit}>hrs</Text>
                                </View>
                                <Text style={{ fontSize: 12, color: '#9E9E9E', marginTop: 6 }}>This week</Text>
                            </View>
                        </View>

                        {/* Tasks Completed (right) - icon above, centered */}
                        <TouchableOpacity style={[styles.overviewCard, styles.overviewStatHalf, { backgroundColor: theme.name === 'dark' ? '#241224' : '#FBF7FF', marginLeft: 8, borderRadius: 12 }]} onPress={() => navigation.navigate('Tasks')}>
                            <View style={styles.overviewStatCenter}>
                                <View style={[styles.overviewIconTop, { backgroundColor: '#F6F0FF' }]}>
                                    <MaterialIcons name="check-box" size={22} color="#7C3AED" />
                                </View>
                                <Text style={{ fontSize: 12, color: '#757575', marginTop: 8 }}>Tasks</Text>
                                <View style={styles.statNumberRow}>
                                    <Text style={[styles.statNumber, { color: '#7C3AED' }]} numberOfLines={1} ellipsizeMode="tail">{tasksCompleted != null ? tasksCompleted : 0}</Text>
                                    <Text style={[styles.statUnit, { color: '#7C3AED' }]}>done</Text>
                                </View>
                                <Text style={{ fontSize: 12, color: '#9E9E9E', marginTop: 6 }}>Completed</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Actions Section */}
                <View style={styles.actionsContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <TouchableOpacity 
                            style={styles.viewAllButton} 
                            onPress={() => setActionsModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.viewAllText}>View All</Text>
                            <MaterialIcons name="arrow-forward" size={14} color="#1565C0" style={styles.viewAllIcon} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuGrid}>
                        {(menuItems || []).slice(0, 4).map((item) => (
                            <Pressable
                                key={item.id}
                                style={styles.menuItem}
                                android_ripple={{ color: `${item.color}20` }}
                                onPress={item.onPress}
                            >
                                <View style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: 12,
                                    padding: 12,
                                    minHeight: 100,
                                    justifyContent: 'space-between',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 8,
                                    elevation: 3,
                                    borderWidth: 0.5,
                                    borderColor: '#E5E7EB',
                                }}>
                                    {/* Professional compact icon */}
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        backgroundColor: `${item.color}`,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}>
                                        <MaterialIcons name={item.icon} size={22} color="#FFFFFF" />
                                    </View>
                                    
                                    <View>
                                        <Text style={[styles.menuTitle, { 
                                            color: '#1F2937', 
                                            fontSize: 13,
                                            fontWeight: '600',
                                            marginBottom: 2,
                                            letterSpacing: 0
                                        }]}>
                                            {item.title}
                                        </Text>
                                        <Text style={[styles.menuDescription, { 
                                            color: '#6B7280', 
                                            fontSize: 11,
                                            lineHeight: 14
                                        }]}>
                                            {item.description}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Appreciation CTA placed after Quick Actions */}
                <View style={[styles.appreciationCard, { backgroundColor: '#FFF8F1', marginBottom: 12 }]}> 
                    {/* Row 1: primary message + Send button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 8 }}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: '#757575' }}>Appreciation</Text>
                                <MaterialIcons name="emoji-events" size={16} color="#F9A825" style={{ marginLeft: 6 }} />
                            </View>
                            <Text style={{ fontSize: 14, color: '#212121', marginTop: 6 }}>Send a note of appreciation to a colleague!</Text>
                        </View>
                        <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
                            <TouchableOpacity style={[styles.pillButton, { paddingHorizontal: 12, paddingVertical: 8 }]} onPress={() => navigation.navigate('Appreciation', { screen: 'ShowAppreciation' })}>
                                <Text style={[styles.pillButtonText, { fontSize: 13 }]}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Row 2: secondary message + View button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: '#9E9E9E' }}>View all appreciation notes of colleagues</Text>
                        </View>
                        <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
                            <TouchableOpacity 
                                style={[styles.viewAllButton, { backgroundColor: '#E3F2FD' }]} 
                                onPress={() => navigation.navigate('Appreciation', { screen: 'ViewAllAppreciation' })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.viewAllText}>View</Text>
                                <MaterialIcons name="arrow-forward" size={14} color="#1565C0" style={styles.viewAllIcon} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Deadlines section removed from here (will be displayed below Latest Employee Appreciations) */}

                {/* Actions Modal - shows all quick actions */}
                <Modal
                    visible={actionsModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setActionsModalVisible(false)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>All Actions</Text>
                                <TouchableOpacity onPress={() => setActionsModalVisible(false)}>
                                    <MaterialIcons name="close" size={22} color="#212121" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 4 }}>
                                {menuItems.map(item => (
                                    <Pressable
                                        key={`modal-${item.id}`}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: '#ffffff',
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 12,
                                            shadowColor: item.color,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 8,
                                            elevation: 3,
                                            borderWidth: 1,
                                            borderColor: `${item.color}15`,
                                        }}
                                        android_ripple={{ color: `${item.color}20` }}
                                        onPress={() => { setActionsModalVisible(false); item.onPress(); }}
                                    >
                                        {/* Modern gradient icon with glow */}
                                        <View style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 14,
                                            backgroundColor: item.color,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 16,
                                            shadowColor: item.color,
                                            shadowOffset: { width: 0, height: 3 },
                                            shadowOpacity: 0.35,
                                            shadowRadius: 6,
                                            elevation: 5,
                                        }}>
                                            <MaterialIcons name={item.icon} size={26} color="#FFFFFF" />
                                        </View>
                                        
                                        <View style={{flex: 1}}>
                                            <Text style={{
                                                fontSize: 16,
                                                fontWeight: '600',
                                                color: '#0f1724',
                                                marginBottom: 4,
                                                letterSpacing: 0.2
                                            }}>
                                                {item.title}
                                            </Text>
                                            <Text style={{
                                                fontSize: 13,
                                                color: '#64748B',
                                                lineHeight: 18
                                            }}>
                                                {item.description}
                                            </Text>
                                        </View>
                                        
                                        {/* Arrow indicator */}
                                        <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" style={{ marginLeft: 8 }} />
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* ...existing code... */}

                {/* Appreciation dashboard (rendered here and also available in Appreciation stack) */}
                {/* Reuse AppreciationDashboard so markup isn't duplicated */}
                <AppreciationDashboard navigation={navigation} />

                {/* Deadlines Section (placed under Latest Employee Appreciations) */}
                {deadlines.length > 0 && (
                    <View style={[styles.deadlinesContainer, { backgroundColor: theme.colors.surface }]}>
                        {/* Header */}
                        <View style={styles.deadlinesHeader}>
                            <View style={styles.deadlinesTitleRow}>
                                <View style={[styles.deadlinesIconCircle, { backgroundColor: theme.name === 'dark' ? 'rgba(66, 153, 225, 0.15)' : '#E3F2FD' }]}>
                                    <MaterialIcons name="event-note" size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.deadlinesSectionTitle, { color: theme.colors.text }]}>Upcoming Deadlines</Text>
                            </View>
                            {deadlines.some(d => {
                                const info = formatDeadline(d.dueDate || d.project_end || d.projectEndDate);
                                return info.level === 'overdue';
                            }) && (
                                <View style={styles.overdueIndicator}>
                                    <MaterialIcons name="warning" size={12} color="#FF3B30" />
                                    <Text style={styles.overdueText}>Overdue</Text>
                                </View>
                            )}
                        </View>

                        {/* Deadline Cards */}
                        {deadlines.map(deadline => {
                            const info = formatDeadline(deadline.dueDate || deadline.project_end || deadline.projectEndDate);
                            const isOverdue = info.level === 'overdue';
                            return (
                                <View 
                                    key={deadline.id} 
                                    style={[
                                        styles.deadlineCardNew,
                                        { 
                                            backgroundColor: isOverdue ? '#FFF5F5' : theme.colors.card,
                                            borderLeftColor: isOverdue ? '#FF3B30' : '#4CAF50'
                                        }
                                    ]}
                                >
                                    {/* Status Indicator Dot */}
                                    <View style={[
                                        styles.deadlineStatusDot,
                                        { backgroundColor: isOverdue ? '#FF3B30' : '#4CAF50' }
                                    ]} />
                                    
                                    <View style={styles.deadlineCardContent}>
                                        <View style={styles.deadlineCardHeader}>
                                            <Text style={[styles.deadlineCardTitle, { color: theme.colors.text }]}>
                                                {deadline.title}
                                            </Text>
                                        </View>
                                        
                                        <Text style={[styles.deadlineProject, { color: theme.colors.muted }]}>
                                            {projectName || 'Intranet portal'}
                                        </Text>
                                        
                                        <View style={styles.deadlineDateRow}>
                                            <Text style={[styles.deadlineDueLabel, { color: theme.colors.muted }]}>Due:</Text>
                                            <Text style={[
                                                styles.deadlineDueDate,
                                                { color: isOverdue ? '#FF3B30' : theme.colors.text }
                                            ]}>
                                                {info.formatted}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Recent Recognitions removed per request */}
            </ScrollView>

            {/* Material Design Bottom Navigation Bar - Floating Style */}
            <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
                <TouchableOpacity style={styles.bottomNavItem} activeOpacity={0.7}>
                    <View style={[styles.iconWrapper, styles.activeIconWrapper]}>
                        <MaterialIcons name="home" size={24} color="#4051B5" />
                    </View>
                    <Text style={[styles.bottomNavText, styles.bottomNavActive]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomNavItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('About')}
                >
                    <View style={styles.iconWrapper}>
                        <MaterialIcons name="info" size={24} color="#757575" />
                    </View>
                    <Text style={styles.bottomNavText}>About</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomNavItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PoliciesView')}
                >
                    <View style={styles.iconWrapper}>
                        <MaterialIcons name="description" size={24} color="#757575" />
                    </View>
                    <Text style={styles.bottomNavText}>Policies</Text>
                </TouchableOpacity>

                <Pressable
                    style={styles.bottomNavItem}
                    android_ripple={{ color: '#E0E0E0' }}
                    onPress={() => navigation.navigate('Expenses')}
                >
                    <View style={styles.iconWrapper}>
                        <MaterialIcons name="receipt-long" size={24} color="#757575" />
                    </View>
                    <Text style={styles.bottomNavText}>Expenses</Text>
                </Pressable>

                <Pressable
                    style={styles.bottomNavItem}
                    android_ripple={{ color: '#E0E0E0' }}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <View style={styles.profileIconContainer}>
                        {profilePicUri ? (
                            <Image 
                                source={{ uri: profilePicUri }} 
                                style={styles.profileIconImage}
                                resizeMode="cover"
                            />
                        ) : user?.username ? (
                            <Text style={styles.profileInitial}>{(user.username || '').charAt(0).toUpperCase()}</Text>
                        ) : (
                            <MaterialIcons name="person" size={18} color="white" />
                        )}
                    </View>
                    <Text style={styles.bottomNavText}>Profile</Text>
                </Pressable>
            </View>

            {/* Profile Menu/Section - modern Material Design style */}
            {profileMenuVisible && (
                <Animated.View
                    style={[
                        styles.profileMenu,
                        { transform: [{ translateY: profileMenuAnim }] }
                    ]}
                >
                    <View style={styles.profileMenuHeader}>
                        <Text style={styles.profileMenuGreeting}>Hi, {user?.username || 'vashu'}</Text>
                    </View>

                    <Pressable
                        style={styles.profileMenuItem}
                        android_ripple={{ color: '#F0F4FF', borderless: false }}
                        onPress={() => { setProfileMenuVisible(false); navigation.navigate('Profile'); }}
                    >
                        <View style={[styles.profileMenuIconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <MaterialIcons name="person-outline" size={22} color="#4051B5" />
                        </View>
                        <Text style={styles.profileMenuItemText}>Profile</Text>
                    </Pressable>

                    <Pressable
                        style={styles.profileMenuItem}
                        android_ripple={{ color: '#F0F4FF', borderless: false }}
                    >
                        <View style={[styles.profileMenuIconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <MaterialIcons name="settings" size={22} color="#4051B5" />
                        </View>
                        <Text style={styles.profileMenuItemText}>Settings</Text>
                    </Pressable>

                    <Pressable
                        style={styles.profileMenuItem}
                        android_ripple={{ color: '#F0F4FF', borderless: false }}
                    >
                        <View style={[styles.profileMenuIconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <MaterialIcons name="help-outline" size={22} color="#4051B5" />
                        </View>
                        <Text style={styles.profileMenuItemText}>Help & Support</Text>
                    </Pressable>

                    <Pressable
                        style={styles.profileMenuItem}
                        android_ripple={{ color: '#FFEEEE', borderless: false }}
                        onPress={handleLogout}
                    >
                        <View style={[styles.profileMenuIconContainer, { backgroundColor: '#FFEFEF' }]}>
                            <MaterialIcons name="logout" size={22} color="#FF424F" />
                        </View>
                        <Text style={[styles.profileMenuItemText, { color: '#FF424F' }]}>Log out</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Backdrop for profile menu */}
            {profileMenuVisible && (
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={toggleProfileMenu}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5', // Material Design background
    },
    appBar: {
        backgroundColor: '#1565C0',
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    appBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    logoSection: {
        flexDirection: 'column',
    },
    appBarTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    appBarSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
    },
    appBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationButton: {
        marginLeft: 12,
        position: 'relative',
    },
    notificationCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    notificationCircleActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    iconText: {
        fontSize: 18,
    },
    logoutText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    notificationBadge: {
        position: 'absolute',
        right: -2,
        top: -2,
        backgroundColor: '#FF3B30',
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#1976D2',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 5,
    },
    notificationBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: -0.3,
        includeFontPadding: false,
        textAlign: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
    },
    notificationPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        zIndex: 1000,
        elevation: 8,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 12,
        maxHeight: '80%', // Limit height for smaller screens
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    appreciationCard: {
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 12,
        marginBottom: 12,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 6,
    },
    heroCard: {
        backgroundColor: '#FAFAFB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    heroCongrat: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 8,
    },
    heroActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    heroActionText: {
        color: '#424242',
        fontWeight: '600'
    },
    carouselCard: {
        minWidth: 260,
        maxWidth: 340,
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    badgePill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#616161'
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1565C0',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    notificationTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 22,
    },
    deadlineCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    deadlinesContainer: {
        borderRadius: 20,
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    deadlinesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    deadlinesTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deadlinesIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    deadlinesSectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    overdueIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    overdueText: {
        color: '#D32F2F',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 3,
        letterSpacing: 0.3,
    },
    deadlineCardNew: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderLeftWidth: 3,
        position: 'relative',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    deadlineStatusDot: {
        position: 'absolute',
        top: 18,
        right: 16,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    deadlineCardContent: {
        flex: 1,
        paddingRight: 28,
    },
    deadlineCardHeader: {
        marginBottom: 6,
    },
    deadlineCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 21,
        letterSpacing: 0.2,
    },
    deadlineProject: {
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
        opacity: 0.7,
    },
    deadlineDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deadlineDueLabel: {
        fontSize: 12,
        marginRight: 6,
        opacity: 0.6,
    },
    deadlineDueDate: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    deadlineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deadlineTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
        flex: 1,
    },
    criticalBadge: {
        backgroundColor: '#FFE8E8',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 16,
        marginLeft: 8,
    },
    criticalText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dueDateText: {
        fontSize: 14,
        color: '#666666',
        marginTop: 2,
    },
    sectionContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    notificationIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationIconText: {
        fontSize: 16,
    },
    notificationContent: {
        flex: 1,
    },
    notificationItemTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#212121',
        marginBottom: 2,
    },
    notificationMessage: {
        fontSize: 13,
        color: '#616161',
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 11,
        color: '#9E9E9E',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 160, // Increased space for floating bottom nav
    },
    welcomeCard: {
        borderRadius: 24,
        marginBottom: 20,
        elevation: 6,
        marginHorizontal: 16,
        overflow: 'hidden',
        height: 220,
        shadowColor: '#4051B5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    welcomeGradient: {
        borderRadius: 16,
        padding: 18,
        flex: 1,
    },
    welcomeHeader: {
        flexDirection: 'column',
    },
    welcomeContent: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    dateTimeContainer: {
        marginBottom: 12,
    },
    timeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.95)',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    // Avatar styles removed as no longer needed
    welcomeDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginVertical: 14,
        width: '100%',
    },
    welcomeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    welcomeFooterText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginLeft: 6,
        fontWeight: '400',
    },
    roleChip: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    roleText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    statsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    marginHorizontal: 16,
    shadowColor: '#4051B5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(64, 81, 181, 0.08)',
    },
    overviewHeader: {
        paddingBottom: 6,
        borderBottomWidth: 0,
        marginBottom: 10,
    },
    overviewTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#212121',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    statItem: {
        borderRadius: 12,
        padding: 12,
        width: '31%',
        alignItems: 'center',
        elevation: 1,
    },
    statIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11,
        color: '#757575',
        marginTop: 2,
    },
    smallIcon: {
        width: 52,
        height: 52,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },

    overviewCard: {
        borderRadius: 12,
        padding: 14,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        marginHorizontal: 16,
    },
    overviewTwoColRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    overviewStatHalf: {
        flex: 1,
        minHeight: 86,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    overviewStatCenter: {
        width: '100%',
        alignItems: 'center',
    },
    overviewIconTop: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appreciationCard: {
        borderRadius: 12,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    pillButton: {
        backgroundColor: '#1565C0',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 64,
    },
    pillButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    overviewStatNumber: {
        fontSize: 26,
        fontWeight: '800',
    },
    overviewStatUnit: {
        fontSize: 12,
        marginLeft: 6,
        marginBottom: 4,
    },
    statNumberRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'nowrap',
    },
    statNumber: {
        fontSize: 26,
        fontWeight: '800',
        color: '#22C55E',
        flexShrink: 0,
    },
    statUnit: {
        fontSize: 12,
        marginLeft: 6,
        marginBottom: 4,
        color: '#22C55E',
    },
    actionsContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        marginHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#212121',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(21, 101, 192, 0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(21, 101, 192, 0.15)',
    },
    viewAllText: {
        color: '#1565C0',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 2,
    },
    viewAllIcon: {
        marginLeft: 0,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        backgroundColor: 'transparent',
        borderRadius: 12,
        marginBottom: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    menuTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 0,
        marginBottom: 2,
        color: '#1F2937',
    },
    menuDescription: {
        fontSize: 11,
        color: '#6B7280',
        lineHeight: 14,
    },
    activityContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        marginHorizontal: 16,
    },
    timeline: {
        paddingLeft: 8,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
        position: 'relative',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 12,
        marginTop: 4,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    timelineConnector: {
        position: 'absolute',
        left: 11,
        top: 28,
        bottom: -12,
        width: 2,
        backgroundColor: '#E0E0E0',
        zIndex: 1,
    },
    timelineContent: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 8,
        elevation: 1,
        marginHorizontal: 0,
    },
    timelineTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#212121',
        marginBottom: 2,
    },
    timelineDescription: {
        fontSize: 13,
        color: '#616161',
        marginBottom: 6,
    },
    timelineFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineTime: {
        fontSize: 11,
        color: '#9E9E9E',
        marginLeft: 4,
    },
    thoughtCardContainer: {
        marginBottom: 16,
        height: 180, // Fixed height for consistent flipping
        perspective: 1000, // Needed for 3D effect
    },
    thoughtCard: {
        flex: 1,
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backfaceVisibility: 'hidden',
    },
    thoughtGradient: {
        flex: 1,
        borderRadius: 16,
        padding: 18,
        justifyContent: 'space-between',
    },
    tapHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 6,
    },
    thoughtHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginLeft: 8,
    },
    thoughtContent: {
        flex: 1,
        justifyContent: 'center',
    },
    thoughtText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.98)',
    marginBottom: 12,
    lineHeight: 26,
    textAlign: 'center',
    },
    thoughtAuthor: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'right',
        fontWeight: '500',
    },
    thoughtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    thoughtFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    // tapHint kept above with marginLeft for consistent spacing
    quoteDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
    },
    quoteDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    activeQuoteDot: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        width: 16,
        height: 6,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        zIndex: 999,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            }
        })
    },
    bottomNavItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 6,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    activeIconWrapper: {
        backgroundColor: '#E8EAF6',
        shadowColor: '#4051B5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    bottomNavText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#757575',
        marginTop: 0,
    },
    bottomNavActive: {
        color: '#4051B5',
        fontWeight: '600',
    },
    profileIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4051B5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#4051B5',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    profileIconImage: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    profileInitial: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    profileMenu: {
        position: 'absolute',
        bottom: 70, // Above bottom nav
        right: 10,
        width: 240,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 1001,
        overflow: 'hidden',
    },
    profileMenuHeader: {
        padding: 20,
        paddingVertical: 24,
        backgroundColor: '#4051B5',
        borderBottomWidth: 0,
        alignItems: 'center',
    },
    profileMenuGreeting: {
        fontSize: 20,
        fontWeight: '600',
        color: 'white',
        marginBottom: 10,
        textAlign: 'center',
    },
    employeeChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignSelf: 'center',
        paddingVertical: 6,
        paddingHorizontal: 24,
        borderRadius: 24,
        marginTop: 4,
    },
    employeeChipText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    profileMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingVertical: 16,
    },
    profileMenuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileMenuItemText: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
    },
    
});

export default HomeScreen;