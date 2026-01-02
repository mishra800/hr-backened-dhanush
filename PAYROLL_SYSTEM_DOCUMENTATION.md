# Comprehensive Payroll System Documentation

## Overview

The Payroll System is a comprehensive module that handles salary calculations, payslip generation, and payroll management for the HR system. It supports role-based access control, automated calculations, manual adjustments, approval workflows, and detailed reporting.

## Features Implemented

### ✅ Core Functionality

1. **Salary Calculation**
   - Comprehensive earnings calculation (Basic, HRA, Allowances, Bonus, Overtime)
   - Automated deductions (PF, ESI, Professional Tax, Income Tax)
   - Attendance-based pro-rata calculations
   - Manual adjustments support
   - Tax slab-based income tax calculation

2. **Payslip Generation**
   - Detailed payslip with all earnings and deductions
   - Professional formatting with company branding
   - PDF generation capability
   - Email distribution support
   - Payslip history and archive

3. **Role-Based Access Control**
   - **Admin/Super Admin**: Full access to all payroll functions
   - **HR**: Can calculate payroll, manage salary structures (cannot approve)
   - **HR Manager**: Full HR access including approval rights
   - **Manager**: Can view team payroll (limited access)
   - **Employee**: Can view own payslips only
   - **Candidate**: No payroll access

4. **Approval Workflow**
   - Draft → Calculated → Approved → Paid status flow
   - Role-based approval permissions
   - Audit trail for all changes
   - Notification system for status updates

5. **Reporting & Analytics**
   - Monthly payroll summary reports
   - Excel export functionality
   - Payroll trends analysis
   - Component-wise breakdown
   - Status-based reporting

### ✅ Advanced Features

1. **Salary Structure Management**
   - Create and update employee salary structures
   - Effective date tracking
   - Salary revision history
   - CTC calculation and tracking

2. **Manual Adjustments**
   - Add/modify earnings and deductions
   - Adjustment notes and audit trail
   - Recalculation with adjustments
   - Approval required for adjustments

3. **Batch Processing**
   - Bulk payroll calculation for all employees
   - Batch status tracking
   - Error handling and reporting
   - Progress monitoring

4. **Configuration Management**
   - Configurable tax slabs
   - Deduction rules management
   - Payroll parameters configuration
   - Financial year settings

## Technical Implementation

### Backend Architecture

#### Models (backend/app/models.py)
- **Payroll**: Main payroll record with all earnings, deductions, and metadata
- **SalaryStructure**: Employee salary components and structure
- **SalaryRevision**: Salary change history and tracking
- **PayrollConfiguration**: System-wide payroll settings
- **TaxSlab**: Income tax slab configuration
- **DeductionRule**: Configurable deduction rules
- **PayrollBatch**: Batch processing tracking
- **PayslipDistribution**: Payslip distribution logging

#### Services (backend/app/payroll_service.py)
- **PayrollService**: Core business logic for payroll calculations
- Attendance integration for working days calculation
- Tax calculation with slab-based computation
- Deduction calculation (PF, ESI, Professional Tax)
- Overtime calculation
- Manual adjustment handling
- Notification integration

#### API Endpoints (backend/app/routers/payroll.py)
- **Employee Endpoints**:
  - `GET /payroll/my-payroll` - Get own payroll history
  - `GET /payroll/my-payslip/{id}` - Get own payslip details
  - `GET /payroll/salary-structure/{id}` - Get salary structure

- **HR/Admin Endpoints**:
  - `POST /payroll/calculate` - Calculate payroll for employees
  - `POST /payroll/approve` - Approve payroll records
  - `PUT /payroll/manual-adjustment` - Apply manual adjustments
  - `POST /payroll/salary-structure` - Create/update salary structure
  - `GET /payroll/summary/{month}` - Get payroll summary
  - `GET /payroll/reports/monthly` - Generate monthly reports

### Frontend Architecture

