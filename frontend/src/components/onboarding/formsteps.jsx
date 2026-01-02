// Additional Form Steps for Employee Information Form

export function FamilyDetailsStep({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Family Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name</label>
          <input
            type="text"
            name="father_name"
            value={formData.father_name}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mother's Name</label>
          <input
            type="text"
            name="mother_name"
            value={formData.mother_name}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Spouse Name (if married)</label>
          <input
            type="text"
            name="spouse_name"
            value={formData.spouse_name}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="font-semibold text-red-900 mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={onChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
            <input
              type="tel"
              name="emergency_contact_number"
              value={formData.emergency_contact_number}
              onChange={onChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Relation *</label>
            <select
              name="emergency_contact_relation"
              value={formData.emergency_contact_relation}
              onChange={onChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Relation</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="spouse">Spouse</option>
              <option value="sibling">Sibling</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EducationStep({ formData, setFormData }) {
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, {
        course: '',
        institution: '',
        specialization: '',
        year_of_passing: '',
        percentage: ''
      }]
    }));
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Educational Qualifications</h3>
        <button
          onClick={addEducation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Education
        </button>
      </div>

      {formData.education.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No education records added yet. Click "Add Education" to start.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.education.map((edu, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-700">Education #{index + 1}</h4>
                <button
                  onClick={() => removeEducation(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course/Degree</label>
                  <input
                    type="text"
                    value={edu.course}
                    onChange={(e) => updateEducation(index, 'course', e.target.value)}
                    placeholder="e.g., B.Tech, MBA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution/College</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={edu.specialization}
                    onChange={(e) => updateEducation(index, 'specialization', e.target.value)}
                    placeholder="e.g., Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year of Passing</label>
                  <input
                    type="number"
                    value={edu.year_of_passing}
                    onChange={(e) => updateEducation(index, 'year_of_passing', e.target.value)}
                    placeholder="YYYY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage/CGPA</label>
                  <input
                    type="text"
                    value={edu.percentage}
                    onChange={(e) => updateEducation(index, 'percentage', e.target.value)}
                    placeholder="e.g., 85% or 8.5 CGPA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmploymentHistoryStep({ formData, setFormData }) {
  const addEmployment = () => {
    setFormData(prev => ({
      ...prev,
      employment_history: [...prev.employment_history, {
        employer: '',
        title: '',
        duration: '',
        reason_for_leaving: ''
      }]
    }));
  };

  const removeEmployment = (index) => {
    setFormData(prev => ({
      ...prev,
      employment_history: prev.employment_history.filter((_, i) => i !== index)
    }));
  };

  const updateEmployment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      employment_history: prev.employment_history.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Employment History</h3>
        <button
          onClick={addEmployment}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Employment
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          Please list your past employment in reverse chronological order (most recent first)
        </p>
      </div>

      {formData.employment_history.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No employment history added. Click "Add Employment" if you have previous work experience.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.employment_history.map((emp, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-700">Employment #{index + 1}</h4>
                <button
                  onClick={() => removeEmployment(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Employer</label>
                  <input
                    type="text"
                    value={emp.employer}
                    onChange={(e) => updateEmployment(index, 'employer', e.target.value)}
                    placeholder="Company Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={emp.title}
                    onChange={(e) => updateEmployment(index, 'title', e.target.value)}
                    placeholder="Your Position"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={emp.duration}
                    onChange={(e) => updateEmployment(index, 'duration', e.target.value)}
                    placeholder="e.g., Jan 2020 - Dec 2022"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                  <input
                    type="text"
                    value={emp.reason_for_leaving}
                    onChange={(e) => updateEmployment(index, 'reason_for_leaving', e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BankStatutoryStep({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Bank & Statutory Details</h3>
      
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
        <h4 className="font-semibold text-green-900 mb-3">Bank Account Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
            <input
              type="text"
              name="bank_name"
              value={formData.bank_name}
              onChange={onChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={onChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
            <input
              type="text"
              name="ifsc_code"
              value={formData.ifsc_code}
              onChange={onChange}
              required
              placeholder="e.g., SBIN0001234"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
            <input
              type="text"
              name="branch_name"
              value={formData.branch_name}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-3">Statutory Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number *</label>
            <input
              type="text"
              name="pan_number"
              value={formData.pan_number}
              onChange={onChange}
              required
              placeholder="ABCDE1234F"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number *</label>
            <input
              type="text"
              name="aadhaar_number"
              value={formData.aadhaar_number}
              onChange={onChange}
              required
              placeholder="XXXX XXXX XXXX"
              maxLength={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">UAN Number (if available)</label>
            <input
              type="text"
              name="uan_number"
              value={formData.uan_number}
              onChange={onChange}
              placeholder="Universal Account Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PF Number (if available)</label>
            <input
              type="text"
              name="pf_number"
              value={formData.pf_number}
              onChange={onChange}
              placeholder="Provident Fund Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ESI Number (if available)</label>
            <input
              type="text"
              name="esi_number"
              value={formData.esi_number}
              onChange={onChange}
              placeholder="Employee State Insurance"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeclarationsStep({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Legal Declarations</h3>
      
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-start">
            <input
              type="checkbox"
              name="has_criminal_record"
              checked={formData.has_criminal_record}
              onChange={onChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <label className="ml-3 block text-sm text-gray-700">
              I have a criminal record or pending legal cases
            </label>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-start mb-2">
            <input
              type="checkbox"
              name="has_health_issues"
              checked={formData.has_health_issues}
              onChange={onChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <label className="ml-3 block text-sm text-gray-700">
              I have any health issues or medical conditions that may affect my work
            </label>
          </div>
          
          {formData.has_health_issues && (
            <div className="ml-7 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Please specify:</label>
              <textarea
                name="health_issues_details"
                value={formData.health_issues_details}
                onChange={onChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-start">
            <input
              type="checkbox"
              name="previous_employer_clearance"
              checked={formData.previous_employer_clearance}
              onChange={onChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <label className="ml-3 block text-sm text-gray-700">
              I have obtained proper clearance from my previous employer (if applicable)
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-900 mb-3">Final Declaration</h4>
        <p className="text-sm text-yellow-800 mb-4">
          I declare that the information given in support of my application is true and complete to the best of my knowledge and belief. I understand that any false information or omission may result in rejection of my application or termination of my employment.
        </p>
        <div className="flex items-start">
          <input
            type="checkbox"
            required
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
          />
          <label className="ml-3 block text-sm font-semibold text-yellow-900">
            I agree to the above declaration *
          </label>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mt-6">
        <p>By submitting this form, you acknowledge that all information provided is accurate and complete.</p>
      </div>
    </div>
  );
}
