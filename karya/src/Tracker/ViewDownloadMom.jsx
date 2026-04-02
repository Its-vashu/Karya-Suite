import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert
} from 'react-native';
import { format } from 'date-fns';

const ViewDownloadMom = ({ details, onClose }) => {
  if (!details) return null;
  
  console.log('Details received in ViewDownloadMom:', details);

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

  // Get status color based on status
  const getStatusColor = (status) => {
    const statusLower = String(status || '').toLowerCase();
    if (statusLower === 'completed') return '#16a34a';
    if (statusLower === 'in progress') return '#0ea5e9';
    if (statusLower === 'pending') return '#f59e0b';
    if (statusLower === 'overdue') return '#ef4444';
    return '#64748b'; // default color
  };

  // Share MoM as text
  const handleShare = async () => {
    try {
      // Format meeting details as text
      const attendees = parseAttendees(details.attendees).join(', ');
      const absentees = parseAttendees(details.absent || details.absentees).join(', ');
      
      let momText = `
📋 MINUTES OF MEETING #${details.id}

📅 Date: ${format(new Date(details.meeting_date || details.date), 'yyyy-MM-dd')}
⏰ Time: ${details.start_time} - ${details.end_time}
🎯 Project: ${details.project || details.project_name}
📍 Location: ${details.location || details.venue || 'Not specified'}

👥 ATTENDEES: ${attendees || 'None listed'}
❌ ABSENT: ${absentees || 'None listed'}

ℹ️ INFORMATION:
${Array.isArray(details.information) 
  ? details.information.map((info, i) => `${i+1}. ${info.information || info}`).join('\\n') 
  : details.information || 'No information items.'}

✅ DECISIONS:
${Array.isArray(details.decisions) 
  ? details.decisions.map((dec, i) => `${i+1}. ${dec.decision_text || dec}`).join('\\n') 
  : details.decisions || 'No decisions recorded.'}

🎯 ACTION ITEMS:
${(details.actionItems || details.action_items || []).map((item, i) => 
  `${i+1}. ${item.action_text || item.text}\n   Due: ${item.due_date}\n   Assigned to: ${item.assigned_to}`
).join('\\n\\n') || 'No action items recorded.'}

Generated on: ${new Date().toLocaleDateString()}
      `;
      
      await Share.share({
        message: momText,
        title: `MoM #${details.id} - ${details.title}`
      });
    } catch (error) {
      console.error('Error sharing MoM:', error);
      Alert.alert('Share Failed', 'Could not share the meeting details.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MoM #{details.id}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        {/* General Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 General Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {format(new Date(details.meeting_date || details.date), 'yyyy-MM-dd')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Time:</Text>
              <Text style={styles.infoValue}>{details.start_time} - {details.end_time}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Project:</Text>
              <Text style={styles.infoValue}>{details.project || details.project_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{details.location || details.venue || 'Not specified'}</Text>
            </View>
          </View>
        </View>

        {/* Attendees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Attendees</Text>
          <View style={styles.attendeeSection}>
            <Text style={styles.attendeeHeader}>✅ Present</Text>
            <View style={styles.attendeeList}>
              {parseAttendees(details.attendees).length > 0 ? 
                parseAttendees(details.attendees).map((attendee, index) => (
                  <View key={`attendee-${index}`} style={styles.attendeeItem}>
                    <View style={[styles.attendeeDot, {backgroundColor: '#16a34a'}]} />
                    <Text style={styles.attendeeName}>{attendee}</Text>
                  </View>
                )) : 
                <Text style={styles.emptyText}>No attendees listed</Text>
              }
            </View>
          </View>
          
          <View style={styles.attendeeSection}>
            <Text style={styles.attendeeHeader}>❌ Absent</Text>
            <View style={styles.attendeeList}>
              {parseAttendees(details.absent || details.absentees).length > 0 ? 
                parseAttendees(details.absent || details.absentees).map((absentee, index) => (
                  <View key={`absent-${index}`} style={styles.attendeeItem}>
                    <View style={[styles.attendeeDot, {backgroundColor: '#ef4444'}]} />
                    <Text style={styles.attendeeName}>{absentee}</Text>
                  </View>
                )) : 
                <Text style={styles.emptyText}>No absentees listed</Text>
              }
            </View>
          </View>
        </View>

        {/* Information Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Information</Text>
          {details.information && Array.isArray(details.information) && details.information.length > 0 ? (
            details.information.map((info, index) => (
              <View key={`info-${index}`} style={styles.infoItem}>
                <Text style={styles.infoNumber}>{index + 1}.</Text>
                <Text style={styles.infoText}>{info.information || info}</Text>
              </View>
            ))
          ) : details.information ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoText}>{details.information}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No information points recorded</Text>
          )}
        </View>

        {/* Decisions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Decisions</Text>
          {details.decisions && Array.isArray(details.decisions) && details.decisions.length > 0 ? (
            details.decisions.map((decision, index) => (
              <View key={`decision-${index}`} style={styles.decisionItem}>
                <Text style={styles.decisionNumber}>{index + 1}.</Text>
                <Text style={styles.decisionText}>{decision.decision_text || decision}</Text>
              </View>
            ))
          ) : details.decisions ? (
            <View style={styles.decisionItem}>
              <Text style={styles.decisionText}>{details.decisions}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No decisions recorded</Text>
          )}
        </View>

        {/* Action Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Action Items</Text>
          {(details.actionItems || details.action_items) && 
           (details.actionItems || details.action_items).length > 0 ? (
            (details.actionItems || details.action_items).map((item, index) => (
              <View key={`action-${index}`} style={styles.actionItem}>
                <Text style={styles.actionTitle}>{index + 1}. {item.action_text || item.text}</Text>
                <View style={styles.actionMeta}>
                  <Text style={styles.actionMetaText}>Due: {item.due_date}</Text>
                  <Text style={styles.actionMetaText}>Assigned to: {item.assigned_to}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No action items recorded</Text>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated on: {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f1724',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  shareButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#0f1724',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1724',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
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
  attendeeSection: {
    marginBottom: 12,
  },
  attendeeHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  attendeeList: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  attendeeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  attendeeName: {
    color: '#334155',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#94a3b8',
    padding: 4,
  },
  infoItem: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    flexDirection: 'row',
  },
  infoNumber: {
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    color: '#334155',
  },
  decisionItem: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    flexDirection: 'row',
  },
  decisionNumber: {
    fontWeight: 'bold',
    color: '#16a34a',
    marginRight: 8,
  },
  decisionText: {
    flex: 1,
    color: '#334155',
  },
  actionItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionTitle: {
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  actionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionMetaText: {
    color: '#64748b',
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12,
  }
});

export default ViewDownloadMom;
