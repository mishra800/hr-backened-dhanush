import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/authcontext';

export default function Employees() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const canManageEmployees = ['admin', 'hr', 'manager'].includes(role);

  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    department: '',
    position: '',
    date_of_joining: '',
    user_id: '',
    pan_number: '',
    aadhaar_number: '',
    profile_summary: '',
    email: '',
    password: '',
    auto_generate_password: true,
    role: 'employee' // NEW: Role selection
  });
  
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchUsers();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Extract Info (Mock AI)
      const extractResponse = await api.post('/employees/extract-info', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const extracted = extractResponse.data;
      setNewEmployee(prev => ({
        ...prev,
        first_name: extracted.first_name || prev.first_name,
        last_name: extracted.last_name || prev.last_name,
        pan_number: extracted.pan_number || prev.pan_number,
        aadhaar_number: extracted.aadhaar_number || prev.aadhaar_number,
        profile_summary: extracted.summary || prev.profile_summary
      }));

      alert('AI Extraction Complete! Please review the auto-filled details.');
    } catch (error) {
      console.error('Error extracting info:', error);
      alert('Failed to extract information.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/employees/${currentEmployeeId}`, newEmployee);
        alert('Employee updated successfully!');
        closeModal();
        fetchEmployees();
      } else {
        // Use the new endpoint that creates both user and employee
        const response = await api.post('/employees/create-with-account', {
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          email: newEmployee.email || `${newEmployee.first_name.toLowerCase()}.${newEmployee.last_name.toLowerCase()}@dhanushhealthcare.com`.replace(/\s/g, ''),
          department: newEmployee.department,
          position: newEmployee.position,
          date_of_joining: newEmployee.date_of_joining,
          pan_number: newEmployee.pan_number,
          aadhaar_number: newEmployee.aadhaar_number,
          profile_summary: newEmployee.profile_summary,
          password: newEmployee.auto_generate_password ? undefined : newEmployee.password,
          role: newEmployee.role || 'employee'
        });
        
        // Show credentials to admin - DON'T close modal yet
        setGeneratedCredentials(response.data.login_credentials);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error.response?.data?.detail || 'Failed to save employee.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const openEditModal = (employee) => {
    setIsEditing(true);
    setCurrentEmployeeId(employee.id);
    setNewEmployee({
      first_name: employee.first_name,
      last_name: employee.last_name,
      department: employee.department,
      position: employee.position,
      date_of_joining: employee.date_of_joining ? employee.date_of_joining.split('T')[0] : '',
      user_id: employee.user_id,
      pan_number: employee.pan_number || '',
      aadhaar_number: employee.aadhaar_number || '',
      profile_summary: employee.profile_summary || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentEmployeeId(null);
    setGeneratedCredentials(null);
    setNewEmployee({
      first_name: '',
      last_name: '',
      department: '',
      position: '',
      date_of_joining: '',
      user_id: '',
      pan_number: '',
      aadhaar_number: '',
      profile_summary: '',
      email: '',
      password: '',
      auto_generate_password: true
    });
  };

  const [showDocModal, setShowDocModal] = useState(false);
  const [employeeDocs, setEmployeeDocs] = useState([]);
  const [selectedEmpForDocs, setSelectedEmpForDocs] = useState(null);

  const openDocModal = async (employee) => {
    setSelectedEmpForDocs(employee);
    // Fetch docs (mock or real if endpoint existed, for now just show upload)
    // In real app: const res = await api.get(`/employees/${employee.id}/documents`);
    // setEmployeeDocs(res.data);
    setShowDocModal(true);
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', 'General');

    try {
      await api.post(`/employees/${selectedEmpForDocs.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Document uploaded successfully!');
      // Refresh docs list
      // For now, we need to re-fetch the employee to get the updated docs list
      // Ideally we would just append to the local state, but let's re-fetch for simplicity
      const res = await api.get(`/employees/${selectedEmpForDocs.id}`);
      setSelectedEmpForDocs(res.data);
      fetchEmployees(); // Update the main list as well
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        {canManageEmployees && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
          >
            Add Employee
          </button>
        )}
      </div>

      {/* Document Modal */}
      {showDocModal && selectedEmpForDocs && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Documents for {selectedEmpForDocs.first_name}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Document</label>
              <input
                type="file"
                onChange={handleDocUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Repository</h3>
              {selectedEmpForDocs.documents && selectedEmpForDocs.documents.length > 0 ? (
                <ul className="divide-y divide-gray-200 border rounded-md">
                  {selectedEmpForDocs.documents.map((doc) => (
                    <li key={doc.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                      <div className="w-0 flex-1 flex items-center">
                        <span className="ml-2 flex-1 w-0 truncate">{doc.document_type} - {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <a href="#" className="font-medium text-primary hover:text-blue-500">
                          Download
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 italic">No documents found.</p>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDocModal(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Display Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Created!</h2>
              <p className="text-sm text-gray-600">Save these login credentials securely</p>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-bold text-yellow-900 mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Login Credentials
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center bg-white border border-gray-300 rounded-md p-3">
                    <code className="flex-1 text-sm font-mono text-gray-900">{generatedCredentials.email}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCredentials.email);
                        alert('Email copied!');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex items-center bg-white border border-gray-300 rounded-md p-3">
                    <code className="flex-1 text-sm font-mono text-gray-900 font-bold">{generatedCredentials.password}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCredentials.password);
                        alert('Password copied!');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <div className="bg-white border border-gray-300 rounded-md p-3">
                    <span className="text-sm font-medium text-gray-900 uppercase">{generatedCredentials.role}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-800 font-medium">
                  ⚠️ This password will only be shown once. Make sure to save it securely!
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const text = `Login Credentials\n\nEmail: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}\nRole: ${generatedCredentials.role}\n\nLogin URL: http://localhost:5173/login`;
                  navigator.clipboard.writeText(text);
                  alert('All credentials copied to clipboard!');
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                📋 Copy All
              </button>
              <button
                onClick={() => {
                  setGeneratedCredentials(null);
                  closeModal();
                }}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && !generatedCredentials && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Employee' : 'Add New Employee'}</h2>

            {!isEditing && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Auto-fill with AI</h3>
                <p className="text-xs text-blue-600 mb-3">Upload a document (Offer Letter, PAN, etc.) to auto-extract details.</p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  disabled={uploading}
                />
                {uploading && <p className="text-xs text-gray-500 mt-2">Analyzing document...</p>}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={newEmployee.first_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={newEmployee.last_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={newEmployee.department}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={newEmployee.position}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    value={newEmployee.date_of_joining}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      name="role"
                      value={newEmployee.role}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the user's access level
                    </p>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email (for login)</label>
                  <input
                    type="email"
                    name="email"
                    value={newEmployee.email}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-generate: firstname.lastname@dhanushhealthcare.com
                  </p>
                </div>
              )}

              {!isEditing && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">🔐 Login Credentials</h3>
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="auto_generate_password"
                      checked={newEmployee.auto_generate_password}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, auto_generate_password: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="auto_generate_password" className="ml-2 block text-sm text-gray-700">
                      Auto-generate secure password (Recommended)
                    </label>
                  </div>
                  
                  {!newEmployee.auto_generate_password && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                      <input
                        type="text"
                        name="password"
                        value={newEmployee.password}
                        onChange={handleInputChange}
                        placeholder="Enter password for employee"
                        required={!newEmployee.auto_generate_password}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Password will be shared with employee after creation
                      </p>
                    </div>
                  )}
                  
                  {newEmployee.auto_generate_password && (
                    <p className="text-xs text-blue-600">
                      ✓ A secure password will be generated automatically and displayed after creation
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                  <input
                    type="text"
                    name="pan_number"
                    value={newEmployee.pan_number}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaar_number"
                    value={newEmployee.aadhaar_number}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Profile Summary (AI Generated)</label>
                <textarea
                  name="profile_summary"
                  value={newEmployee.profile_summary}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
                >
                  {isEditing ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date of Joining
              </th>
              {canManageEmployees && (
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                        {employee.first_name[0]}{employee.last_name[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs text-gray-500">ID: {employee.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{employee.department}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{employee.position}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(employee.date_of_joining).toLocaleDateString()}
                </td>
                {canManageEmployees && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => openDocModal(employee)} className="text-gray-600 hover:text-gray-900">Docs</button>
                    <button onClick={() => openEditModal(employee)} className="text-primary hover:text-blue-900">Edit</button>
                    <button onClick={() => handleDelete(employee.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
