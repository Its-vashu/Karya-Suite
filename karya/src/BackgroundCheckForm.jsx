import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Modal,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL_EXPORT as API_BASE_URL } from './api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from './theme/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Helper function to capitalize the first letter of each word
const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

// Reusable InputField component for better code quality and reusability
const InputField = ({ label, value, onChangeText, onBlur, error, placeholder, multiline, numberOfLines, keyboardType, style, isRequired, autoCapitalize, maxLength }) => (
  <View style={[styles.inputContainer, style]}>
    <Text style={styles.inputLabel}>
      {label}
      {isRequired && <Text style={styles.requiredIndicator}> *</Text>}
    </Text>
    <TextInput
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder={placeholder}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
  placeholderTextColor={theme.colors.muted}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const BackgroundCheckForm = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    candidateName: user?.full_name || user?.name || '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    maritalStatus: '',
    emailId: user?.email || '',
    contactNumber: user?.phone || '',
    alternateContactNumber: '',
    aadhaarCardNumber: '',
    panNumber: '',
    uanNumber: '',
    currentCompleteAddress: '',
    currentLandmark: '',
    currentCity: '',
    currentState: '',
    currentPinCode: '',
    currentPoliceStation: '',
    currentDurationFrom: '',
    currentDurationTo: '',
    permanentCompleteAddress: '',
    permanentLandmark: '',
    permanentCity: '',
    permanentState: '',
    permanentPinCode: '',
    permanentPoliceStation: '',
    permanentDurationFrom: '',
    permanentDurationTo: '',
    educationDetails: [{
      instituteName: '',
      courseName: '',
      passingYear: '',
      registrationNumber: '',
      mode: 'REGULAR'
    }],
    organizationName: '',
    organizationAddress: '',
    designation: '',
    employeeCode: '',
    dateOfJoining: '',
    lastWorkingDay: '',
    salary: '',
    reasonForLeaving: '',
    managerName: '',
    managerContactNumber: '',
    managerEmailId: '',
    hrDetails: [{
      name: '',
      contactNumber: '',
      emailId: ''
    }],
    referenceDetails: [{
      refereeName: '',
      organizationName: '',
      designation: '',
      contactNumber: '',
      emailId: ''
    }],
    verificationChecks: {
      educationVerification: false,
      employmentVerification: false,
      addressCriminalVerification: false,
      identityVerification: false,
      cibilVerification: false
    },
    candidateNameAuth: '',
    signature: '',
    authDate: new Date().toISOString().split('T')[0],
    acknowledgment: false, // Changed to a boolean for consistency
  });

  // Helper: format an ISO timestamp string to device local readable string
  const formatIsoToLocal = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  // Helper: convert server error detail (could be array/object) to safe string for Alert
  const safeMessage = (maybeMsg) => {
    if (!maybeMsg) return '';
    if (typeof maybeMsg === 'string') return maybeMsg;
    try {
      // If it's array or object, join or stringify
      if (Array.isArray(maybeMsg)) return maybeMsg.join('\n');
      return JSON.stringify(maybeMsg);
    } catch (e) {
      return String(maybeMsg);
    }
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [showLoadScreen, setShowLoadScreen] = useState(true);  // Add this state to control showing the load screen
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [formId, setFormId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [maritalModalVisible, setMaritalModalVisible] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [emailToLoad, setEmailToLoad] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formStatusChecked, setFormStatusChecked] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);

  // Form steps data
  const steps = [
    { title: 'Personal', desc: 'Personal Information' },
    { title: 'Address', desc: 'Address Details' },
    { title: 'Education', desc: 'Educational Qualifications' },
    { title: 'Employment', desc: 'Employment Details' },
    { title: 'References', desc: 'Professional References' },
    { title: 'Authorization', desc: 'Authorization & Checks' }
  ];

  // Validation rules based on web version
  const validators = {
    email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    phone: (phone) => /^[6-9]\d{9}$/.test(String(phone).replace(/\D/g, '')),
    aadhaar: (aadhaar) => /^\d{12}$/.test(String(aadhaar)),
    pinCode: (pinCode) => /^\d{6}$/.test(String(pinCode))
  };

  // Handles input changes with on-the-fly validation and formatting
  const handleInputChange = useCallback((field, value) => {
    let processedValue = value;
    if (['candidateName', 'fatherName', 'motherName', 'signature', 'candidateNameAuth'].includes(field)) {
      processedValue = toTitleCase(value);
    } else if (field === 'panNumber') {
      // Don't modify case while typing to avoid cursor/duplication issues; normalize on blur instead
      processedValue = value;
    } else if (field.includes('Phone') || field.includes('Contact')) {
      // Clean non-numeric characters for phone fields
      processedValue = value.replace(/\D/g, '');
    } else if (field.includes('PinCode')) {
      // Clean non-numeric characters for PIN code fields
      processedValue = value.replace(/\D/g, '');
    }

    setFormData(prev => {
      if (prev[field] === processedValue) return prev;
      return { ...prev, [field]: processedValue };
    });

    // Check validation and set error state
    let error = '';
    if (processedValue) {
      if ((field.includes('email') || field === 'emailId') && !validators.email(processedValue)) {
        error = 'Invalid email format';
      } else if ((field.includes('contact') || field.includes('Contact')) && processedValue.length > 0 && !validators.phone(processedValue)) {
        error = 'Enter a valid 10-digit number';
      } else if (field === 'aadhaarCardNumber' && processedValue.length > 0 && !validators.aadhaar(processedValue)) {
        error = 'Enter a valid 12-digit Aadhaar number';
      } else if (field.includes('PinCode') && processedValue.length > 0 && !validators.pinCode(processedValue)) {
        error = 'Enter a valid 6-digit PIN code';
      }
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [validators]);

  // Handles date picker changes
  const onDateChange = useCallback((event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleInputChange(currentDateField, formattedDate);
    }
  }, [currentDateField, handleInputChange]);

  // Handles changes for array fields (education, HR, etc.)
  const handleArrayChange = useCallback((arrayName, index, field, value) => {
    let processedValue = value;
    if (['name', 'refereeName'].includes(field)) {
      processedValue = toTitleCase(value);
    }
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) =>
        i === index ? { ...item, [field]: processedValue } : item
      )
    }));
  }, []);

  // Adds a new item to an array field
  const addArrayItem = useCallback((arrayName, template) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], template]
    }));
  }, []);

  // Removes an item from an array field
  const removeArrayItem = useCallback((arrayName, index) => {
    if (formData[arrayName].length > 1) {
      setFormData(prev => ({
        ...prev,
        [arrayName]: prev[arrayName].filter((_, i) => i !== index)
      }));
    }
  }, [formData]);

  // Copies current address to permanent address
  const copyAddress = useCallback(() => {
    setIsCopying(true);
    const updates = {
      permanentCompleteAddress: formData.currentCompleteAddress,
      permanentLandmark: formData.currentLandmark,
      permanentCity: formData.currentCity,
      permanentState: formData.currentState,
      permanentPinCode: formData.currentPinCode,
      permanentPoliceStation: formData.currentPoliceStation,
      permanentDurationFrom: formData.currentDurationFrom,
      permanentDurationTo: formData.currentDurationTo,
    };
    setFormData(prev => ({ ...prev, ...updates }));
    setIsCopying(false);
    Alert.alert('Address Copied', 'Current address has been copied to permanent address.');
  }, [formData]);

  // Check form status when component loads
  useEffect(() => {
    const checkInitialFormStatus = async () => {
      if (user?.email && !formStatusChecked) {
        setLoading(true);
        try {
          // Check if user already has a submitted form
          const result = await checkFormStatus(user.email);
          setFormStatusChecked(true);
          
          // If form exists and is approved, display success screen
          if (result?.exists && result.status === 'approved') {
            console.log('Setting success screen to true');
            setFormId(result.id);
            setFormStatus('approved');
            setShowSuccessScreen(true);
            setEmailToLoad(user.email); // Set the email in the input field
          }
        } catch (error) {
          console.error("Error checking form status:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    checkInitialFormStatus();
  }, [user?.email, formStatusChecked]);

  // Performs final validation before submission
  const validateFormOnSubmit = useCallback(() => {
    const newErrors = {};
    const requiredFields = {
      1: ['candidateName', 'fatherName', 'emailId', 'contactNumber', 'dateOfBirth'],
      2: ['currentCompleteAddress', 'permanentCompleteAddress'],
      3: [],
      4: ['organizationName', 'designation'],
      5: ['refereeName'],
      6: ['candidateNameAuth', 'acknowledgment']
    };

    // Global field validation
    if (!formData.candidateName.trim()) newErrors.candidateName = 'Candidate name is required.';
    if (!formData.fatherName.trim()) newErrors.fatherName = 'Father name is required.';
    if (!formData.emailId.trim() || !validators.email(formData.emailId)) newErrors.emailId = 'Valid email is required.';
    if (!formData.contactNumber.trim() || !validators.phone(formData.contactNumber)) newErrors.contactNumber = 'Valid contact number is required.';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required.';
    if (formData.acknowledgment !== true) newErrors.acknowledgment = 'Acknowledgment is required.';

    // Address validation
    if (!formData.currentCompleteAddress.trim()) newErrors.currentCompleteAddress = 'Current address is required.';
    if (!formData.permanentCompleteAddress.trim()) newErrors.permanentCompleteAddress = 'Permanent address is required.';
    if (formData.currentPinCode && !validators.pinCode(formData.currentPinCode)) newErrors.currentPinCode = 'Invalid PIN code.';
    if (formData.permanentPinCode && !validators.pinCode(formData.permanentPinCode)) newErrors.permanentPinCode = 'Invalid PIN code.';
    
    // Employment validation
    if (formData.organizationName && !formData.organizationName.trim()) newErrors.organizationName = 'Organization name is required.';
    if (formData.designation && !formData.designation.trim()) newErrors.designation = 'Designation is required.';
    
    // Education validation
    formData.educationDetails.forEach((edu, index) => {
      if (!edu.courseName.trim()) newErrors[`education_${index}_course`] = 'Course is required.';
      if (!edu.instituteName.trim()) newErrors[`education_${index}_institute`] = 'Institute is required.';
    });

    // Reference validation
    formData.referenceDetails.forEach((ref, index) => {
      if (!ref.refereeName.trim()) newErrors[`reference_${index}_name`] = 'Referee name is required.';
    });

  setErrors(newErrors);
  return { ok: Object.keys(newErrors).length === 0, errors: newErrors };
  }, [formData, validators]);

  // Submits the form
  // Actual network submit (extracted so we can optionally bypass validation)
  const performSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Transform data to match backend schema like the web version
      const submissionData = {
        ...transformFormDataForSubmission(formData),
    // send full ISO timestamp (UTC) so server stores an unambiguous time
    submissionDate: new Date().toISOString(),
        status: 'pending'
      };
      
  console.log('Submitting payload:', submissionData);
  const response = await fetch(`${API_BASE_URL}/api/background-check/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        const result = await response.json();
        setFormId(result.id);
        setFormStatus('pending');
        setShowSuccessScreen(true);
  setLastSubmittedAt(new Date().toISOString());
  // No immediate copy prompt: user can download PDF from the pending screen
      } else {
        let parsed;
        try {
          parsed = await response.json();
        } catch (e) {
          parsed = await response.text().catch(() => null);
        }
  console.warn('Submit failed:', response.status, parsed);
  // Show the full parsed error to the user for debugging
  Alert.alert('Submit Error', safeMessage(parsed) || `Failed to submit form (status ${response.status})`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transform data to match backend schema
  const transformFormDataForSubmission = (data) => {
    const ensureDate = (dateValue) => {
      if (!dateValue) return null;
      if (typeof dateValue === 'string') return dateValue;
      return new Date(dateValue).toISOString().split('T')[0];
    };
    
    // Format phone numbers to be 10-digit strings (remove non-digits)
    const formatPhoneNumber = (phone) => {
      if (!phone) return '0000000000';  // Default value if empty
      const digits = String(phone).replace(/\D/g, '');
      // Ensure exactly 10 digits - pad if shorter, truncate if longer
      if (digits.length < 10) {
        return digits.padStart(10, '0');
      }
      return digits.slice(0, 10);
    };
    
    // Format Aadhaar to be a 12-digit string
    const formatAadhaar = (aadhaar) => {
      if (!aadhaar) return '000000000000';  // Default value if empty
      const digits = String(aadhaar).replace(/\D/g, '');
      // Ensure exactly 12 digits
      if (digits.length < 12) {
        return digits.padStart(12, '0');
      }
      return digits.slice(0, 12);
    };
    
    // Format PIN code to be a 6-digit string
    const formatPinCode = (pinCode) => {
      if (!pinCode) return '000000';  // Default value if empty
      const digits = String(pinCode).replace(/\D/g, '');
      // Ensure exactly 6 digits
      if (digits.length < 6) {
        return digits.padStart(6, '0');
      }
      return digits.slice(0, 6);
    };
    
    // Clean and validate email
    const formatEmail = (email) => {
      if (!email) return '';
      return String(email).trim().replace(/\s+/g, '');
    };

    return {
      ...data,
      emailId: formatEmail(data.emailId),
      managerEmailId: formatEmail(data.managerEmailId),
      contactNumber: parseInt(formatPhoneNumber(data.contactNumber)) || 0,
      alternateContactNumber: parseInt(formatPhoneNumber(data.alternateContactNumber)) || 0,
      aadhaarCardNumber: parseInt(formatAadhaar(data.aadhaarCardNumber)) || 0,
      uanNumber: data.uanNumber ? parseInt(String(data.uanNumber).replace(/\D/g, '')) || 0 : 0,
      currentPinCode: parseInt(formatPinCode(data.currentPinCode)) || 0,
      permanentPinCode: parseInt(formatPinCode(data.permanentPinCode)) || 0,
      managerContactNumber: parseInt(formatPhoneNumber(data.managerContactNumber)) || 0,
      dateOfBirth: ensureDate(data.dateOfBirth),
      currentDurationFrom: ensureDate(data.currentDurationFrom || new Date()),
      currentDurationTo: ensureDate(data.currentDurationTo),
      permanentDurationFrom: ensureDate(data.permanentDurationFrom || new Date()),
      permanentDurationTo: ensureDate(data.permanentDurationTo),
      dateOfJoining: ensureDate(data.dateOfJoining),
      lastWorkingDay: ensureDate(data.lastWorkingDay),
      authDate: ensureDate(data.authDate),
      educationDetails: data.educationDetails.map(ed => ({
        institution_name: ed.instituteName || "",
        degree: ed.courseName || "",
        field_of_study: ed.courseName || "",
        year_of_passing: parseInt(ed.passingYear) || 0,
        percentage_or_cgpa: ed.registrationNumber || ""
      })),
      hrDetails: data.hrDetails.map(hr => ({
        hr_name: hr.name || "",
        designation: hr.designation || "HR",
        hr_contact_number: parseInt(formatPhoneNumber(hr.contactNumber)) || 0,
        hr_email_id: formatEmail(hr.emailId) || "placeholder@example.com"
      })),
      referenceDetails: data.referenceDetails.map(ref => ({
        ref_name: ref.refereeName || "",
        relationship: ref.designation || "Professional",
        ref_contact_number: parseInt(formatPhoneNumber(ref.contactNumber)) || 0,
        ref_email_id: formatEmail(ref.emailId) || "placeholder@example.com",
        address: ref.organizationName || ""
      })),
      verificationChecks: {
        address_verification: data.verificationChecks?.addressCriminalVerification ? 'true' : 'false',
        employment_verification: data.verificationChecks?.employmentVerification ? 'true' : 'false',
        education_verification: data.verificationChecks?.educationVerification ? 'true' : 'false',
        criminal_record_check: data.verificationChecks?.addressCriminalVerification ? 'true' : 'false',
        reference_check: 'false',
        identity_verification: data.verificationChecks?.identityVerification ? 'true' : 'false',
        drug_test: 'false',
        credit_check: data.verificationChecks?.cibilVerification ? 'true' : 'false'
      },
      acknowledgment: data.acknowledgment ? 'true' : 'false'
    };
  };

  // Save draft handler
  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      // Transform data to match backend schema
      const submissionData = transformFormDataForSubmission(formData);
      
      const response = await fetch(`${API_BASE_URL}/api/background-check/save-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
  const res = await response.json();
  Alert.alert('Draft Saved', safeMessage(res.message) || 'Draft saved successfully');
      } else {
        const err = await response.json().catch(() => ({}));
  Alert.alert('Error', safeMessage(err.detail) || 'Failed to save draft');
      }
    } catch (e) {
      console.error('Save draft error', e);
      Alert.alert('Error', 'Network error while saving draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Check form status by email
  const checkFormStatus = async (email) => {
    try {
      const normalize = (e) => (e ? String(e).trim().toLowerCase() : '');
      const normalizedEmail = normalize(email);
      console.log('Checking status (via profile) for email:', email, '->', normalizedEmail);

      // Use the backend profile endpoint which returns the most recent form (draft or submitted)
      const resp = await fetch(`${API_BASE_URL}/api/background-check/profile/${encodeURIComponent(normalizedEmail)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (resp.status === 404) {
        console.log('No profile/form found for email:', normalizedEmail);
        return { exists: false };
      }

      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        console.warn('Profile endpoint returned non-ok:', resp.status, err);
        return { exists: false, error: err };
      }

      const data = await resp.json();
      console.log('Profile response data:', data);

      // The backend returns a form object; determine its status
      const status = data.status || data.form_status || null;
      const id = data.id || data.form_id || null;

      if (!status) {
        // If backend returned a draft-like shape without explicit status, treat as draft
        return { exists: true, status: 'draft', id };
      }

      // Normalize statuses to expected values
      if (status === 'approved' || status === 'pending' || status === 'rejected' || status === 'draft') {
        return { exists: true, status, id };
      }

      // Fallback: no usable status
      return { exists: true, status: status, id };
    } catch (error) {
      console.error('Status check (profile) error:', error);
      return { exists: false, error };
    }
  };

  // Load form by email
  const handleLoadByEmail = async () => {
    // Validate the email format
    if (!emailToLoad || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToLoad)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    
    // Reset the form state first and ensure email is used consistently across the form
    const resetFormWithEmail = {
      ...formData,
      candidateName: user?.full_name || user?.name || '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      maritalStatus: '',
      emailId: emailToLoad,  // Set the email in the form data
      contactNumber: user?.phone || '',
      alternateContactNumber: '',
      // Reset other fields but keep the email
    };
    
    // Reset all form state except email
    setFormData(resetFormWithEmail);
    setShowSuccessScreen(false);
    setFormStatus(null);
    setFormId(null);
    setCurrentStep(1);  // Start at step 1 for new entries
    
    // Don't switch from load screen yet - wait for the API check
    // We'll switch screens based on what the API returns
    // setShowLoadScreen(false); - REMOVED THIS LINE

    setLoading(true);
    try {
      console.log('Loading form by email:', emailToLoad);
      
      // First check if form already exists in any status
      const statusCheck = await checkFormStatus(emailToLoad);
      console.log('Status check result:', statusCheck);
      
      // Always update the email in the form regardless of result
      setFormData(prev => ({
        ...prev,
        emailId: emailToLoad
      }));
      
      if (statusCheck && statusCheck.exists) {
        // If form exists, handle based on its status
        if (statusCheck.status === 'approved') {
          // Set the email to display in the form
          setFormData(prev => ({
            ...prev,
            emailId: emailToLoad
          }));
          setEmailToLoad(emailToLoad); // Ensure the email is stored in the field
          setFormId(statusCheck.id);
          setFormStatus('approved');
          setShowSuccessScreen(true);
          // IMPORTANT: For approved forms, don't show load screen, but also don't show form screen
          // Keep showLoadScreen=false so it shows success screen
          setShowLoadScreen(false);
        } else if (statusCheck.status === 'pending') {
          // If the form is pending, do NOT load the editable submit page.
          // Show a pending message/screen instead and prevent resubmission.
          setFormId(statusCheck.id);
          setFormStatus('pending');
          setEmailToLoad(emailToLoad);
          setShowSuccessScreen(true);
          setShowLoadScreen(false);
          Alert.alert('Form Pending', 'Your form has already been submitted and is pending HR review.');
        } else if (statusCheck.status === 'rejected') {
          // Rejected: allow loading for editing/resubmit
          try {
            const response = await fetch(`${API_BASE_URL}/api/background-check/form/${statusCheck.id}`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (response.ok) {
              const data = await response.json();
              console.log('Loaded form data:', data);

              // Convert snake_case to camelCase for form fields
              const processed = {};
              Object.keys(data).forEach(key => {
                if (key === 'id' || key === 'status' || key === 'created_at' || key === 'updated_at') {
                  return; // Skip these fields
                }
                const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
                processed[camelKey] = data[key];
              });

              setFormData(prev => ({ ...prev, ...processed }));

              Alert.alert('Form Rejected', 'This form was rejected. You may edit and resubmit it.');

              // For rejected forms, show the form screen
              setShowLoadScreen(false);
            }
          } catch (err) {
            console.error("Error loading form data:", err);
            Alert.alert('Error', 'Failed to load form data');
          }
        }
        return;
      }
      
        // If no submitted form exists, try loading a draft
        try {
          // First prepare the form for a new entry, in case no drafts are found
          // The emailId is already set above
          setShowSuccessScreen(false);
          setFormStatus(null);
          setFormId(null);
          setCurrentStep(1);
          
          const response = await fetch(`${API_BASE_URL}/api/background-check/get-draft/${encodeURIComponent(emailToLoad)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user?.token}`
            }
          });

        if (response.ok) {
          const data = await response.json();
          // Map received fields into formData structure
          setFormData(prev => ({ ...prev, ...data }));
          Alert.alert('Draft Loaded', 'Draft loaded into the form');
          // Show the form screen when a draft is loaded
          setShowLoadScreen(false);
        } else if (response.status === 404) {
          // No form or draft found, set email in form and show the form input page
          setFormData(prev => ({ 
            ...prev, 
            emailId: emailToLoad
          }));
          setShowSuccessScreen(false);
          setFormStatus(null);
          setFormId(null);
          setCurrentStep(1); // Start at the first step
          Alert.alert('New Form', 'No existing form found. You can create a new one with this email address.');
          // Show the form screen for a new form
          setShowLoadScreen(false);
        } else {
          const err = await response.json().catch(() => ({}));
          Alert.alert('Error', safeMessage(err.detail) || 'Failed to load draft');
          // Show form even on error with the email filled in
          setShowLoadScreen(false);
        }
      } catch (e) {
        console.error('Load draft error:', e);
        Alert.alert('Error', 'Network error while loading draft');
        // Set up for a new form with the entered email
        setFormData(prev => ({ 
          ...prev, 
          emailId: emailToLoad 
        }));
        setShowSuccessScreen(false);
        setFormStatus(null);
        setFormId(null);
        // Show form on error too
        setShowLoadScreen(false);
      }
    } catch (e) {
      console.error('Load form/draft error:', e);
      Alert.alert('Error', 'Network error while loading form data');
      // Set up for a new form with the entered email
      setFormData(prev => ({ 
        ...prev, 
        emailId: emailToLoad 
      }));
      setShowSuccessScreen(false);
      setFormStatus(null);
      setFormId(null);
      // Show form on network error too 
      setShowLoadScreen(false);
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF/CSV download (safe): try authenticated preflight and use RNFS if available
  const handleGenerateDocument = async (format = 'pdf') => {
    if (!formId) {
      Alert.alert('No Form ID', 'Please submit the form first to get a Form ID for download.');
      return;
    }

    setIsGenerating(true);

    const url = `${API_BASE_URL}/api/background-check/form/${formId}/download/${format}`;
    const fileExt = format === 'csv' ? 'csv' : 'pdf';
    
    // File ke liye ek unique naam banate hain
    const fileName = `background_check_${formId}_${Date.now()}.${fileExt}`;
    // File ko app ke temporary cache folder mein save karenge
    const fileUri = FileSystem.cacheDirectory + fileName;

    try {
      console.log('Downloading from:', url);
      console.log('Saving to:', fileUri);

      // Expo File System se file download karein
      const { uri } = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${user?.token}`, // Authentication token
        },
      });

      console.log('File downloaded to:', uri);

      // Check karein ki sharing available hai ya nahi
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Sharing is not available on your device.');
        setIsGenerating(false);
        return;
      }
      
      // Download hui file ko share/open karne ka option dein
      await Sharing.shareAsync(uri, { dialogTitle: 'Share or Open PDF' });

    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'File download nahi ho saki. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };


  const submitForm = async () => {
    const validation = validateFormOnSubmit();
    if (validation.ok) {
      await performSubmit();
      return;
    }

    const msgs = Object.values(validation.errors).filter(Boolean);
    const message = msgs.length ? msgs.join('\n') : 'Please check all required fields and correct any errors before submitting.';

    // Allow user to override validation and submit anyway
    Alert.alert('Validation Error', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit Anyway', onPress: () => performSubmit() }
    ]);
  };
  
  // Renders form step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Personal Information</Text>

            <InputField
              label="Full Name"
              value={formData.candidateName}
              onChangeText={(value) => handleInputChange('candidateName', value)}
              error={errors.candidateName}
              placeholder="Enter your full name"
              isRequired={true}
            />

            <InputField
              label="Father's Name"
              value={formData.fatherName}
              onChangeText={(value) => handleInputChange('fatherName', value)}
              error={errors.fatherName}
              placeholder="Enter father's name"
              isRequired={true}
            />

            <InputField
              label="Mother's Name"
              value={formData.motherName}
              onChangeText={(value) => handleInputChange('motherName', value)}
              placeholder="Enter mother's name"
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date of Birth<Text style={styles.requiredIndicator}> *</Text></Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setCurrentDateField('dateOfBirth');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.pickerText}>{formData.dateOfBirth || 'Select date'}</Text>
                <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Marital Status</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setMaritalModalVisible(true)}>
                <Text style={styles.pickerText}>{formData.maritalStatus || 'Select Status'}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              {errors.maritalStatus && <Text style={styles.errorText}>{errors.maritalStatus}</Text>}
            </View>

            <InputField
              label="Email"
              value={formData.emailId}
              onChangeText={(value) => handleInputChange('emailId', value)}
              error={errors.emailId}
              placeholder="Enter email address"
              keyboardType="email-address"
              isRequired={true}
            />

            <InputField
              label="Contact Number"
              value={formData.contactNumber}
              onChangeText={(value) => handleInputChange('contactNumber', value)}
              error={errors.contactNumber}
              placeholder="Enter 10-digit contact number"
              keyboardType="phone-pad"
              isRequired={true}
            />

            <InputField
              label="Alternate Contact Number"
              value={formData.alternateContactNumber}
              onChangeText={(value) => handleInputChange('alternateContactNumber', value)}
              error={errors.alternateContactNumber}
              placeholder="Enter alternate contact number"
              keyboardType="phone-pad"
            />

            <InputField
              label="Aadhaar Card Number"
              value={formData.aadhaarCardNumber}
              onChangeText={(value) => handleInputChange('aadhaarCardNumber', value)}
              error={errors.aadhaarCardNumber}
              placeholder="Enter 12-digit Aadhaar number"
              keyboardType="numeric"
            />

            <InputField
              label="PAN Number"
              value={formData.panNumber}
              onChangeText={(value) => handleInputChange('panNumber', value)}
              onBlur={() => handleInputChange('panNumber', (formData.panNumber || '').toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
              placeholder="Enter PAN number"
            />

            <InputField
              label="UAN Number"
              value={formData.uanNumber}
              onChangeText={(value) => handleInputChange('uanNumber', value)}
              placeholder="Enter UAN number"
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Address Details</Text>

            <Text style={styles.sectionTitle}>Current Address</Text>
            <InputField
              label="Complete Address"
              value={formData.currentCompleteAddress}
              onChangeText={(value) => handleInputChange('currentCompleteAddress', value)}
              error={errors.currentCompleteAddress}
              placeholder="Enter complete address"
              multiline
              numberOfLines={3}
              isRequired={true}
            />

            <InputField
              label="Landmark"
              value={formData.currentLandmark}
              onChangeText={(value) => handleInputChange('currentLandmark', value)}
              placeholder="Enter landmark"
            />

            <View style={styles.row}>
              <InputField
                label="City"
                value={formData.currentCity}
                onChangeText={(value) => handleInputChange('currentCity', value)}
                placeholder="Enter city"
                style={styles.halfWidth}
              />
              <InputField
                label="State"
                value={formData.currentState}
                onChangeText={(value) => handleInputChange('currentState', value)}
                placeholder="Enter state"
                style={styles.halfWidth}
              />
            </View>

            <View style={styles.row}>
              <InputField
                label="PIN Code"
                value={formData.currentPinCode}
                onChangeText={(value) => handleInputChange('currentPinCode', value)}
                error={errors.currentPinCode}
                placeholder="Enter PIN code"
                keyboardType="numeric"
                style={styles.halfWidth}
              />
              <InputField
                label="Police Station"
                value={formData.currentPoliceStation}
                onChangeText={(value) => handleInputChange('currentPoliceStation', value)}
                placeholder="Enter police station"
                style={styles.halfWidth}
              />
            </View>

            <Text style={styles.sectionTitle}>Permanent Address</Text>
            {/* Copy Current to Permanent - position moved as requested */}
            <TouchableOpacity style={[styles.copyButton, { marginTop: 8 }]} onPress={copyAddress} disabled={isCopying}>
              <MaterialIcons name="content-copy" size={16} color={theme.colors.primary} />
              <Text style={styles.copyButtonText}>
                {isCopying ? 'Copying...' : 'Copy Current to Permanent'}
              </Text>
            </TouchableOpacity>

            <InputField
              label="Complete Address"
              value={formData.permanentCompleteAddress}
              onChangeText={(value) => handleInputChange('permanentCompleteAddress', value)}
              error={errors.permanentCompleteAddress}
              placeholder="Enter complete address"
              multiline
              numberOfLines={3}
              isRequired={true}
            />

            <InputField
              label="Landmark"
              value={formData.permanentLandmark}
              onChangeText={(value) => handleInputChange('permanentLandmark', value)}
              placeholder="Enter landmark"
            />

            <View style={styles.row}>
              <InputField
                label="City"
                value={formData.permanentCity}
                onChangeText={(value) => handleInputChange('permanentCity', value)}
                placeholder="Enter city"
                style={styles.halfWidth}
              />
              <InputField
                label="State"
                value={formData.permanentState}
                onChangeText={(value) => handleInputChange('permanentState', value)}
                placeholder="Enter state"
                style={styles.halfWidth}
              />
            </View>

            <View style={styles.row}>
              <InputField
                label="PIN Code"
                value={formData.permanentPinCode}
                onChangeText={(value) => handleInputChange('permanentPinCode', value)}
                error={errors.permanentPinCode}
                placeholder="Enter PIN code"
                keyboardType="numeric"
                style={styles.halfWidth}
              />
              <InputField
                label="Police Station"
                value={formData.permanentPoliceStation}
                onChangeText={(value) => handleInputChange('permanentPoliceStation', value)}
                placeholder="Enter police station"
                style={styles.halfWidth}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Educational Qualifications</Text>

            {formData.educationDetails.map((edu, index) => (
              <View key={index} style={styles.arrayItemContainer}>
                <View style={styles.arrayItemHeader}>
                  <Text style={styles.arrayItemTitle}>Education {index + 1}</Text>
                  {formData.educationDetails.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeArrayItem('educationDetails', index)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="delete" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <InputField
                  label="Institute Name"
                  value={edu.instituteName}
                  onChangeText={(value) => handleArrayChange('educationDetails', index, 'instituteName', value)}
                  error={errors[`education_${index}_institute`]}
                  placeholder="Enter institute name"
                  isRequired={true}
                />

                <InputField
                  label="Course Name"
                  value={edu.courseName}
                  onChangeText={(value) => handleArrayChange('educationDetails', index, 'courseName', value)}
                  error={errors[`education_${index}_course`]}
                  placeholder="Enter course name"
                  isRequired={true}
                />

                <View style={styles.row}>
                  <InputField
                    label="Passing Year"
                    value={edu.passingYear}
                    onChangeText={(value) => handleArrayChange('educationDetails', index, 'passingYear', value)}
                    placeholder="Enter passing year"
                    keyboardType="numeric"
                    style={styles.halfWidth}
                  />
                  <InputField
                    label="Registration No."
                    value={edu.registrationNumber}
                    onChangeText={(value) => handleArrayChange('educationDetails', index, 'registrationNumber', value)}
                    placeholder="Enter registration number"
                    style={styles.halfWidth}
                  />
                </View>

                <InputField
                  label="Mode"
                  value={edu.mode}
                  onChangeText={(value) => handleArrayChange('educationDetails', index, 'mode', value)}
                  placeholder="REGULAR/DISTANCE"
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addArrayItem('educationDetails', {
                instituteName: '',
                courseName: '',
                passingYear: '',
                registrationNumber: '',
                mode: 'REGULAR'
              })}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.primary} />
              <Text style={styles.addButtonText}>Add Education</Text>
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Employment Details</Text>

            <Text style={styles.sectionTitle}>Previous Organization Details</Text>
            <InputField
              label="Organization Name"
              value={formData.organizationName}
              onChangeText={(value) => handleInputChange('organizationName', value)}
              error={errors.organizationName}
              placeholder="Enter organization name"
              isRequired={true}
            />

            <InputField
              label="Organization Address"
              value={formData.organizationAddress}
              onChangeText={(value) => handleInputChange('organizationAddress', value)}
              placeholder="Enter organization address"
              multiline
              numberOfLines={2}
            />

            <InputField
              label="Designation"
              value={formData.designation}
              onChangeText={(value) => handleInputChange('designation', value)}
              error={errors.designation}
              placeholder="Enter designation"
              isRequired={true}
            />

            <InputField
              label="Employee Code"
              value={formData.employeeCode}
              onChangeText={(value) => handleInputChange('employeeCode', value)}
              placeholder="Enter employee code"
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.inputLabel}>Date of Joining</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    setCurrentDateField('dateOfJoining');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.pickerText}>{formData.dateOfJoining || 'Select date'}</Text>
                  <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                {errors.dateOfJoining && <Text style={styles.errorText}>{errors.dateOfJoining}</Text>}
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.inputLabel}>Last Working Day</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    setCurrentDateField('lastWorkingDay');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.pickerText}>{formData.lastWorkingDay || 'Select date'}</Text>
                  <MaterialIcons name="calendar-today" size={18} color="#0a2850" />
                </TouchableOpacity>
                {errors.lastWorkingDay && <Text style={styles.errorText}>{errors.lastWorkingDay}</Text>}
              </View>
            </View>

            <InputField
              label="Salary (CTC)"
              value={formData.salary}
              onChangeText={(value) => handleInputChange('salary', value)}
              placeholder="Enter salary"
              keyboardType="numeric"
            />

            <InputField
              label="Reason for Leaving"
              value={formData.reasonForLeaving}
              onChangeText={(value) => handleInputChange('reasonForLeaving', value)}
              placeholder="Enter reason for leaving"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.sectionTitle}>Reporting Manager Details</Text>
            <InputField
              label="Manager Name"
              value={formData.managerName}
              onChangeText={(value) => handleInputChange('managerName', value)}
              placeholder="Enter manager name"
            />

            <InputField
              label="Manager Contact Number"
              value={formData.managerContactNumber}
              onChangeText={(value) => handleInputChange('managerContactNumber', value)}
              error={errors.managerContactNumber}
              placeholder="Enter manager contact number"
              keyboardType="phone-pad"
            />

            <InputField
              label="Manager Email ID"
              value={formData.managerEmailId}
              onChangeText={(value) => handleInputChange('managerEmailId', value)}
              error={errors.managerEmailId}
              placeholder="Enter manager email"
              keyboardType="email-address"
            />
            
            <Text style={styles.sectionTitle}>HR Details</Text>
            {formData.hrDetails.map((hr, index) => (
                <View key={index} style={styles.arrayItemContainer}>
                    <View style={styles.arrayItemHeader}>
                        <Text style={styles.arrayItemTitle}>HR #{index + 1}</Text>
                        {formData.hrDetails.length > 1 && (
                            <TouchableOpacity
                                onPress={() => removeArrayItem('hrDetails', index)}
                                style={styles.removeButton}
                            >
                                <MaterialIcons name="delete" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <InputField
                        label="Name"
                        value={hr.name}
                        onChangeText={(value) => handleArrayChange('hrDetails', index, 'name', value)}
                    />
                    <InputField
                        label="Contact Number"
                        value={hr.contactNumber}
                        onChangeText={(value) => handleArrayChange('hrDetails', index, 'contactNumber', value)}
                        keyboardType="phone-pad"
                    />
                    <InputField
                        label="Email ID"
                        value={hr.emailId}
                        onChangeText={(value) => handleArrayChange('hrDetails', index, 'emailId', value)}
                        keyboardType="email-address"
                    />
                </View>
            ))}
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => addArrayItem('hrDetails', { name: '', contactNumber: '', emailId: '' })}
            >
                <MaterialIcons name="add" size={20} color="#0a2850" />
                <Text style={styles.addButtonText}>Add HR</Text>
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Professional References</Text>

            {formData.referenceDetails.map((ref, index) => (
              <View key={index} style={styles.arrayItemContainer}>
                <View style={styles.arrayItemHeader}>
                  <Text style={styles.arrayItemTitle}>Reference {index + 1}</Text>
                  {formData.referenceDetails.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeArrayItem('referenceDetails', index)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="delete" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <InputField
                  label="Name"
                  value={ref.refereeName}
                  onChangeText={(value) => handleArrayChange('referenceDetails', index, 'refereeName', value)}
                  error={errors[`reference_${index}_name`]}
                  placeholder="Enter reference name"
                  isRequired={true}
                />

                <InputField
                  label="Organization"
                  value={ref.organizationName}
                  onChangeText={(value) => handleArrayChange('referenceDetails', index, 'organizationName', value)}
                  placeholder="Enter organization name"
                />

                <InputField
                  label="Designation"
                  value={ref.designation}
                  onChangeText={(value) => handleArrayChange('referenceDetails', index, 'designation', value)}
                  placeholder="Enter designation"
                />

                <InputField
                  label="Contact Number"
                  value={ref.contactNumber}
                  onChangeText={(value) => handleArrayChange('referenceDetails', index, 'contactNumber', value)}
                  placeholder="Enter contact number"
                  keyboardType="phone-pad"
                />

                <InputField
                  label="Email ID"
                  value={ref.emailId}
                  onChangeText={(value) => handleArrayChange('referenceDetails', index, 'emailId', value)}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addArrayItem('referenceDetails', {
                refereeName: '',
                organizationName: '',
                designation: '',
                contactNumber: '',
                emailId: ''
              })}
            >
              <MaterialIcons name="add" size={20} color="#0a2850" />
              <Text style={styles.addButtonText}>Add Reference</Text>
            </TouchableOpacity>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Authorization & Verification Checks</Text>

            <Text style={styles.sectionTitle}>Required Background Verification:</Text>
            <View style={styles.checkboxGroup}>
                <View style={styles.checkboxItem}>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setFormData(prev => ({ ...prev, verificationChecks: { ...prev.verificationChecks, educationVerification: !prev.verificationChecks.educationVerification }}))}
                    >
                        <MaterialIcons
                            name={formData.verificationChecks.educationVerification ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color="#0a2850"
                        />
                        <Text style={styles.checkboxLabel}>Education Verification</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setFormData(prev => ({ ...prev, verificationChecks: { ...prev.verificationChecks, employmentVerification: !prev.verificationChecks.employmentVerification }}))}
                    >
                        <MaterialIcons
                            name={formData.verificationChecks.employmentVerification ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color="#0a2850"
                        />
                        <Text style={styles.checkboxLabel}>Employment Verification</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.checkboxItem}>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setFormData(prev => ({ ...prev, verificationChecks: { ...prev.verificationChecks, addressCriminalVerification: !prev.verificationChecks.addressCriminalVerification }}))}
                    >
                        <MaterialIcons
                            name={formData.verificationChecks.addressCriminalVerification ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color="#0a2850"
                        />
                        <Text style={styles.checkboxLabel}>Address & Criminal Verification</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setFormData(prev => ({ ...prev, verificationChecks: { ...prev.verificationChecks, identityVerification: !prev.verificationChecks.identityVerification }}))}
                    >
                        <MaterialIcons
                            name={formData.verificationChecks.identityVerification ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color="#0a2850"
                        />
                        <Text style={styles.checkboxLabel}>Identity Verification</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setFormData(prev => ({ ...prev, verificationChecks: { ...prev.verificationChecks, cibilVerification: !prev.verificationChecks.cibilVerification }}))}
                >
                    <MaterialIcons
                        name={formData.verificationChecks.cibilVerification ? "check-box" : "check-box-outline-blank"}
                        size={24}
                        color="#0a2850"
                    />
                    <Text style={styles.checkboxLabel}>CIBIL Verification</Text>
                </TouchableOpacity>
            </View>

            <InputField
              label="Full Name for Authorization"
              value={formData.candidateNameAuth}
              onChangeText={(value) => handleInputChange('candidateNameAuth', value)}
              error={errors.candidateNameAuth}
              placeholder="Enter your full name"
              isRequired={true}
            />

            <InputField
              label="Signature"
              value={formData.signature}
              onChangeText={(value) => handleInputChange('signature', value)}
              placeholder="Enter your signature/initials"
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setCurrentDateField('authDate');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.pickerText}>{formData.authDate || 'Select date'}</Text>
                <MaterialIcons name="calendar-today" size={18} color="#0a2850" />
              </TouchableOpacity>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.acknowledgmentCheckbox, formData.acknowledgment && styles.checkboxChecked]}
                onPress={() => setFormData(prev => ({ ...prev, acknowledgment: !prev.acknowledgment }))}
              >
                {formData.acknowledgment && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={styles.acknowledgmentLabel}>
                I hereby declare that the information provided is true and correct to the best of my knowledge. *
              </Text>
            </View>
            {errors.acknowledgment && (
              <Text style={styles.errorText}>{errors.acknowledgment}</Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  // New function to render the load screen (separate from success screen)
  const renderLoadScreen = () => {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
  <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.surface} />
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : styles.header.paddingTop }]}>
          <TouchableOpacity onPress={() => {
            navigation.goBack();
          }} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#0a2850" />
          </TouchableOpacity>
          <Text style={styles.title}>Employee Background Check Form</Text>
        </View>
        
        <View style={{ padding: 16, flex: 1 }}>
          {/* Load Form section - standalone screen */}
          <View style={styles.loadFormContainer}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>Load Existing Form:</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={{ 
                flex: 1, 
                flexDirection: 'row', 
                borderWidth: 1, 
                borderColor: '#d1d5db',
                borderRadius: 8,
                marginRight: 8,
                alignItems: 'center',
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    padding: 12,
                    color: '#000',
                  }}
                  placeholder="Enter email address"
                  value={emailToLoad}
                  onChangeText={(text) => {
                    setEmailToLoad(text);
                    // We're on the load screen - just update the text, no other state changes needed
                  }}
                />
                {emailToLoad ? (
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={() => {
                      setEmailToLoad('');
                      // We're already on the load screen, just clear the email
                    }}
                  >
                    <MaterialIcons name="clear" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#2563eb',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                }}
                onPress={handleLoadByEmail}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Load Form</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#4b5563', textAlign: 'center', fontSize: 16 }}>
              Enter an email address to load an existing form or start a new one
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
  <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading form...</Text>
      </SafeAreaView>
    );
  }
  
  
  if (showSuccessScreen && formStatus === 'pending') {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : styles.header.paddingTop }]}>
          <TouchableOpacity onPress={() => {
            setEmailToLoad('');
            setShowSuccessScreen(false);
            setFormStatus(null);
            setFormId(null);
            setCurrentStep(1);
            setShowLoadScreen(true);
          }} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#0a2850" />
          </TouchableOpacity>
          <Text style={styles.title}>Employee Background Check Form</Text>
        </View>

        <View style={{ padding: 16 }}>
          <View style={[styles.successContainer, { marginTop: 20 }]}> 
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check" size={40} color="#fff" />
            </View>

            <Text style={styles.successTitle}>Form Submitted Successfully!</Text>

            <Text style={styles.successMessage}>
              Your form has been submitted and is awaiting HR review. You will be notified when it's approved.
            </Text>

            <Text style={{ color: '#4b5563', marginTop: 8 }}>
              Submitted: {formatIsoToLocal(lastSubmittedAt || formData.submissionDate)}
            </Text>

            <View style={styles.badgesRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#fff4e6', borderColor: '#f59e0b' }]}> 
                <Text style={[styles.statusBadgeText, { color: '#b45309' }]}>PENDING</Text>
              </View>
              <View style={styles.formIdBadge}>
                <Text style={styles.formIdText}>ID: {formId || '-'}</Text>
              </View>
            </View>

            <View style={{ marginTop: 18, alignItems: 'center' }}>
              {/* Download PDF while form is pending/submitted - placed above OK */}
              <TouchableOpacity style={styles.downloadButtonPDF} onPress={() => handleGenerateDocument('pdf')}>
                <MaterialIcons name="file-download" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>

              <View style={{ height: 12 }} />

              <TouchableOpacity style={styles.okButton} onPress={() => {
                setShowSuccessScreen(false);
                setShowLoadScreen(true);
              }}>
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showSuccessScreen && formStatus === 'approved') {
    // Make sure the email field shows the current email
    if (formData.emailId && !emailToLoad) {
      setEmailToLoad(formData.emailId);
    }
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : styles.header.paddingTop }]}>
          <TouchableOpacity onPress={() => {
            // Clear email field and reset form state when going back, but don't navigate away
            setEmailToLoad('');
            setShowSuccessScreen(false);
            setFormStatus(null);
            setFormId(null);
            
            // Important: Reset form data to prevent redirects
            setFormData(prev => ({
              ...prev,
              emailId: '',
            }));
            
            // Reset to first step for new form
            setCurrentStep(1);
            
            // Go back to load screen instead of form screen
            setShowLoadScreen(true);
          }} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#0a2850" />
          </TouchableOpacity>
          <Text style={styles.title}>Employee Background Check Form</Text>
        </View>
        
        <View style={{ padding: 16 }}>
          {/* Load Form section - matches web version exactly */}
          <View style={styles.loadFormContainer}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>Load Existing Form:</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={{ 
                flex: 1, 
                flexDirection: 'row', 
                borderWidth: 1, 
                borderColor: '#d1d5db',
                borderRadius: 8,
                marginRight: 8,
                alignItems: 'center',
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    padding: 12,
                    color: '#000',
                  }}
                  placeholder="Enter email address"
                  value={emailToLoad}
                  onChangeText={(text) => {
                    // Always update the email field
                    setEmailToLoad(text);
                    
                    // If email is completely cleared, reset all form state but STAY on load screen
                    if (!text || text.trim() === '') {
                      setShowSuccessScreen(false);
                      setFormStatus(null);
                      setFormId(null);
                      
                      // Also clear the form's email field to prevent unexpected redirects
                      setFormData(prev => ({
                        ...prev,
                        emailId: '',
                      }));
                      
                      // Reset to first step for new form entry
                      setCurrentStep(1);
                      
                      // Always stay on load screen when the email is modified
                      setShowLoadScreen(true);
                    }
                  }}
                />
                {emailToLoad ? (
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={() => {
                      // Just clear the email and stay on this screen
                      setEmailToLoad('');
                      // Reset form state but don't change screen
                      setShowSuccessScreen(false);
                      setFormStatus(null);
                      setFormId(null);
                      
                      // Important: Reset the form data to prevent redirecting
                      setFormData(prev => ({
                        ...prev,
                        candidateName: user?.full_name || user?.name || '',
                        emailId: '',
                      }));
                      // Reset to first step for new form entry
                      setCurrentStep(1);
                      
                      // MOST IMPORTANT: Force stay on the load screen
                      setShowLoadScreen(true);
                    }}
                  >
                    <MaterialIcons name="clear" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#2563eb',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                }}
                onPress={handleLoadByEmail}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Load Form</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Success message container - styled to exactly match the web version */}
          <View style={[styles.successContainer, { marginTop: 20 }]}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check" size={40} color="#fff" />
            </View>

            <Text style={styles.successTitle}>Form Submitted Successfully!</Text>

            <Text style={styles.successMessage}>
              Your background check form has been approved by HR. You can now download the official document.
            </Text>

            <View style={styles.badgesRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}> 
                <Text style={[styles.statusBadgeText, { color: '#065f46' }]}>APPROVED</Text>
              </View>
              <View style={styles.formIdBadge}>
                <Text style={styles.formIdText}>ID: {formId || '23'}</Text>
              </View>
            </View>

            <View style={styles.downloadButtonsContainer}>
              <TouchableOpacity style={styles.downloadButtonPDF} onPress={() => handleGenerateDocument('pdf')}>
                <MaterialIcons name="file-download" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // Second condition: Show the load screen (initial state)
  if (showLoadScreen) {
    return renderLoadScreen();
  }
  
  // Second condition: Show success screen for approved forms
  if (showSuccessScreen && formStatus === 'approved') {
    // Make sure the email field shows the current email
    if (formData.emailId && !emailToLoad) {
      setEmailToLoad(formData.emailId);
    }
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : styles.header.paddingTop }]}>
          <TouchableOpacity onPress={() => {
            // Clear email field and reset form state when going back, but don't navigate away
            setEmailToLoad('');
            setShowSuccessScreen(false);
            setFormStatus(null);
            setFormId(null);
            
            // Important: Reset form data to prevent redirects
            setFormData(prev => ({
              ...prev,
              emailId: '',
            }));
            
            // Reset to first step for new form
            setCurrentStep(1);
            
            // Go back to load screen instead of form screen
            setShowLoadScreen(true);
          }} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#0a2850" />
          </TouchableOpacity>
          <Text style={styles.title}>Employee Background Check Form</Text>
        </View>
        
        <View style={{ padding: 16 }}>
          {/* Load Form section - matches web version exactly */}
          <View style={styles.loadFormContainer}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>Load Existing Form:</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={{ 
                flex: 1, 
                flexDirection: 'row', 
                borderWidth: 1, 
                borderColor: '#d1d5db',
                borderRadius: 8,
                marginRight: 8,
                alignItems: 'center',
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    padding: 12,
                    color: '#000',
                  }}
                  placeholder="Enter email address"
                  value={emailToLoad}
                  onChangeText={(text) => {
                    // Always update the email field
                    setEmailToLoad(text);
                    
                    // If email is completely cleared, reset all form state but STAY on load screen
                    if (!text || text.trim() === '') {
                      setShowSuccessScreen(false);
                      setFormStatus(null);
                      setFormId(null);
                      
                      // Also clear the form's email field to prevent unexpected redirects
                      setFormData(prev => ({
                        ...prev,
                        emailId: '',
                      }));
                      
                      // Reset to first step for new form entry
                      setCurrentStep(1);
                      
                      // Always stay on load screen when the email is modified
                      setShowLoadScreen(true);
                    }
                  }}
                />
                {emailToLoad ? (
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={() => {
                      // Just clear the email and stay on this screen
                      setEmailToLoad('');
                      // Reset form state but don't change screen
                      setShowSuccessScreen(false);
                      setFormStatus(null);
                      setFormId(null);
                      
                      // Important: Reset the form data to prevent redirecting
                      setFormData(prev => ({
                        ...prev,
                        candidateName: user?.full_name || user?.name || '',
                        emailId: '',
                      }));
                      // Reset to first step for new form entry
                      setCurrentStep(1);
                      
                      // MOST IMPORTANT: Force stay on the load screen
                      setShowLoadScreen(true);
                    }}
                  >
                    <MaterialIcons name="clear" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#2563eb',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                }}
                onPress={handleLoadByEmail}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Load Form</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Success message container - styled to exactly match the web version */}
          <View style={[styles.successContainer, { marginTop: 20 }]}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check" size={40} color="#fff" />
            </View>

            <Text style={styles.successTitle}>Form Submitted Successfully!</Text>

            <Text style={styles.successMessage}>
              Your background check form has been approved by HR. You can now download the official document.
            </Text>

            <View style={styles.badgesRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}> 
                <Text style={[styles.statusBadgeText, { color: '#065f46' }]}>APPROVED</Text>
              </View>
              <View style={styles.formIdBadge}>
                <Text style={styles.formIdText}>ID: {formId || '23'}</Text>
              </View>
            </View>

          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : styles.header.paddingTop }]}>
        <TouchableOpacity onPress={() => {
          // Clear email field and reset form state when going back
          // Don't navigate away, just reset state
          setEmailToLoad('');
          setShowSuccessScreen(false);
          setFormStatus(null);
          setFormId(null);
          
          // Reset form data to fresh state
          setFormData(prev => ({
            ...prev,
            candidateName: user?.full_name || user?.name || '',
            emailId: '',
          }));
          
          // Reset to first step
          setCurrentStep(1);
          
          // Return to load screen
          setShowLoadScreen(true);
        }} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#0a2850" />
        </TouchableOpacity>
  <Text style={styles.title}>Background Form</Text>
  <View style={styles.headerActions} />
      </View>

      {/* Load draft modal */}
      <Modal visible={loadModalVisible} transparent animationType="fade" onRequestClose={() => setLoadModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Load Draft by Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email to load"
              value={emailToLoad}
              onChangeText={setEmailToLoad}
              keyboardType="email-address"
              placeholderTextColor="#9ca3af"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setLoadModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { marginLeft: 8 }]} onPress={() => handleLoadByEmail()}>
                <Text style={styles.modalButtonText}>Load</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={maritalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMaritalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Marital Status</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => { handleInputChange('maritalStatus', 'Single'); setMaritalModalVisible(false); }}>
              <Text style={styles.modalOptionText}>Single</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { handleInputChange('maritalStatus', 'Married'); setMaritalModalVisible(false); }}>
              <Text style={styles.modalOptionText}>Married</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { handleInputChange('maritalStatus', 'Divorced'); setMaritalModalVisible(false); }}>
              <Text style={styles.modalOptionText}>Divorced</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { handleInputChange('maritalStatus', 'Widowed'); setMaritalModalVisible(false); }}>
              <Text style={styles.modalOptionText}>Widowed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={formData[currentDateField] ? new Date(formData[currentDateField]) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.progressItem}>
            <View style={[
              styles.progressCircle,
              currentStep > index + 1 && styles.progressCompleted,
              currentStep === index + 1 && styles.progressCurrent
            ]}>
              <Text style={[
                styles.progressNumber,
                (currentStep > index + 1 || currentStep === index + 1) && styles.progressNumberActive
              ]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[
              styles.progressText,
              currentStep >= index + 1 && styles.progressTextActive
            ]}>
              {step.title}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 10 : 20}
        enabled={true}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="automatic"
        >
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.navigationContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : styles.navigationContainer.paddingBottom || 20 }]}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.prevButton} onPress={() => setCurrentStep(prev => prev - 1)}>
            <MaterialIcons name="chevron-left" size={20} color="#0a2850" />
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonSpacer} />

        {currentStep < steps.length ? (
          <TouchableOpacity style={styles.nextButton} onPress={() => setCurrentStep(prev => prev + 1)}>
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitForm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Form</Text>
                <MaterialIcons name="send" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f8fb',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  loadFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  successContainer: {
    backgroundColor: '#f0fbf4',
    borderWidth: 1,
    borderColor: '#d1f5dc',
    borderRadius: 12,
    padding: 24,
    paddingTop: 30,
    paddingBottom: 30,
    elevation: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  formIdBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6eefb',
  },
  formIdText: {
    fontWeight: '600',
    color: '#0a2850',
  },
  okButton: {
    backgroundColor: '#0a2850',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  okButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  formStatusContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 8,
  },
  downloadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  downloadButtonPDF: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 160,
    backgroundColor: '#2563eb',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0a2850',
  },
  progressContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressCompleted: {
    backgroundColor: '#10b981',
  },
  progressCurrent: {
    backgroundColor: '#0a2850',
  },
  progressNumber: {
    color: '#6b7280',
    fontWeight: '600',
  },
  progressNumberActive: {
    color: '#fff',
  },
  progressText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
    flexWrap: 'wrap'
  },
  progressTextActive: {
    color: '#0a2850',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0a2850',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  requiredIndicator: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1f2937',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  copyButtonText: {
    color: '#0a2850',
    marginLeft: 4,
    fontSize: 12,
  },
  arrayItemContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  arrayItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrayItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'ios' ? 12 : 8,
  },
  headerActionBtn: {
  marginLeft: 8,
  padding: 8,
  borderRadius: 8,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#e6eefb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0a2850',
    borderRadius: 6,
  },
  modalButtonText: {
    color: '#fff',
  },
  addButtonText: {
    color: '#0a2850',
    marginLeft: 8,
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff'
  },
  pickerText: {
    color: '#1f2937'
  },
  checkboxGroup: {
    marginBottom: 16,
  },
  checkboxItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  acknowledgmentCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0a2850',
    borderColor: '#0a2850',
  },
  acknowledgmentLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonSpacer: {
    flex: 1,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  prevButtonText: {
    color: '#0a2850',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a2850',
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    marginRight: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    marginRight: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0a2850',
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default BackgroundCheckForm;