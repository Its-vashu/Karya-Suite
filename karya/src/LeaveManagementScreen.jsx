import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Platform,
    ActivityIndicator,
    TextInput,
    Modal,
    FlatList,
    KeyboardAvoidingView
} from 'react-native';
import { findNodeHandle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useTheme } from './theme/ThemeContext';
import { API_BASE_URL_EXPORT as API_BASE_URL } from './api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CalendarModal } from './Calendar';

// --- Constants ---
const TABS = { APPLY: 'apply', HISTORY: 'history' };
const LEAVE_TYPES_CONFIG = {
    casual: { name: 'Casual Leave', icon: 'beach', color: '#2196F3', total: 12 },
    sick: { name: 'Sick Leave', icon: 'hospital-box', color: '#F44336', total: 10 },
    personal: { name: 'Personal Leave', icon: 'account', color: '#9C27B0', total: 5 },
    earned: { name: 'Earned Leave', icon: 'briefcase', color: '#4CAF50', total: 18 },
    maternity: { name: 'Maternity Leave', icon: 'human-pregnant', color: '#FF9800', total: 90 },
};

// --- Helper Functions ---
const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
};

const formatDateForAPI = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ====================================================================
// --- Child Components (Defined in the same file for simplicity) ---
// ====================================================================

const LeaveCard = React.memo(({ leave, onCardPress, onDelete, leaveTypes, getStatusStyles }) => {
    const leaveTypeDetails = leaveTypes.find(lt => lt.id === leave.leave_type?.toLowerCase()) || { name: leave.leave_type, icon: '❓' };
    const statusStyle = getStatusStyles(leave.status, leave.applied_on);

    return (
        <TouchableOpacity style={styles.leaveCard} onPress={() => onCardPress(leave)} activeOpacity={0.8}>
            <View style={styles.leaveCardHeader}>
                <View style={styles.leaveTypeIndicator}>
                    <Text style={styles.leaveTypeIndicatorIcon}>{leaveTypeDetails.icon}</Text>
                    <Text style={styles.leaveTypeIndicatorText}>{leaveTypeDetails.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                    <MaterialIcons name={statusStyle.icon} color={statusStyle.textColor} size={12} />
                    <Text style={[styles.statusText, { color: statusStyle.textColor, marginLeft: 4 }]}>{statusStyle.text}</Text>
                </View>
            </View>
            <View style={styles.leaveCardBody}>
                <Text style={styles.reasonText} numberOfLines={2}>{leave.reason || 'No reason provided.'}</Text>
                <View style={styles.footer}>
                    <Text style={styles.dateInfo}>
                        {formatDisplayDate(leave.start_date)} - {formatDisplayDate(leave.end_date)} ({leave.days} days)
                    </Text>
                    {leave.status?.toLowerCase() === 'pending' && !statusStyle.isExpired && (
                        <TouchableOpacity 
                            style={styles.deleteButton} 
                            onPress={(e) => { e.stopPropagation(); onDelete(leave); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="delete-outline" size={22} color="#b91c1c" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const LeaveHistoryList = React.memo(({ history, loading, onCardPress, onDelete, leaveTypes, getStatusStyles }) => {
    if (loading && !history.length) {
        return <ActivityIndicator color="#0a2850" size="large" style={styles.loader} />;
    }

    if (!history.length) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Leave History</Text>
                <Text style={styles.emptyStateText}>Your applied leaves will appear here.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={history}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <LeaveCard 
                    leave={item} 
                    onCardPress={onCardPress}
                    onDelete={onDelete}
                    leaveTypes={leaveTypes}
                    getStatusStyles={getStatusStyles}
                />
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
        />
    );
});

const LeaveDetailsModal = React.memo(({ visible, onClose, leave, leaveTypes, getStatusStyles }) => {
    if (!leave) return null;

    const leaveTypeDetails = leaveTypes.find(lt => lt.id === leave.leave_type?.toLowerCase()) || { name: leave.leave_type };
    const statusStyle = getStatusStyles(leave.status, leave.applied_on);

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity style={styles.modalContainer} activeOpacity={1}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Leave Details</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <MaterialIcons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalBody}>
                        <DetailRow label="Leave Type" value={leaveTypeDetails.name} />
                        <DetailRow label="Duration" value={`${formatDisplayDate(leave.start_date)} to ${formatDisplayDate(leave.end_date)}`} />
                        <DetailRow label="Total Days" value={`${leave.days} days`} />
                        <DetailRow label="Applied On" value={formatDisplayDate(leave.applied_on)} />
                        <View style={[styles.detailRow, { alignItems: 'center' }]}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                                <MaterialIcons name={statusStyle.icon} color={statusStyle.textColor} size={12} />
                                <Text style={[styles.statusText, { color: statusStyle.textColor, marginLeft: 4 }]}>{statusStyle.text}</Text>
                            </View>
                        </View>
                        <View style={styles.reasonContainer}>
                            <Text style={styles.detailLabel}>Reason</Text>
                            <Text style={styles.reasonTextModal}>{leave.reason}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
});

const DetailRow = ({ label, value }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

const ApplyLeaveForm = ({ onApply, leaveBalance, leaveTypes, keyboardOffset = 0 }) => {
    const [leaveApplication, setLeaveApplication] = useState({ leave_type: '', start_date: null, end_date: null, reason: '' });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);
    const reasonRef = useRef(null);

    const handleInputChange = (name, value) => {
        setLeaveApplication(prev => ({ ...prev, [name]: value }));
    };

    const requestedDays = useMemo(() => {
        if (!leaveApplication.start_date || !leaveApplication.end_date) return 0;
        return Math.ceil((new Date(leaveApplication.end_date) - new Date(leaveApplication.start_date)) / (1000 * 60 * 60 * 24)) + 1;
    }, [leaveApplication.start_date, leaveApplication.end_date]);
    
    const handleSubmit = async () => {
        setLoading(true);
        await onApply(leaveApplication);
        setLoading(false);
        setLeaveApplication({ leave_type: '', start_date: null, end_date: null, reason: '' });
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}} keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : 80}>
            <KeyboardAwareScrollView ref={scrollRef} enableOnAndroid={true} extraScrollHeight={Platform.OS === 'ios' ? 20 : 100} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom: 24}}>
                <View style={styles.formCard}>
                <Text style={styles.formTitle}>Apply for Leave</Text>
                <Text style={styles.fieldLabel}>Leave Type *</Text>
                {leaveTypes.map((type) => (
                    <TouchableOpacity key={type.id} style={[styles.leaveTypeButton, leaveApplication.leave_type === type.id && { backgroundColor: `${type.color}30`, borderColor: type.color }]} onPress={() => handleInputChange('leave_type', type.id)}>
                        <Icon name={type.icon} size={20} color={type.color} style={styles.leaveTypeIcon} />
                        <Text style={[styles.leaveTypeName, leaveApplication.leave_type === type.id && { color: type.color, fontWeight: '600' }]}>{type.name}</Text>
                        <View style={styles.leaveBalanceChip}><Text style={styles.leaveBalanceText}>{leaveBalance[type.id] || 0}</Text></View>
                    </TouchableOpacity>
                ))}

                <View style={styles.rowFields}>
                    <View style={{flex: 1, marginRight: 8}}>
                        <Text style={styles.fieldLabel}>From Date *</Text>
                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartDatePicker(true)}>
                            <MaterialIcons name="calendar-today" size={18} color="#4A5568" />
                            <Text style={[styles.datePickerText, !leaveApplication.start_date && styles.datePickerPlaceholder]}>
                                {leaveApplication.start_date ? formatDisplayDate(formatDateForAPI(leaveApplication.start_date)) : "Select Date"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{flex: 1, marginLeft: 8}}>
                        <Text style={styles.fieldLabel}>To Date *</Text>
                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowEndDatePicker(true)}>
                            <MaterialIcons name="calendar-today" size={18} color="#4A5568" />
                            <Text style={[styles.datePickerText, !leaveApplication.end_date && styles.datePickerPlaceholder]}>
                                {leaveApplication.end_date ? formatDisplayDate(formatDateForAPI(leaveApplication.end_date)) : "Select Date"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {requestedDays > 0 && (
                    <View style={styles.daysCalculationContainer}><Text style={styles.daysCalculationText}>Total: <Text style={{fontWeight: 'bold'}}>{requestedDays} days</Text></Text></View>
                )}

                <Text style={styles.fieldLabel}>Reason for Leave *</Text>
                <TextInput
                    ref={reasonRef}
                    style={styles.textArea}
                    placeholder="Enter reason for leave..."
                    value={leaveApplication.reason}
                    onChangeText={(text) => handleInputChange('reason', text)}
                    multiline
                    onFocus={() => {
                        // Scroll the reason input into view when focused
                        if (scrollRef?.current && reasonRef?.current) {
                            try {
                                scrollRef.current.props.scrollToFocusedInput(findNodeHandle(reasonRef.current));
                            } catch (e) {
                                // fallback: call scrollToPosition
                                scrollRef.current.scrollToPosition(0, 200, true);
                            }
                        }
                    }}
                />
                
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit Application</Text>}
                </TouchableOpacity>

                <CalendarModal visible={showStartDatePicker} onClose={() => setShowStartDatePicker(false)} onSelectDate={(date) => { handleInputChange('start_date', date); setShowStartDatePicker(false); }} />
                <CalendarModal visible={showEndDatePicker} onClose={() => setShowEndDatePicker(false)} onSelectDate={(date) => { handleInputChange('end_date', date); setShowEndDatePicker(false); }} minDate={leaveApplication.start_date} />
            </View>
                </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
    );
};


