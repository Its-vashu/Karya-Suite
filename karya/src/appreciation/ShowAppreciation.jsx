/**
 * ShowAppreciation Component
 * Allows users to send appreciation to colleagues
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { useAuth } from '../AuthContext';
import { useTheme } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataAPI } from '../api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const ShowAppreciation = ({ navigation }) => {
  const { user, setUser } = useAuth();
  const { theme } = useTheme();

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
      console.warn('resolveUserId (show): failed to read stored user', e);
    }
    return null;
  };
  const [employees, setEmployees] = useState([]);
  const [awardTypes, setAwardTypes] = useState([
  'Employee of the Month',
  'Best Performer',
  'Innovation Champion',
  'Team Player',
  'Customer Excellence',
  'Leadership Excellence'
  ]);
  const [badgeLevels, setBadgeLevels] = useState(['Bronze', 'Silver', 'Gold']);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('-- Select Employee --');
  const [selectedAwardType, setSelectedAwardType] = useState('');
  const [selectedBadgeLevel, setSelectedBadgeLevel] = useState('');
  const [description, setDescription] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(new Date().getFullYear());
  const [sendEmail, setSendEmail] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState(null);
  
  // Dropdown modals
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [awardTypeModalVisible, setAwardTypeModalVisible] = useState(false);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [badgeLevelModalVisible, setBadgeLevelModalVisible] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    // load award types from backend (if available)
    const loadAwardTypes = async () => {
      try {
        const resp = await dataAPI.fetchAwardTypes();
        // normalize: could be { award_types, badge_levels } or array
        if (Array.isArray(resp)) {
          setAwardTypes(resp);
        } else if (resp?.award_types) {
          setAwardTypes(resp.award_types);
        } else {
          // keep default if shape unexpected
          console.warn('Unexpected award types shape', resp);
        }
      } catch (err) {
        console.warn('Could not load award types, using defaults', err?.message || err);
      }
    };

    loadAwardTypes();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      setError(null);
      
      console.log('Fetching employees from API...');
      const result = await dataAPI.fetchAllEmployees();
      console.log('Raw API response:', result);
      
      // dataAPI.get now returns response.data. Normalize to an array.
      const usersArray = Array.isArray(result) ? result : (result?.data || []);
      console.log('Normalized users array:', usersArray);
      
      if (!Array.isArray(usersArray)) {
        throw new Error('Unexpected users response format');
      }

      // Filter out current user (defensive)
      const filteredEmployees = usersArray.filter(emp => emp && emp.id && emp.id !== user?.id);
      console.log('Filtered employees:', filteredEmployees);
      console.log('Employee count:', filteredEmployees.length);
      
      setEmployees(filteredEmployees);
      
      if (filteredEmployees.length === 0) {
        setError('No employees found. Please check if you have access to employee data.');
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setError(`Failed to load employee list: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Custom dropdown component
  const CustomDropdown = ({ title, value, onPress }) => (
    <TouchableOpacity 
      style={styles.dropdownButton} 
      onPress={onPress}
      disabled={loading}
    >
      <Text style={value ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
        {value || title}
      </Text>
      <MaterialIcons name="arrow-drop-down" size={24} color="#757575" />
    </TouchableOpacity>
  );

  // Dropdown modal component
  const DropdownModal = ({ visible, onClose, title, items, onSelect, selectedValue }) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#757575" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={items}
            keyExtractor={(item, index) => {
              if (!item) return String(index);
              if (typeof item === 'string' || typeof item === 'number') return String(item);
              if (item.id) return String(item.id);
              if (item.value) return String(item.value);
              return String(index);
            }}
            renderItem={({ item }) => {
              if (!item) return null;

              // Determine itemValue and itemLabel for different shapes
              let itemValue;
              let itemLabel;

              if (typeof item === 'string' || typeof item === 'number') {
                itemValue = item;
                itemLabel = String(item);
              } else if (item.value !== undefined && item.label !== undefined) {
                // shape: { value, label }
                itemValue = item.value;
                itemLabel = String(item.label);
              } else if (item.id) {
                // employee-like object
                itemValue = item.id;
                itemLabel = item.full_name || item.username || item.email || String(item.id);
              } else {
                // Fallback to JSON-stringify label (safe)
                itemValue = JSON.stringify(item);
                itemLabel = String(item.label || item.name || item.toString());
              }

              const isSelected = selectedValue === itemValue || String(selectedValue) === String(itemValue);

              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && styles.selectedModalItem
                  ]}
                  onPress={() => {
                    onSelect(itemValue, itemLabel);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    isSelected && styles.selectedModalItemText
                  ]}>
                    {itemLabel}
                  </Text>
                  {isSelected && (
                    <MaterialIcons name="check" size={20} color="#1976D2" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const validateForm = () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select an employee');
      return false;
    }
    if (!selectedAwardType) {
      Alert.alert('Error', 'Please select an award type');
      return false;
    }
    if (!selectedBadgeLevel) {
      Alert.alert('Error', 'Please select a badge level');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use selected month/year instead of overriding with current date
      const uid = await resolveUserId();
      const appreciationData = {
        employee_id: selectedEmployee,
        month: month,
        year: year,
        award_type: selectedAwardType,
        badge_level: selectedBadgeLevel,
        appreciation_message: description, // API expects appreciation_message not description
        given_by_id: uid, // API expects given_by_id not sender_id
      };

      // Create appreciation
      await dataAPI.createAppreciation(appreciationData);

      // Optionally send email
      if (sendEmail) {
        try {
          const selected = employees.find(e => e.id === selectedEmployee || e.id === Number(selectedEmployee));
          if (selected) {
              await dataAPI.sendAppreciationEmail({
              recipient_email: selected.email,
              recipient_name: selected.full_name || selected.username,
              award_type: selectedAwardType,
              badge_level: selectedBadgeLevel,
              appreciation_message: description,
                hr_name: uid,
              month,
              year
            });
          }
        } catch (err) {
          console.warn('Failed to send appreciation email:', err);
        }
      }
      
      // Show success message
      Alert.alert(
        'Success',
        'Appreciation sent successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Reset form and navigate back
              setSelectedEmployee('');
              setSelectedAwardType('');
              setSelectedBadgeLevel('');
              setDescription('');
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to send appreciation:', error);
      setError('Failed to send appreciation. Please try again.');
      Alert.alert('Error', 'Failed to send appreciation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingEmployees) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 8 } : null]}>
          {/* Navigation Header */}
          <View style={styles.navigationHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Send Appreciation</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 8 } : null]}>
        {/* Navigation Header */}
        <View style={styles.navigationHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Appreciation</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView style={styles.scrollContainer}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Send Appreciation</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Employee</Text>
          {loadingEmployees ? (
            <View style={styles.loadingEmployeesContainer}>
              <ActivityIndicator size="small" color="#1976D2" />
              <Text style={styles.loadingEmployeesText}>Loading employees...</Text>
            </View>
          ) : employees.length === 0 ? (
            <View style={styles.noEmployeesContainer}>
              <Text style={styles.noEmployeesText}>No employees available</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={fetchEmployees}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CustomDropdown 
              title="-- Select Employee --"
              value={selectedEmployeeName !== "-- Select Employee --" ? selectedEmployeeName : ""}
              onPress={() => setEmployeeModalVisible(true)}
            />
          )}
          <Text style={styles.debugText}>
            Debug: {employees.length} employees loaded
          </Text>
          <DropdownModal
            visible={employeeModalVisible}
            onClose={() => setEmployeeModalVisible(false)}
            title="Select Employee"
            items={employees}
            selectedValue={selectedEmployee}
            onSelect={(id, name) => {
              setSelectedEmployee(id);
              setSelectedEmployeeName(name);
            }}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Award Type</Text>
          <CustomDropdown 
            title="-- Select Award Type --"
            value={selectedAwardType}
            onPress={() => setAwardTypeModalVisible(true)}
          />
          <DropdownModal
            visible={awardTypeModalVisible}
            onClose={() => setAwardTypeModalVisible(false)}
            title="Select Award Type"
            items={awardTypes}
            selectedValue={selectedAwardType}
            onSelect={(value) => setSelectedAwardType(value)}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Badge Level</Text>
          <View style={styles.badgePillsRow}>
            {['Gold', 'Silver', 'Bronze'].map(level => {
              const value = level.toLowerCase();
              const isActive = selectedBadgeLevel === value;
              const colorMap = {
                gold: { bg: '#FFF8E1', border: '#FFD54F', text: '#B8860B' },
                silver: { bg: '#F5F7FA', border: '#E0E0E0', text: '#9E9E9E' },
                bronze: { bg: '#FFF3E0', border: '#FFCC80', text: '#A0522D' }
              };
              const colors = colorMap[value] || colorMap.bronze;

              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.badgePill,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                    isActive && styles.badgePillActive
                  ]}
                  onPress={() => setSelectedBadgeLevel(value)}
                >
                  <View style={[styles.radioDot, isActive && { backgroundColor: colors.border }]} />
                  <Text style={[styles.badgePillText, { color: colors.text }, isActive && styles.badgePillTextActive]}>{level}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Why are you appreciating this person?"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            editable={!loading}
          />
        </View>

        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Month</Text>
            <CustomDropdown
              title={month}
              value={month}
              onPress={() => setMonthModalVisible(true)}
            />
            <DropdownModal
              visible={monthModalVisible}
              onClose={() => setMonthModalVisible(false)}
              title="Select Month"
              items={[ 'January','February','March','April','May','June','July','August','September','October','November','December' ]}
              selectedValue={month}
              onSelect={(val) => setMonth(val)}
            />
          </View>
            <View style={{ width: 110 }}>
              <Text style={styles.label}>Year</Text>
              <TouchableOpacity onPress={() => setYearModalVisible(true)} style={[styles.dropdownButton, { height: 50 }]}>
                <Text style={styles.dropdownSelectedText}>{String(year)}</Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#757575" />
              </TouchableOpacity>
              <DropdownModal
                visible={yearModalVisible}
                onClose={() => setYearModalVisible(false)}
                title="Select Year"
                items={(() => {
                  const current = new Date().getFullYear();
                  const range = [];
                  // show current year +/- 3
                  for (let y = current - 3; y <= current + 3; y++) range.push(y);
                  return range;
                })()}
                selectedValue={year}
                onSelect={(val) => setYear(Number(val))}
              />
            </View>
        </View>

        <View style={[styles.formGroup, { marginTop: 6 }]}>
          <TouchableOpacity onPress={() => setSendEmail(prev => !prev)} style={styles.sendEmailRow}>
            <View style={[styles.checkbox, sendEmail && styles.checkboxChecked]}>
              {sendEmail && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.sendEmailText}>Send appreciation email to employee</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ flex: 1, marginLeft: 12 }}>
            <LinearGradient
              colors={[ '#2b6cb0', '#8b5cf6' ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.createButton, loading && styles.disabledButton]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <MaterialIcons name="emoji-events" size={18} color="white" />
                  <Text style={styles.createButtonText}>Create Appreciation</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1976D2',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  scrollContainer: {
    flex: 1,
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
  loadingEmployeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingEmployeesText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  noEmployeesContainer: {
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFB74D',
    alignItems: 'center',
  },
  noEmployeesText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  debugText: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
  marginBottom: 18,
  textAlign: 'center',
  },
  errorContainer: {
  backgroundColor: '#FFEBEE',
  padding: 12,
  borderRadius: 6,
  marginBottom: 18,
  flexDirection: 'row',
  alignItems: 'center',
  borderLeftWidth: 4,
  borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 6,
  backgroundColor: '#FFFFFF',
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  },
  picker: {
    height: 50,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
    padding: 12,
    fontSize: 16,
    color: '#212121',
    textAlignVertical: 'top',
    height: 120,
  },
  submitButton: {
    backgroundColor: '#1976D2',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    padding: 12,
    height: 52,
    paddingHorizontal: 14,
    elevation: 1,
  },
  dropdownSelectedText: {
    fontSize: 16,
    color: '#212121',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  // Slightly larger modal items for finger targets
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectedModalItem: {
    backgroundColor: '#E3F2FD',
  },
  modalItemText: {
    fontSize: 16,
    color: '#424242',
  },
  selectedModalItemText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  // Badge pill styles
  badgePillsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  badgePill: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  backgroundColor: '#FFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  },
  badgePillActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  badgePillText: {
    color: '#424242',
    fontWeight: '600',
    marginLeft: 8,
  },
  badgePillTextActive: {
    color: '#FF9800',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  sendEmailText: {
    color: '#1565C0',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#424242',
    fontWeight: '600',
  },
  createButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ShowAppreciation;