#### Components (frontend/src/pages/PayrollManagement.jsx)
- **PayrollManagement**: Main payroll management interface
- **PayslipPreview**: Detailed payslip preview component
- Role-based UI rendering
- Responsive design with Tailwind CSS
- Interactive dashboards and forms

#### Features
- **Dashboard**: Payroll summary, statistics, and quick actions
- **Employee Payroll**: Individual employee payroll management
- **Salary Structures**: Salary structure creation and management
- **My Payslips**: Employee self-service payslip access
- **Reports**: Excel export and analytics

### Database Schema

#### Core Tables
```sql
-- Enhanced payroll table with comprehensive fields
payroll (
    id, employee_id, month, status,
    basic_salary, hra, transport_allowance, medical_allowance,
    special_allowance, bonus, overtime_amount, other_allowances,
    pf, esi, professional_tax, income_tax, loan_deduction, other_deductions,
    total_working_days, actual_working_days, leave_days, overtime_hours,
    gross_salary, total_deductions, net_salary,
    calculated_by, approved_by, payment_date,
    calculation_notes, manual_adjustments
)

-- Enhanced salary structures
salary_structures (
    id, employee_id, basic_salary, hra,
    transport_allowance, medical_allowance, special_allowance,
    other_allowances, effective_date
)

-- Configuration tables
payroll_configurations (config_key, config_value, description)
tax_slabs (financial_year, min_income, max_income, tax_rate)
deduction_rules (rule_name, rule_type, rule_config)
```

## Calculation Logic

### Earnings Calculation
1. **Basic Salary**: Base salary from salary structure
2. **HRA**: House Rent Allowance (typically 40-50% of basic)
3. **Allowances**: Transport, Medical, Special allowances
4. **Bonus**: Performance or festival bonuses
5. **Overtime**: Calculated at 1.5x hourly rate for extra hours
6. **Pro-rata**: Adjusted based on actual working days

### Deductions Calculation
1. **Provident Fund (PF)**: 12% of basic salary (capped at ₹15,000)
2. **ESI**: 0.75% of gross salary (if gross ≤ ₹25,000)
3. **Professional Tax**: State-specific (Karnataka rates implemented)
4. **Income Tax**: Slab-based calculation with standard deduction
5. **Loan Deductions**: From loan management system
6. **Other Deductions**: Configurable additional deductions

### Tax Slabs (FY 2023-24)
- ₹0 - ₹2,50,000: 0%
- ₹2,50,001 - ₹5,00,000: 5%
- ₹5,00,001 - ₹10,00,000: 20%
- Above ₹10,00,000: 30%

## Role-Based Permissions

### Super Admin / Admin
- ✅ View all payroll data
- ✅ Calculate payroll for all employees
- ✅ Approve payroll records
- ✅ Manage salary structures
- ✅ Export payroll reports
- ✅ Manage payroll configuration

### HR
- ✅ View all payroll data
- ✅ Calculate payroll for all employees
- ❌ Approve payroll records (calculation only)
- ✅ Manage salary structures
- ✅ Export payroll reports
- ❌ Manage payroll configuration

### HR Manager
- ✅ View all payroll data
- ✅ Calculate payroll for all employees
- ✅ Approve payroll records
- ✅ Manage salary structures
- ✅ Export payroll reports
- ✅ Manage payroll configuration

### Manager
- ✅ View own payroll
- ❌ View team payroll (to be implemented)
- ❌ Calculate payroll
- ❌ Other payroll functions

### Employee
- ✅ View own payroll history
- ✅ Download own payslips
- ❌ All other payroll functions

## API Usage Examples

### Calculate Payroll for All Employees
```javascript
const response = await api.post('/payroll/calculate', {
  month: '2024-01',
  employee_ids: null, // null for all employees
  manual_adjustments: {
    earnings: { bonus: 5000 },
    deductions: { loan_deduction: 2000 }
  }
});
```

### Get Employee Payslip
```javascript
const payslip = await api.get('/payroll/my-payslip/123');
```

