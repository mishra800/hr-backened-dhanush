import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authcontext';

const AssetAcknowledgmentForm = ({ onSubmit, onCancel, initialData = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_id_number: '',
    department: '',
    date_of_joining: '',
    
    // Received Items
    laptop_received: false,
    laptop_serial_number: '',
    laptop_model: '',
    laptop_condition: 'Good',
    
    email_received: false,
    email_address: '',
    email_password_received: false,
    
    wifi_access_received: false,
    wifi_credentials_received: false,
    
    id_card_received: false,
    id_card_number: '',
    
    biometric_setup_completed: false,
    biometric_type: '',
    
    // Additional Items
    monitor_received: false,
    monitor_serial_number: '',
    keyboard_received: false,
    mouse_received: false,
    headset_received: false,
    mobile_received: false,
    mobile_number: '',
    
    // Login Status
    system_login_working: false,
    email_login_working: false,
    vpn_access_working: false,
    
    // Comments
    employee_comments: '',
    issues_reported: '',
    additional_requirements: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        date_of_joining: initialData.date_of_joining ? 
          new Date(initialData.date_of_joining).toISOString().split('T')[0] : ''
      }));
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        date_of_joining: new Date(formData.date_of_joining).toISOString()
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting acknowledgment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <img src="/api/placeholder/150/60" alt="Company Logo" className="h-12 mr-4" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Asset Acknowledgment Form</h1>
            <p className="text-gray-600">IT Equipment & Setup Confirmation</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name *
              </label>
              <input
                type="text"
                name="employee_name"
                value={formData.employee_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                name="employee_id_number"
                value={formData.employee_id_number}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Joining *
              </label>
              <input
                type="date"
                name="date_of_joining"
                value={formData.date_of_joining}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* IT Equipment Received */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">IT Equipment Received</h2>
          
          {/* Laptop Section */}
          <div className="mb-4 p-3 border border-blue-200 rounded">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                name="laptop_received"
                checked={formData.laptop_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="font-medium text-gray-700">Laptop Received</label>
            </div>
            {formData.laptop_received && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <input
                  type="text"
                  name="laptop_serial_number"
                  placeholder="Serial Number"
                  value={formData.laptop_serial_number}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="laptop_model"
                  placeholder="Model"
                  value={formData.laptop_model}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="laptop_condition"
                  value={formData.laptop_condition}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs Repair">Needs Repair</option>
                </select>
              </div>
            )}
          </div>

          {/* Monitor Section */}
          <div className="mb-4 p-3 border border-blue-200 rounded">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                name="monitor_received"
                checked={formData.monitor_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="font-medium text-gray-700">Monitor Received</label>
            </div>
            {formData.monitor_received && (
              <input
                type="text"
                name="monitor_serial_number"
                placeholder="Monitor Serial Number"
                value={formData.monitor_serial_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Other Equipment */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="keyboard_received"
                checked={formData.keyboard_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              Keyboard
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="mouse_received"
                checked={formData.mouse_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              Mouse
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="headset_received"
                checked={formData.headset_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              Headset
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="mobile_received"
                checked={formData.mobile_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              Mobile Device
            </label>
          </div>

          {formData.mobile_received && (
            <div className="mt-3">
              <input
                type="text"
                name="mobile_number"
                placeholder="Mobile Number"
                value={formData.mobile_number}
                onChange={handleInputChange}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Access & Credentials */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Access & Credentials Setup</h2>
          
          {/* Email Setup */}
          <div className="mb-4 p-3 border border-green-200 rounded">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                name="email_received"
                checked={formData.email_received}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="font-medium text-gray-700">Email Account Setup</label>
            </div>
            {formData.email_received && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <input
                  type="email"
                  name="email_address"
                  placeholder="Email Address"
                  value={formData.email_address}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="email_password_received"
                    checked={formData.email_password_received}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Password Received
                </label>
              </div>
            )}
          </div>

          {/* WiFi Access */}
          <div className="mb-4 p-3 border border-green-200 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="wifi_access_received"
                  checked={formData.wifi_access_received}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                WiFi Access Provided
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="wifi_credentials_received"
                  checked={formData.wifi_credentials_received}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                WiFi Credentials Received
              </label>
            </div>
          </div>

          {/* ID Card & Biometric */}
          <div className="mb-4 p-3 border border-green-200 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="id_card_received"
                  checked={formData.id_card_received}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                ID Card Received
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="biometric_setup_completed"
                  checked={formData.biometric_setup_completed}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                Biometric Setup Completed
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formData.id_card_received && (
                <input
                  type="text"
                  name="id_card_number"
                  placeholder="ID Card Number"
                  value={formData.id_card_number}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {formData.biometric_setup_completed && (
                <select
                  name="biometric_type"
                  value={formData.biometric_type}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Biometric Type</option>
                  <option value="fingerprint">Fingerprint</option>
                  <option value="face_recognition">Face Recognition</option>
                  <option value="both">Both</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Login Status Verification */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Login Status Verification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center p-3 border border-yellow-200 rounded">
              <input
                type="checkbox"
                name="system_login_working"
                checked={formData.system_login_working}
                onChange={handleInputChange}
                className="mr-2"
              />
              System Login Working
            </label>
            <label className="flex items-center p-3 border border-yellow-200 rounded">
              <input
                type="checkbox"
                name="email_login_working"
                checked={formData.email_login_working}
                onChange={handleInputChange}
                className="mr-2"
              />
              Email Login Working
            </label>
            <label className="flex items-center p-3 border border-yellow-200 rounded">
              <input
                type="checkbox"
                name="vpn_access_working"
                checked={formData.vpn_access_working}
                onChange={handleInputChange}
                className="mr-2"
              />
              VPN Access Working
            </label>
          </div>
        </div>

        {/* Comments & Issues */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Comments & Issues</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Comments
              </label>
              <textarea
                name="employee_comments"
                value={formData.employee_comments}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any general comments about the setup process..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issues Reported
              </label>
              <textarea
                name="issues_reported"
                value={formData.issues_reported}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Report any issues with equipment or setup..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Requirements
              </label>
              <textarea
                name="additional_requirements"
                value={formData.additional_requirements}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional equipment or access needed..."
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Acknowledgment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetAcknowledgmentForm;