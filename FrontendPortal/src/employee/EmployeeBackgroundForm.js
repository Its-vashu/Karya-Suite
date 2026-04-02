import React, { useState, useEffect, useCallback } from 'react';
import { Download, Plus, Trash2, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useUser } from '../context/UserContext';


const API_BASE = process.env.REACT_APP_API_BASE_URL;

// API service functions to interact with the backend
const apiService = {
  // Tests connectivity to the backend
  testConnection: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });
      return response.ok;
    } catch (error) {
      //console.error('Connection test failed:', error);
      alert(`Connection test failed: ${error.message}`);
      return false;
    }
  },

  // Gets profile by email ID
  getProfileByEmail: async (emailId) => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/profile/${emailId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No profile found for this email
        }
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage += ': ' + errorData.detail;
          }
        } catch (parseError) {
          //console.error('Could not parse error response:', parseError);
          alert(`Could not parse error response: ${parseError.message}`);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      //console.error('Error fetching profile:', error);
      alert(`Error fetching profile: ${error.message}`);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  },

  // Gets draft by email ID
  getDraftByEmail: async (emailId) => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/get-draft/${emailId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No draft found for this email
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      //console.error('Error fetching draft:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  },

  // Submits new form data or updates an existing form
  submitForm: async (formData) => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          // //console.log('Error details:', errorData);
          // alert(`Error details: ${JSON.stringify(errorData)}`);
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage += ': ' + errorData.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join('; ');
            } else {
              errorMessage += ': ' + errorData.detail;
            }
          }
        } catch (parseError) {
          // console.error('Could not parse error response:', parseError);
          alert(`Could not parse error response: ${parseError.message}`);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      //console.error('Error submitting form:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  },

  // Fetches a specific form by its ID
  getForm: async (formId) => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/form/${formId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage += ': ' + errorData.detail;
          }
        } catch (parseError) {
          //console.error('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      //console.error('Error fetching form:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  },

  // Generates and downloads a document (PDF or CSV) for a given form ID
  generateDocument: async (formId, format) => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/form/${formId}/download/${format}`, {
        method: 'GET',
        headers: {
          'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `background_check_form.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      //console.error('Error generating document:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  },

  // Fetches all submitted forms (excluding drafts)
  getAllForms: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/forms/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      //console.error('Error fetching forms:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  },
};

