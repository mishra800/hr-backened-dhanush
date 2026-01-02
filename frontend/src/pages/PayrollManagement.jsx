import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/authcontext';
import { 
  Calendar, 
  Download, 
  Eye, 
  Edit,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  Users,
  FileText,
  BarChart3
} from 'lucide-react';

export default function PayrollManagement() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isHRAdmin = ['super_admin', 'admin', 'hr', 'hr_manager'].includes(role);

  const [activeTab, setActiveTab] = useState(isHRAdmin ? 'dashboard' : 'my-payroll');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for different sections
  const [myPayrolls, setMyPayrolls] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [calculationResults, setCalculationResults] = useState(null);

  useEffect(() => {
    if (activeTab === 'my-payroll') {
      fetchMyPayrolls();
    } else if (activeTab === 'dashboard' && isHRAdmin) {
      fetchPayrollSummary();
    } else if (activeTab === 'employees' && isHRAdmin) {
      fetchEmployees();
    }
  }, [activeTab]);

  const fetchMyPayrolls = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payroll/my-payroll');
      setMyPayrolls(response.data);
    } catch (error) {
      setError('Failed to fetch payroll data');
      console.error('Error fetching payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll/summary/${selectedMonth}`);
      setPayrollSummary(response.data);
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      setPayrollSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      setError('Failed to fetch employees');
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayslip = async (payrollId) => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll/my-payslip/${payrollId}`);
      setSelectedPayslip(response.data);
    } catch (error) {
      setError('Failed to fetch payslip');
      console.error('Error fetching payslip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async () => {
    try {
      setLoading(true);
      const response = await api.post('/payroll/calculate', {
        month: selectedMonth,
        employee_ids: null // Calculate for all employees
      });
      setCalculationResults(response.data);
      setShowCalculationModal(true);
      setSuccess(`Payroll calculated successfully for ${response.data.processed_count} employees`);
    } catch (error) {
      setError('Failed to calculate payroll');
      console.error('Error calculating payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayroll = async (payrollIds) => {
    try {
      setLoading(true);
      const response = await api.post('/payroll/approve', {
        payroll_ids: payrollIds
      });
      setSuccess('Payroll approved successfully');
      // Refresh data
      if (activeTab === 'dashboard') {
        fetchPayrollSummary();
      }
    } catch (error) {
      setError('Failed to approve payroll');
      console.error('Error approving payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (format = 'excel') => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll/reports/monthly?month=${selectedMonth}&format=${format}`, {
        responseType: format === 'excel' ? 'blob' : 'json'
      });
      
      if (format === 'excel') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payroll_report_${selectedMonth}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setSuccess('Report downloaded successfully');
      }
    } catch (error) {
      setError('Failed to download report');
      console.error('Error downloading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'calculated': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
        <p className="mt-2 text-gray-600">
          {isHRAdmin ? 'Manage employee payroll and salary structures' : 'View your payslips and salary information'}
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {isHRAdmin && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`${activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`${activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Users className="h-5 w-5 mr-2" />
                Employee Payroll
              </button>
              <button
                onClick={() => setActiveTab('salary-structures')}
                className={`${activeTab === 'salary-structures'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Salary Structures
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('my-payroll')}
            className={`${activeTab === 'my-payroll'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="h-5 w-5 mr-2" />
            My Payslips
          </button>
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && isHRAdmin && (
        <div className="space-y-6">
          {/* Month Selector and Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Payroll Dashboard</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={fetchPayrollSummary}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {payrollSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Employees</p>
                      <p className="text-2xl font-bold text-blue-900">{payrollSummary.total_employees}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Gross Salary</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(payrollSummary.total_gross_salary)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-600">Total Deductions</p>
                      <p className="text-2xl font-bold text-red-900">{formatCurrency(payrollSummary.total_deductions)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Net Salary</p>
                      <p className="text-2xl font-bold text-purple-900">{formatCurrency(payrollSummary.total_net_salary)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleCalculatePayroll}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate Payroll'}
              </button>
              <button
                onClick={() => handleDownloadReport('excel')}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Excel Report
              </button>
            </div>
          </div>

          {/* Status Breakdown */}
          {payrollSummary && payrollSummary.status_breakdown && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payroll Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(payrollSummary.status_breakdown).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Payroll Tab */}
      {activeTab === 'my-payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">My Payslips</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {myPayrolls.length > 0 ? (
                  myPayrolls.map((payroll) => (
                    <div key={payroll.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payroll.month}</p>
                          <p className="text-sm text-gray-500">
                            Net Pay: {formatCurrency(payroll.net_salary)}
                          </p>
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payroll.status)}`}>
                              {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPayslip(payroll.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          {payroll.status === 'approved' && (
                            <button
                              onClick={() => handleDownloadPayslip(payroll.id)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium flex items-center"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No payslips found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payslip Preview */}
          <div className="lg:col-span-1">
            {selectedPayslip ? (
              <PayslipPreview payslip={selectedPayslip} />
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Select a payslip to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculation Results Modal */}
      {showCalculationModal && calculationResults && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payroll Calculation Results</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Processed: {calculationResults.processed_count} employees
                </p>
                {calculationResults.error_count > 0 && (
                  <p className="text-sm text-red-600">
                    Errors: {calculationResults.error_count} employees
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCalculationModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowCalculationModal(false);
                    fetchPayrollSummary();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Refresh Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Payslip Preview Component
function PayslipPreview({ payslip }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 border">
      <div className="text-center border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">DHA HR Systems</h2>
        <p className="text-sm text-gray-500">Payslip for {payslip.payroll_period.month}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700">Employee: {payslip.employee.name}</p>
        <p className="text-xs text-gray-500">ID: {payslip.employee.employee_code}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Earnings</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Basic Salary</span>
              <span className="font-medium">{formatCurrency(payslip.earnings.basic_salary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HRA</span>
              <span className="font-medium">{formatCurrency(payslip.earnings.hra)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Allowances</span>
              <span className="font-medium">
                {formatCurrency(
                  payslip.earnings.transport_allowance + 
                  payslip.earnings.medical_allowance + 
                  payslip.earnings.special_allowance + 
                  payslip.earnings.other_allowances
                )}
              </span>
            </div>
            {payslip.earnings.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Bonus</span>
                <span className="font-medium">{formatCurrency(payslip.earnings.bonus)}</span>
              </div>
            )}
            {payslip.earnings.overtime_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Overtime</span>
                <span className="font-medium">{formatCurrency(payslip.earnings.overtime_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total Earnings</span>
              <span>{formatCurrency(payslip.earnings.total)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Deductions</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">PF</span>
              <span className="font-medium">{formatCurrency(payslip.deductions.pf)}</span>
            </div>
            {payslip.deductions.esi > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">ESI</span>
                <span className="font-medium">{formatCurrency(payslip.deductions.esi)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Professional Tax</span>
              <span className="font-medium">{formatCurrency(payslip.deductions.professional_tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Income Tax</span>
              <span className="font-medium">{formatCurrency(payslip.deductions.income_tax)}</span>
            </div>
            {payslip.deductions.loan_deduction > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Deduction</span>
                <span className="font-medium">{formatCurrency(payslip.deductions.loan_deduction)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total Deductions</span>
              <span>{formatCurrency(payslip.deductions.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 bg-gray-50 p-4 rounded-md">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Net Pay</span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(payslip.summary.net_salary)}</span>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Working Days: {payslip.payroll_period.actual_working_days}/{payslip.payroll_period.total_working_days}</p>
        {payslip.payroll_period.leave_days > 0 && (
          <p>Leave Days: {payslip.payroll_period.leave_days}</p>
        )}
        {payslip.payroll_period.overtime_hours > 0 && (
          <p>Overtime Hours: {payslip.payroll_period.overtime_hours}</p>
        )}
      </div>

      <button
        onClick={() => window.print()}
        className="mt-6 w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
      >
        Print Payslip
      </button>
    </div>
  );
}