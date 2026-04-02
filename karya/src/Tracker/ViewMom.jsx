import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useAuth } from '../AuthContext';
import { API_BASE_URL_EXPORT } from '../api';
import axios from 'axios';
import ViewDownloadMom from './ViewDownloadMom';

// Use properly configured BASE_URL from api.js (includes forced live URL)
const API_BASE = API_BASE_URL_EXPORT;

// Fetch Information by MOM ID (web app endpoint)
const fetchMomInformation = async (momId, token) => {
  try {
    const url = `${API_BASE}/mom/mom-information/mom/${momId}`;
    console.log(`Fetching MoM information from: ${url}`);
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('MoM information response:', response.data);
    // web returns array or object; normalize to array
    if (Array.isArray(response.data)) return response.data;
    if (response.data?.information) return response.data.information;
    return response.data || [];
  } catch (error) {
    console.error('Error fetching MoM information:', error);
    throw error;
  }
};

// Fetch Decisions by MOM ID (web app endpoint)
const fetchMomDecisions = async (momId, token) => {
  try {
    const url = `${API_BASE}/mom-decision/mom/${momId}`;
    console.log(`Fetching MoM decisions from: ${url}`);
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('MoM decisions response:', response.data);
    if (Array.isArray(response.data)) return response.data;
    if (response.data?.decisions) return response.data.decisions;
    return response.data || [];
  } catch (error) {
    console.error('Error fetching MoM decisions:', error);
    throw error;
  }
};

// Fetch Action Items by MOM ID (web app endpoint)
const fetchMomActionItems = async (momId, token) => {
  try {
    const url = `${API_BASE}/mom/action-items/mom/${momId}`;
    console.log(`Fetching MoM action items from: ${url}`);
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('MoM action items response:', response.data);
    if (Array.isArray(response.data)) return response.data;
    if (response.data?.action_items) return response.data.action_items;
    return response.data || [];
  } catch (error) {
    console.error('Error fetching MoM action items:', error);
    throw error;
  }
};

// Combined function to fetch all details
const fetchAllMomDetails = async (momId, token) => {
  try {
    const [information, decisions, actionItems] = await Promise.all([
      fetchMomInformation(momId, token),
      fetchMomDecisions(momId, token),
      fetchMomActionItems(momId, token)
    ]);
    
    return { information, decisions, actionItems };
  } catch (error) {
    console.error('Error fetching all MoM details:', error);
    throw error;
  }
};