const EmployeeBackgroundForm = () => {
  // State for form data, initialized with default values
  const { email: userEmailFromContext, fullName: userFullNameFromContext, loading: userContextLoading } = useUser();
  
  const [formData, setFormData] = useState({
    candidateName: userFullNameFromContext ,
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    maritalStatus: '',
    emailId: userEmailFromContext ,
    contactNumber: '',
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
    acknowledgment: 'false'
  });

  // UI state variables
  const [fetchedData, setFetchedData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [userFormStatus, setUserFormStatus] = useState(null);
  const [userFormId, setUserFormId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialEmailChecked, setInitialEmailChecked] = useState(false);
  const [emailToLoad, setEmailToLoad] = useState('');

  // Handles going back to EmployeeHome
  const handleGoBack = () => {
    window.location.href = '/EmployeeHome';
  };

  // Helper function to capitalize the first letter of each word
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  // Helper function to transform form data from frontend (camelCase) to backend (snake_case) schema
  const transformFormDataForSubmission = useCallback((data) => {
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
      // Trim whitespace and ensure no spaces in the domain part
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
  }, []);

  // Adds a new notification to be displayed
  const addNotification = useCallback((type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Removes a notification by its ID
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Loads form data into state from a given form ID (used for editing)
  const loadFormData = useCallback(async (formId) => {
    try {
      const fetchedData = await apiService.getForm(formId);
      
      // Transform backend snake_case keys to frontend camelCase keys
      const transformedVerificationChecks = {};
      if (fetchedData.verification_checks) {
        transformedVerificationChecks.addressCriminalVerification = 
          fetchedData.verification_checks.address_verification === 'true' || 
          fetchedData.verification_checks.criminal_record_check === 'true';
        transformedVerificationChecks.educationVerification = 
          fetchedData.verification_checks.education_verification === 'true';
        transformedVerificationChecks.employmentVerification = 
          fetchedData.verification_checks.employment_verification === 'true';
        transformedVerificationChecks.identityVerification = 
          fetchedData.verification_checks.identity_verification === 'true';
        transformedVerificationChecks.cibilVerification = 
          fetchedData.verification_checks.credit_check === 'true';
      } else {
        transformedVerificationChecks.addressCriminalVerification = false;
        transformedVerificationChecks.educationVerification = false;
        transformedVerificationChecks.employmentVerification = false;
        transformedVerificationChecks.identityVerification = false;
        transformedVerificationChecks.cibilVerification = false;
      }

      // Ensure date fields are correctly formatted for input type="date"
      const ensureDateForInput = (dateValue) => {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        ...fetchedData,
        candidateName: fetchedData.candidate_name,
        fatherName: fetchedData.father_name,
        motherName: fetchedData.mother_name,
        dateOfBirth: ensureDateForInput(fetchedData.date_of_birth),
        maritalStatus: fetchedData.marital_status,
        emailId: fetchedData.email_id,
        contactNumber: fetchedData.contact_number,
        alternateContactNumber: fetchedData.alternate_contact_number,
        aadhaarCardNumber: fetchedData.aadhaar_card_number,
        panNumber: fetchedData.pan_number,
        uanNumber: fetchedData.uan_number,
        currentCompleteAddress: fetchedData.current_complete_address,
        currentLandmark: fetchedData.current_landmark,
        currentCity: fetchedData.current_city,
        currentState: fetchedData.current_state,
        currentPinCode: fetchedData.current_pin_code,
        currentPoliceStation: fetchedData.current_police_station,
        currentDurationFrom: ensureDateForInput(fetchedData.current_duration_from),
        currentDurationTo: ensureDateForInput(fetchedData.current_duration_to),
        permanentCompleteAddress: fetchedData.permanent_complete_address,
        permanentLandmark: fetchedData.permanent_landmark,
        permanentCity: fetchedData.permanent_city,
        permanentState: fetchedData.permanent_state,
        permanentPinCode: fetchedData.permanent_pin_code,
        permanentPoliceStation: fetchedData.permanent_police_station,
        permanentDurationFrom: ensureDateForInput(fetchedData.permanent_duration_from),
        permanentDurationTo: ensureDateForInput(fetchedData.permanent_duration_to),
        organizationName: fetchedData.organization_name,
        organizationAddress: fetchedData.organization_address,
        designation: fetchedData.designation,
        employeeCode: fetchedData.employee_code,
        dateOfJoining: ensureDateForInput(fetchedData.date_of_joining),
        lastWorkingDay: ensureDateForInput(fetchedData.last_working_day),
        salary: fetchedData.salary,
        reasonForLeaving: fetchedData.reason_for_leaving,
        managerName: fetchedData.manager_name,
        managerContactNumber: fetchedData.manager_contact_number,
        managerEmailId: fetchedData.manager_email_id,
        candidateNameAuth: fetchedData.candidate_name_auth,
        signature: fetchedData.signature,
        authDate: ensureDateForInput(fetchedData.auth_date),
        acknowledgment: String(fetchedData.acknowledgment),
        educationDetails: fetchedData.education_details ? 
          fetchedData.education_details.map(ed => ({
            instituteName: ed.institution_name || "",
            courseName: ed.degree || ed.field_of_study || "",
            passingYear: String(ed.year_of_passing) || "",
            registrationNumber: ed.percentage_or_cgpa || ""
          })) : [],
        hrDetails: fetchedData.hr_details ? 
          fetchedData.hr_details.map(hr => ({
            name: hr.hr_name || "",
            contactNumber: hr.hr_contact_number || "",
            emailId: hr.hr_email_id || ""
          })) : [],
        referenceDetails: fetchedData.reference_details ? 
          fetchedData.reference_details.map(ref => ({
            refereeName: ref.ref_name || "",
            organizationName: ref.address || "",
            designation: ref.relationship || "",
            contactNumber: ref.ref_contact_number || "",
            emailId: ref.ref_email_id || ""
          })) : [],
        verificationChecks: transformedVerificationChecks,
      });

      addNotification('success', 'Form data loaded successfully');
      setShowForm(true);
      setFormSubmitted(false);
      setUserFormStatus(fetchedData.status);
    } catch (error) {
      //console.error('Error loading form data:', error);
      addNotification('error', `Error loading form data: ${error.message}`);
    }
  }, [addNotification]);

  // Effect hook for initial form loading and status checking
  useEffect(() => {
    const initializeForm = async () => {
      if (userContextLoading) {
        return;
      }

      // Test backend connection first
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        addNotification('error', 'Cannot connect to backend server. Please check if the server is running.');
        setIsLoading(false);
        setInitialEmailChecked(true);
        return;
      }

      let email = userEmailFromContext;

      // If email is still not available from context, try localStorage or prompt
      if (!email && !initialEmailChecked) {
        email = localStorage.getItem('userEmailForForm');
        if (!email) {
          email = prompt("Please enter your email ID to load your form status:");
        }
        if (email) {
          localStorage.setItem('userEmailForForm', email);
        } else {
          setIsLoading(false);
          setInitialEmailChecked(true);
          return;
        }
      }

      // Update formData and emailToLoad if email is now determined
      if (email && formData.emailId !== email) {
        setFormData(prev => ({ ...prev, emailId: email }));
      }
      if (email && emailToLoad !== email) {
        setEmailToLoad(email);
      }

      if (!email) {
        setIsLoading(false);
        setInitialEmailChecked(true);
        return;
      }

      try {
        setIsLoading(true);
        
        // First, try to get the user's profile (submitted form)
        const userProfile = await apiService.getProfileByEmail(email);
        
        if (userProfile) {
          // User has a submitted form
          setUserFormStatus(userProfile.status);
          setUserFormId(userProfile.id);
          
          if (userProfile.status !== 'approved') {
            // Load the form data for editing if not approved
            await loadFormData(userProfile.id);
            setShowForm(true);
            setFormSubmitted(false);
          } else {
            // Form is approved, show success message
            setFormSubmitted(true);
            setShowForm(false);
          }
        } else {
          // No submitted form found, check for drafts
          const userDraft = await apiService.getDraftByEmail(email);
          
          if (userDraft) {
            // User has a draft, load it
            await loadFormData(userDraft.id);
            setUserFormStatus('draft');
            setUserFormId(userDraft.id);
            setShowForm(true);
            setFormSubmitted(false);
            addNotification('info', 'Draft loaded. You can continue filling the form.');
          } else {
            // No form or draft found, start fresh
            setUserFormStatus('none');
            setShowForm(true);
            setFormSubmitted(false);
          }
        }
      } catch (error) {
        //console.error('Error initializing user form:', error);
        addNotification('error', 'Error loading form status. Please try again.');
        setUserFormStatus('none');
        setShowForm(true);
      } finally {
        setIsLoading(false);
        setInitialEmailChecked(true);
      }
    };

    if (!userContextLoading && !initialEmailChecked) {
      initializeForm();
    }
  }, [userEmailFromContext, userFullNameFromContext, userContextLoading, initialEmailChecked, addNotification, formData.emailId, emailToLoad, loadFormData]);

  // Effect to re-check HR approval status after form submission or initial load
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (userFormId && (userFormStatus === 'pending' || userFormStatus === 'approved' || userFormStatus === 'rejected')) {
        try {
          const fetchedForm = await apiService.getForm(userFormId);
          if (fetchedForm) {
            const previousStatus = userFormStatus;
            setUserFormStatus(fetchedForm.status);
            
            if (fetchedForm.status === 'approved') {
              addNotification('success', `Your background check form has been approved by HR.`);
              if (previousStatus !== 'approved') {
                // console.log(`
                // --- Email Simulation ---
                // To: ${fetchedForm.email_id}, smriti.joshi@concientech.com
                // Subject: Your Employee Profile Check Form Has Been Approved!

                // Dear ${fetchedForm.candidate_name},

                // We are pleased to inform you that your employee profile check form (Form ID: ${fetchedForm.id}) has been successfully approved by HR.

                // You can now download the complete details of your approved form:
                // - Download PDF: [Link to download PDF for Form ID: ${fetchedForm.id}]
                // - Download CSV: [Link to download CSV for Form ID: ${fetchedForm.id}]

                // Thank you for your cooperation.

                // Best regards,
                // HR Department
                // ------------------------
                // `);
              }
            } else if (fetchedForm.status === 'rejected') {
              addNotification('error', `Your background check form has been rejected by HR.`);
            } else if (fetchedForm.status === 'pending') {
              addNotification('info', `Your background check form is pending review by HR.`);
            }
          }
        } catch (error) {
          //console.error('Error checking HR approval:', error);
          addNotification('error', 'Error checking form approval status.');
        }
      }
    };

    checkApprovalStatus();
  }, [userFormId, userFormStatus, addNotification]);

  const handleGenerateDocument = useCallback(async (format) => {
    try {
      if (!userFormId) {
        addNotification('error', 'Form ID not found. Please submit the form first.');
        return;
      }
      await apiService.generateDocument(userFormId, format);
      addNotification('success', `${format.toUpperCase()} downloaded successfully`);
    } catch (error) {
      //console.error('Error generating document:', error);
      addNotification('error', `Error generating ${format.toUpperCase()}`);
    }
  }, [userFormId, addNotification]);

  // Handles loading an existing form by email ID (for the input field)
  const handleLoadFormByEmail = async () => {
    if (!emailToLoad) {
      addNotification('error', 'Please enter an email ID to load the form.');
      return;
    }

    setIsLoading(true);
    try {
      // First try to get profile (submitted form)
      const userProfile = await apiService.getProfileByEmail(emailToLoad);
      
      if (userProfile) {
        setUserFormStatus(userProfile.status);
        setUserFormId(userProfile.id);
        
        if (userProfile.status === 'approved') {
          setFormSubmitted(true);
          setShowForm(false);
          addNotification('success', `Form loaded successfully! Status: ${userProfile.status}`);
        } else {
          await loadFormData(userProfile.id);
          addNotification('success', `Form loaded successfully! Status: ${userProfile.status}`);
          setShowForm(true);
          setFormSubmitted(false);
        }
      } else {
        // Try to get draft
        const userDraft = await apiService.getDraftByEmail(emailToLoad);
        
        if (userDraft) {
          await loadFormData(userDraft.id);
          setUserFormStatus('draft');
          setUserFormId(userDraft.id);
          addNotification('success', 'Draft loaded successfully!');
          setShowForm(true);
          setFormSubmitted(false);
        } else {
          // No form or draft found
          addNotification('info', 'No previously submitted form found for this email. Starting a new form.');
          
          // Reset form to empty, but keep the entered email
          setFormData({
            candidateName: '',
            fatherName: '',
            motherName: '',
            dateOfBirth: '',
            maritalStatus: '',
            emailId: emailToLoad,
            contactNumber: '',
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
            acknowledgment: 'false'
          });
          setShowForm(true);
          setFormSubmitted(false);
        }
      }
    } catch (error) {
      //console.error('Error loading form:', error);
      addNotification('error', 'Error loading form. Please try again.');
      setUserFormStatus('none');
      setShowForm(true);
      setFormSubmitted(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation rules for form fields
  const validators = {
    email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    phone: (phone) => /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '')),
    aadhaar: (aadhaar) => /^\d{12}$/.test(aadhaar),
    pinCode: (pinCode) => /^\d{6}$/.test(pinCode)
  };

  // Validates a single form field and sets error state
  const validateField = useCallback((fieldName, value) => {
    let error = '';
    if (value) {
      if ((fieldName.includes('email') || fieldName === 'emailId') && !validators.email(value)) {
        error = 'Please enter a valid email address';
      } else if ((fieldName.includes('contact') || fieldName.includes('Contact')) && !validators.phone(value)) {
        error = 'Please enter a valid 10-digit mobile number';
      } else if (fieldName === 'aadhaarCardNumber' && !validators.aadhaar(value)) {
        error = 'Please enter a valid 12-digit Aadhaar number';
      } else if (fieldName.includes('PinCode') && !validators.pinCode(value)) {
        error = 'Please enter a valid 6-digit PIN code';
      }
    }

    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    return error === '';
  }, []);

  // Handles changes to individual form input fields
  const handleInputChange = useCallback((field, value) => {
    let processedValue = value;

    // Capitalize the first letter of each word for specified fields
    if (['candidateName', 'fatherName', 'motherName', 'signature', 'candidateNameAuth'].includes(field)) {
      processedValue = toTitleCase(value);
    } else if (field === 'panNumber') {
      processedValue = value.toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    validateField(field, processedValue);
  }, [validateField]);

  // Handles changes to fields within array items (e.g., education details)
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

  // Copies current address details to permanent address fields
  const copyAddress = useCallback(() => {
    const currentFields = [
      'currentCompleteAddress', 'currentLandmark', 'currentCity', 'currentState',
      'currentPinCode', 'currentPoliceStation', 'currentDurationFrom', 'currentDurationTo'
    ];
    const permanentFields = [
      'permanentCompleteAddress', 'permanentLandmark', 'permanentCity', 'permanentState',
      'permanentPinCode', 'permanentPoliceStation', 'permanentDurationFrom', 'permanentDurationTo'
    ];

    const updates = {};
    currentFields.forEach((field, index) => {
      updates[permanentFields[index]] = formData[field];
    });

    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, [formData]);

  // Defines the steps for the multi-step form
  const steps = [
    { title: 'Personal Information', desc: 'Basic personal details' },
    { title: 'Address Details', desc: 'Current & permanent address' },
    { title: 'Education', desc: 'Educational qualifications' },
    { title: 'Employment', desc: 'Organization & manager details' },
    { title: 'References', desc: 'Professional references' },
    { title: 'Authorization', desc: 'Final authorization' }
  ];

  // Handles the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) {
      //console.log("Preventing double submission - form is already being submitted");
      return;
    }

    setIsSubmitting(true);

    // Validate required fields
    const requiredFields = ['candidateName', 'emailId', 'contactNumber', 'dateOfBirth'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      addNotification('error', `Please fill in the following required fields: ${missingFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    // Validate acknowledgment checkbox
    if (formData.acknowledgment !== 'true') {
      addNotification('error', 'Please acknowledge the terms and conditions');
      setIsSubmitting(false);
      return;
    }

    try {
      // Transform data to match backend schema
      const submissionData = {
        ...transformFormDataForSubmission(formData),
        submissionDate: new Date().toISOString().split('T')[0],
        status: 'pending'
      };

      // Submit the form
      const response = await apiService.submitForm(submissionData);
      setUserFormId(response.id);
      setUserFormStatus('pending');
      setFormSubmitted(true);
      setShowForm(false);
      addNotification('success', `Form submitted successfully! Form ID: ${response.id}. HR will review and approve your form.`);
    } catch (error) {
      //console.error('Form submission error:', error);
      const errorMessage = error.message.includes(':') ? error.message : 'Error submitting form to server. Please try again.';
      addNotification('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  
 const handleDownloadPDF = async () => {
  // Check if we have a form ID to fetch data from backend
  if (!userFormId) {
    addNotification('error', 'No form ID found. Please submit the form first.');
    return;
  }

  try {
    // Show loading state
    addNotification('info', 'Generating PDF... Please wait.');
    
    // Fetch the latest data from backend using the form ID
    const backendData = await apiService.getForm(userFormId);
    
    if (!backendData) {
      addNotification('error', 'Could not fetch form data from backend.');
      return;
    }

    //console.log("Backend Data for PDF Generation:", backendData); // Debug log

    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === 'N/A' || dateStr === '') return '';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB'); // Uses DD/MM/YYYY format
      } catch (e) {
        //console.error("Error formatting date:", dateStr, e);
        alert("Error formatting date:", dateStr, e)
        return '';
      }
    };

    // Helper function to safely get value
    const safeValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return String(value);
    };

    // Use backend data instead of formData
    const pdfData = {
      // Personal Information - map backend snake_case to frontend format
      candidateName: backendData.candidate_name || '',
      fatherName: backendData.father_name || '',
      motherName: backendData.mother_name || '',
      dateOfBirth: backendData.date_of_birth || '',
      maritalStatus: backendData.marital_status || '',
      emailId: backendData.email_id || '',
      contactNumber: backendData.contact_number || '',
      alternateContactNumber: backendData.alternate_contact_number || '',
      aadhaarCardNumber: backendData.aadhaar_card_number || '',
      panNumber: backendData.pan_number || '',
      uanNumber: backendData.uan_number || '',

      // Current Address
      currentCompleteAddress: backendData.current_complete_address || '',
      currentLandmark: backendData.current_landmark || '',
      currentCity: backendData.current_city || '',
      currentState: backendData.current_state || '',
      currentPinCode: backendData.current_pin_code || '',
      currentPoliceStation: backendData.current_police_station || '',
      currentDurationFrom: backendData.current_duration_from || '',
      currentDurationTo: backendData.current_duration_to || '',

      // Permanent Address
      permanentCompleteAddress: backendData.permanent_complete_address || '',
      permanentLandmark: backendData.permanent_landmark || '',
      permanentCity: backendData.permanent_city || '',
      permanentState: backendData.permanent_state || '',
      permanentPinCode: backendData.permanent_pin_code || '',
      permanentPoliceStation: backendData.permanent_police_station || '',
      permanentDurationFrom: backendData.permanent_duration_from || '',
      permanentDurationTo: backendData.permanent_duration_to || '',

      // Employment Details
      organizationName: backendData.organization_name || '',
      organizationAddress: backendData.organization_address || '',
      designation: backendData.designation || '',
      employeeCode: backendData.employee_code || '',
      dateOfJoining: backendData.date_of_joining || '',
      lastWorkingDay: backendData.last_working_day || '',
      salary: backendData.salary || '',
      reasonForLeaving: backendData.reason_for_leaving || '',

      // Manager Details
      managerName: backendData.manager_name || '',
      managerContactNumber: backendData.manager_contact_number || '',
      managerEmailId: backendData.manager_email_id || '',

      // Authorization
      candidateNameAuth: backendData.candidate_name_auth || '',
      signature: backendData.signature || '',
      authDate: backendData.auth_date || '',
      acknowledgment: backendData.acknowledgment || false,

      // Transform arrays from backend format
      educationDetails: (backendData.education_details || []).map(edu => ({
        instituteName: edu.institution_name || '',
        courseName: edu.degree || edu.field_of_study || '',
        passingYear: edu.year_of_passing || '',
        registrationNumber: edu.percentage_or_cgpa || '',
        mode: 'REGULAR' // Default since backend doesn't store this
      })),

      hrDetails: (backendData.hr_details || []).map(hr => ({
        name: hr.hr_name || '',
        contactNumber: hr.hr_contact_number || '',
        emailId: hr.hr_email_id || ''
      })),

      referenceDetails: (backendData.reference_details || []).map(ref => ({
        refereeName: ref.ref_name || '',
        organizationName: ref.address || '',
        designation: ref.relationship || '',
        contactNumber: ref.ref_contact_number || '',
        emailId: ref.ref_email_id || ''
      })),

      // Transform verification checks
      verificationChecks: {
        educationVerification: backendData.verification_checks?.education_verification === 'true',
        employmentVerification: backendData.verification_checks?.employment_verification === 'true',
        addressCriminalVerification: backendData.verification_checks?.address_verification === 'true' || 
                                   backendData.verification_checks?.criminal_record_check === 'true',
        identityVerification: backendData.verification_checks?.identity_verification === 'true',
        cibilVerification: backendData.verification_checks?.credit_check === 'true'
      }
    };

    // Page 1: Personal Information and Address Details
    const page1Content = `
        <div class="header">
            <h1>BACKGROUND CHECK FORM</h1>
        </div>
        <div class="section">
            <h2 class="section-title">PERSONAL INFORMATION</h2>
            <table class="form-table">
                <tr>
                    <td class="form-label">CANDIDATE NAME</td>
                    <td class="form-value">${toTitleCase(safeValue(pdfData.candidateName))}</td>
                    <td class="form-label">FATHER NAME</td>
                    <td class="form-value">${toTitleCase(safeValue(pdfData.fatherName))}</td>
                </tr>
                <tr>
                    <td class="form-label">DATE OF BIRTH</td>
                    <td class="form-value">${formatDate(pdfData.dateOfBirth)}</td>
                    <td class="form-label">MOTHER NAME</td>
                    <td class="form-value">${toTitleCase(safeValue(pdfData.motherName))}</td>
                </tr>
                <tr>
                    <td class="form-label">MARITAL STATUS</td>
                    <td class="form-value">${safeValue(pdfData.maritalStatus)}</td>
                    <td class="form-label">EMAIL ID</td>
                    <td class="form-value">${safeValue(pdfData.emailId)}</td>
                </tr>
                <tr>
                    <td class="form-label">CONTACT NUMBER</td>
                    <td class="form-value">${safeValue(pdfData.contactNumber)}</td>
                    <td class="form-label">ALTERNATE CONTACT NUMBER</td>
                    <td class="form-value">${safeValue(pdfData.alternateContactNumber)}</td>
                </tr>
                <tr>
                    <td class="form-label">AADHAAR CARD NUMBER</td>
                    <td class="form-value">${safeValue(pdfData.aadhaarCardNumber)}</td>
                    <td class="form-label">PAN NUMBER</td>
                    <td class="form-value">${safeValue(pdfData.panNumber).toUpperCase()}</td>
                </tr>
                <tr>
                    <td class="form-label">UAN NUMBER</td>
                    <td class="form-value" colspan="3">${safeValue(pdfData.uanNumber)}</td>
                </tr>
            </table>
        </div>
        <div class="section">
            <h2 class="section-title">CURRENT ADDRESS</h2>
            <table class="form-table">
                <tr>
                    <td class="form-label">COMPLETE ADDRESS</td>
                    <td class="form-value" colspan="3">${safeValue(pdfData.currentCompleteAddress)}</td>
                </tr>
                <tr>
                    <td class="form-label">PROMINENT LANDMARK</td>
                    <td class="form-value">${safeValue(pdfData.currentLandmark)}</td>
                    <td class="form-label">CITY</td>
                    <td class="form-value">${safeValue(pdfData.currentCity)}</td>
                </tr>
                <tr>
                    <td class="form-label">STATE</td>
                    <td class="form-value">${safeValue(pdfData.currentState)}</td>
                    <td class="form-label">PIN CODE</td>
                    <td class="form-value">${safeValue(pdfData.currentPinCode)}</td>
                </tr>
                <tr>
                    <td class="form-label">NEAREST POLICE STATION</td>
                    <td class="form-value">${safeValue(pdfData.currentPoliceStation)}</td>
                    <td class="form-label">DURATION FROM</td>
                    <td class="form-value">${formatDate(pdfData.currentDurationFrom)}</td>
                </tr>
                <tr>
                    <td class="form-label">DURATION TO</td>
                    <td class="form-value" colspan="3">${formatDate(pdfData.currentDurationTo)}</td>
                </tr>
            </table>
        </div>
        <div class="section">
            <h2 class="section-title">PERMANENT ADDRESS</h2>
            <table class="form-table">
                <tr>
                    <td class="form-label">COMPLETE ADDRESS</td>
                    <td class="form-value" colspan="3">${safeValue(pdfData.permanentCompleteAddress)}</td>
                </tr>
                <tr>
                    <td class="form-label">PROMINENT LANDMARK</td>
                    <td class="form-value">${safeValue(pdfData.permanentLandmark)}</td>
                    <td class="form-label">CITY</td>
                    <td class="form-value">${safeValue(pdfData.permanentCity)}</td>
                </tr>
                <tr>
                    <td class="form-label">STATE</td>
                    <td class="form-value">${safeValue(pdfData.permanentState)}</td>
                    <td class="form-label">PIN CODE</td>
                    <td class="form-value">${safeValue(pdfData.permanentPinCode)}</td>
                </tr>
                <tr>
                    <td class="form-label">NEAREST POLICE STATION</td>
                    <td class="form-value">${safeValue(pdfData.permanentPoliceStation)}</td>
                    <td class="form-label">DURATION FROM</td>
                    <td class="form-value">${formatDate(pdfData.permanentDurationFrom)}</td>
                </tr>
                <tr>
                    <td class="form-label">DURATION TO</td>
                    <td class="form-value" colspan="3">${formatDate(pdfData.permanentDurationTo)}</td>
                </tr>
            </table>
        </div>
    `;

    // Page 2: Education, Employment, HR, and Professional References
    const page2Content = `
        <div class="section">
            <h2 class="section-title">EDUCATIONAL QUALIFICATIONS</h2>
            <table class="education-table">
                <thead>
                    <tr>
                        <th>Institute Name</th>
                        <th>Course Name</th>
                        <th>Passing Year</th>
                        <th>Registration No.</th>
                        <th>Mode</th>
                    </tr>
                </thead>
                <tbody>
                    ${(pdfData.educationDetails && pdfData.educationDetails.length > 0) ? 
                      pdfData.educationDetails.map(edu => `
                        <tr>
                            <td>${safeValue(edu.instituteName)}</td>
                            <td>${safeValue(edu.courseName)}</td>
                            <td>${safeValue(edu.passingYear)}</td>
                            <td>${safeValue(edu.registrationNumber)}</td>
                            <td>${safeValue(edu.mode)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5">No education details provided</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="section">
            <h2 class="section-title">EMPLOYMENT DETAILS</h2>
            <h3 class="section-subtitle">Previous Organization Details</h3>
            <table class="form-table">
                <tr>
                    <td class="form-label">ORGANIZATION NAME</td>
                    <td class="form-value" colspan="3">${safeValue(pdfData.organizationName)}</td>
                </tr>
                <tr>
                    <td class="form-label">ORGANIZATION ADDRESS</td>
                    <td class="form-value" colspan="3">${safeValue(pdfData.organizationAddress)}</td>
                </tr>
                <tr>
                    <td class="form-label">DESIGNATION</td>
                    <td class="form-value">${safeValue(pdfData.designation)}</td>
                    <td class="form-label">EMPLOYEE CODE</td>
                    <td class="form-value">${safeValue(pdfData.employeeCode)}</td>
                </tr>
                <tr>
                    <td class="form-label">DATE OF JOINING</td>
                    <td class="form-value">${formatDate(pdfData.dateOfJoining)}</td>
                    <td class="form-label">LAST WORKING DAY</td>
                    <td class="form-value">${formatDate(pdfData.lastWorkingDay)}</td>
                </tr>
                <tr>
                    <td class="form-label">SALARY (CTC)</td>
                    <td class="form-value">${safeValue(pdfData.salary)}</td>
                    <td class="form-label">REASON FOR LEAVING</td>
                    <td class="form-value">${safeValue(pdfData.reasonForLeaving)}</td>
                </tr>
            </table>
            <h3 class="section-subtitle">Reporting Manager/Supervisor Details</h3>
            <table class="form-table">
                <tr>
                    <td class="form-label">MANAGER NAME</td>
                    <td class="form-value">${safeValue(pdfData.managerName)}</td>
                    <td class="form-label">MANAGER CONTACT NUMBER</td>
                    <td class="form-value">${safeValue(pdfData.managerContactNumber)}</td>
                </tr>
                <tr>
                    <td class="form-label">MANAGER EMAIL ID</td>
                    <td class="form-value" colspan="3">${safeValue(pdfData.managerEmailId)}</td>
                </tr>
            </table>
            <h3 class="section-subtitle">HR Details</h3>
            <table class="org-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Contact Number</th>
                        <th>Email ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${(pdfData.hrDetails && pdfData.hrDetails.length > 0) ? 
                      pdfData.hrDetails.map(hr => `
                        <tr>
                            <td>${toTitleCase(safeValue(hr.name))}</td>
                            <td>${safeValue(hr.contactNumber)}</td>
                            <td>${safeValue(hr.emailId)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="3">No HR details provided</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="section">
            <h2 class="section-title">PROFESSIONAL REFERENCES</h2>
            <table class="ref-table">
                <thead>
                    <tr>
                        <th>Referee Name</th>
                        <th>Organization Name</th>
                        <th>Designation</th>
                        <th>Contact Number</th>
                        <th>Email ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${(pdfData.referenceDetails && pdfData.referenceDetails.length > 0) ? 
                      pdfData.referenceDetails.map(ref => `
                        <tr>
                            <td>${toTitleCase(safeValue(ref.refereeName))}</td>
                            <td>${safeValue(ref.organizationName)}</td>
                            <td>${safeValue(ref.designation)}</td>
                            <td>${safeValue(ref.contactNumber)}</td>
                            <td>${safeValue(ref.emailId)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5">No reference details provided</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    // Page 3: Authorization and Verification Checks
    const page3Content = `
        <div class="section authorization-section">
            <h2 class="section-title">AUTHORIZATION & VERIFICATION CHECKS</h2>
            <div class="checkbox-section">
                <p>Required Background Verification Checks:</p>
                <div class="checkbox-item">
                    <span>Education Verification</span>
                    <span class="checkbox">${pdfData.verificationChecks?.educationVerification ? '&#10003;' : ''}</span>
                </div>
                <div class="checkbox-item">
                    <span>Employment Verification</span>
                    <span class="checkbox">${pdfData.verificationChecks?.employmentVerification ? '&#10003;' : ''}</span>
                </div>
                <div class="checkbox-item">
                    <span>Address & Criminal Verification</span>
                    <span class="checkbox">${pdfData.verificationChecks?.addressCriminalVerification ? '&#10003;' : ''}</span>
                </div>
                <div class="checkbox-item">
                    <span>Identity Verification</span>
                    <span class="checkbox">${pdfData.verificationChecks?.identityVerification ? '&#10003;' : ''}</span>
                </div>
                <div class="checkbox-item">
                    <span>CIBIL Verification</span>
                    <span class="checkbox">${pdfData.verificationChecks?.cibilVerification ? '&#10003;' : ''}</span>
                </div>
            </div>
            <h3 class="section-subtitle">Letter of Authorization</h3>
            <p class="text-justify">
                I hereby authorize (company name) and/or any of its subsidiaries or affiliates, and any person or
                organizations acting on its behalf to verify the information presented on this application form and to
                procure and investigate report for background verification purpose. I have read, understood and by my
                signature consent to above statement. I also understood if any misrepresentation found in details
                provided by me it may cause the repercussions, which may be lead to result as releasing from my duties
                with immediate effect.
            </p>
            <table class="form-table" style="margin-top: 15px;">
                <tr>
                    <td class="form-label">NAME OF THE CANDIDATE (FOR AUTHORIZATION)</td>
                    <td class="form-value">${toTitleCase(safeValue(pdfData.candidateNameAuth))}</td>
                </tr>
                <tr>
                    <td class="form-label">SIGNATURE (TYPE YOUR FULL NAME)</td>
                    <td class="form-value">${toTitleCase(safeValue(pdfData.signature))}</td>
                </tr>
                <tr>
                    <td class="form-label">DATE</td>
                    <td class="form-value">${formatDate(pdfData.authDate)}</td>
                </tr>
            </table>
            <div style="margin-top: 10px; font-size: 10px; font-weight: bold;">
                <span class="checkbox" style="width: 10px; height: 10px; margin-right: 5px;">${pdfData.acknowledgment === 'true' || pdfData.acknowledgment === true ? '&#10003;' : ''}</span>
                I acknowledge that all the information provided above is true and correct to the best of my knowledge.
            </div>
        </div>
    `;

    // Rest of your existing PDF generation code...
    const fullHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Background Check Form</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; font-size: 11px; line-height: 1.4; color: #333; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #4A90E2; }
          .header h1 { color: #4A90E2; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; }
          .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
          .section-title { background-color: #4A90E2; color: #fff; font-size: 14px; font-weight: bold; padding: 8px 15px; margin: 0; text-align: center; text-transform: uppercase; }
          .section-subtitle { font-size: 12px; font-weight: bold; color: #555; margin: 10px 15px 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .form-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
          .form-table td { border: 1px solid #eee; padding: 8px 12px; vertical-align: top; }
          .form-label { font-weight: bold; color: #444; background-color: #f8f8f8; width: 35%; }
          .form-value { color: #222; width: 65%; }
          .education-table, .org-table, .ref-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .education-table th, .education-table td,
          .org-table th, .org-table td,
          .ref-table th, .ref-table td { border: 1px solid #eee; padding: 8px 12px; text-align: left; vertical-align: top; }
          .education-table th, .org-table th, .ref-table th { background-color: #e0eaff; font-weight: bold; text-align: center; color: #333; }
          .checkbox-section { margin: 15px 0; padding: 10px 15px; background-color: #f0f8ff; border-radius: 5px; border: 1px dashed #cce0ff; }
          .checkbox-item { display: flex; align-items: center; margin-bottom: 8px; }
          .checkbox { width: 16px; height: 16px; border: 1px solid #4A90E2; display: inline-flex; justify-content: center; align-items: center; margin-right: 8px; flex-shrink: 0; }
          .checkbox-item span:first-child { flex-grow: 1; }
          .authorization-section { border: 2px solid #4A90E2; padding: 15px; margin-top: 20px; background-color: #f9fcff; border-radius: 10px; }
          .text-justify { text-align: justify; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        ${page1Content}
        <div class="page-break"></div>
        ${page2Content}
        <div class="page-break"></div>
        ${page3Content}
      </body>
      </html>
    `;

    // Create a temporary element
    const element = document.createElement('div');
    element.innerHTML = fullHtmlContent;

    // PDF options
    const options = {
      margin: 0.5,
      filename: `background_check_form_${(pdfData.candidateName || 'candidate').replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: true, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generate PDF
    html2pdf().set(options).from(element).save();
    
    addNotification('success', 'PDF generated successfully with backend data!');

  } catch (error) {
    //console.error('Error generating PDF:', error);
    addNotification('error', `Error generating PDF: ${error.message}`);
  }
};

const handleDownloadCSV = () => {
    // Flatten the data structure for CSV format
    const csvData = [
      // Personal Information
      ['Section', 'Field', 'Value'],
      ['Personal Info', 'Candidate Name', formData.candidateName ],
      ['Personal Info', 'Father Name', formData.fatherName ],
      ['Personal Info', 'Mother Name', formData.motherName ],
      ['Personal Info', 'Date of Birth', formData.dateOfBirth ],
      ['Personal Info', 'Marital Status', formData.maritalStatus ],
      ['Personal Info', 'Email ID', formData.emailId ],
      ['Personal Info', 'Contact Number', formData.contactNumber ],
      ['Personal Info', 'Alternate Contact Number', formData.alternateContactNumber ],
      ['Personal Info', 'Aadhaar Card Number', formData.aadhaarCardNumber ],
      ['Personal Info', 'PAN Number', formData.panNumber ],
      ['Personal Info', 'UAN Number', formData.uanNumber ],

      // Current Address
      ['Current Address', 'Complete Address', formData.currentCompleteAddress ],
      ['Current Address', 'Landmark', formData.currentLandmark ],
      ['Current Address', 'City', formData.currentCity ],
      ['Current Address', 'State', formData.currentState ],
      ['Current Address', 'Pin Code', formData.currentPinCode ],
      ['Current Address', 'Police Station', formData.currentPoliceStation ],
      ['Current Address', 'Duration From', formData.currentDurationFrom ],
      ['Current Address', 'Duration To', formData.currentDurationTo ],

      // Permanent Address
      ['Permanent Address', 'Complete Address', formData.permanentCompleteAddress ],
      ['Permanent Address', 'Landmark', formData.permanentLandmark ],
      ['Permanent Address', 'City', formData.permanentCity ],
      ['Permanent Address', 'State', formData.permanentState ],
      ['Permanent Address', 'Pin Code', formData.permanentPinCode ],
      ['Permanent Address', 'Police Station', formData.permanentPoliceStation ],
      ['Permanent Address', 'Duration From', formData.permanentDurationFrom ],
      ['Permanent Address', 'Duration To', formData.permanentDurationTo ],

      // Education Details
      ...(formData.educationDetails || []).map((edu, index) => [
        [`Education ${index + 1}`, 'Institute Name', edu.instituteName ],
        [`Education ${index + 1}`, 'Course Name', edu.courseName ],
        [`Education ${index + 1}`, 'Passing Year', edu.passingYear ],
        [`Education ${index + 1}`, 'Registration Number', edu.registrationNumber ],
        [`Education ${index + 1}`, 'Mode', edu.mode ]
      ]).flat(),

      // Organization Details
      ['Organization', 'Organization Name', formData.organizationName ],
      ['Organization', 'Organization Address', formData.organizationAddress ],
      ['Organization', 'Designation', formData.designation ],
      ['Organization', 'Employee Code', formData.employeeCode ],
      ['Organization', 'Date of Joining', formData.dateOfJoining ],
      ['Organization', 'Last Working Day', formData.lastWorkingDay ],
      ['Organization', 'Salary', formData.salary ],
      ['Organization', 'Reason for Leaving', formData.reasonForLeaving ],

      // Manager Details
      ['Manager', 'Manager Name', formData.managerName ],
      ['Manager', 'Manager Contact', formData.managerContactNumber ],
      ['Manager', 'Manager Email', formData.managerEmailId ],

      // HR Details
      ...(formData.hrDetails || []).map((hr, index) => [
        [`HR ${index + 1}`, 'HR Name', hr.name ],
        [`HR ${index + 1}`, 'HR Contact', hr.contactNumber ],
        [`HR ${index + 1}`, 'HR Email', hr.emailId ]
      ]).flat(),

      // Reference Details
      ...(formData.referenceDetails || []).map((ref, index) => [
        [`Reference ${index + 1}`, 'Referee Name', ref.refereeName ],
        [`Reference ${index + 1}`, 'Organization Name', ref.organizationName ],
        [`Reference ${index + 1}`, 'Designation', ref.designation ],
        [`Reference ${index + 1}`, 'Contact Number', ref.contactNumber ],
        [`Reference ${index + 1}`, 'Email ID', ref.emailId ]
      ]).flat(),

      // Verification Checks
      ['Verification', 'Education Verification', formData.verificationChecks?.educationVerification ? 'Yes' : 'No'],
      ['Verification', 'Employment Verification', formData.verificationChecks?.employmentVerification ? 'Yes' : 'No'],
      ['Verification', 'Address & Criminal Verification', formData.verificationChecks?.addressCriminalVerification ? 'Yes' : 'No'],
      ['Verification', 'Identity Verification', formData.verificationChecks?.identityVerification ? 'Yes' : 'No'],
      ['Verification', 'CIBIL Verification', formData.verificationChecks?.cibilVerification ? 'Yes' : 'No'],

      // Authorization
      ['Authorization', 'Candidate Name', formData.candidateNameAuth || formData.candidateName ],
      ['Authorization', 'Signature', formData.signature ],
      ['Authorization', 'Auth Date', formData.authDate ]
    ];

    // Convert array to CSV string
    const csvContent = csvData
      .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `background_check_form_${formData.candidateName || 'candidate'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };  

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg flex items-center justify-between min-w-96 ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm">{notification.message}</span>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
{/* Header */}
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="py-6">
      {/* Top row with back button and heading */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleGoBack}
            className="flex items-center text-gray-500 hover:text-blue-600 transition-colors duration-200 text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Home
          </button>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight whitespace-nowrap">
            Employee Background Check Form
          </h1>
        </div>
      </div>
      
      {/* Email loading section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <label className="text-sm font-medium text-gray-700 min-w-0">
            Load Existing Form:
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-1">
            <input
              type="email"
              placeholder="Enter email address"
              value={emailToLoad}
              onChange={(e) => setEmailToLoad(e.target.value)}
              className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
            />
            <button
              onClick={handleLoadFormByEmail}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Loading...
                </div>
              ) : (
                'Load Form'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
      {formSubmitted && (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Form Submitted Successfully!</h2>
            <p className="text-green-700 mb-6">
              {userFormStatus === 'approved' 
                ? 'Your background check form has been approved by HR. You can now download the official document.'
                : userFormStatus === 'rejected'
                ? 'Your background check form has been rejected by HR. Please edit the form and resubmit.'
                : 'Your form has been submitted for review. HR will approve it shortly.'
              }
            </p>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> {userFormStatus ? userFormStatus.toUpperCase() : 'PENDING'}
              </p>
              {userFormId && (
                <p className="text-sm text-gray-600">
                  <strong>Form ID:</strong> {userFormId}
                </p>
              )}
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => handleGenerateDocument('csv')}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Download className="w-5 h-5 mr-2" />
                Download CSV
              </button>
            </div>
            
            {userFormStatus !== 'approved' && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setFormSubmitted(false);
                }}
                className="mt-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Edit Form
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Form */}
      {showForm && (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg">
            {/* Progress Steps */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      currentStep === index + 1 
                        ? 'bg-blue-600 text-white' 
                        : currentStep > index + 1 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {currentStep > index + 1 ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <div className="ml-2 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        currentStep >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-12 h-0.5 ml-4 ${
                        currentStep > index + 1 ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Candidate Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.candidateName}
                        onChange={(e) => handleInputChange('candidateName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {validationErrors.candidateName && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.candidateName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => handleInputChange('fatherName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={formData.motherName}
                        onChange={(e) => handleInputChange('motherName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marital Status
                      </label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.emailId}
                        onChange={(e) => handleInputChange('emailId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {validationErrors.emailId && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.emailId}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {validationErrors.contactNumber && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.contactNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alternate Contact Number
                      </label>
                      <input
                        type="tel"
                        value={formData.alternateContactNumber}
                        onChange={(e) => handleInputChange('alternateContactNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {validationErrors.alternateContactNumber && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.alternateContactNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aadhaar Card Number
                      </label>
                      <input
                        type="text"
                        value={formData.aadhaarCardNumber}
                        onChange={(e) => handleInputChange('aadhaarCardNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="12-digit Aadhaar number"
                      />
                      {validationErrors.aadhaarCardNumber && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.aadhaarCardNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        value={formData.panNumber}
                        onChange={(e) => handleInputChange('panNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        UAN Number
                      </label>
                      <input
                        type="text"
                        value={formData.uanNumber}
                        onChange={(e) => handleInputChange('uanNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Address Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Details</h3>
                  
                  {/* Current Address */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-4">Current Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Complete Address
                        </label>
                        <textarea
                          value={formData.currentCompleteAddress}
                          onChange={(e) => handleInputChange('currentCompleteAddress', e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prominent Landmark
                        </label>
                        <input
                          type="text"
                          value={formData.currentLandmark}
                          onChange={(e) => handleInputChange('currentLandmark', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.currentCity}
                          onChange={(e) => handleInputChange('currentCity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.currentState}
                          onChange={(e) => handleInputChange('currentState', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          value={formData.currentPinCode}
                          onChange={(e) => handleInputChange('currentPinCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {validationErrors.currentPinCode && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.currentPinCode}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nearest Police Station
                        </label>
                        <input
                          type="text"
                          value={formData.currentPoliceStation}
                          onChange={(e) => handleInputChange('currentPoliceStation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration From
                        </label>
                        <input
                          type="date"
                          value={formData.currentDurationFrom}
                          onChange={(e) => handleInputChange('currentDurationFrom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration To
                        </label>
                        <input
                          type="date"
                          value={formData.currentDurationTo}
                          onChange={(e) => handleInputChange('currentDurationTo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permanent Address */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-800">Permanent Address</h4>
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Copy from Current Address
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Complete Address
                        </label>
                        <textarea
                          value={formData.permanentCompleteAddress}
                          onChange={(e) => handleInputChange('permanentCompleteAddress', e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prominent Landmark
                        </label>
                        <input
                          type="text"
                          value={formData.permanentLandmark}
                          onChange={(e) => handleInputChange('permanentLandmark', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.permanentCity}
                          onChange={(e) => handleInputChange('permanentCity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.permanentState}
                          onChange={(e) => handleInputChange('permanentState', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          value={formData.permanentPinCode}
                          onChange={(e) => handleInputChange('permanentPinCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {validationErrors.permanentPinCode && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.permanentPinCode}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nearest Police Station
                        </label>
                        <input
                          type="text"
                          value={formData.permanentPoliceStation}
                          onChange={(e) => handleInputChange('permanentPoliceStation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration From
                        </label>
                        <input
                          type="date"
                          value={formData.permanentDurationFrom}
                          onChange={(e) => handleInputChange('permanentDurationFrom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration To
                        </label>
                        <input
                          type="date"
                          value={formData.permanentDurationTo}
                          onChange={(e) => handleInputChange('permanentDurationTo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Education Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Education Details</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('educationDetails', {
                        instituteName: '',
                        courseName: '',
                        passingYear: '',
                        registrationNumber: '',
                        mode: 'REGULAR'
                      })}
                      className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Education
                    </button>
                  </div>

                  {formData.educationDetails.map((education, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-800">
                          Education #{index + 1}
                        </h4>
                        {formData.educationDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('educationDetails', index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Institute Name
                          </label>
                          <input
                            type="text"
                            value={education.instituteName}
                            onChange={(e) => handleArrayChange('educationDetails', index, 'instituteName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Name
                          </label>
                          <input
                            type="text"
                            value={education.courseName}
                            onChange={(e) => handleArrayChange('educationDetails', index, 'courseName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passing Year
                          </label>
                          <input
                            type="number"
                            value={education.passingYear}
                            onChange={(e) => handleArrayChange('educationDetails', index, 'passingYear', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Registration Number
                          </label>
                          <input
                            type="text"
                            value={education.registrationNumber}
                            onChange={(e) => handleArrayChange('educationDetails', index, 'registrationNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mode
                          </label>
                          <select
                            value={education.mode}
                            onChange={(e) => handleArrayChange('educationDetails', index, 'mode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="REGULAR">Regular</option>
                            <option value="DISTANCE">Distance</option>
                            <option value="CORRESPONDENCE">Correspondence</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Employment Details */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={formData.organizationName}
                        onChange={(e) => handleInputChange('organizationName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Address
                      </label>
                      <textarea
                        value={formData.organizationAddress}
                        onChange={(e) => handleInputChange('organizationAddress', e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee Code
                      </label>
                      <input
                        type="text"
                        value={formData.employeeCode}
                        onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Joining
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfJoining}
                        onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Working Day
                      </label>
                      <input
                        type="date"
                        value={formData.lastWorkingDay}
                        onChange={(e) => handleInputChange('lastWorkingDay', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salary (CTC)
                      </label>
                      <input
                        type="text"
                        value={formData.salary}
                        onChange={(e) => handleInputChange('salary', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Leaving
                      </label>
                      <input
                        type="text"
                        value={formData.reasonForLeaving}
                        onChange={(e) => handleInputChange('reasonForLeaving', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manager Name
                      </label>
                      <input
                        type="text"
                        value={formData.managerName}
                        onChange={(e) => handleInputChange('managerName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manager Contact Number
                      </label>
                      <input
                        type="tel"
                        value={formData.managerContactNumber}
                        onChange={(e) => handleInputChange('managerContactNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {validationErrors.managerContactNumber && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.managerContactNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manager Email ID
                      </label>
                      <input
                        type="email"
                        value={formData.managerEmailId}
                        onChange={(e) => handleInputChange('managerEmailId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {validationErrors.managerEmailId && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.managerEmailId}</p>
                      )}
                    </div>
                  </div>

                  {/* HR Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-gray-800">HR Details</h4>
                      <button
                        type="button"
                        onClick={() => addArrayItem('hrDetails', {
                          name: '',
                          contactNumber: '',
                          emailId: ''
                        })}
                        className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add HR
                      </button>
                    </div>

                    {formData.hrDetails.map((hr, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-medium text-gray-700">HR #{index + 1}</h5>
                          {formData.hrDetails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArrayItem('hrDetails', index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Name
                            </label>
                            <input
                              type="text"
                              value={hr.name}
                              onChange={(e) => handleArrayChange('hrDetails', index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contact Number
                            </label>
                            <input
                              type="tel"
                              value={hr.contactNumber}
                              onChange={(e) => handleArrayChange('hrDetails', index, 'contactNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email ID
                            </label>
                            <input
                              type="email"
                              value={hr.emailId}
                              onChange={(e) => handleArrayChange('hrDetails', index, 'emailId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: References */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Reference Details</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('referenceDetails', {
                        refereeName: '',
                        organizationName: '',
                        designation: '',
                        contactNumber: '',
                        emailId: ''
                      })}
                      className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Reference
                    </button>
                  </div>

                  {formData.referenceDetails.map((reference, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-800">
                          Reference #{index + 1}
                        </h4>
                        {formData.referenceDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('referenceDetails', index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Referee Name
                          </label>
                          <input
                            type="text"
                            value={reference.refereeName}
                            onChange={(e) => handleArrayChange('referenceDetails', index, 'refereeName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organization Name
                          </label>
                          <input
                            type="text"
                            value={reference.organizationName}
                            onChange={(e) => handleArrayChange('referenceDetails', index, 'organizationName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Designation
                          </label>
                          <input
                            type="text"
                            value={reference.designation}
                            onChange={(e) => handleArrayChange('referenceDetails', index, 'designation', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Number
                          </label>
                          <input
                            type="tel"
                            value={reference.contactNumber}
                            onChange={(e) => handleArrayChange('referenceDetails', index, 'contactNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email ID
                          </label>
                          <input
                            type="email"
                            value={reference.emailId}
                            onChange={(e) => handleArrayChange('referenceDetails', index, 'emailId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 6: Authorization */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Checks & Authorization</h3>
                  
                  {/* Verification Checks */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Verification Checks Required</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.verificationChecks.educationVerification}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            verificationChecks: {
                              ...prev.verificationChecks,
                              educationVerification: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Education Verification</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.verificationChecks.employmentVerification}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            verificationChecks: {
                              ...prev.verificationChecks,
                              employmentVerification: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Employment Verification</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.verificationChecks.addressCriminalVerification}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            verificationChecks: {
                              ...prev.verificationChecks,
                              addressCriminalVerification: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Address & Criminal Verification</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.verificationChecks.identityVerification}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            verificationChecks: {
                              ...prev.verificationChecks,
                              identityVerification: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Identity Verification</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.verificationChecks.cibilVerification}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            verificationChecks: {
                              ...prev.verificationChecks,
                              cibilVerification: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">CIBIL Verification</span>
                      </label>
                    </div>
                  </div>

                  {/* Authorization */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Authorization</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Candidate Name (for Authorization)
                        </label>
                        <input
                          type="text"
                          value={formData.candidateNameAuth}
                          onChange={(e) => handleInputChange('candidateNameAuth', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Signature
                        </label>
                        <input
                          type="text"
                          value={formData.signature}
                          onChange={(e) => handleInputChange('signature', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Type your full name as signature"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={formData.authDate}
                          onChange={(e) => handleInputChange('authDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={formData.acknowledgment === 'true'}
                          onChange={(e) => handleInputChange('acknowledgment', e.target.checked ? 'true' : 'false')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                          required
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          I hereby authorize the verification of the above information and declare that all the information provided is true and correct to the best of my knowledge. I understand that any false information may result in the rejection of my application.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Form
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeBackgroundForm;