// ====================================================================
// --- Main Screen Component ---
// ====================================================================

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LeaveManagementScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets(); // Get safe area insets

    const [activeTab, setActiveTab] = useState(TABS.APPLY);
    const [loading, setLoading] = useState(true);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState({});
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const leaveTypes = useMemo(() => 
        Object.entries(LEAVE_TYPES_CONFIG).map(([id, config]) => ({ id, ...config })), 
    []);

    // estimate header height (paddingVertical 16 + statusbar/safeInsetTop)
    const headerHeight = 56; // default
    const keyboardOffset = insets.top + headerHeight;

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    };

    const calculateAndUpdateLeaveBalance = useCallback((history) => {
        const balances = {};
        leaveTypes.forEach(type => {
            const used = history
                .filter(leave => leave.leave_type?.toLowerCase() === type.id && leave.status?.toLowerCase() === 'approved')
                .reduce((sum, leave) => sum + leave.days, 0);
            balances[type.id] = type.total - used;
        });
        setLeaveBalance(balances);
    }, [leaveTypes]);

    const fetchLeaveHistory = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/leave-applications/?user_id=${user.id}`, { headers: { 'Authorization': `Bearer ${user.token}` } });
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            if (Array.isArray(data)) {
                const formattedData = data.map(leave => ({...leave, days: calculateDays(leave.start_date, leave.end_date)}));
                // Sort so newest leaves appear first. Prefer applied_on, then start_date, then id as fallbacks.
                const sortedData = formattedData.slice().sort((a, b) => {
                    const aTime = new Date(a.applied_on || a.start_date || 0).getTime();
                    const bTime = new Date(b.applied_on || b.start_date || 0).getTime();
                    if (!isFinite(aTime) && isFinite(bTime)) return 1;
                    if (isFinite(aTime) && !isFinite(bTime)) return -1;
                    if (bTime !== aTime) return bTime - aTime;
                    // fallback to id (newer id higher)
                    return (b.id || 0) - (a.id || 0);
                });
                setLeaveHistory(sortedData);
                calculateAndUpdateLeaveBalance(sortedData);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not fetch leave history.');
        } finally {
            setLoading(false);
        }
    }, [user, calculateAndUpdateLeaveBalance]);

    useEffect(() => {
        fetchLeaveHistory();
    }, [fetchLeaveHistory]);

    const getStatusStyles = useCallback((status, appliedOn) => {
        const s = status?.toLowerCase() || 'pending';
        
        // If it's pending, check if it's older than 48 hours
        if (s === 'pending' && appliedOn) {
            // Convert applied_on string to Date, handling both ISO and simple date formats
            const appliedDate = new Date(appliedOn);
            const today = new Date();
            
            // Reset hours to start of day for both dates to compare full days
            appliedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            
            // Calculate difference in days
            const diffTime = Math.abs(today - appliedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If more than 2 days old
            if (diffDays > 2) {
                return { backgroundColor: '#FFF1F2', textColor: '#B91C1C', text: 'Not Approved', icon: 'block', isExpired: true };
            }
        }

        switch (s) {
            case 'approved': return { backgroundColor: '#E8F5E9', textColor: '#2E7D32', text: 'Approved', icon: 'check-circle' };
            case 'rejected': return { backgroundColor: '#FFEBEE', textColor: '#C62828', text: 'Rejected', icon: 'cancel' };
            default: return { backgroundColor: '#FFF8E1', textColor: '#F57F17', text: 'Pending', icon: 'hourglass-top' };
        }
    }, []);

    const handleShowDetails = useCallback((leave) => {
        setSelectedLeave(leave);
        setModalVisible(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
        setSelectedLeave(null);
    }, []);

    const handleDelete = useCallback(async (leaveToDelete) => {
        Alert.alert('Delete Application', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                setLeaveHistory(prev => prev.filter(l => l.id !== leaveToDelete.id)); // Optimistic delete
                try {
                    const response = await fetch(`${API_BASE_URL}/leave-applications/${leaveToDelete.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${user.token}` } });
                    if (!response.ok) throw new Error('Failed to delete on server');
                    await fetchLeaveHistory();
                } catch (error) {
                    Alert.alert('Error', 'Could not delete application.');
                    await fetchLeaveHistory(); // Re-sync
                }
            }}
        ]);
    }, [user, fetchLeaveHistory]);

    const handleApply = useCallback(async (applicationData) => {
        const { leave_type, start_date, end_date, reason } = applicationData;
        if (!leave_type || !start_date || !end_date || !reason) {
            Alert.alert('Validation Error', 'Please fill all required fields.');
            return;
        }
        
        const payload = {
            user_id: user.id,
            employee_name: user.username || 'Employee',
            leave_type,
            start_date: formatDateForAPI(start_date),
            end_date: formatDateForAPI(end_date),
            reason,
            status: 'Pending'
        };

        try {
            const response = await fetch(`${API_BASE_URL}/leave-applications/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to submit application');
            Alert.alert('Success', 'Leave application submitted.');
            await fetchLeaveHistory();
            setActiveTab(TABS.HISTORY);
        } catch (error) {
            Alert.alert('Error', 'Could not submit your application.');
        }
    }, [user, fetchLeaveHistory]);

    return (
        <View style={{flex: 1, backgroundColor: theme.colors.primary}}>
            <StatusBar 
                barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} 
                backgroundColor={theme.colors.primary} 
            />
            <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.backButton}
                    >
                        <MaterialIcons name="arrow-back-ios" size={20} color="white" style={{ marginLeft: 8 }}/>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Leave Management</Text>
                    <View style={{ width: 40, opacity: 0 }} />
                </View>
            
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tabButton, activeTab === TABS.APPLY && styles.activeTabButton]} onPress={() => setActiveTab(TABS.APPLY)}>
                        <Text style={[styles.tabButtonText, activeTab === TABS.APPLY && styles.activeTabText]}>Apply Leave</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabButton, activeTab === TABS.HISTORY && styles.activeTabButton]} onPress={() => setActiveTab(TABS.HISTORY)}>
                        <Text style={[styles.tabButtonText, activeTab === TABS.HISTORY && styles.activeTabText]}>Leave History</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {activeTab === TABS.APPLY ? (
                        <ApplyLeaveForm 
                            onApply={handleApply}
                            leaveBalance={leaveBalance}
                            leaveTypes={leaveTypes}
                            keyboardOffset={keyboardOffset}
                        />
                    ) : (
                        <LeaveHistoryList 
                            history={leaveHistory}
                            loading={loading}
                            onCardPress={handleShowDetails}
                            onDelete={handleDelete}
                            leaveTypes={leaveTypes}
                            getStatusStyles={getStatusStyles}
                        />
                    )}
                </View>
                
                <LeaveDetailsModal
                    visible={modalVisible}
                    onClose={handleCloseModal}
                    leave={selectedLeave}
                    leaveTypes={leaveTypes}
                    getStatusStyles={getStatusStyles}
                />
            </SafeAreaView>
        </View>
    );
};