### Create Salary Structure
```javascript
const salaryStructure = await api.post('/payroll/salary-structure', {
  employee_id: 1,
  basic_salary: 50000,
  hra: 20000,
  transport_allowance: 2000,
  medical_allowance: 1500,
  special_allowance: 5000,
  other_allowances: 1500
});
```

### Generate Monthly Report
```javascript
// Excel export
const report = await api.get('/payroll/reports/monthly?month=2024-01&format=excel', {
  responseType: 'blob'
});
```

## Installation & Setup

### 1. Database Migration
```bash
# Run the payroll migration script
sqlite3 backend/hr_system.db < backend/payroll_migration.sql
```

### 2. Backend Dependencies
```bash
cd backend
pip install pandas openpyxl  # For Excel export functionality
```

### 3. Frontend Dependencies
```bash
cd frontend
npm install @heroicons/react  # For UI icons (if not already installed)
```

### 4. Configuration
The system comes with default configurations, but you can customize:
- Tax slabs in `tax_slabs` table
- Deduction rules in `deduction_rules` table
- Payroll parameters in `payroll_configurations` table

## Usage Workflow

### For HR/Admin Users

1. **Setup Salary Structures**
   - Navigate to "Salary Structures" tab
   - Create salary structures for employees
   - Set effective dates for salary changes

2. **Monthly Payroll Processing**
   - Go to "Dashboard" tab
   - Select the month for processing
   - Click "Calculate Payroll" to process all employees
   - Review calculation results
   - Approve payroll records (HR Manager/Admin only)

3. **Generate Reports**
   - Use "Download Excel Report" for monthly summaries
   - Export payroll data for accounting systems
   - Monitor payroll trends and analytics

### For Employees

1. **View Payslips**
   - Navigate to "My Payslips" tab
   - View payslip history
   - Click on any payslip to see detailed breakdown

2. **Download Payslips**
   - Select approved payslips
   - Use "Print Payslip" for PDF generation
   - Download for personal records

## Error Handling

The system includes comprehensive error handling:
- Validation for negative or invalid entries
- Missing data checks
- Role-based access validation
- Database transaction rollback on errors
- User-friendly error messages

## Security Features

- Role-based access control at API level
- Employee data isolation (employees can only see own data)
- Audit trail for all payroll changes
- Secure calculation with validation
- Input sanitization and validation

## Future Enhancements

### Planned Features
1. **Automated Payslip Email Distribution**
2. **Integration with Banking Systems**
3. **Advanced Tax Planning Tools**
4. **Payroll Analytics Dashboard**
5. **Mobile App Support**
6. **Integration with Time Tracking Systems**
7. **Multi-currency Support**
8. **Payroll Forecasting**

### Technical Improvements
1. **Background Job Processing**
2. **Real-time Notifications**
3. **Advanced Reporting with Charts**
4. **API Rate Limiting**
5. **Caching for Performance**
6. **Automated Testing Suite**

## Troubleshooting

### Common Issues

1. **Payroll Calculation Errors**
   - Check salary structure exists for employee
   - Verify attendance data is available
   - Check for valid month format (YYYY-MM)

2. **Permission Denied Errors**
   - Verify user role and permissions
   - Check role_utils.py for correct role mapping
   - Ensure user is authenticated

3. **Missing Payslip Data**
   - Ensure payroll is calculated and approved
   - Check payroll status in database
   - Verify employee-payroll relationship

### Database Queries for Debugging

```sql
-- Check payroll status for a month
SELECT employee_id, status, net_salary FROM payroll WHERE month = '2024-01';

-- Check salary structures
SELECT * FROM salary_structures WHERE employee_id = 1;

-- Check payroll configurations
SELECT * FROM payroll_configurations;
```

## Support

For technical support or feature requests:
1. Check this documentation first
2. Review error logs in backend/logs
3. Check database integrity
4. Contact development team with specific error details

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Compatibility**: HR System v2.0+