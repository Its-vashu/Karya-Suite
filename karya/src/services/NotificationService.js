/**
 * Smart Notification Service
 * Handles real appreciation notifications with badges and system notifications
 */

import { dataAPI } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.subscribers = [];
    this.notifications = [];
    this.unreadCount = 0;
    this.lastFetch = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    this.DISMISSED_KEY = 'dismissed_notifications_v1';
    this.dismissedSet = new Set();
    // Auto-refresh settings (polling) to keep notifications reasonably fresh
    this.autoRefreshIntervalMs = 60 * 1000; // default: 60s
    this._autoRefreshHandle = null;
    this.NOTIFICATIONS_KEY = 'notifications_v1';
    this.RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // keep max 7 days
  }

  // Persist notifications array to AsyncStorage (prunes by retention)
  async saveNotificationsToStorage() {
    try {
      const now = Date.now();
      const pruned = (this.notifications || []).filter(n => {
        if (!n) return false;
        // keep if no timestamp or if within retention
        if (!n.timestamp) return true;
        return (now - n.timestamp) <= this.RETENTION_MS;
      });

      await AsyncStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(pruned));
    } catch (err) {
      console.warn('Failed to save notifications to storage:', err?.message || err);
    }
  }

  // Load previously persisted notifications from storage
  async loadNotificationsFromStorage() {
    try {
      const raw = await AsyncStorage.getItem(this.NOTIFICATIONS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
      return [];
    } catch (err) {
      console.warn('Failed to load notifications from storage:', err?.message || err);
      return [];
    }
  }

  // Start periodic refresh
  startAutoRefresh(intervalMs = this.autoRefreshIntervalMs) {
    try {
      this.stopAutoRefresh();
      this._autoRefreshHandle = setInterval(() => {
        // Fire and forget
        this.loadNotifications().catch(() => {});
      }, intervalMs);
    } catch (err) {
      console.warn('Failed to start auto refresh:', err?.message || err);
    }
  }

  stopAutoRefresh() {
    if (this._autoRefreshHandle) {
      clearInterval(this._autoRefreshHandle);
      this._autoRefreshHandle = null;
    }
  }

  // Subscribe to notification updates
  subscribe(callback) {
    this.subscribers.push(callback);
    // Immediately send current notifications
    if (this.notifications.length > 0) {
      try { callback(this.notifications, this.unreadCount); } catch (e) { /* ignore */ }
    }
  }

  // Unsubscribe from notifications
  unsubscribe(callback) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback);
  }

  // Notify all subscribers
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.notifications, this.unreadCount);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  // Load dismissed ids from AsyncStorage
  async loadDismissedSet() {
    try {
      const raw = await AsyncStorage.getItem(this.DISMISSED_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        this.dismissedSet = new Set(arr);
      }
    } catch (err) {
      console.warn('Failed to load dismissed notifications:', err?.message || err);
    }
  }

  // Persist dismissed ids
  async saveDismissedSet() {
    try {
      const arr = Array.from(this.dismissedSet);
      await AsyncStorage.setItem(this.DISMISSED_KEY, JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to save dismissed notifications:', err?.message || err);
    }
  }

  // Get badge color based on level
  getBadgeInfo(badgeLevel) {
    const level = (badgeLevel || 'bronze').toLowerCase();
    switch (level) {
      case 'gold':
        return { color: '#FFD700', icon: 'trophy', textColor: '#B8860B' };
      case 'silver':
        return { color: '#C0C0C0', icon: 'medal', textColor: '#708090' };
      case 'bronze':
        return { color: '#CD7F32', icon: 'military-tech', textColor: '#8B4513' };
      default:
        return { color: '#9E9E9E', icon: 'star', textColor: '#616161' };
    }
  }

  // Convert a flexible source into a Date object.
  // Accepts ISO strings, timestamps, or month+year pairs (e.g. { month, year })
  safeParseDate(source) {
    try {
      if (!source) return null;
      // If already a Date
      if (source instanceof Date && !isNaN(source)) return source;

      // If an object with month/year
      if (typeof source === 'object') {
        const { month, year, created_at } = source;
        if (created_at) {
          const d = new Date(created_at);
          if (!isNaN(d)) return d;
        }
        if (month && year) {
          // Build a parsable date, use first of month
          const candidate = new Date(`${month} 1, ${year}`);
          if (!isNaN(candidate)) return candidate;
        }
      }

      // If numeric timestamp
      if (typeof source === 'number') {
        const d = new Date(source);
        if (!isNaN(d)) return d;
      }

      // If string: try ISO first
      if (typeof source === 'string') {
        // common: created_at ISO, or month name only
        const dIso = new Date(source);
        if (!isNaN(dIso)) return dIso;

        // If string like "September" or "Sep", without year - can't parse reliably
        return null;
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // Format time ago from a Date object or anything parseable by safeParseDate
  formatTimeAgo(dateSource) {
    try {
      const date = this.safeParseDate(dateSource);
      if (!date) return 'Recently';
      const now = Date.now();
      const diffInMs = now - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;

      // For older, prefer a short localized format
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  }

  // Fetch appreciation notifications
  async fetchAppreciationNotifications() {
    try {
      console.log('📱 Fetching appreciation notifications...');
      const appreciations = await dataAPI.fetchDashboardAppreciations(10);

      if (!appreciations || appreciations.length === 0) {
        return [];
      }

      // Convert appreciations to notification format
      const appreciationNotifications = appreciations.map(item => {
        const badgeInfo = this.getBadgeInfo(item.badge_level);
        // Build a reliable date for the appreciation. Prefer original raw.created_at if available.
        const createdAt = (item.raw && (item.raw.created_at || item.raw.createdAt)) || item.created_at || null;
        const dateSource = createdAt ? createdAt : (item.month && item.year ? { month: item.month, year: item.year } : null);
        const parsed = this.safeParseDate(dateSource);

        let timestamp = null;
        let timeLabel = '';

        if (parsed) {
          timestamp = parsed.getTime();
          timeLabel = this.formatTimeAgo(parsed);
        } else if (item.month && item.year) {
          // Use month/year as a readable label when no full date exists
          timeLabel = `${item.month} ${item.year}`;
        } else {
          // No reliable date information — keep a neutral label
          timeLabel = 'Recently';
        }

        return {
          id: `appreciation_${item.id}`,
          type: 'appreciation',
          title: `🏆 ${item.award_type} Award`,
          message: `${item.employee_username} received ${item.badge_level?.toUpperCase()} badge for ${item.award_type}`,
          subMessage: item.appreciation_message || '',
          time: timeLabel,
          timestamp: timestamp,
          // Prefer backend-provided read flag when available
          isRead: (item.is_read === true) || (item.read === true) || false,
          priority: 'high',
          badge: {
            level: item.badge_level,
            color: badgeInfo.color,
            icon: badgeInfo.icon,
            textColor: badgeInfo.textColor
          },
          data: item,
          // prefer real avatar url when available, fallback to initial
          avatar: item.employee_profile_picture || item.avatar_url || (item.employee_username?.charAt(0).toUpperCase() || '👤')
        };
      });

      return appreciationNotifications;
    } catch (error) {
      console.error('Error fetching appreciation notifications:', error);
      return [];
    }
  }

  // Fetch system notifications (timesheet / policy / leave)
  async fetchSystemNotifications() {
    try {
      const notifications = [];

      // Try to resolve current user id from AsyncStorage
      let userId = null;
      try {
        const userRaw = await AsyncStorage.getItem('userData');
        if (userRaw) {
          const userObj = JSON.parse(userRaw);
          userId = userObj?.id || userObj?.user_id || null;
        }
      } catch (e) {
        // ignore
      }

      // 1) Timesheet reminders for current user (if available)
      if (userId) {
        try {
          const timesheets = await dataAPI.get(`/timesheets/?user_id=${userId}`);
          if (Array.isArray(timesheets) && timesheets.length) {
            // If there are recent unsubmitted periods, create a reminder
            const recent = timesheets.slice(0, 3);
            recent.forEach((ts, idx) => {
              const title = '📝 Timesheet Reminder';
              const message = ts.note || `Please submit timesheet for ${ts.week_ending || ts.period || ts.date || 'recent period'}`;
              const parsed = this.safeParseDate(ts.created_at || ts.date || ts.week_ending);

              let tsTimestamp = null;
              let tsLabel = '';
              if (parsed) {
                tsTimestamp = parsed.getTime();
                tsLabel = this.formatTimeAgo(parsed);
              } else if (ts.week_ending) {
                tsLabel = ts.week_ending;
              } else {
                tsLabel = 'Recently';
              }

              notifications.push({
                id: `timesheet_${ts.id || idx}`,
                type: 'timesheet',
                title,
                message,
                time: tsLabel,
                timestamp: tsTimestamp,
                isRead: false,
                priority: 'medium',
                icon: 'event-note',
                iconColor: '#1976D2',
                data: ts
              });
            });
          }
        } catch (e) {
          // ignore timesheet errors - continue with other system notifs
          console.warn('Timesheet notifications fetch failed:', e?.message || e);
        }
      }

      // 2) Recent policy updates
      try {
        const policies = await dataAPI.get('/policies');
        if (Array.isArray(policies)) {
          // pick latest 2 policies
          policies.slice(0, 2).forEach((p, i) => {
            const parsed = this.safeParseDate(p.effective_date);
            let pTimestamp = null;
            let pLabel = '';
            if (parsed) {
              pTimestamp = parsed.getTime();
              pLabel = this.formatTimeAgo(parsed);
            } else if (p.effective_date) {
              pLabel = p.effective_date;
            } else {
              pLabel = 'Recently';
            }

            notifications.push({
              id: `policy_${p.id || i}`,
              type: 'policy',
              title: '📋 Policy Update',
              message: p.name || p.title || (p.description || 'Policy updated'),
              time: pLabel,
              timestamp: pTimestamp,
              isRead: false,
              priority: 'low',
              icon: 'description',
              iconColor: '#388E3C',
              data: p
            });
          });
        }
      } catch (e) {
        // fallback to light mock if no policy endpoint
      }

      // 3) Leave application updates for current user
      if (userId) {
        try {
          const leaves = await dataAPI.get(`/leave-applications/?user_id=${userId}`);
          if (Array.isArray(leaves) && leaves.length) {
            leaves.slice(0, 3).forEach((l, i) => {
              const parsed = this.safeParseDate(l.updated_at || l.created_at || l.date);
              const title = l.status && l.status.toLowerCase() === 'approved' ? '✅ Leave Approved' : (l.status && l.status.toLowerCase() === 'rejected' ? '⚠️ Leave Update' : '🕒 Leave Application');

              let lTimestamp = null;
              let lLabel = '';
              if (parsed) {
                lTimestamp = parsed.getTime();
                lLabel = this.formatTimeAgo(parsed);
              } else if (l.updated_at || l.created_at || l.date) {
                lLabel = (l.updated_at || l.created_at || l.date);
              } else {
                lLabel = 'Recently';
              }

              notifications.push({
                id: `leave_${l.id || i}`,
                type: 'leave',
                title,
                message: l.reason || `Leave ${l.status || 'updated'}`,
                time: lLabel,
                timestamp: lTimestamp,
                isRead: false,
                priority: 'medium',
                icon: 'beach-access',
                iconColor: '#FB8C00',
                data: l
              });
            });
          }
        } catch (e) {
          console.warn('Leave notifications fetch failed:', e?.message || e);
        }
      }

      // If we found no real system notifications, keep empty rather than injecting mock data
      return notifications;
    } catch (error) {
      console.error('Error fetching system notifications:', error);
      return [];
    }
  }

  // Load all notifications (merge persisted + fresh, dedupe, prune, sort)
  async loadNotifications() {
    try {
      // Ensure dismissed set is loaded before loading
      await this.loadDismissedSet();

      // Check cache first
      const now = Date.now();
      if (this.lastFetch && (now - this.lastFetch) < this.CACHE_DURATION) {
        // Use cached
        return this.notifications;
      }

      console.log('📱 Loading fresh notifications...');

      // Load persisted notifications first (client-only store)
      const persisted = await this.loadNotificationsFromStorage();

      // Fetch both types in parallel
      const [appreciationNotifs, systemNotifs] = await Promise.all([
        this.fetchAppreciationNotifications(),
        this.fetchSystemNotifications()
      ]);

      // Combine persisted + freshly fetched
      const allNotifications = [...(persisted || []), ...(appreciationNotifs || []), ...(systemNotifs || [])];

      // Deduplicate by id (prefer last occurrence which should be freshest)
      const uniqueMap = new Map();
      for (const n of allNotifications) {
        if (!n || !n.id) continue;
        uniqueMap.set(n.id, n);
      }
      let uniqueNotifications = Array.from(uniqueMap.values());

      // Filter out dismissed notifications and prune by retention
      uniqueNotifications = uniqueNotifications.filter(n => {
        if (!n || !n.id) return false;
        if (this.dismissedSet.has(n.id)) return false;
        if (n.timestamp && (now - n.timestamp) > this.RETENTION_MS) return false;
        return true;
      });

      // Sort by priority and recency
      uniqueNotifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        if (priorityDiff !== 0) return priorityDiff;
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      this.notifications = uniqueNotifications;
      this.unreadCount = uniqueNotifications.filter(n => !n.isRead).length;
      this.lastFetch = now;

      console.log(`📱 Loaded ${uniqueNotifications.length} notifications (${this.unreadCount} unread)`);

      // Persist the resulting list
      await this.saveNotificationsToStorage();

      // Notify subscribers
      this.notifySubscribers();

      // Start auto-refreshing notifications in the background (non-blocking)
      try { this.startAutoRefresh(); } catch (e) { /* ignore */ }

      return this.notifications;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return this.notifications; // Return cached if available
    }
  }

  // Mark notification as read
  // Mark a single notification as read and remove it from active list
  async markAsRead(notificationId) {
    // Add to dismissed set and persist
    try {
      this.dismissedSet.add(notificationId);
      await this.saveDismissedSet();
    } catch (e) {
      console.warn('Error persisting dismissed id', e);
    }

    const beforeCount = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    const afterCount = this.notifications.length;
    // Recalculate unread count
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    if (beforeCount !== afterCount) {
      this.notifySubscribers();
      await this.saveNotificationsToStorage();
    }
  }

  // Mark all as read
  // Clear all notifications (mark all read / remove)
  async markAllAsRead() {
    // First attempt: call backend endpoint to mark all as read (if supported)
    try {
      try {
        await dataAPI.post('/notifications/mark-all-read');
      } catch (e) {
        // try alternative endpoint name
        await dataAPI.post('/notifications/mark_read_all');
      }
    } catch (err) {
      // Backend mark-all-read failed or not supported - fallback to local persistence
      try {
        this.notifications.forEach(n => this.dismissedSet.add(n.id));
        await this.saveDismissedSet();
      } catch (e) {
        console.warn('Failed to persist dismissed on markAllAsRead', e?.message || e);
      }
    } finally {
      // Clear local list and notify subscribers regardless
      this.notifications = [];
      this.unreadCount = 0;
      this.notifySubscribers();
      await this.saveNotificationsToStorage();
    }
  }

  // Clear local dismissal store (useful for testing or if you want to force show all)
  async clearDismissals() {
    try {
      this.dismissedSet = new Set();
      await AsyncStorage.removeItem(this.DISMISSED_KEY);
    } catch (err) {
      console.warn('Failed to clear dismissed notifications:', err?.message || err);
    }
    // Reload notifications after clearing
    await this.refresh();
  }

  // Get unread count
  getUnreadCount() {
    return this.unreadCount;
  }

  // Get notifications
  getNotifications() {
    return this.notifications;
  }

  // Clear cache and refresh
  async refresh() {
    this.lastFetch = null;
    return await this.loadNotifications();
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
