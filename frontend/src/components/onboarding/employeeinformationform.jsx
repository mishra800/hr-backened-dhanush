import { useState } from 'react';
import api from '../../api/axios';

export default function EmployeeInformationForm({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Details
    full_name: '',
    designation: '',
    employee_id: '',
    photo: null,
    signature: null,
    
    // Contact Information
    personal_contact: '',
    official_contact: '',
    personal_email: '',
    official_email: '',
    
    // Address
    permanent_address: '',
    present_address: '',
    same_as_permanent: false,
    
    // Personal Information
    date_of_birth: '',
    gender: '',
    marital_status: '',
    blood_group: '',
    nationality: '',
    
    // Family Details
    father_name: '',
    mother_name: '',
    spouse_name: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relation: '',
    
    // Education Qualifications
    education: [],
    
    // Employment History
    employment_history: [],
    
    // Bank Details
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    
    // Statutory Details
    pan_number: '',
    aadhaar_number: '',
    uan_number: '',
    pf_number: '',
    esi_number: '',
    
    // Legal Declarations
    has_criminal_record: false,
    has_health_issues: false,
    health_issues_details: '',
    previous_employer_clearance: true,
  });

  const STEPS = [
    { id: 1, title: 'Personal Details', icon: '👤' },
    { id: 2, title: 'Contact & Address', icon: '📍' },
    { id: 3, title: 'Family Details', icon: '👨‍👩‍👧‍👦' },
    { id: 4, title: 'Education', icon: '🎓' },
    { id: 5, title: 'Employment History', icon: '💼' },
    { id: 6, title: 'Bank & Statutory', icon: '🏦' },
    { id: 7, title: 'Declarations', icon: '📝' },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  // Validation function for each step
  const validateStep = (step) => {
    switch (step) {
      case 1: // Personal Details
        if (!formData.full_name || !formData.designation || !formData.date_of_birth || !formData.gender) {
          alert('Please fill all required fields: Full Name, Designation, Date of Birth, and Gender');
          return false;
        }
        break;
      
      case 2: // Contact & Address
        if (!formData.personal_contact || !formData.personal_email || !formData.permanent_address) {
          alert('Please fill all required fields: Personal Contact, Personal Email, and Permanent Address');
          return false;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.personal_email)) {
          alert('Please enter a valid email address');
          return false;
        }
        // Phone validation (basic)
        const phoneRegex = /^[0-9+\s-]{10,}$/;
        if (!phoneRegex.test(formData.personal_contact)) {
          alert('Please enter a valid phone number (minimum 10 digits)');
          return false;
        }
        break;
      
      case 3: // Family Details
        if (!formData.emergency_contact_name || !formData.emergency_contact_number || !formData.emergency_contact_relation) {
          alert('Please fill all required Emergency Contact fields');
          return false;
        }
        break;
      
      case 4: // Education
        if (formData.education.length === 0) {
          alert('Please add at least one education qualification');
          return false;
        }
        // Validate each education entry
        for (let edu of formData.education) {
          if (!edu.course || !edu.institution) {
            alert('Please fill Course and Institution for all education entries');
            return false;
          }
        }
        break;
      
      case 5: // Employment History
        // Employment history is optional, but if added, validate
        for (let emp of formData.employment_history) {
          if (emp.employer && !emp.title) {
            alert('Please fill Job Title for all employment entries');
            return false;
          }
        }
        break;
      
      case 6: // Bank & Statutory
        if (!formData.bank_name || !formData.account_number || !formData.ifsc_code) {
          alert('Please fill all required Bank Details: Bank Name, Account Number, and IFSC Code');
          return false;
        }
        if (!formData.pan_number || !formData.aadhaar_number) {
          alert('Please fill all required Statutory Details: PAN Number and Aadhaar Number');
          return false;
        }
        // PAN validation (format: ABCDE1234F)
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.pan_number.toUpperCase())) {
          alert('Please enter a valid PAN number (Format: ABCDE1234F)');
          return false;
        }
        // Aadhaar validation (12 digits)
        const aadhaarRegex = /^[0-9]{12}$/;
        if (!aadhaarRegex.test(formData.aadhaar_number.replace(/\s/g, ''))) {
          alert('Please enter a valid Aadhaar number (12 digits)');
          return false;
        }
        break;
      
      case 7: // Declarations
        // No mandatory fields, but check if health issues details are provided if checkbox is checked
        if (formData.has_health_issues && !formData.health_issues_details) {
          alert('Please provide details about your health issues');
          return false;
        }
        break;
      
      default:
        return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission
    if (!validateStep(7)) {
      return;
    }

    // Show confirmation dialog with summary
    const confirmMessage = `
Please confirm your submission:

Personal Details: ${formData.full_name} (${formData.designation})
Contact: ${formData.personal_email}
Education Records: ${formData.education.length}
Employment Records: ${formData.employment_history.length}
Bank: ${formData.bank_name}
PAN: ${formData.pan_number}

Once submitted, you may need HR approval to make changes.
Do you want to proceed?
    `;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          if (key === 'education' || key === 'employment_history') {
            data.append(key, JSON.stringify(formData[key]));
          } else {
            data.append(key, formData[key]);
          }
        }
      });

      console.log('Submitting employee information form...');
      const response = await api.post('/onboarding/employee-information', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('Form submission successful:', response.data);
      alert('✅ Employee information submitted successfully!\n\nYour information has been recorded and will be reviewed by HR.');
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error occurred';
      alert(`❌ Failed to submit form. Please try again.\n\nError: ${errorMessage}`);
    }
  };

  const handleSubmitForReview = async () => {
    // Final validation before submission
    if (!validateStep(7)) {
      return;
    }

    try {
      // First submit the form data
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          if (key === 'education' || key === 'employment_history') {
            data.append(key, JSON.stringify(formData[key]));
          } else {
            data.append(key, formData[key]);
          }
        }
      });

      console.log('Submitting employee information form...');
      const formResponse = await api.post('/onboarding/employee-information', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('Form submission successful:', formResponse.data);

      // Then get employee ID and submit for compliance review
      const employeeResponse = await api.get('/onboarding/my-employee-id');
      const employeeId = employeeResponse.data.employee_id;

      console.log('Submitting for compliance review...');
      const reviewResponse = await api.post(`/onboarding/submit-for-review/${employeeId}`);
      
      console.log('Compliance review submission successful:', reviewResponse.data);
      
      alert(`✅ Form submitted for compliance review!

Your information has been submitted and is now pending admin review.

Next Steps:
1. Admin will verify your documents and information
2. Once approved, IT resources will be provisioned
3. You'll receive your company email and credentials

Status: ${reviewResponse.data.status}`);
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error submitting for review:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error occurred';
      alert(`❌ Failed to submit for review. Please try again.\n\nError: ${errorMessage}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-blue-100 text-xs text-blue-800 rounded">
          Debug: EmployeeInformationForm is rendering, currentStep: {currentStep}
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Employee Information Form</h2>
          <span className="text-sm text-gray-500">Step {currentStep} of {STEPS.length}</span>
        </div>
        
        {/* Progress percentage */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex-1 flex items-center">
              <div className={`flex flex-col items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  currentStep > step.id ? 'bg-green-500 text-white' :
                  currentStep === step.id ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? '✓' : step.icon}
                </div>
                <span className={`text-xs mt-1 text-center ${
                  currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-1 flex-1 mx-2 transition-all ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Required fields notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Note:</span> Fields marked with <span className="text-red-600">*</span> are mandatory and must be filled before proceeding to the next step.
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <PersonalDetailsStep formData={formData} onChange={handleInputChange} onFileChange={handleFileChange} />
        )}

        {/* Step 2: Contact & Address */}
        {currentStep === 2 && (
          <ContactAddressStep formData={formData} onChange={handleInputChange} />
        )}

        {/* Step 3: Family Details */}
        {currentStep === 3 && (
          <FamilyDetailsStep formData={formData} onChange={handleInputChange} />
        )}

        {/* Step 4: Education */}
        {currentStep === 4 && (
          <EducationStep formData={formData} setFormData={setFormData} />
        )}

        {/* Step 5: Employment History */}
        {currentStep === 5 && (
          <EmploymentHistoryStep formData={formData} setFormData={setFormData} />
        )}

        {/* Step 6: Bank & Statutory */}
        {currentStep === 6 && (
          <BankStatutoryStep formData={formData} onChange={handleInputChange} />
        )}

        {/* Step 7: Declarations */}
        {currentStep === 7 && (
          <DeclarationsStep formData={formData} onChange={handleInputChange} />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {currentStep < STEPS.length ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Save Draft
            </button>
            <button
              onClick={handleSubmitForReview}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              🔓 Submit for Compliance Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { FamilyDetailsStep, EducationStep, EmploymentHistoryStep, BankStatutoryStep, DeclarationsStep } from './formsteps';

// Step Components
function PersonalDetailsStep({ formData, onChange, onFileChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={onChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Designation *</label>
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={onChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
          <input
            type="text"
            name="employee_id"
            value={formData.employee_id}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={onChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={onChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
          <select
            name="marital_status"
            value={formData.marital_status}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
          <select
            name="blood_group"
            value={formData.blood_group}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
          <input
            type="text"
            name="nationality"
            value={formData.nationality}
            onChange={onChange}
            placeholder="e.g., Indian"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo (for ID Card)</label>
          <input
            type="file"
            name="photo"
            accept="image/*"
            onChange={onFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">Passport size photo (JPG/PNG, max 2MB)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Signature</label>
          <input
            type="file"
            name="signature"
            accept="image/*"
            onChange={onFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">Clear signature on white paper (JPG/PNG)</p>
        </div>
      </div>
    </div>
  );
}

function ContactAddressStep({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Contact & Address Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Personal Contact Number *</label>
          <input
            type="tel"
            name="personal_contact"
            value={formData.personal_contact}
            onChange={onChange}
            required
            placeholder="+91 XXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Official Contact Number</label>
          <input
            type="tel"
            name="official_contact"
            value={formData.official_contact}
            onChange={onChange}
            placeholder="+91 XXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Personal Email ID *</label>
          <input
            type="email"
            name="personal_email"
            value={formData.personal_email}
            onChange={onChange}
            required
            placeholder="your.email@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Official Email ID</label>
          <input
            type="email"
            name="official_email"
            value={formData.official_email}
            onChange={onChange}
            placeholder="Will be generated by IT"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
            readOnly
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Permanent Residential Address *</label>
        <textarea
          name="permanent_address"
          value={formData.permanent_address}
          onChange={onChange}
          required
          rows={3}
          placeholder="House No., Street, City, State, PIN Code"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="same_as_permanent"
          checked={formData.same_as_permanent}
          onChange={onChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-700">
          Present address is same as permanent address
        </label>
      </div>

      {!formData.same_as_permanent && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Present Residential Address</label>
          <textarea
            name="present_address"
            value={formData.present_address}
            onChange={onChange}
            rows={3}
            placeholder="House No., Street, City, State, PIN Code"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}

// Continue in next file part...
