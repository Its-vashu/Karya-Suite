import React, { useState, useEffect } from 'react';
import { Users, FileText, Clock, Check, X, AlertCircle, Trash2, Eye } from 'lucide-react';
 import {
  User,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  GraduationCap,
  Building,
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const BackgroundCheckForm = () => {
  const [activeTab, setActiveTab] = useState('forms');
  const [formData, setFormData] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFormDetails, setShowFormDetails] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [remarks, setRemarks] = useState('');


  // Fetch all forms on component mount and when switching to forms tab
  useEffect(() => {
    if (activeTab === 'forms') {
      fetchAllForms();
    }
  }, [activeTab]);
// Add this to your fetchAllForms function to see what the backend returns:

const fetchAllForms = async () => {
  setLoading(true);
  setError('');
  try {
    const response = await fetch(`${API_BASE}/api/background-check/forms`);
    if (!response.ok) {
      throw new Error('Failed to fetch forms');
    }
    const data = await response.json();
    
    // ADD THIS LINE TO DEBUG:
    // console.log('Backend response for all forms:', data);
    // console.log('First form structure:', data[0]);
    
    setFormData(data);
  } catch (error) {
    //console.error('Error fetching forms:', error);
    setError('Failed to load forms');
  } finally {
    setLoading(false);
  }
};
  const fetchFormById = async (formId) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/background-check/form/${formId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      const data = await response.json();
      setSelectedForm(data);
      setShowFormDetails(true);
    } catch (error) {
      //console.error('Error fetching form details:', error);
      setError('Failed to load form details');
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/background-check/form/${formId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Form deleted successfully!');
        fetchAllForms(); // Refresh the forms list
      } else {
        const errorData = await response.json();
        // toast.warning(`Error deleting form: ${errorData.detail || 'Unknown error'}`);
        alert(`Error deleting form: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      //console.error('Error deleting form:', error);
      toast.warning(`Error deleting form: ${error.message}`);
    }
  };

  const handleApproval = async (formId, action, remarksText = '') => {
    try {
      const response = await fetch(`${API_BASE}/api/background-check/form/${formId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          remarks: remarksText
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Form ${action}d successfully!`);
        fetchAllForms(); // Refresh the forms list
        setShowFormDetails(false);
        setShowRemarksModal(false);
        setRemarks('');
      } else {
        const errorData = await response.json();
        alert(`Error ${action}ing form: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      //console.error(`Error ${action}ing form:`, error);
      // alert(`Error ${action}ing form: ${error.message}`);
      toast.warning(`Error ${action}ing form: ${error.message}`);
    }
  };

  const openRemarksModal = (action, formId) => {
    setApprovalAction(action);
    setSelectedForm(prev => ({ ...prev, id: formId }));
    setShowRemarksModal(true);
  };

  const submitApproval = () => {
    if (selectedForm) {
      handleApproval(selectedForm.id, approvalAction, remarks);
    }
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="flex items-center justify-center py-8 text-red-600">
      <AlertCircle className="w-5 h-5 mr-2" />
      <span>{message}</span>
    </div>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Check className="w-3 h-3 inline mr-1" />;
      case 'rejected':
        return <X className="w-3 h-3 inline mr-1" />;
      case 'pending':
      default:
        return <Clock className="w-3 h-3 inline mr-1" />;
    }
  };

  const RemarksModal = ({ isOpen, onClose, onSubmit, action }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">
            {action === 'approve' ? 'Approve' : 'Reject'} Form
          </h3>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks (optional)"
            className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className={`px-4 py-2 rounded-md text-white ${
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    );
  };

const FormDetailsModal = ({ form, onClose, openRemarksModal }) => { // openRemarksModal is received as prop here
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch complete form details from backend
  useEffect(() => {
    const fetchFormDetails = async () => {
      try {
        setLoading(true);
        // Corrected API endpoint for fetching form details
        const response = await fetch(`${API_BASE}/api/background-check/form/${form.id}`); 
        if (!response.ok) {
          throw new Error('Failed to fetch form details');
        }
        const data = await response.json();
        setFormData(data);
      } catch (err) {
        setError(err.message);
        // Fallback to provided form data if fetch fails
        setFormData(form);
      } finally {
        setLoading(false);
      }
    };

    if (form?.id) {
      fetchFormDetails();
    } else {
      setFormData(form);
      setLoading(false);
    }
  }, [form]); // Added form to dependency array. Also, BASE_URL should be in scope or passed as prop if it changes.

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return <Check className="w-4 h-4 inline mr-1" />;
      case 'rejected': return <X className="w-4 h-4 inline mr-1" />;
      default: return <Clock className="w-4 h-4 inline mr-1" />;
    }
  };

  const InfoField = ({ icon: Icon, label, value, className = "" }) => (
    <div className={`space-y-1 ${className}`}>
      <label className="flex items-center text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 mr-2" />}
        {label}
      </label>
      <p className="text-gray-900 bg-gray-50 p-2 rounded border">{value }</p>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200 mb-4">
      {Icon && <Icon className="w-5 h-5 text-blue-600" />}
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading form details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Form</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Background Check Form Details</h2>
              <p className="text-gray-600">Candidate: {formData?.candidate_name || 'Unknown'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Personal Information */}
          <section>
            <SectionHeader icon={User} title="Personal Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField icon={User} label="Candidate Name" value={formData?.candidate_name} />
              <InfoField icon={User} label="Father's Name" value={formData?.father_name} />
              <InfoField icon={User} label="Mother's Name" value={formData?.mother_name} />
              <InfoField icon={Calendar} label="Date of Birth" value={formData?.date_of_birth} />
              <InfoField label="Marital Status" value={formData?.marital_status} />
              <InfoField icon={Mail} label="Email ID" value={formData?.email_id} />
              <InfoField icon={Phone} label="Contact Number" value={formData?.contact_number} />
              <InfoField icon={Phone} label="Alternate Contact" value={formData?.alternate_contact_number} />
              <InfoField icon={CreditCard} label="Aadhaar Number" value={formData?.aadhaar_card_number} />
              <InfoField icon={CreditCard} label="PAN Number" value={formData?.pan_number} />
              <InfoField label="UAN Number" value={formData?.uan_number} />
            </div>
          </section>

          {/* Address Information */}
          <section>
            <SectionHeader icon={MapPin} title="Address Information" />

            {/* Current Address */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">Current Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField className="md:col-span-2" label="Complete Address" value={formData?.current_complete_address} />
                <InfoField label="Prominent Landmark" value={formData?.current_prominent_landmark} />
                <InfoField label="City" value={formData?.current_city} />
                <InfoField label="State" value={formData?.current_state} />
                <InfoField label="PIN Code" value={formData?.current_pin_code} />
                <InfoField label="Police Station" value={formData?.current_police_station} />
                <InfoField label="Duration From" value={formData?.current_duration_from} />
                <InfoField label="Duration To" value={formData?.current_duration_to} />
              </div>
            </div>

            {/* Permanent Address */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Permanent Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField className="md:col-span-2" label="Complete Address" value={formData?.permanent_complete_address} />
                <InfoField label="Prominent Landmark" value={formData?.permanent_prominent_landmark} />
                <InfoField label="City" value={formData?.permanent_city} />
                <InfoField label="State" value={formData?.permanent_state} />
                <InfoField label="PIN Code" value={formData?.permanent_pin_code} />
                <InfoField label="Police Station" value={formData?.permanent_police_station} />
                <InfoField label="Duration From" value={formData?.permanent_duration_from} />
                <InfoField label="Duration To" value={formData?.permanent_duration_to} />
              </div>
            </div>
          </section>

          {/* Education Information */}
          <section>
            <SectionHeader icon={GraduationCap} title="Education Qualification" />
            {/* The backend data for education details is likely an array, not separate fields like education_1_institute_name.
                You'll need to adjust this mapping based on your actual backend response structure.
                Assuming it's an array named `education_details` from the backend.
            */}
            {(formData?.education_details || []).map((edu, index) => {
              if (!edu.institution_name) return null; // Only render if there's data

              return (
                <div key={index} className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-800 mb-3">Education {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoField className="md:col-span-2" label="School/Institute/College/University" value={edu.institution_name} />
                    <InfoField label="Course Name" value={edu.degree || edu.field_of_study} /> {/* Adjust based on your backend field names */}
                    <InfoField label="Passing Year" value={edu.year_of_passing} />
                    <InfoField label="Registration/Roll Number" value={edu.percentage_or_cgpa} /> {/* Adjust based on your backend field names */}
                    <InfoField label="Mode" value={edu.mode} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Organization Details */}
          <section>
            <SectionHeader icon={Building} title="Organization Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField className="md:col-span-2" label="Organization Name" value={formData?.organization_name} />
              <InfoField className="md:col-span-2" label="Organization Address" value={formData?.organization_address} />
              <InfoField label="Designation" value={formData?.designation} />
              <InfoField label="Employee Code" value={formData?.employee_code} />
              <InfoField label="Date of Joining" value={formData?.date_of_joining} />
              <InfoField label="Last Working Day" value={formData?.last_working_day} />
              <InfoField label="Salary (CTC)" value={formData?.salary} /> {/* Corrected to formData.salary */}
              <InfoField label="Reason for Leaving" value={formData?.reason_for_leaving} />
            </div>

            {/* Reporting Manager */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-800 mb-3">Reporting Manager/Supervisor</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoField label="Manager Name" value={formData?.manager_name} /> {/* Corrected to formData.manager_name */}
                <InfoField label="Contact Number" value={formData?.manager_contact_number} /> {/* Corrected to formData.manager_contact_number */}
                <InfoField label="Email ID" value={formData?.manager_email_id} /> {/* Corrected to formData.manager_email_id */}
              </div>
            </div>

            {/* HR Details */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-800 mb-3">HR Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(formData?.hr_details || []).map((hr, index) => (
                  <div key={index}>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">HR Contact {index + 1}</h5>
                    <div className="space-y-2">
                      <InfoField label="Name" value={hr.hr_name} />
                      <InfoField label="Contact Number" value={hr.hr_contact_number} />
                      <InfoField label="Email ID" value={hr.hr_email_id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Professional References */}
          <section>
            <SectionHeader icon={Users} title="Professional References" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(formData?.reference_details || []).map((ref, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-800 mb-3">Referee {index + 1}</h4>
                  <div className="space-y-3">
                    <InfoField label="Name" value={ref.ref_name} />
                    <InfoField label="Organization" value={ref.address} /> {/* Assuming 'address' is used for organization name */}
                    <InfoField label="Designation" value={ref.relationship} /> {/* Assuming 'relationship' is used for designation */}
                    <InfoField label="Contact Number" value={ref.ref_contact_number} />
                    <InfoField label="Email ID" value={ref.ref_email_id} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Verification Checks */}
          <section>
            <SectionHeader icon={Check} title="Verification Checks" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Education Verification" value={formData?.verification_checks?.education_verification === 'true' ? 'Required' : 'Not Required'} />
              <InfoField label="Employment Verification" value={formData?.verification_checks?.employment_verification === 'true' ? 'Required' : 'Not Required'} />
              <InfoField label="Address & Criminal Verification" value={formData?.verification_checks?.address_verification === 'true' ? 'Required' : 'Not Required'} />
              <InfoField label="Identity Verification" value={formData?.verification_checks?.identity_verification === 'true' ? 'Required' : 'Not Required'} />
              <InfoField label="CIBIL Verification" value={formData?.verification_checks?.credit_check === 'true' ? 'Required' : 'Not Required'} />
            </div>
          </section>

          {/* Authorization */}
          <section>
            <SectionHeader icon={FileText} title="Authorization" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Candidate Name (Authorization)" value={formData?.candidate_name_auth} />
              <InfoField label="Signature" value={formData?.signature} />
              <InfoField label="Auth Date" value={formData?.auth_date} />
              <InfoField label="Acknowledgment" value={formData?.acknowledgment === 'true' ? 'Acknowledged' : 'Not Acknowledged'} />
            </div>
          </section>


          {/* Status and Remarks */}
          {formData?.remarks && (
            <section>
              <SectionHeader icon={FileText} title="Remarks" />
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{formData.remarks}</p>
              </div>
            </section>
          )}

          {/* Footer with status and actions */}
          <div className="border-t pt-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div>
                  <span className={`px-3 py-2 text-sm rounded-full font-medium inline-flex items-center ${getStatusColor(formData?.status)}`}>
                    {getStatusIcon(formData?.status)}
                    {formData?.status ? formData.status.charAt(0).toUpperCase() + formData.status.slice(1) : 'Pending'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Submitted: {new Date(formData?.created_at || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {(formData?.status === 'pending' || !formData?.status) && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => openRemarksModal('approve', formData.id)} // This is the call that needed the prop
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => openRemarksModal('reject', formData.id)} // This is the call that needed the prop
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const renderAllForms = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-lg font-semibold text-gray-800">All Background Check Forms</h3>
      <button
        onClick={fetchAllForms}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
      >
        Refresh
      </button>
    </div>

    {loading ? (
      <LoadingSpinner />
    ) : error ? (
      <ErrorMessage message={error} />
    ) : formData.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg">No forms found</p>
        <p className="text-sm mt-2">No background check forms have been submitted yet</p>
      </div>
    ) : (
      <div className="grid gap-4">
        {formData.map((form) => (
          <div key={form.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {/* Try multiple possible field names */}
                <h4 className="font-semibold text-gray-800 text-lg">
                  {form?.candidate_name || form?.name || form?.candidateName || 'Unknown Candidate'}
                </h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium mr-2">Email:</span>
                    {form?.email_id || form?.email || form?.emailId || 'Not provided'}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium mr-2">Contact:</span>
                    {form?.contact_number || form?.phone || form?.contact || form?.contactNumber || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusColor(form.status)}`}>
                  {getStatusIcon(form.status)}
                  {form.status ? form.status.charAt(0).toUpperCase() + form.status.slice(1) : 'Pending'}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Submitted: {new Date(form.created_at || form.createdAt || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchFormById(form.id)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </button>
                  <button
                    onClick={() => deleteForm(form.id)}
                    className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
  const renderPendingForms = () => {
    const pendingForms = formData.filter(form => form.status === 'pending' || !form.status);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Pending Approvals</h3>
          <button
            onClick={fetchAllForms}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : pendingForms.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No pending approvals</p>
            <p className="text-sm mt-2">All background checks have been processed</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingForms.map((form) => (
             <div key={form.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {/* Try multiple possible field names */}
                <h4 className="font-semibold text-gray-800 text-lg">
                  {form?.candidate_name || form?.name || form?.candidateName || 'Unknown Candidate'}
                </h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium mr-2">Email:</span>
                    {form?.email_id || form?.email || form?.emailId || 'Not provided'}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium mr-2">Contact:</span>
                    {form?.contact_number || form?.phone || form?.contact || form?.contactNumber || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusColor(form.status)}`}>
                  {getStatusIcon(form.status)}
                  {form.status ? form.status.charAt(0).toUpperCase() + form.status.slice(1) : 'Pending'}
                </span>
              </div>
            </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Submitted: {new Date(form.created_at || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchFormById(form.id)}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                      <button
                        onClick={() => openRemarksModal('approve', form.id)}
                        className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => openRemarksModal('reject', form.id)}
                        className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('forms')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'forms'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                All Forms
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Pending Approvals
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'forms' ? renderAllForms() : renderPendingForms()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFormDetails && selectedForm && (
        <FormDetailsModal
          form={selectedForm}
          onClose={() => {
            setShowFormDetails(false);
            setSelectedForm(null);
          }}
          // PASS openRemarksModal as a prop here
          openRemarksModal={openRemarksModal}
        />
      )}

      <RemarksModal
        isOpen={showRemarksModal}
        onClose={() => {
          setShowRemarksModal(false);
          setRemarks('');
        }}
        onSubmit={submitApproval}
        action={approvalAction}
      />
    </div>
  );
};

export default BackgroundCheckForm;