import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { useAuth } from './AuthContext';
import { useIsFocused } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL_EXPORT as API_BASE_URL } from './api';

const UserDetails = ({ navigation, route }) => {
  const { user, setUser } = useAuth();
  const isFocused = useIsFocused();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const scrollViewRef = useRef(null);
  
  // Store original profile for comparison when saving
  const [originalProfile, setOriginalProfile] = useState({
    nickname: '',
    bio: ''
  });
  
  // If the screen was opened with autoEdit=true, enable a limited edit mode
  const [limitedEdit, setLimitedEdit] = useState(false);

  useEffect(() => {
    const autoEdit = route?.params?.autoEdit;
    if (autoEdit) {
      setLimitedEdit(true);
      setEditing(true);
      setActiveSection('personal');
    }
  }, [route]);
  
  const [userProfile, setUserProfile] = useState({
    // Personal Information
    firstName: user?.firstName || user?.name || '',
    lastName: user?.lastName || '',
    fullName: user?.fullName || '',
    nickname: '',
    bio: '',
    email: user?.email || '',
    phoneNumber: user?.phone || '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    profilePicture: '',
    
    // Address Information
    currentAddress: '',
    currentLandmark: '',
    currentCity: '',
    currentState: '',
    currentPinCode: '',
    currentPoliceStation: '',
    currentDurationFrom: '',
    currentDurationTo: '',
    permanentAddress: '',
    permanentLandmark: '',
    permanentCity: '',
    permanentState: '',
    permanentPinCode: '',
    permanentPoliceStation: '',
    permanentDurationFrom: '',
    permanentDurationTo: '',
    
    // Family Information
    fatherName: '',
    motherName: '',
    spouseName: '',
    
    // Education & Work
    educationDetails: [],
    currentEmployer: '',
    designation: user?.designation || '',
    department: user?.department || '',
    workExperience: '',
    previousEmployer: '',
    organizationAddress: '',
    employeeCode: user?.employeeId || '',
    dateOfJoining: user?.joiningDate || '',
    lastWorkingDay: '',
    salary: '',
    reasonForLeaving: '',
    
    // Manager Information
    managerName: '',
    managerContactNumber: '',
    managerEmailId: '',
    hrDetails: [],
    
    // Identity Information
    aadharNumber: '',
    panNumber: '',
    passportNumber: '',
    drivingLicense: '',
    uanNumber: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelation: '',
    
    // Other
    references: [],
    criminalRecord: '',
    medicalHistory: '',
  });

  useEffect(() => {
    console.log('Current references state:', userProfile.references);
  }, [userProfile.references]);

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Reload profile when screen gains focus so updates elsewhere appear immediately
  useEffect(() => {
    if (isFocused) {
      loadUserProfile();
    }
  }, [isFocused]);

  // Ensure references is always an array
  useEffect(() => {
    if (!Array.isArray(userProfile.references)) {
      console.log('References is not an array, initializing...');
      setUserProfile(prev => ({
        ...prev,
        references: []
      }));
    } else if (userProfile.references.length === 0 && editing) {
      // If we're in edit mode and there are no references, add a dummy one
      console.log('No references and in edit mode, adding dummy reference');
      setUserProfile(prev => ({
        ...prev,
        references: [{
          name: '',
          organization: '',
          designation_relation: '',
          contact: '',
          email: ''
        }]
      }));
    }
  }, [userProfile.references, editing]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // First try to get from AsyncStorage for quick loading
      const storedProfile = await AsyncStorage.getItem(`user_profile_${user?.id || user?.email}`);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        setUserProfile(prev => ({
          ...prev,
          ...parsedProfile
        }));
        
        // Set original profile for comparing changes later
        setOriginalProfile({
          nickname: parsedProfile.nickname || '',
          bio: parsedProfile.bio || ''
        });
      }
      
      // Then try to fetch from API for updated data
      await fetchProfileFromApi();
      
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileFromApi = async () => {
    // Don't show loading indicator here since we already have data from AsyncStorage
    try {
      // Get token from Auth context or AsyncStorage
      const token = user?.token;
      if (!token) {
        console.log('No auth token available');
        return;
      }
      
      // Use the email as identifier
      const email = user?.email;
      if (!email) {
        console.log('No email available in user context');
        return;
      }
      
      console.log('Fetching profile data for email:', email);
      
      // MAIN DATA SOURCE: Background check profile endpoint (most comprehensive)
      let profileData = null;
      try {
        console.log('Trying primary endpoint: background-check/profile');
        const mainEndpoint = `${API_BASE_URL}/api/background-check/profile/${encodeURIComponent(email)}`;
        
        const response = await axios.get(mainEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          },
        });
        
        if (response.data) {
          console.log('Successfully fetched profile from primary endpoint');
          profileData = response.data;
          profileData.dataSource = 'background_check_profile';
        }
      } catch (primaryError) {
        console.log('Primary endpoint failed:', primaryError.message);
      }
      
      // FALLBACK 1: If primary fails, try user profile by ID
      if (!profileData && user?.id) {
        try {
          console.log('Trying fallback: user profile by ID');
          const userId = user.id;
          const fallbackEndpoint = `${API_BASE_URL}/users/${userId}/details`;
          
          const response = await axios.get(fallbackEndpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.data) {
            console.log('Successfully fetched profile from ID endpoint');
            profileData = response.data;
            profileData.dataSource = 'user_profile_by_id';
          }
        } catch (fallbackError) {
          console.log('Fallback endpoint failed:', fallbackError.message);
        }
      }
      
      // FALLBACK 2: Basic user details from context
      if (!profileData) {
        console.log('All endpoints failed, using basic user data from context');
        profileData = {
          ...user,
          dataSource: 'user_context'
        };
      }
      
      // ADDITIONAL DATA: Get nickname, bio, profile pic (if not already in profile)
      // These will be implemented in future updates
      
        // If successful, update state and save to AsyncStorage
      if (profileData) {
        console.log('Mapping profile data from source:', profileData.dataSource);
        
        // Log all fields of the first reference detail if available
        if (profileData.reference_details && profileData.reference_details.length > 0) {
          console.log('First reference detail - ALL FIELDS:', 
            Object.entries(profileData.reference_details[0]).map(([key, val]) => 
              `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`
            ).join(', ')
          );
        } else {
          console.log('No reference details available in API response');
        }
        
        // If reference_details is missing or empty but we have an email, try to fetch them directly
        if ((!profileData.reference_details || 
            (Array.isArray(profileData.reference_details) && profileData.reference_details.length === 0)) && 
            profileData.email_id) {
          try {
            console.log('Attempting to fetch references directly');
            const referencesEndpoint = `${API_BASE_URL}/api/background-check/references/${encodeURIComponent(profileData.email_id)}`;
            const refResponse = await axios.get(referencesEndpoint, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (refResponse.data && Array.isArray(refResponse.data)) {
              console.log('Successfully fetched references separately:', refResponse.data);
              profileData.reference_details = refResponse.data;
            }
          } catch (refError) {
            console.log('Error fetching references separately:', refError.message);
          }
        }
        
        if (profileData.reference_details) {
          console.log('Reference details type:', typeof profileData.reference_details);
          console.log('Is array?', Array.isArray(profileData.reference_details));
          if (typeof profileData.reference_details === 'string') {
            try {
              const parsed = JSON.parse(profileData.reference_details);
              console.log('Parsed reference details:', parsed);
              profileData.reference_details = parsed;
            } catch (e) {
              console.error('Failed to parse reference_details string:', e);
            }
          }
          
          // Make sure it's always an array
          if (!Array.isArray(profileData.reference_details)) {
            console.log('Reference details is not an array, converting to array');
            if (profileData.reference_details && typeof profileData.reference_details === 'object') {
              // If it's an object, wrap it in an array
              profileData.reference_details = [profileData.reference_details];
            } else {
              profileData.reference_details = [];
            }
          }
        }
        
        // Specifically log HR details for debugging
        console.log('HR details from API:', profileData.hr_details);
        
        // Make sure HR details is always an array
        if (profileData.hr_details) {
          console.log('HR details type:', typeof profileData.hr_details);
          console.log('Is array?', Array.isArray(profileData.hr_details));
          if (typeof profileData.hr_details === 'string') {
            try {
              const parsed = JSON.parse(profileData.hr_details);
              console.log('Parsed HR details:', parsed);
              profileData.hr_details = parsed;
            } catch (e) {
              console.error('Failed to parse HR details string:', e);
            }
          }
          
          // Make sure it's always an array
          if (!Array.isArray(profileData.hr_details)) {
            console.log('HR details is not an array, converting to array');
            if (profileData.hr_details && typeof profileData.hr_details === 'object') {
              // If it's an object, wrap it in an array
              profileData.hr_details = [profileData.hr_details];
            } else {
              profileData.hr_details = [];
            }
          }
        }
        
        // Removed education data logging to avoid console clutter
        
        // Handle education data - It might come in different formats
        try {
          // Special case: If the data contains the Education data: prefix, remove it
          if (profileData.education_details && 
              typeof profileData.education_details === 'string' &&
              profileData.education_details.includes('Education data:')) {
            profileData.education_details = profileData.education_details.replace('Education data:', '').trim();
          }
          
          // Parse if it's a string (which seems to be the case from your screenshot)
          if (profileData.education_details && typeof profileData.education_details === 'string') {
            try {
              profileData.education_details = JSON.parse(profileData.education_details);
              console.log('Successfully parsed education_details from string');
            } catch (e) {
              console.warn('Failed to parse education_details string:', e);
              profileData.education_details = [];
            }
          }
          
          // Safety check - If education_details is not an array, create an empty one
          if (profileData.education_details && !Array.isArray(profileData.education_details)) {
            console.warn('education_details is not an array, converting to empty array');
            profileData.education_details = [];
          } else if (!profileData.education_details) {
            console.warn('education_details is missing, adding empty array');
            profileData.education_details = [];
          }
        } catch (error) {
          console.error('Error processing education_details:', error);
          profileData.education_details = [];
        }
        
        // Map API response to our user profile structure based on data source
        let mappedProfile;        // If from background check system (matches web app's primary source)
        if (profileData.dataSource === 'background_check_profile') {
          mappedProfile = {
            ...userProfile,
            // Personal Information
            firstName: profileData.candidate_name?.split(' ')[0] || userProfile.firstName,
            lastName: profileData.candidate_name?.split(' ').slice(1).join(' ') || userProfile.lastName,
            fullName: profileData.candidate_name || userProfile.fullName,
            email: profileData.email_id || userProfile.email,
            phoneNumber: profileData.contact_number?.toString() || userProfile.phoneNumber,
            dateOfBirth: profileData.date_of_birth || userProfile.dateOfBirth,
            maritalStatus: profileData.marital_status || userProfile.maritalStatus,
            
            // Address Information
            currentAddress: profileData.current_complete_address || userProfile.currentAddress,
            currentLandmark: profileData.current_landmark || userProfile.currentLandmark,
            currentCity: profileData.current_city || userProfile.currentCity,
            currentState: profileData.current_state || userProfile.currentState,
            currentPinCode: profileData.current_pin_code?.toString() || userProfile.currentPinCode,
            currentPoliceStation: profileData.current_police_station || userProfile.currentPoliceStation,
            currentDurationFrom: profileData.current_duration_from || userProfile.currentDurationFrom,
            currentDurationTo: profileData.current_duration_to || userProfile.currentDurationTo,
            
            permanentAddress: profileData.permanent_complete_address || userProfile.permanentAddress,
            permanentLandmark: profileData.permanent_landmark || userProfile.permanentLandmark,
            permanentCity: profileData.permanent_city || userProfile.permanentCity,
            permanentState: profileData.permanent_state || userProfile.permanentState,
            permanentPinCode: profileData.permanent_pin_code?.toString() || userProfile.permanentPinCode,
            permanentPoliceStation: profileData.permanent_police_station || userProfile.permanentPoliceStation,
            permanentDurationFrom: profileData.permanent_duration_from || userProfile.permanentDurationFrom,
            permanentDurationTo: profileData.permanent_duration_to || userProfile.permanentDurationTo,
            
            // Family Information
            fatherName: profileData.father_name || userProfile.fatherName,
            motherName: profileData.mother_name || userProfile.motherName,
            
            // Education & Work - Use the correct format from API and clean it up
            educationDetails: Array.isArray(profileData.education_details) ? 
              profileData.education_details
                .filter(edu => edu && typeof edu === 'object') // Filter out any non-object entries
                .map(edu => {
                  // Log what we get from API for debugging
                  console.log('Education entry from API:', edu);
                  
                  // Check all possible field names for mode
                  const modeValue = edu.mode || edu.study_mode || edu.course_mode || 
                                    (edu.is_regular === true ? 'REGULAR' : 
                                     edu.is_regular === false ? 'DISTANCE' : '');
                  
                  return {
                    institution_name: edu.institution_name || '',
                    degree: edu.degree || '',
                    year_of_passing: edu.year_of_passing || '',
                    registration_no: edu.registration_no || '',
                    mode: modeValue
                  };
                }) 
              : [],
            currentEmployer: profileData.organization_name || userProfile.currentEmployer,
            designation: profileData.designation || userProfile.designation,
            employeeCode: profileData.employee_code || userProfile.employeeCode,
            dateOfJoining: profileData.date_of_joining || userProfile.dateOfJoining,
            lastWorkingDay: profileData.last_working_day || userProfile.lastWorkingDay,
            salary: profileData.salary?.toString() || userProfile.salary,
            reasonForLeaving: profileData.reason_for_leaving || userProfile.reasonForLeaving,
            organizationAddress: profileData.organization_address || userProfile.organizationAddress,
            
            // Manager Information
            managerName: profileData.manager_name || userProfile.managerName,
            managerContactNumber: profileData.manager_contact_number || userProfile.managerContactNumber,
            managerEmailId: profileData.manager_email_id || userProfile.managerEmailId,
            
            // HR Details - Process and clean up the data using our normalizer
            hrDetails: Array.isArray(profileData.hr_details) ? 
              profileData.hr_details.map(hr => normalizeHRDetail(hr)) 
            : [],
            
            // Identity Information
            aadharNumber: profileData.aadhaar_card_number?.toString() || userProfile.aadharNumber,
            panNumber: profileData.pan_number || userProfile.panNumber,
            uanNumber: profileData.uan_number?.toString() || userProfile.uanNumber,
            
            // References
            references: Array.isArray(profileData.reference_details) ? 
              profileData.reference_details.map(ref => {
                console.log('Processing reference before normalization:', JSON.stringify(ref));
                const normalized = normalizeReference(ref);
                console.log('Reference after normalization:', JSON.stringify(normalized));
                return normalized;
              }) 
              : (userProfile.references || []),
            
            // Debug info
            dataSource: profileData.dataSource
          };
        } else {
          // Fallback: Map from other API formats or user context
          mappedProfile = {
            ...userProfile,
            firstName: profileData.firstName || profileData.name || userProfile.firstName,
            lastName: profileData.lastName || userProfile.lastName,
            fullName: profileData.fullName || userProfile.fullName,
            nickname: profileData.nickname || userProfile.nickname,
            bio: profileData.bio || userProfile.bio,
            email: profileData.email || userProfile.email,
            phoneNumber: profileData.phoneNumber || profileData.phone || userProfile.phoneNumber,
            dateOfBirth: profileData.dateOfBirth || userProfile.dateOfBirth,
            gender: profileData.gender || userProfile.gender,
            maritalStatus: profileData.maritalStatus || userProfile.maritalStatus,
            profilePicture: profileData.profilePicture || userProfile.profilePicture,
            
            // Address
            currentAddress: profileData.currentAddress || userProfile.currentAddress,
            currentCity: profileData.currentCity || userProfile.currentCity,
            currentState: profileData.currentState || userProfile.currentState,
            currentPinCode: profileData.currentPinCode || userProfile.currentPinCode,
            
            // Work info
            department: profileData.department || userProfile.department,
            designation: profileData.designation || userProfile.designation,
            employeeCode: profileData.employeeCode || profileData.employeeId || userProfile.employeeCode,
            dateOfJoining: profileData.dateOfJoining || userProfile.dateOfJoining,
            
            // Emergency contact
            emergencyContactName: profileData.emergencyContactName || userProfile.emergencyContactName,
            emergencyContactNumber: profileData.emergencyContactNumber || userProfile.emergencyContactNumber,
            emergencyContactRelation: profileData.emergencyContactRelation || userProfile.emergencyContactRelation,
            
            // Debug info
            dataSource: profileData.dataSource
          };
        }
        
        // Update state
        setUserProfile(mappedProfile);

        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem(`user_profile_${user?.id || user?.email}`, JSON.stringify(mappedProfile));

        // Also update the main stored 'user' object and in-memory AuthContext so app reflects latest nickname/bio immediately
        try {
          // Prefer updating in-memory user from context; persist updated fields to AsyncStorage as well
          const updatedUser = { ...(user || {}), nickname: mappedProfile.nickname || '', bio: mappedProfile.bio || '' };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          if (typeof setUser === 'function') setUser(updatedUser);
        } catch (e) {
          console.warn('Failed to update main auth user after loading profile:', e);
        }
      }
    } catch (error) {
      console.log('Error fetching profile from API:', error);
      // Don't show error to user since we already have data from AsyncStorage
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // If we're in limited edit mode (launched from Profile -> Edit), only save nickname and bio
      if (limitedEdit) {
        // Merge current stored profile with new nickname/bio
        const key = `user_profile_${user?.id || user?.email}`;
        try {
          const stored = await AsyncStorage.getItem(key);
          let base = stored ? JSON.parse(stored) : {};
          base = { ...base, nickname: userProfile.nickname, bio: userProfile.bio };
          await AsyncStorage.setItem(key, JSON.stringify(base));
        } catch (e) {
          console.warn('Failed to update local profile store for nickname/bio:', e);
        }

        // Try to send minimal update to API if token available. Prefer dedicated endpoints, fallback to legacy.
        try {
          const token = user?.token;
          if (token) {
            const userId = user.id;
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

            // Try per-field endpoints first
            let didUpdate = false;
            try {
              await axios.put(`${API_BASE_URL}/users/${userId}/nickname`, { nickname: userProfile.nickname }, { headers });
              didUpdate = true;
            } catch (e) {
              if (e.response && e.response.status !== 404) throw e; // rethrow other errors
            }

            try {
              await axios.put(`${API_BASE_URL}/users/${userId}/bio`, { bio: userProfile.bio }, { headers });
              didUpdate = true;
            } catch (e) {
              if (e.response && e.response.status !== 404) throw e;
            }

            // If per-field endpoints returned 404 (not found), fallback to legacy combined endpoint
            if (!didUpdate) {
              const personalEndpoint = `${API_BASE_URL}/users/${userId}/details`;
              console.log('Fallback: attempting combined personal endpoint:', personalEndpoint);
              await axios.put(personalEndpoint, { nickname: userProfile.nickname, bio: userProfile.bio }, { headers });
              didUpdate = true;
            }
            // Update main stored `user` object so other screens that read it reflect the change
            try {
              const updatedUser = { ...(user || {}), nickname: userProfile.nickname, bio: userProfile.bio };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              console.log('Updated main stored user with nickname/bio');
              try { setUser(updatedUser); } catch (e) { console.warn('setUser not available or failed', e); }
            } catch (e) {
              console.warn('Failed to update main stored user:', e);
            }
          }
        } catch (apiErr) {
          console.warn('Failed to update nickname/bio on server (non-fatal):', apiErr?.message || apiErr);
        }
        // Update originalProfile so UI shows saved values immediately
        setOriginalProfile({ nickname: userProfile.nickname || '', bio: userProfile.bio || '' });
        setEditing(false);
        setLimitedEdit(false);
        Alert.alert('Success', 'Profile updated successfully!');
        // Return to previous screen (Profile)
        navigation.goBack();
        return;
      }

      // Existing full-save behavior for normal edit mode
      // Save to AsyncStorage
      await AsyncStorage.setItem(`user_profile_${user?.id || user?.email}`, JSON.stringify(userProfile));

      // API call to save (uncomment when API is ready)
      const token = user?.token;
      if (token) {
        // Different endpoints for different profile sections
        if (activeSection === 'personal') {
          // Update personal details - prefer per-field endpoints for nickname/bio, fallback to legacy combined endpoint
          const userId = user.id;
          const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

          // First try per-field updates for nickname/bio
          let didUpdate = false;
          try {
            // Only update nickname if it changed
            if (userProfile.nickname !== originalProfile.nickname) {
              await axios.put(`${API_BASE_URL}/users/${userId}/nickname`, { nickname: userProfile.nickname }, { headers });
              didUpdate = true;
            }
          } catch (e) {
            if (!(e.response && e.response.status === 404)) throw e;
          }

          try {
            if (userProfile.bio !== originalProfile.bio) {
              await axios.put(`${API_BASE_URL}/users/${userId}/bio`, { bio: userProfile.bio }, { headers });
              didUpdate = true;
            }
          } catch (e) {
            if (!(e.response && e.response.status === 404)) throw e;
          }

          // If per-field endpoints didn't exist or didn't run, fallback to legacy combined endpoint
          if (!didUpdate) {
            const personalEndpoint = `${API_BASE_URL}/users/${userId}/details`;
            console.log('Fallback: attempting combined personal endpoint:', personalEndpoint);
            await axios.put(personalEndpoint, {
              first_name: userProfile.firstName,
              last_name: userProfile.lastName,
              email: userProfile.email,
              phone_number: userProfile.phoneNumber,
              date_of_birth: userProfile.dateOfBirth,
              gender: userProfile.gender,
              marital_status: userProfile.maritalStatus,
              bio: userProfile.bio,
              nickname: userProfile.nickname
            }, { headers });
            didUpdate = true;
          }
          // Persist nickname/bio to main stored `user` so other screens show changes
            try {
              const updatedUser = { ...(user || {}), nickname: userProfile.nickname, bio: userProfile.bio };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              try { if (typeof setUser === 'function') setUser(updatedUser); } catch (e) { console.warn('setUser failed after full save', e); }
              console.log('Updated main stored user (full save) with nickname/bio');
            } catch (e) {
              console.warn('Failed to update main stored user after full save:', e);
            }

          // Update original profile so inputs reflect saved state
          setOriginalProfile({ nickname: userProfile.nickname || '', bio: userProfile.bio || '' });
        } else if (activeSection === 'address') {
          // Update address details
          const addressEndpoint = `${API_BASE_URL}/api/users/${user.id}/address`;
          await axios.put(addressEndpoint, {
            // Current address
            current_address: userProfile.currentAddress,
            current_landmark: userProfile.currentLandmark,
            current_city: userProfile.currentCity,
            current_state: userProfile.currentState,
            current_pin_code: userProfile.currentPinCode,
            current_police_station: userProfile.currentPoliceStation,
            current_duration_from: userProfile.currentDurationFrom,
            current_duration_to: userProfile.currentDurationTo,
            
            // Permanent address
            permanent_address: userProfile.permanentAddress,
            permanent_landmark: userProfile.permanentLandmark,
            permanent_city: userProfile.permanentCity,
            permanent_state: userProfile.permanentState,
            permanent_pin_code: userProfile.permanentPinCode,
            permanent_police_station: userProfile.permanentPoliceStation,
            permanent_duration_from: userProfile.permanentDurationFrom,
            permanent_duration_to: userProfile.permanentDurationTo,
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } else if (activeSection === 'family') {
          // Update family details
          const familyEndpoint = `${API_BASE_URL}/api/users/${user.id}/family`;
          await axios.put(familyEndpoint, {
            father_name: userProfile.fatherName,
            mother_name: userProfile.motherName,
            spouse_name: userProfile.spouseName
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } else if (activeSection === 'references') {
          // Update professional references
          const referencesEndpoint = `${API_BASE_URL}/api/background-check/references/${user.email}`;
          await axios.put(referencesEndpoint, {
            references: userProfile.references
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } else if (activeSection === 'legal') {
          // Legal documents are read-only, not updated from mobile app
          console.log('Legal documents are read-only');
          // Only inform user
          Alert.alert('Information', 'Government & Legal documents cannot be updated from the mobile app. Please contact HR for any changes.');
        }
        
        // Log for debugging
        console.log(`Profile section "${activeSection}" saved successfully`);
      }
      
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      const serverMsg = error?.response?.data?.detail || error?.response?.data || error?.message || 'Unknown error';
      Alert.alert('Error', `Failed to save profile: ${serverMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reload from AsyncStorage to reset
    loadUserProfile();
    setEditing(false);
  };

  // Determine the next section based on the current section
  const getNextSection = (currentSection) => {
    const sections = ['personal', 'current_address', 'permanent_address', 'education', 'professional', 'references', 'legal'];
    const currentIndex = sections.indexOf(currentSection);
    
    if (currentIndex < sections.length - 1) {
      return sections[currentIndex + 1];
    }
    
    // If we're at the last section, return the first section
    return sections[0];
  };

  // Navigate to the next section
  const goToNextSection = () => {
    const nextSection = getNextSection(activeSection);
    setActiveSection(nextSection);
    
    // Scroll to top when changing sections
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return as-is if invalid
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Helper function to ensure reference objects have all required fields
  const normalizeReference = (ref) => {
    // If ref is a string (possible with some API responses), try to parse it
    if (typeof ref === 'string') {
      try {
        ref = JSON.parse(ref);
      } catch (e) {
        console.error('Failed to parse reference string:', e);
        ref = {};
      }
    }
    
    // Ensure ref is an object
    if (!ref || typeof ref !== 'object') {
      ref = {};
    }
    
    // Log the original reference object for debugging
    console.log('Original reference object:', JSON.stringify(ref));
    
    // Create a normalized reference with all fields
    return {
      name: ref.ref_name || ref.name || '',
      organization: ref.organization || ref.ref_organization || '',
      designation_relation: ref.designation_relation || ref.ref_designation || ref.relation || '',
      contact: (ref.ref_contact_number || ref.contact || '').toString(),
      email: ref.ref_email_id || ref.email || ''
    };
  };
  
  const handleProfilePictureUpload = () => {
    // Try to use react-native-image-picker if installed. If not, instruct the developer.
    try {
      const ImagePicker = require('react-native-image-picker');
      ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
        if (!response) return;
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Image picker error', response.errorMessage || response.errorCode);
          return;
        }

        const asset = Array.isArray(response.assets) ? response.assets[0] : null;
        if (!asset || !asset.uri) {
          Alert.alert('Error', 'No image selected');
          return;
        }

        // Show preview immediately
        setUserProfile(prev => ({ ...prev, profilePicture: asset.uri }));

        // Try to upload to API if token available
        const token = user?.token;
        const userId = user?.id;
        if (token && userId) {
          try {
            const form = new FormData();
            const name = asset.fileName || `profile_${userId}.jpg`;
            const fileType = asset.type || 'image/jpeg';
            form.append('file', {
              uri: asset.uri,
              name,
              type: fileType,
            });

            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' };
            // Backend route exists in user_router: POST /users/upload-profile-pic/ or POST /users/{id}/upload-profile-pic/
            // Try both variants safely
            let uploadedUrl = null;
            const tryParseUrl = (resp) => {
              if (!resp || !resp.data) return null;
              const d = resp.data;
              // common shapes: { url }, { data: { url } }, { fileUrl }, { profilePicture }, { message }
              return d.url || d.fileUrl || d.file || (d.data && (d.data.url || d.data.fileUrl || d.data.file)) || d.profilePicture || d.message || null;
            };

            try {
              const resp = await axios.post(`${API_BASE_URL}/users/upload-profile-pic/`, form, { headers });
              uploadedUrl = tryParseUrl(resp);
            } catch (e) {
              // try per-user variant
              try {
                const resp2 = await axios.post(`${API_BASE_URL}/users/${userId}/upload-profile-pic/`, form, { headers });
                uploadedUrl = tryParseUrl(resp2);
              } catch (e2) {
                console.warn('Profile image upload failed:', e2?.message || e2);
                Alert.alert('Upload failed', e2?.response?.data?.detail || e2?.message || 'Failed to upload profile image');
              }
            }

            if (uploadedUrl) {
              setUserProfile(prev => ({ ...prev, profilePicture: uploadedUrl }));
              // Persist changes locally and update auth user
              try {
                const key = `user_profile_${user?.id || user?.email}`;
                const stored = await AsyncStorage.getItem(key);
                const parsed = stored ? JSON.parse(stored) : {};
                const merged = { ...parsed, profilePicture: uploadedUrl };
                await AsyncStorage.setItem(key, JSON.stringify(merged));

                const storedUserRaw = await AsyncStorage.getItem('user');
                if (storedUserRaw) {
                  const storedUser = JSON.parse(storedUserRaw);
                  const updatedUser = { ...storedUser, profilePicture: uploadedUrl };
                  await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                  if (typeof setUser === 'function') setUser(updatedUser);
                }
              } catch (persistErr) {
                console.warn('Failed to persist profile picture url locally:', persistErr);
              }

              Alert.alert('Success', 'Profile picture uploaded');
            }
          } catch (uploadErr) {
            console.warn('Upload error:', uploadErr);
            Alert.alert('Upload failed', uploadErr?.response?.data?.detail || uploadErr?.message || 'Failed to upload image');
          }
        }
      });
    } catch (e) {
      Alert.alert('Not available', 'Install react-native-image-picker to enable profile image selection on mobile.');
    }
  };
  
  // Helper function to ensure HR details have all required fields
  const normalizeHRDetail = (hr) => {
    // If hr is a string (possible with some API responses), try to parse it
    if (typeof hr === 'string') {
      try {
        hr = JSON.parse(hr);
      } catch (e) {
        console.error('Failed to parse HR detail string:', e);
        hr = {};
      }
    }
    
    // Ensure hr is an object
    if (!hr || typeof hr !== 'object') {
      hr = {};
    }
    
    // Log the original HR object for debugging
    console.log('Original HR object:', JSON.stringify(hr));
    
    // Create a normalized HR detail with all fields
    return {
      name: hr.hr_name || hr.name || '',
      contact: (hr.hr_contact_number || hr.contact || '').toString(),
      email: hr.hr_email_id || hr.email || ''
    };
  };

  const renderField = (label, value, key, placeholder = '', editable = true, keyboardType = 'default') => {
    // Special handling for Mode field
    if (label === 'Mode' && !value && key.includes('mode')) {
      // Try to find a reasonable default mode value
      let defaultModeValue = 'REGULAR'; // Default to REGULAR if nothing specified
      // Only allow editing for nickname/bio (all other fields are read-only)
      const allowEditField = editing && editable && (key === 'nickname' || key === 'bio');
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {allowEditField ? (
            <TextInput
              style={styles.fieldInput}
              value={String(value || defaultModeValue)}
              onChangeText={(text) => setUserProfile(prev => {
                // Handle dot notation for nested objects
                if (key.includes('[')) {
                  // For array items like educationDetails[0].mode
                  const parts = key.match(/(.+)\[(\d+)\]\.(.+)/);
                  if (parts) {
                    const [_, arrayName, index, propName] = parts;
                    const newArray = [...(prev[arrayName] || [])];
                    newArray[index] = {...(newArray[index] || {}), [propName]: text};
                    return {...prev, [arrayName]: newArray};
                  }
                }
                return {...prev, [key]: text};
              })}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              keyboardType={keyboardType}
            />
          ) : (
            <Text style={styles.fieldValue}>{value || defaultModeValue}</Text>
          )}
        </View>
      );
    }

    // Normal field rendering for other fields
    // Only allow editing nickname and bio. All other fields remain read-only even when `editing` is true.
    const allowEditField = editing && editable && (key === 'nickname' || key === 'bio');
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {allowEditField ? (
          <TextInput
            style={styles.fieldInput}
            value={String(value || '')}
            onChangeText={(text) => {
              setUserProfile(prev => {
                // Handle array notation for nested objects
                if (key.includes('[')) {
                  // For array items like references[0].name
                  const parts = key.match(/(.+)\[(\d+)\]\.(.+)/);
                  if (parts) {
                    const [_, arrayName, indexStr, propName] = parts;
                    const index = parseInt(indexStr);
                    const newArray = [...(prev[arrayName] || [])];
                    if (newArray[index]) {
                      newArray[index] = { ...newArray[index], [propName]: text };
                    }
                    return { ...prev, [arrayName]: newArray };
                  }
                }
                return { ...prev, [key]: text };
              });
            }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={styles.fieldValue}>{value || 'Not provided'}</Text>
        )}
      </View>
    );
  };
  
  // Grid tab for two-row layout
  const renderGridTab = (name, title, icon) => (
    <TouchableOpacity 
      style={[
        styles.gridTab, 
        activeSection === name ? styles.activeGridTab : {}
      ]}
      onPress={() => setActiveSection(name)}
      activeOpacity={0.6}
    >
      <MaterialIcons 
        name={icon} 
        size={18}
        color={activeSection === name ? "#4051B5" : "#6B7280"} 
        style={styles.gridTabIcon}
      />
      <Text style={[
        styles.gridTabText,
        activeSection === name ? styles.activeGridTabText : {}
      ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
  
  // Legacy function kept for compatibility
  const renderSectionTab = (name, title, icon) => (
    <TouchableOpacity 
      style={[
        styles.sectionTab, 
        activeSection === name ? styles.activeSectionTab : {}
      ]}
      onPress={() => setActiveSection(name)}
      activeOpacity={0.6}
    >
      <MaterialIcons 
        name={icon} 
        size={14}
        color={activeSection === name ? "#4051B5" : "#6B7280"} 
      />
      <Text style={[
        styles.sectionTabText,
        activeSection === name ? styles.activeSectionTabText : {}
      ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  // Next button component for section navigation
  const NextButton = () => (
    <TouchableOpacity 
      style={styles.nextButton}
      onPress={goToNextSection}
      activeOpacity={0.7}
    >
      <Text style={styles.nextButtonText}>Next</Text>
      <MaterialIcons 
        name="arrow-forward" 
        size={18}
        color="#FFFFFF" 
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4051B5" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0a2850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        {/* We're hiding the edit button in the header since we now have one in profile section */}
        <View style={styles.editButton}>
          {/* Empty view to maintain header layout */}
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
    {/* Profile header removed per request (avatar, name and edit controls) */}

        {/* Section Tabs - Two-row grid layout for better visibility on mobile */}
        <View style={styles.sectionTabsContainer}>
          {/* First Row of Tabs */}
          <View style={styles.tabRow}>
            {renderGridTab('personal', 'Personal', 'person')}
            {renderGridTab('current_address', 'Current Address', 'location-on')}
            {renderGridTab('permanent_address', 'Permanent Address', 'home')}
            {renderGridTab('education', 'Education', 'school')}
          </View>
          
          {/* Second Row of Tabs */}
          <View style={styles.tabRow}>
            {renderGridTab('professional', 'Professional', 'business-center')}
            {renderGridTab('references', 'References', 'contacts')}
            {renderGridTab('legal', 'Legal Docs', 'gavel')}
            {/* Empty spacer tab to balance the layout */}
            <View style={styles.emptyTab} />
          </View>
        </View>

        {/* quick link removed: My Appreciations (moved/removed to avoid duplication) */}

        {/* Personal Information - Updated to match web app */}
        {activeSection === 'personal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.sectionContent}>
              {renderField("Father's Name", userProfile.fatherName, 'fatherName', "Enter father's name")}
              {renderField("Mother's Name", userProfile.motherName, 'motherName', "Enter mother's name")}
              {renderField('Email', userProfile.email, 'email', 'Enter email address', true, 'email-address')}
              {renderField('Phone Number', userProfile.phoneNumber, 'phoneNumber', 'Enter phone number', true, 'phone-pad')}
              {renderField('Date of Birth', userProfile.dateOfBirth, 'dateOfBirth', 'DD/MM/YYYY')}
              {renderField('Gender', userProfile.gender, 'gender', 'Enter gender')}
              {renderField('Marital Status', userProfile.maritalStatus, 'maritalStatus', 'Enter marital status')}
            </View>
            <NextButton />
          </View>
        )}

        {/* Current Address - Updated to match web app */}
        {activeSection === 'current_address' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Address</Text>
            <View style={styles.sectionContent}>
              {renderField('Complete Address', userProfile.currentAddress, 'currentAddress', 'Enter complete address')}
              {renderField('Landmark', userProfile.currentLandmark, 'currentLandmark', 'Enter landmark')}
              {renderField('City', userProfile.currentCity, 'currentCity', 'Enter city')}
              {renderField('State', userProfile.currentState, 'currentState', 'Enter state')}
              {renderField('PIN Code', userProfile.currentPinCode, 'currentPinCode', 'Enter PIN code', true, 'numeric')}
              {renderField('Nearest Police Station', userProfile.currentPoliceStation, 'currentPoliceStation', 'Enter nearest police station')}
              {renderField('Duration From', userProfile.currentDurationFrom, 'currentDurationFrom', 'DD MMM YYYY')}
              {renderField('Duration To', userProfile.currentDurationTo, 'currentDurationTo', 'DD MMM YYYY')}
            </View>
            <NextButton />
          </View>
        )}
        
        {/* Permanent Address - Added as separate section to match web app */}
        {activeSection === 'permanent_address' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permanent Address</Text>
            <View style={styles.sectionContent}>
              {renderField('Complete Address', userProfile.permanentAddress, 'permanentAddress', 'Enter complete address')}
              {renderField('Landmark', userProfile.permanentLandmark, 'permanentLandmark', 'Enter landmark')}
              {renderField('City', userProfile.permanentCity, 'permanentCity', 'Enter city')}
              {renderField('State', userProfile.permanentState, 'permanentState', 'Enter state')}
              {renderField('PIN Code', userProfile.permanentPinCode, 'permanentPinCode', 'Enter PIN code', true, 'numeric')}
              {renderField('Nearest Police Station', userProfile.permanentPoliceStation, 'permanentPoliceStation', 'Enter nearest police station')}
              {renderField('Duration From', userProfile.permanentDurationFrom, 'permanentDurationFrom', 'DD MMM YYYY')}
              {renderField('Duration To', userProfile.permanentDurationTo, 'permanentDurationTo', 'DD MMM YYYY')}
            </View>
            <NextButton />
          </View>
        )}

        {/* Educational Qualifications - Added to match web app */}
        {activeSection === 'education' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Educational Qualifications</Text>
            
            {Array.isArray(userProfile.educationDetails) && userProfile.educationDetails.length > 0 ? (
              userProfile.educationDetails.map((edu, index) => (
                <View key={index} style={styles.sectionContent}>
                  <Text style={styles.subTitle}>Education {index + 1}</Text>
                  {/* Match field names from the API response in the screenshot */}
                  {/* Log education data for debugging */}
                  {__DEV__ && console.log(`Education ${index} data:`, edu)}
                  
                  {renderField('Institute Name', edu?.institution_name || edu?.institute_name, `educationDetails[${index}].institution_name`, 'Enter institute name')}
                  {renderField('Course Name', edu?.degree || edu?.course_name, `educationDetails[${index}].degree`, 'Enter degree/course name')}
                  {renderField('Passing Year', edu?.year_of_passing || edu?.passing_year, `educationDetails[${index}].year_of_passing`, 'Enter passing year')}
                  {renderField('Registration No.', edu?.registration_no, `educationDetails[${index}].registration_no`, 'Enter registration no.')}
                  {renderField('Mode', edu?.mode || edu?.study_mode || edu?.course_mode, `educationDetails[${index}].mode`, 'Enter mode (REGULAR/DISTANCE)')}
                </View>
              ))
            ) : (
              <View style={styles.sectionContent}>
                <Text style={styles.emptyMessage}>No educational details provided</Text>
                
                {/* Add Education button for empty state */}
                {/* Add Education disabled: only nickname and bio are editable per requirements */}
              </View>
            )}
            <NextButton />
          </View>
        )}

        {/* Professional Information - Updated to match web app */}
        {activeSection === 'professional' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Previous Organization Details</Text>
            <View style={styles.sectionContent}>
              {renderField('Organization Name', userProfile.currentEmployer, 'currentEmployer', 'Enter organization name')}
              {renderField('Organization Address', userProfile.organizationAddress, 'organizationAddress', 'Enter organization address')}
              {renderField('Designation', userProfile.designation, 'designation', 'Enter designation')}
              {renderField('Employee Code', userProfile.employeeCode, 'employeeCode', 'Enter employee code')}
              {renderField('Date of Joining', userProfile.dateOfJoining, 'dateOfJoining', 'DD/MM/YYYY')}
              {renderField('Last Working Day', userProfile.lastWorkingDay, 'lastWorkingDay', 'DD/MM/YYYY')}
              {renderField('Salary (CTC)', userProfile.salary, 'salary', 'Enter salary', true, 'numeric')}
              {renderField('Reason for Leaving', userProfile.reasonForLeaving, 'reasonForLeaving', 'Enter reason for leaving')}
            </View>
            
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>Reporting Manager/Supervisor Details</Text>
            <View style={styles.sectionContent}>
              {renderField('Manager Name', userProfile.managerName, 'managerName', 'Enter manager name')}
              {renderField('Manager Contact Number', userProfile.managerContactNumber, 'managerContactNumber', 'Enter manager phone', true, 'phone-pad')}
              {renderField('Manager Email ID', userProfile.managerEmailId, 'managerEmailId', 'Enter manager email', true, 'email-address')}
            </View>

            <Text style={[styles.sectionTitle, {marginTop: 20}]}>HR Details</Text>
            {__DEV__ && console.log('HR Details:', userProfile.hrDetails)}
            
            {Array.isArray(userProfile.hrDetails) && userProfile.hrDetails.length > 0 ? (
              userProfile.hrDetails.map((hr, index) => (
                <View key={index} style={[styles.sectionContent, index > 0 ? {marginTop: 10} : {}]}>
                  <Text style={styles.subTitle}>HR Contact {index + 1}</Text>
                  {renderField('Name', hr.name || 'Not available', `hrDetails[${index}].name`, 'Enter HR name')}
                  {renderField('Contact', hr.contact || 'Not available', `hrDetails[${index}].contact`, 'Enter HR contact', true, 'phone-pad')}
                  {renderField('Email', hr.email || 'Not available', `hrDetails[${index}].email`, 'Enter HR email', true, 'email-address')}
                </View>
              ))
            ) : (
              <View style={styles.sectionContent}>
                <Text style={styles.emptyMessage}>No HR details provided</Text>
                
                {/* Add HR Contact button for empty state */}
                {/* Add HR Contact disabled: only nickname and bio are editable per requirements */}
              </View>
            )}
            <NextButton />
          </View>
        )}

        {/* Professional References - Added to match web app */}
        {activeSection === 'references' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional References</Text>
            {__DEV__ && console.log('References data:', JSON.stringify(userProfile.references))}
            
            {userProfile.references && userProfile.references.length > 0 ? (
              userProfile.references.map((ref, index) => (
                <View key={index} style={[styles.sectionContent, index > 0 ? {marginTop: 10} : {}]}>
                  <Text style={styles.subTitle}>Reference {index + 1}</Text>
                  {__DEV__ && console.log(`Reference ${index} after mapping:`, JSON.stringify(ref))}
                  {renderField('Name', ref?.name || '', `references[${index}].name`, 'Enter reference name')}
                  {renderField('Organization', ref?.organization || '', `references[${index}].organization`, 'Enter organization')}
                  {renderField('Designation/Relation', ref?.designation_relation || '', `references[${index}].designation_relation`, 'Enter designation/relation')}
                  {renderField('Contact', ref?.contact || '', `references[${index}].contact`, 'Enter contact number', true, 'phone-pad')}
                  {renderField('Email', ref?.email || '', `references[${index}].email`, 'Enter email', true, 'email-address')}
                </View>
              ))
            ) : (
              <View style={styles.sectionContent}>
                <Text style={styles.emptyMessage}>No references provided</Text>
                
                {/* Add Reference button for empty state */}
                {/* Add Reference disabled: only nickname and bio are editable per requirements */}
              </View>
            )}
            
            {/* Add Reference button when references exist */}
            {/* Add Another Reference disabled: editing of references is not allowed */}
            <NextButton />
          </View>
        )}

        {/* Government & Legal Documents - Added to match web app */}
        {activeSection === 'legal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Government & Legal Documents</Text>
            <Text style={styles.sectionSubtitle}>These details are protected and cannot be modified from here.</Text>
            <View style={styles.sectionContent}>
              {renderField('Aadhar Number', userProfile.aadharNumber, 'aadharNumber', 'Enter Aadhar number', false)}
              {renderField('PAN Number', userProfile.panNumber, 'panNumber', 'Enter PAN number', false)}
              {renderField('UAN Number', userProfile.uanNumber, 'uanNumber', 'Enter UAN number', false)}
              {renderField('Passport Number', userProfile.passportNumber, 'passportNumber', 'Enter passport number', false)}
              {renderField('Driving License', userProfile.drivingLicense, 'drivingLicense', 'Enter driving license number', false)}
            </View>
            <NextButton />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a2850',
  },
  editButton: {
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileImageContainer: {
    marginRight: 16,
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4051B5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileNickname: {
    fontSize: 15,
    color: '#4051B5',
    fontWeight: '600',
    marginBottom: 4
  },
  profileBio: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4051B5',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  
  // Section tabs container for two-row grid layout
  sectionTabsContainer: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    width: '100%',
    marginTop: 10,
  },
  // Tab row style for grid layout
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  // Grid tab style for two-row layout
  gridTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeGridTab: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  gridTabIcon: {
    marginBottom: 4,
  },
  gridTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  activeGridTabText: {
    color: '#4051B5',
    fontWeight: '600',
  },
  emptyTab: {
    flex: 1,
    marginHorizontal: 4,
  },
  // Legacy styles kept for compatibility
  sectionTabs: {
    maxHeight: 40,
    width: '100%',
  },
  sectionTabsContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    marginHorizontal: 2,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 70,
    maxWidth: 90,
  },
  activeSectionTab: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  sectionTabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 2,
    textAlign: 'center',
  },
  activeSectionTabText: {
    color: '#4051B5',
    fontWeight: '600',
  },
  
  // Section content styles
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fieldContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    color: '#111827',
  },
  fieldInput: {
    fontSize: 15,
    color: '#111827',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 6,
    marginBottom: 8,
    marginLeft: 16,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#9CA3AF',
    padding: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4051B5',
    marginLeft: 4,
  },
  bottomPadding: {
    height: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4051B5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 8,
  },
  smallLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600'
  },
  nicknameInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827'
  },
  bioInputShort: {
    height: 68,
    textAlignVertical: 'top'
  },
  profileInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8
  },
  profileEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  profileEditButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4051B5',
    marginLeft: 4
  }
  ,
  viewAppreciationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4051B5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8
  },
  viewAppreciationsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8
  }
});

export default UserDetails;