// --- Styles (Combined for all components) ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    // Main Screen
    container: { 
        flex: 1, 
        backgroundColor: '#f4f5f7'
    },
    header: { 
        backgroundColor: '#0a2850', 
        paddingVertical: 16, 
        paddingHorizontal: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        minHeight: Platform.OS === 'ios' ? 44 : 56
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: 'white',
        flex: 1,
        textAlign: 'center'
    },
    backButton: { 
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tabContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#E0E7FF', borderRadius: 10, padding: 4 },
    tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTabButton: { backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#4338CA', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    tabButtonText: { fontSize: 14, fontWeight: '600', color: '#4338CA' },
    activeTabText: { color: '#0a2850' },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    // Apply Leave Form
    formCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 40 },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: '#0a2850', marginBottom: 18 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    leaveTypeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    leaveTypeIcon: { fontSize: 20, marginRight: 12 },
    leaveTypeName: { fontSize: 14, color: '#334155', flex: 1 },
    leaveBalanceChip: { backgroundColor: '#0a2850', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    leaveBalanceText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    rowFields: { flexDirection: 'row', marginBottom: 16 },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', height: 48 },
    datePickerText: { flex: 1, fontSize: 14, color: '#1F2937', marginLeft: 8 },
    datePickerPlaceholder: { color: '#A0AEC0' },
    daysCalculationContainer: { backgroundColor: '#f0f9ff', borderRadius: 8, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#bae6fd' },
    daysCalculationText: { color: '#0284c7', fontSize: 14, textAlign: 'center' },
    textArea: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: '#1F2937', marginBottom: 16 },
    submitButton: { backgroundColor: '#0a2850', borderRadius: 8, padding: 14, alignItems: 'center' },
    submitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // History List
    loader: { marginVertical: 40 },
    emptyState: { alignItems: 'center', paddingVertical: 60, flex: 1, justifyContent: 'center' },
    emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B5563', marginBottom: 8 },
    emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    
    // Leave Card
    leaveCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, },
    leaveCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', },
    leaveTypeIndicator: { flexDirection: 'row', alignItems: 'center' },
    leaveTypeIndicatorIcon: { fontSize: 18, marginRight: 8 },
    leaveTypeIndicatorText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    leaveCardBody: { padding: 14, },
    reasonText: { fontSize: 14, color: '#1F2937', marginBottom: 12, lineHeight: 20 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
    dateInfo: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    deleteButton: { padding: 6, borderRadius: 20, backgroundColor: '#fee2e2' },

    // Details Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%', },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12, marginBottom: 16, },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0a2850' },
    closeButton: { padding: 4, },
    modalBody: {},
    detailRow: { flexDirection: 'row', marginBottom: 14, },
    detailLabel: { fontSize: 14, color: '#6B7280', width: 100, fontWeight: '500' },
    detailValue: { fontSize: 14, color: '#1F2937', flex: 1, fontWeight: '600' },
    reasonContainer: { marginTop: 8 },
    reasonTextModal: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 4, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, },
});

export default LeaveManagementScreen;