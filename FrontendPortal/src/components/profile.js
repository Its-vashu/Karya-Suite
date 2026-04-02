import React, { useState, useEffect, useCallback } from 'react';
import { User, Edit2, Save, X, Calendar, CreditCard, FileText, MapPin, Phone, Mail, Users, Briefcase } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import {useUser} from '../context/UserContext'

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const Profile = () => {

  const {role,fullName} = useUser();
  // console.log("User role from context:", role);

  const [userProfile, setUserProfile] = useState({
    // Basic Information
    fullName: '',
    nickname: '',
    bio: '',
    email: '',
    phoneNumber: '',
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

    // Educational Information
    educationDetails: [], // Ensure this is always an array

    // Professional Information
    currentEmployer: '',
    designation: '',
    workExperience: '',
    previousEmployer: '',
    organizationAddress: '',
    employeeCode: '',
    dateOfJoining: '',
    lastWorkingDay: '',
    salary: '',
    reasonForLeaving: '',
    managerName: '',
    managerContactNumber: '',
    managerEmailId: '',
    hrDetails: [], // Ensure this is always an array

    // Government Documents
    aadharNumber: '',
    panNumber: '',
    passportNumber: '',
    drivingLicense: '',
    uanNumber: '',

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelation: '',

    // Additional Information
    references: [], // Ensure this is always an array
    criminalRecord: '',
    medicalHistory: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({
    nickname: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formApprovalStatus, setFormApprovalStatus] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userFormId, setUserFormId] = useState(null);

  const getTokenInfo = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const base64Payload = token.split('.')[1];
        const payload = atob(base64Payload);
        const decoded = JSON.parse(payload);
        return {
          userId: decoded.user_id || decoded.id,
          username: decoded.sub || decoded.username || 'User',
          email: decoded.email
        };
      } catch (err) {
        //console.error('Token decode error:', err);
        alert('Invalid token. Please log in again.');
        return null;
      }
    }
    return null;
  }, []);

  // Fetch user nickname
  const fetchNickname = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/nickname`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.nickname || '';
      } else if (response.status === 404) {
        // console.log('No nickname found for this user.');
        return '';
      } else {
        throw new Error(`Failed to fetch nickname: ${response.status}`);
      }
    } catch (error) {
      // console.error('Error fetching nickname:', error);
      return '';
    }
  };

  // Fetch user bio
  const fetchBio = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/bio`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.bio || '';
      } else if (response.status === 404) {
        // console.log('No bio found for this user.');
        return '';
      } else {
        throw new Error(`Failed to fetch bio: ${response.status}`);
      }
    } catch (error) {
      // console.error('Error fetching bio:', error);
      return '';
    }
  };

  // Update user nickname
  // const updateNickname = async (userId, nickname) => {
  //   try {
  //     const response = await fetch(`${API_BASE}/users/${userId}/nickname`, {
  //       method: 'PUT',
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  //         'Content-Type': 'application/json',
  //         'Accept': 'application/json'
  //       },
  //       body: JSON.stringify({ nickname })
  //     });

  //     if (response.ok) {
  //       // const data = await response.json();
  //       // console.log('Nickname updated successfully:', data);
  //       return true;
  //     } else {
  //       const errorData = await response.json().catch(() => ({}));
  //       // console.error('Failed to update nickname:', response.status, errorData);
  //       throw new Error(`Failed to update nickname: ${errorData.detail || 'Unknown error'}`);
  //     }
  //   } catch (error) {
  //     // console.error('Error updating nickname:', error);
  //     throw error;
  //   }
  // };

  // Update user bio
  // const updateBio = async (userId, bio) => {
  //   try {
  //     const response = await fetch(`${API_BASE}/users/${userId}/bio`, {
  //       method: 'PUT',
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  //         'Content-Type': 'application/json',
  //         'Accept': 'application/json'
  //       },
  //       body: JSON.stringify({ bio })
  //     });

  //     if (response.ok) {
  //       // const data = await response.json();
  //       // console.log('Bio updated successfully:', data);
  //       return true;
  //     } else {
  //       const errorData = await response.json().catch(() => ({}));
  //       // console.error('Failed to update bio:', response.status, errorData);
  //       throw new Error(`Failed to update bio: ${errorData.detail || 'Unknown error'}`);
  //     }
  //   } catch (error) {
  //     // console.error('Error updating bio:', error);
  //     throw error;
  //   }
  // };

  // Save editable fields (nickname and bio)
  // const saveEditableFields = async () => {
  //   if (!userId) {
  //     setError('User ID not available. Please refresh the page.');
  //     return;
  //   }

  //   setSaving(true);
  //   setError(null);

  //   try {
  //     // Update nickname if it has changed
  //     if (editableFields.nickname !== userProfile.nickname) {
  //       await updateNickname(userId, editableFields.nickname);
  //     }

  //     // Update bio if it has changed
  //     if (editableFields.bio !== userProfile.bio) {
  //       await updateBio(userId, editableFields.bio);
  //     }

  //     // Update the user profile state with the new values
  //     setUserProfile(prev => ({
  //       ...prev,
  //       nickname: editableFields.nickname,
  //       bio: editableFields.bio
  //     }));

  //     setIsEditing(false);
  //     //console.log('Profile updated successfully');
  //   } catch (error) {
  //     //console.error('Error saving profile:', error);
  //     setError(`Failed to save changes: ${error.message}`);
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  // Cancel editing
  // const cancelEditing = () => {
  //   setEditableFields({
  //     nickname: userProfile.nickname,
  //     bio: userProfile.bio
  //   });
  //   setIsEditing(false);
  //   setError(null);
  // };

  const fetchProfilePic = async (currentUserId) => {
    if (!currentUserId) return;
    try {
      const response = await fetch(`${API_BASE}/users/${currentUserId}/profile-pic`);
      if (!response.ok) {
        if (response.status === 404) {
          // console.log('No profile picture found for this user.');
          setUserProfile(prev => ({ ...prev, profilePicture: '' }));
        } else {
          throw new Error('Failed to fetch image');
        }
      } else {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setUserProfile(prev => ({
          ...prev,
          profilePicture: imageUrl,
        }));
      }
    } catch (err) {
      // console.error('Error fetching profile image:', err);
      setUserProfile(prev => ({ ...prev, profilePicture: '' }));
    }
  };

  // New function to fetch profile using the new API endpoint
  const fetchProfileByEmail = async (email) => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/profile/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        // console.log("Fetched Profile Data from new API:", profileData);
        
        // Map the API response to your userProfile structure
        const mappedProfileData = {
          fullName: profileData.candidate_name || '',
          email: profileData.email_id || email,
          phoneNumber: profileData.contact_number || '',
          dateOfBirth: profileData.date_of_birth || '',
          maritalStatus: profileData.marital_status || '',
          gender: profileData.gender || '',
          fatherName: profileData.father_name || '',
          motherName: profileData.mother_name || '',
          
          // Current Address
          currentAddress: profileData.current_complete_address || '',
          currentLandmark: profileData.current_landmark || '',
          currentCity: profileData.current_city || '',
          currentState: profileData.current_state || '',
          currentPinCode: profileData.current_pin_code || '',
          currentPoliceStation: profileData.current_police_station || '',
          currentDurationFrom: profileData.current_duration_from || '',
          currentDurationTo: profileData.current_duration_to || '',
          
          // Permanent Address
          permanentAddress: profileData.permanent_complete_address || '',
          permanentLandmark: profileData.permanent_landmark || '',
          permanentCity: profileData.permanent_city || '',
          permanentState: profileData.permanent_state || '',
          permanentPinCode: profileData.permanent_pin_code || '',
          permanentPoliceStation: profileData.permanent_police_station || '',
          permanentDurationFrom: profileData.permanent_duration_from || '',
          permanentDurationTo: profileData.permanent_duration_to || '',
          
          // Education Details
          educationDetails: Array.isArray(profileData.education_details) ? profileData.education_details.map(edu => ({
            instituteName: edu.institution_name || '',
            courseName: edu.degree || edu.field_of_study || '',
            passingYear: edu.year_of_passing || '',
            registrationNumber: edu.percentage_or_cgpa || '',
            mode: edu.mode || 'REGULAR',
          })) : [],
          
          // Professional Information
          currentEmployer: profileData.organization_name || '',
          designation: profileData.designation || '',
          organizationAddress: profileData.organization_address || '',
          employeeCode: profileData.employee_code || '',
          dateOfJoining: profileData.date_of_joining || '',
          lastWorkingDay: profileData.last_working_day || '',
          salary: profileData.salary || '',
          reasonForLeaving: profileData.reason_for_leaving || '',
          managerName: profileData.manager_name || '',
          managerContactNumber: profileData.manager_contact_number || '',
          managerEmailId: profileData.manager_email_id || '',
          
          // HR Details
          hrDetails: Array.isArray(profileData.hr_details) ? profileData.hr_details.map(hr => ({
            name: hr.hr_name || '',
            contactNumber: hr.hr_contact_number || '',
            emailId: hr.hr_email_id || '',
          })) : [],
          
          // Government Documents
          aadharNumber: profileData.aadhaar_card_number || '',
          panNumber: profileData.pan_number || '',
          uanNumber: profileData.uan_number || '',
          passportNumber: profileData.passport_number || '',
          drivingLicense: profileData.driving_license_number || '',
          
          // References
          references: Array.isArray(profileData.reference_details) ? profileData.reference_details.map(ref => ({
            name: ref.ref_name || '',
            contact: ref.ref_contact_number || '',
            relation: ref.relationship || '',
            organization: ref.address || '',
            email: ref.ref_email_id || ''
          })) : [],
          
          // Emergency Contact
          emergencyContactName: profileData.emergency_contact_name || '',
          emergencyContactNumber: profileData.emergency_contact_number || '',
          emergencyContactRelation: profileData.emergency_contact_relation || '',
          
          // Additional Information
          criminalRecord: profileData.verification_checks?.criminal_record_check === 'true' ? 'Yes, record found' : 'No criminal record',
          medicalHistory: profileData.medical_history || '',
        };

        // Set form approval status and form ID if available
        if (profileData.id) {
          setUserFormId(profileData.id);
        }
        if (profileData.status) {
          setFormApprovalStatus(profileData.status);
        }

        return mappedProfileData;
      } else if (response.status === 404) {
        // console.log("Profile not found for this email.");
        setFormApprovalStatus('not_submitted');
        return null;
      } else {
        const errorData = await response.json().catch(() => ({}));
        // console.error("Error fetching profile by email:", response.status, errorData);
        setFormApprovalStatus('error');
        throw new Error(`Failed to fetch profile: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      // console.error('Error in fetchProfileByEmail:', error);
      setFormApprovalStatus('error');
      throw error;
    }
  };

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tokenInfo = getTokenInfo();

    if (!tokenInfo || !tokenInfo.userId || !tokenInfo.email) {
      setError("User not authenticated. Please log in.");
      setLoading(false);
      setUserProfile(prev => ({...prev, fullName: 'Guest User', email: ''}));
      setEditableFields({ nickname: '', bio: '' });
      setFormApprovalStatus('not_authenticated');
      return;
    }

    setUserId(tokenInfo.userId);
    let fetchedData = {
      fullName: tokenInfo.username || '',
      email: tokenInfo.email || '',
      nickname: '',
      bio: '',
      // Initialize array fields explicitly here as well,
      // in case the API doesn't return them or returns null
      educationDetails: [],
      hrDetails: [],
      references: [],
    };

    try {
      // First, try to fetch profile using the new API endpoint
      try {
        const newProfileData = await fetchProfileByEmail(tokenInfo.email);
        if (newProfileData) {
          fetchedData = { ...fetchedData, ...newProfileData };
          // console.log("Successfully fetched data from new profile API");
        }
      } catch (newApiError) {
        // console.log("New profile API failed, falling back to existing methods:", newApiError.message);
        
        // Fallback to existing API calls
        const allFormsResponse = await fetch(`${API_BASE}/api/background-check/forms`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Accept': 'application/json'
          }
        });

        let formData = null;
        if (allFormsResponse.ok) {
          const allForms = await allFormsResponse.json();
          formData = allForms.find(form => form.email_id === tokenInfo.email);
          if (formData) {
            setUserFormId(formData.id);
            setFormApprovalStatus(formData.status);

            if (formData.status === 'approved') {
              const mappedBackgroundData = {
                fullName: formData.candidate_name || fetchedData.fullName,
                email: formData.email_id || fetchedData.email,
                phoneNumber: formData.contact_number || '',
                dateOfBirth: formData.date_of_birth || '',
                maritalStatus: formData.marital_status || '',
                fatherName: formData.father_name || '',
                motherName: formData.mother_name || '',
                currentAddress: formData.current_complete_address || '',
                currentLandmark: formData.current_landmark || '',
                currentCity: formData.current_city || '',
                currentState: formData.current_state || '',
                currentPinCode: formData.current_pin_code || '',
                currentPoliceStation: formData.current_police_station || '',
                currentDurationFrom: formData.current_duration_from || '',
                currentDurationTo: formData.current_duration_to || '',
                permanentAddress: formData.permanent_complete_address || '',
                permanentLandmark: formData.permanent_landmark || '',
                permanentCity: formData.permanent_city || '',
                permanentState: formData.permanent_state || '',
                permanentPinCode: formData.permanent_pin_code || '',
                permanentPoliceStation: formData.permanent_police_station || '',
                permanentDurationFrom: formData.permanent_duration_from || '',
                permanentDurationTo: formData.permanent_duration_to || '',
                // Ensure arrays from form data are properly handled to prevent undefined issues
                educationDetails: Array.isArray(formData.education_details) ? formData.education_details.map(edu => ({
                  instituteName: edu.institution_name || '',
                  courseName: edu.degree || edu.field_of_study || '',
                  passingYear: edu.year_of_passing || '',
                  registrationNumber: edu.percentage_or_cgpa || '',
                  mode: edu.mode || 'REGULAR',
                })) : [],
                currentEmployer: formData.organization_name || '',
                designation: formData.designation || '',
                organizationAddress: formData.organization_address || '',
                employeeCode: formData.employee_code || '',
                dateOfJoining: formData.date_of_joining || '',
                lastWorkingDay: formData.last_working_day || '',
                salary: formData.salary || '',
                reasonForLeaving: formData.reason_for_leaving || '',
                managerName: formData.manager_name || '',
                managerContactNumber: formData.manager_contact_number || '',
                managerEmailId: formData.manager_email_id || '',
                hrDetails: Array.isArray(formData.hr_details) ? formData.hr_details.map(hr => ({
                  name: hr.hr_name || '',
                  contactNumber: hr.hr_contact_number || '',
                  emailId: hr.hr_email_id || '',
                })) : [],
                aadharNumber: formData.aadhaar_card_number || '',
                panNumber: formData.pan_number || '',
                uanNumber: formData.uan_number || '',
                references: Array.isArray(formData.reference_details) ? formData.reference_details.map(ref => ({
                  name: ref.ref_name || '',
                  contact: ref.ref_contact_number || '',
                  relation: ref.relationship || '',
                  organization: ref.address || '',
                  email: ref.ref_email_id || ''
                })) : [],
                criminalRecord: formData.verification_checks?.criminal_record_check === 'true' ? 'Yes, record found' : 'No criminal record',
                medicalHistory: formData.medical_history || '',
                passportNumber: formData.passport_number || '',
                drivingLicense: formData.driving_license_number || '',
                emergencyContactName: formData.emergency_contact_name || '',
                emergencyContactNumber: formData.emergency_contact_number || '',
                emergencyContactRelation: formData.emergency_contact_relation || '',
                gender: formData.gender || '',
              };
              // Merge approved background data into fetchedData.
              // Note: nickname and bio are intentionally NOT overwritten here,
              // as they are managed by the individual endpoints.
              fetchedData = { ...fetchedData, ...mappedBackgroundData };
              setError(null);
            } else {
              setError(`Your background check form is ${formData.status.toUpperCase()}. Full details not visible yet.`);
            }
          } else {
            setFormApprovalStatus('not_submitted');
            setError('No background check form has been submitted for your account.');
          }
        } else {
          const errorData = await allFormsResponse.json().catch(() => ({}));
          // console.error('Failed to fetch all forms:', allFormsResponse.status, errorData);
          setError('Failed to fetch background check forms.'+ (errorData.detail || ''));
          setFormApprovalStatus('error');
        }
      }

      // Fetch nickname and bio using individual endpoints
      if (tokenInfo.userId) {
        try {
          const [nickname, bio] = await Promise.all([
            fetchNickname(tokenInfo.userId),
            fetchBio(tokenInfo.userId)
          ]);
          
          fetchedData = {
            ...fetchedData,
            nickname: nickname,
            bio: bio,
          };
          
          // console.log("Successfully fetched nickname and bio from individual endpoints");
        } catch (nicknameOrBioError) {
          // console.log("Failed to fetch nickname or bio, using defaults:", nicknameOrBioError);
        }
      }

      setUserProfile(fetchedData);
      setEditableFields({
        nickname: fetchedData.nickname,
        bio: fetchedData.bio
      });

      if (tokenInfo?.userId) {
        await fetchProfilePic(tokenInfo.userId);
      }

    } catch (error) {
      //console.error('Error fetching data for profile:', error);
      setError('Network error or server unavailable. Please check your connection and try again.');
      setFormApprovalStatus('error');
      setEditableFields({ nickname: '', bio: '' });
    } finally {
      setLoading(false);
    }
  }, [getTokenInfo]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);
  const updateEditableFields = async () => {
    setSaving(true);
    if (!userId) {
      setError("User ID not available for update.");
      setSaving(false);
      return;
    }

    try {
      const updateNicknameResponse = await fetch(`${API_BASE}/users/${userId}/nickname`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: editableFields.nickname })
      });

      const updateBioResponse = await fetch(`${API_BASE}/users/${userId}/bio`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: editableFields.bio })
      });

      let nicknameUpdated = false;
      let bioUpdated = false;
      let updateError = null;

      if (updateNicknameResponse.ok) {
        const updatedNicknameData = await updateNicknameResponse.json();
        setUserProfile(prev => ({
          ...prev,
          nickname: updatedNicknameData.nickname
        }));
        nicknameUpdated = true;
        // console.log("Nickname updated successfully:", updatedNicknameData);
      } else {
        const errorData = await updateNicknameResponse.json().catch(() => ({}));
        // console.error('Failed to update nickname:', updateNicknameResponse.status, errorData);
        updateError = `Failed to update nickname: ${errorData.detail || 'Unknown error'}.`;
      }

      if (updateBioResponse.ok) {
        const updatedBioData = await updateBioResponse.json();
        setUserProfile(prev => ({
          ...prev,
          bio: updatedBioData.bio
        }));
        bioUpdated = true;
        // console.log("Bio updated successfully:", updatedBioData);
      } else {
        const errorData = await updateBioResponse.json().catch(() => ({}));
        // console.error('Failed to update bio:', updateBioResponse.status, errorData);
        updateError = updateError ? `${updateError} Also, failed to update bio: ${errorData.detail || 'Unknown error'}.` : `Failed to update bio: ${errorData.detail || 'Unknown error'}.`;
      }

      if (nicknameUpdated && bioUpdated) {
        setIsEditing(false);
        setError(null);
      } else if (updateError) {
        setError(updateError);
      } else {
        setError("An unknown error occurred while updating profile.");
      }

    } catch (error) {
      // console.error('Error updating profile:', error);
      setError('Network error. Please check your connection or server status.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleEdit = () => {
    setIsEditing(true);
    // When starting edit, populate editableFields with current userProfile values
    setEditableFields({
      nickname: userProfile.nickname,
      bio: userProfile.bio
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // When canceling, revert editableFields to the current userProfile values
    setEditableFields({
      nickname: userProfile.nickname,
      bio: userProfile.bio
    });
  };

  const handleInputChange = (field, value) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !userId) {
      setError("User ID not available for profile picture upload.");
      return;
    }

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/users/upload-profile-pic/`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        // Re-fetch profile pic to update the displayed image
        await fetchProfilePic(userId);
        setError(null); // Clear any upload-related errors
      } else {
        const errorData = await res.json().catch(() => ({}));
        // console.error('Failed to upload profile picture:', res.status, errorData);
        setError(`Failed to upload profile picture: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      // console.error('Upload error:', err);
      setError('Network error during picture upload. Please check connection.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      // Ensure date is valid before formatting
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
      }
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      //console.error("Error formatting date:", e);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Error Message - Still show general errors like network issues or auth */}
        {error && (formApprovalStatus === 'error' || formApprovalStatus === 'not_authenticated' || error.includes('Failed to update') || error.includes('Failed to upload')) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                {!(formApprovalStatus && formApprovalStatus !== 'approved' && formApprovalStatus !== 'not_authenticated') && (
                  <div className="mt-3">
                    <button
                      onClick={fetchProfileData}
                      className="text-sm font-medium text-red-800 hover:text-red-600"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header with Profile Picture and Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 px-6 py-4">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                {userProfile.profilePicture ? (
                  <img
                    src={userProfile.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
                <Edit2 className="w-4 h-4" />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {userProfile.fullName || fullName || 'Employee Profile'}
                  <span className="text-xl font-normal text-blue-600 ml-2">({role})</span>
                </h1>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={updateEditableFields}
                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Nickname (Editable) */}
              <div className="mb-2">
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                {isEditing ? (
                  <input
                    id="nickname"
                    type="text"
                    value={editableFields.nickname || ''}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your nickname"
                  />
                ) : (
                  <p className="text-lg text-gray-700">{userProfile.nickname || 'No nickname set'}</p>
                )}
              </div>

              {/* Bio (Editable) */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    value={editableFields.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-700 max-w-2xl">{userProfile.bio || 'No bio added yet'}</p>
                )}
              </div>
              {/* Conditional message based on form approval status, but NOT blocking display */}
              {formApprovalStatus && formApprovalStatus !== 'approved' && formApprovalStatus !== 'not_authenticated' && formApprovalStatus !== 'not_submitted' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Your background check form is **{formApprovalStatus.toUpperCase()}**. Other details will appear once approved.
                </div>
              )}
               {formApprovalStatus === 'not_submitted' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  No background check form has been submitted yet for your account. Please submit one to see your full profile.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                  <p className="text-gray-700">{userProfile.fatherName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                  <p className="text-gray-700">{userProfile.motherName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-700 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    {userProfile.email || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <p className="text-gray-700 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {userProfile.phoneNumber || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <p className="text-gray-700 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {formatDate(userProfile.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <p className="text-gray-700">{userProfile.gender || 'Not provided'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                  <p className="text-gray-700">{userProfile.maritalStatus || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Address Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Current Address
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address</label>
                <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.currentAddress || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.currentLandmark || 'Not provided'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <p className="text-gray-700">{userProfile.currentCity || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <p className="text-gray-700">{userProfile.currentState || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                  <p className="text-gray-700">{userProfile.currentPinCode || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Police Station</label>
                  <p className="text-gray-700">{userProfile.currentPoliceStation || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration From</label>
                  <p className="text-gray-700">{formatDate(userProfile.currentDurationFrom)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration To</label>
                  <p className="text-gray-700">{formatDate(userProfile.currentDurationTo)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permanent Address Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Permanent Address
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address</label>
                <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.permanentAddress || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.permanentLandmark || 'Not provided'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <p className="text-gray-700">{userProfile.permanentCity || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <p className="text-gray-700">{userProfile.permanentState || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                  <p className="text-gray-700">{userProfile.permanentPinCode || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Police Station</label>
                  <p className="text-gray-700">{userProfile.permanentPoliceStation || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration From</label>
                  <p className="text-gray-700">{formatDate(userProfile.permanentDurationFrom)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration To</label>
                  <p className="text-gray-700">{formatDate(userProfile.permanentDurationTo)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Educational Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Educational Qualifications
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Defensive check added here */}
              {(userProfile.educationDetails && userProfile.educationDetails.length > 0) ? (
                userProfile.educationDetails.map((edu, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Education {index + 1}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
                        <p className="text-gray-700">{edu.instituteName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                        <p className="text-gray-700">{edu.courseName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passing Year</label>
                        <p className="text-gray-700">{edu.passingYear || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration No.</label>
                        <p className="text-gray-700">{edu.registrationNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                        <p className="text-gray-700">{edu.mode || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-700">No educational details provided.</p>
              )}
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                Professional Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="text-md font-semibold text-gray-800 mb-2">Previous Organization Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <p className="text-gray-700">{userProfile.currentEmployer || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Address</label>
                  <p className="text-gray-700">{userProfile.organizationAddress || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <p className="text-gray-700">{userProfile.designation || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code</label>
                  <p className="text-gray-700">{userProfile.employeeCode || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                  <p className="text-gray-700">{formatDate(userProfile.dateOfJoining)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
                  <p className="text-gray-700">{formatDate(userProfile.lastWorkingDay)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary (CTC)</label>
                  <p className="text-gray-700">{userProfile.salary || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                  <p className="text-gray-700">{userProfile.reasonForLeaving || 'Not provided'}</p>
                </div>
              </div>

              <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">Reporting Manager/Supervisor Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name</label>
                  <p className="text-gray-700">{userProfile.managerName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Contact Number</label>
                  <p className="text-gray-700">{userProfile.managerContactNumber || 'Not provided'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Email ID</label>
                  <p className="text-gray-700">{userProfile.managerEmailId || 'Not provided'}</p>
                </div>
              </div>

              <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">HR Details</h3>
              {/* Defensive check added here */}
              {(userProfile.hrDetails && userProfile.hrDetails.length > 0) ? (
                userProfile.hrDetails.map((hr, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">HR Contact {index + 1}</h4>
                    <p className="text-gray-700">Name: {hr.name || 'Not provided'}</p>
                    <p className="text-gray-700">Contact: {hr.contactNumber || 'Not provided'}</p>
                    <p className="text-gray-700">Email: {hr.emailId || 'Not provided'}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-700">No HR details provided.</p>
              )}
            </div>
          </div>

          {/* Professional References */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Professional References
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Defensive check added here */}
              {(userProfile.references && userProfile.references.length > 0) ? (
                userProfile.references.map((ref, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Reference {index + 1}</h3>
                    <p className="text-gray-700">Name: {ref.name || 'Not provided'}</p>
                    <p className="text-gray-700">Organization: {ref.organization || 'Not provided'}</p>
                    <p className="text-gray-700">Designation/Relation: {ref.relation || 'Not provided'}</p>
                    <p className="text-gray-700">Contact: {ref.contact || 'Not provided'}</p>
                    <p className="text-gray-700">Email: {ref.email || 'Not provided'}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-700">No professional references provided.</p>
              )}
            </div>
          </div>
        </div>

        {/* Government Documents - Full Width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-green-600" />
              Government & Legal Documents
            </h2>
            <p className="text-sm text-gray-600 mt-1">These details are protected and cannot be modified from here.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.aadharNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.panNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UAN Number</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {userProfile.uanNumber || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {(userProfile.criminalRecord && userProfile.criminalRecord !== 'No criminal record') || userProfile.medicalHistory ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-600" />
                Additional Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {userProfile.criminalRecord && userProfile.criminalRecord !== 'No criminal record' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Criminal Record Status</label>
                  <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    {userProfile.criminalRecord}
                  </p>
                </div>
              )}
              {userProfile.medicalHistory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                  <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    {userProfile.medicalHistory}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Profile;