const ViewMom = () => {
  const { user, token } = useAuth();
  const [moms, setMoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMom, setSelectedMom] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMomDetails, setSelectedMomDetails] = useState(null);
  
  useEffect(() => {
    fetchMoms();
  }, []);

  const fetchMoms = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/mom/`;
      console.log('Fetching MoMs from:', url);
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('MoMs response:', response.data);
      // Web app can return { moms: [...] } or array
      if (response.data?.moms) {
        setMoms(Array.isArray(response.data.moms) ? response.data.moms : []);
      } else if (response.data?.mom) {
        // older response shape
        setMoms(Array.isArray(response.data.mom) ? response.data.mom : []);
      } else if (Array.isArray(response.data)) {
        setMoms(response.data);
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        setMoms(response.data.results);
      } else {
        setMoms([]);
        setError('No meetings available');
      }
    } catch (error) {
      console.error('Error fetching MoMs:', error);
      setError(`Error: ${error.response?.data?.detail || error.message || 'Failed to fetch MoMs'}`);
      Alert.alert('Error', 'Failed to fetch Minutes of Meetings');
      // leave moms as-is (could be empty)
    } finally {
      setLoading(false);
    }
  };

  const fetchMomDetails = async (momId) => {
    if (!momId) return;
    
    setSelectedMom(momId);
    setShowDetails(true);
    setSelectedMomDetails(null);
    
    try {
      console.log(`Fetching details for MoM ID: ${momId}`);

      // 1) fetch basic MoM record (title, date, start_time, end_time, attendees, project, venue, etc.)
      let basic = {};
      try {
        const basicResp = await axios.get(`${API_BASE}/mom/${momId}`, { headers: { Authorization: `Bearer ${token}` } });
        basic = basicResp.data || {};
        console.log('Basic MoM data:', basic);
      } catch (e) {
        console.warn('Failed to fetch basic MoM data, continuing with other details', e?.response?.data || e.message || e);
      }

      // 2) fetch information, decisions and action items in parallel
      const result = await fetchAllMomDetails(momId, token);
      const information = result?.information || [];
      const decisionsRaw = result?.decisions || [];
      const actionItemsRaw = result?.actionItems || result?.action_items || [];

      // 3) normalize decisions: web may return {decision: 'text'} or {decision_text: 'text'}
      const decisions = Array.isArray(decisionsRaw) ? decisionsRaw.map(d => ({
        id: d.id,
        decision_text: d.decision_text || d.decision || d.text || d
      })) : [];

      // 4) normalize action items: web may use 'action_item', 'action_text', and remark can be array/objects
      const actionItems = Array.isArray(actionItemsRaw) ? actionItemsRaw.map(ai => {
        // normalize remark into strings array
        let remark = ai.remark;
        if (typeof remark === 'string') {
          try { remark = JSON.parse(remark); } catch (e) { /* leave as-is */ }
        }
        if (!Array.isArray(remark)) remark = remark ? [remark] : [];
        // flatten objects inside remark to readable strings if needed
        const remarkStrings = remark.map(r => {
          if (!r) return '';
          if (typeof r === 'string') return r;
          // object: pick common fields
          if (typeof r === 'object') return Object.values(r).join(' - ');
          return String(r);
        }).filter(Boolean);

        return {
          id: ai.id,
          action_text: ai.action_text || ai.action_item || ai.text,
          assigned_to: ai.assigned_to || ai.assigned || ai.assignee,
          due_date: ai.due_date || ai.due || ai.dueDate,
          status: ai.status,
          remark: remarkStrings,
          raw: ai
        };
      }) : [];

      const combined = { basic, information, decisions, actionItems };
      console.log('Combined MoM details:', combined);
      setSelectedMomDetails(combined);
    } catch (error) {
      console.error('Error fetching MoM details:', error);
      console.error('Error details:', error.response?.data || 'No response data');
      Alert.alert('Error', 'Failed to fetch MoM details');
      setShowDetails(false);
      // don't set mock data here; prefer to let UI show an error
    }
  };

  // Helper function to parse comma-separated strings or arrays
  const parseAttendees = (attendeeData) => {
    if (!attendeeData) return [];
    
    if (Array.isArray(attendeeData)) {
      return attendeeData;
    }
    
    if (typeof attendeeData === 'string') {
      return attendeeData.split(',').filter(Boolean).map(item => item.trim());
    }
    
    return [];
  };

  // Render a single MoM card
  const renderMomItem = ({ item }) => {
    const momId = item.id || item.mom_id || item.momId || '';
    const date = item.meeting_date || item.date || item.meetingDate || '';
    const start = item.start_time || item.start || '';
    const end = item.end_time || item.end || '';
    const project = item.project || item.project_name || item.projectName || '';
    const meetingType = (item.meeting_type || item.meetingType || item.type || 'Online');

    return (
      <TouchableOpacity
        style={styles.cardTouchable}
        activeOpacity={0.85}
        onPress={() => fetchMomDetails(item.id || item.mom_id || item.momId)}
      >
        <View style={styles.cardRowTop}>
          <View>
            <Text style={styles.cardLabel}>MOM ID</Text>
            <Text style={styles.cardId}>#{momId}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>DATE</Text>
            <Text style={styles.cardDate}>{date}</Text>
          </View>
        </View>

        <View style={styles.cardRowMiddle}>
          <View>
            <Text style={styles.cardLabel}>TIME</Text>
            <Text style={styles.cardTime}>{start}{start && end ? '  ·  ' : ''}{end}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardLabel}>TYPE</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{meetingType}</Text></View>
          </View>
        </View>

        <View style={styles.cardRowBottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>PROJECT</Text>
            <Text style={styles.cardProject} numberOfLines={1}>{project}</Text>
          </View>
          <TouchableOpacity style={styles.viewSmallButton} onPress={() => fetchMomDetails(item.id || item.mom_id || item.momId)}>
            <Text style={styles.viewSmallButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render ViewDownloadMom component instead of custom modal
  const renderMomDetails = () => {
    if (!showDetails) return null;
    
    // If there's no data yet, show loading
    if (!selectedMomDetails) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0ea5a4" />
          <Text style={styles.loadingText}>Loading meeting details...</Text>
        </View>
      );
    }
    
    // Format the data in a way that ViewDownloadMom can understand
    const basic = selectedMomDetails.basic || {};
    const info0 = (selectedMomDetails.information && selectedMomDetails.information[0]) || {};

    const meetingDate = basic.meeting_date || basic.meeting_date || basic.date || info0.meeting_date || info0.date || undefined;
    const formattedDetails = {
      id: selectedMom || basic.id || info0.id,
      meeting_date: meetingDate,
      date: meetingDate,
      title: basic.title || info0.title || '',
      start_time: basic.start_time || info0.start_time || '',
      end_time: basic.end_time || info0.end_time || '',
      project: basic.project || basic.project_name || info0.project_name || info0.project || '',
      project_name: basic.project || basic.project_name || info0.project_name || info0.project || '',
      location: basic.location || basic.location_link || basic.venue || info0.venue || '',
      venue: basic.venue || basic.location || basic.location_link || info0.venue || '',
      attendees: basic.attendees || info0.attendees || basic.outer_attendees || [],
      absent: basic.absent || info0.absent || basic.absentees || [],
      absentees: basic.absent || info0.absent || basic.absentees || [],
      information: selectedMomDetails.information || (info0.information ? [info0.information] : []),
      decisions: selectedMomDetails.decisions || [],
      action_items: selectedMomDetails.actionItems || selectedMomDetails.action_items || []
    };
    
    return (
      <ViewDownloadMom 
        details={formattedDetails} 
        onClose={() => setShowDetails(false)}
      />
    );
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    const statusLower = String(status || '').toLowerCase();
    if (statusLower === 'completed') return '#16a34a';
    if (statusLower === 'in progress') return '#0ea5e9';
    if (statusLower === 'pending') return '#f59e0b';
    if (statusLower === 'overdue') return '#ef4444';
    if (statusLower === 'cancelled') return '#ef4444';
    return '#64748b'; // default color
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0ea5a4" />
        <Text style={styles.loadingText}>Loading Minutes of Meetings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMoms}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (moms.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No Minutes of Meetings found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMoms}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showDetails ? (
        renderMomDetails()
      ) : (
        <FlatList
          data={moms}
          renderItem={renderMomItem}
          keyExtractor={(item) => `mom-${item.id || item.mom_id}`}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#0ea5a4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  momCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6eef1',
  },
  momTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f1724',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e6f2fb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#d1e9f6',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  headerCell: {
    color: '#0f1724',
    fontWeight: '700',
  },
  colId: { flex: 1 },
  colDate: { flex: 1.4 },
  colTime: { flex: 1.6 },
  colProject: { flex: 2.6 },
  colMeetingType: { flex: 1.6 },
  colActions: { flex: 1.6, textAlign: 'right' },
  momMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  momMetaText: {
    color: '#64748b',
    fontSize: 14,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e6eef1',
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f1724',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#0f1724',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f1724',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6eef1',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    fontWeight: '600',
    color: '#64748b',
  },
  infoValue: {
    flex: 1,
    color: '#0f1724',
  },
  attendeesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  attendeeChip: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  attendeeChipText: {
    color: '#0369a1',
    fontSize: 14,
  },
  absenteeChip: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  absenteeChipText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e6eef1',
  },
  listItemNumber: {
    width: 24,
    fontWeight: 'bold',
    color: '#0ea5a4',
  },
  listItemText: {
    flex: 1,
    color: '#334155',
  },
  actionItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e6eef1',
  },
  actionItemTitle: {
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  actionItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  viewButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  /* Mobile card styles */
  cardTouchable: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e6eef1',
    elevation: 2,
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardId: {
    color: '#0f1724',
    fontWeight: '700',
  },
  cardDate: {
    color: '#64748b',
  },
  cardRowMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTime: {
    color: '#475569',
  },
  badge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 12,
  },
  cardRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardProject: {
    color: '#0f1724',
    flex: 1,
    marginRight: 8,
  },
  viewSmallButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewSmallButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  actionItemMetaText: {
    color: '#64748b',
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ViewMom;
// legacy file left intentionally empty to avoid case-sensitivity issues on some systems
