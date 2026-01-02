import { useState } from 'react';

export default function Help() {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'overview', name: 'System Overview', icon: '🏢' },
    { id: 'authentication', name: 'Login & Authentication', icon: '🔐' },
    { id: 'recruitment', name: 'Recruitment Process', icon: '👥' },
    { id: 'employees', name: 'Employee Management', icon: '👤' },
    { id: 'attendance', name: 'Attendance System', icon: '📅' },
    { id: 'leave', name: 'Leave Management', icon: '🏖️' },
    { id: 'performance', name: 'Performance Reviews', icon: '⭐' },
    { id: 'onboarding', name: 'Onboarding Process', icon: '🎯' },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'authentication':
        return <AuthenticationSection />;
      case 'recruitment':
        return <RecruitmentSection />;
      case 'employees':
        return <EmployeesSection />;
      case 'attendance':
        return <AttendanceSection />;
      case 'leave':
        return <LeaveSection />;
      case 'performance':
        return <PerformanceSection />;
      case 'onboarding':
        return <OnboardingSection />;
      case 'troubleshooting':
        return <TroubleshootingSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Help & Documentation</h1>
          <p className="text-gray-600">Complete guide to using the Dhanush Healthcare HR Management System</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Topics</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// Section Components
function OverviewSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🏢 System Overview</h2>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="text-blue-900 font-semibold">Welcome to Dhanush Healthcare HR Management System</p>
        <p className="text-blue-800 text-sm mt-1">A comprehensive platform for managing all HR operations</p>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Key Features</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <FeatureCard icon="👥" title="Recruitment" desc="End-to-end hiring process management" />
        <FeatureCard icon="📅" title="Attendance" desc="Photo & GPS-based attendance tracking" />
        <FeatureCard icon="🏖️" title="Leave Management" desc="Request and approve leaves" />
        <FeatureCard icon="⭐" title="Performance" desc="360° performance reviews" />
        <FeatureCard icon="🎯" title="Onboarding" desc="Streamlined new hire onboarding" />
        <FeatureCard icon="📊" title="Analytics" desc="Real-time HR insights" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">User Roles</h3>
      <div className="space-y-3">
        <RoleCard role="Admin" color="purple" permissions={['Full system access', 'User management', 'System configuration']} />
        <RoleCard role="HR" color="blue" permissions={['Employee management', 'Recruitment', 'Leave approval']} />
        <RoleCard role="Manager" color="orange" permissions={['Team management', 'Performance reviews', 'Leave approval']} />
        <RoleCard role="Employee" color="gray" permissions={['Mark attendance', 'Request leave', 'View profile']} />
      </div>
    </div>
  );
}


function AuthenticationSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🔐 Login & Authentication</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">How to Login</h3>
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>Navigate to the login page</li>
          <li>Enter your email address (e.g., john.doe@dhanushhealthcare.com)</li>
          <li>Enter your password</li>
          <li>Click "Sign In"</li>
          <li>You'll be redirected to your dashboard</li>
        </ol>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Default Credentials</h3>
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="text-yellow-900 font-semibold">⚠️ For Testing Only</p>
        <div className="mt-3 space-y-2 text-sm">
          <p><strong>Admin:</strong> admin@dhanushhealthcare.com / admin123</p>
          <p><strong>HR:</strong> hr@dhanushhealthcare.com / hr123</p>
          <p><strong>Manager:</strong> manager@dhanushhealthcare.com / manager123</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Forgot Password?</h3>
      <div className="space-y-3 text-gray-700">
        <p>1. Click "Forgot Password?" on the login page</p>
        <p>2. Enter your email address</p>
        <p>3. Check your email for reset link</p>
        <p>4. Click the link and set a new password</p>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Password Requirements</h3>
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        <li>Minimum 8 characters</li>
        <li>At least one uppercase letter</li>
        <li>At least one lowercase letter</li>
        <li>At least one number</li>
        <li>At least one special character</li>
      </ul>
    </div>
  );
}


function RecruitmentSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Recruitment Process</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">Complete Workflow</h3>
      <div className="space-y-4">
        <WorkflowStep number="1" title="Create Job Requisition" desc="HR creates a new job opening with details" />
        <WorkflowStep number="2" title="Candidate Application" desc="Candidates apply through the portal" />
        <WorkflowStep number="3" title="Resume Screening" desc="AI-powered resume parsing and screening" />
        <WorkflowStep number="4" title="Interview Scheduling" desc="Schedule interviews with candidates" />
        <WorkflowStep number="5" title="Interview Feedback" desc="Interviewers provide feedback" />
        <WorkflowStep number="6" title="Offer Generation" desc="Generate and send offer letters" />
        <WorkflowStep number="7" title="Onboarding" desc="Accepted candidates move to onboarding" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Kanban Board Stages</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StageCard stage="Applied" color="blue" />
        <StageCard stage="Screening" color="yellow" />
        <StageCard stage="Interview" color="purple" />
        <StageCard stage="Offer" color="green" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">How to Add a Candidate</h3>
      <div className="bg-gray-50 rounded-lg p-6">
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Go to Recruitment page</li>
          <li>Click "Add Candidate" button</li>
          <li>Fill in candidate details (name, email, phone, position)</li>
          <li>Upload resume (optional - AI will parse it)</li>
          <li>Click "Submit"</li>
          <li>Candidate appears in "Applied" stage</li>
        </ol>
      </div>
    </div>
  );
}


function EmployeesSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 Employee Management</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">Adding New Employees</h3>
      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
        <p className="text-green-900 font-semibold">✅ Recommended Method</p>
        <p className="text-green-800 text-sm mt-1">Use "Create with Account" to automatically create both user account and employee profile</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h4 className="font-semibold mb-3">Step-by-Step Process:</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Login as Admin/HR</li>
          <li>Go to Employees page</li>
          <li>Click "Add Employee" button</li>
          <li>Fill in employee details:
            <ul className="list-disc list-inside ml-6 mt-2">
              <li>First Name & Last Name</li>
              <li>Email (for login)</li>
              <li>Department & Position</li>
              <li>Date of Joining</li>
              <li>PAN & Aadhaar (optional)</li>
            </ul>
          </li>
          <li>Choose password option:
            <ul className="list-disc list-inside ml-6 mt-2">
              <li>Auto-generate (recommended)</li>
              <li>Set custom password</li>
            </ul>
          </li>
          <li>Select user role (Employee/Manager/HR/Admin)</li>
          <li>Click "Create Employee"</li>
          <li>📋 Copy the generated credentials</li>
          <li>Share credentials securely with employee</li>
        </ol>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">AI Document Extraction</h3>
      <p className="text-gray-700 mb-3">Upload documents to auto-fill employee details:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        <li>Offer Letter → Extracts name, position, salary</li>
        <li>PAN Card → Extracts PAN number</li>
        <li>Aadhaar Card → Extracts Aadhaar number</li>
        <li>Resume → Extracts profile summary</li>
      </ul>
    </div>
  );
}


function AttendanceSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Attendance System</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">How to Mark Attendance</h3>
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h4 className="font-semibold mb-3">One-Click Attendance Process:</h4>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li><strong>Click "Start Camera & Mark Attendance"</strong>
            <p className="text-sm ml-6 mt-1">Browser will request camera permission - click "Allow"</p>
          </li>
          <li><strong>Wait for Camera Ready</strong>
            <p className="text-sm ml-6 mt-1">You'll see a "LIVE" badge and "Camera Ready" message</p>
          </li>
          <li><strong>Position Your Face</strong>
            <p className="text-sm ml-6 mt-1">Align your face within the circle guide</p>
          </li>
          <li><strong>Click "Capture & Mark Attendance"</strong>
            <p className="text-sm ml-6 mt-1">Browser will request location permission - click "Allow"</p>
          </li>
          <li><strong>Success!</strong>
            <p className="text-sm ml-6 mt-1">Your attendance is marked with photo and location</p>
          </li>
        </ol>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Attendance Rules</h3>
      <div className="space-y-3">
        <RuleCard icon="⏰" title="Check-in Window" desc="8:00 AM - 11:00 AM (Late after 11 AM)" />
        <RuleCard icon="🏢" title="Office Mode" desc="Must be within 100m of office location" />
        <RuleCard icon="🏠" title="WFH Mode" desc="Can mark from anywhere with approved WFH request" />
        <RuleCard icon="📸" title="Photo Required" desc="Face photo captured for verification" />
        <RuleCard icon="📍" title="GPS Required" desc="Location tracked for compliance" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Troubleshooting</h3>
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <p className="font-semibold text-yellow-900 mb-2">Common Issues:</p>
        <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
          <li><strong>Camera not starting:</strong> Check browser permissions</li>
          <li><strong>Location error:</strong> Enable location services</li>
          <li><strong>"Too far from office":</strong> Request WFH or move closer</li>
          <li><strong>"Already marked":</strong> Can only mark once per day</li>
        </ul>
      </div>
    </div>
  );
}


function LeaveSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🏖️ Leave Management</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">How to Request Leave</h3>
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Go to Leave page</li>
          <li>Click "Request Leave" button</li>
          <li>Select leave type (Casual/Sick/Earned)</li>
          <li>Choose start and end dates</li>
          <li>Enter reason for leave</li>
          <li>Click "Submit Request"</li>
          <li>Wait for manager/HR approval</li>
        </ol>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Leave Types</h3>
      <div className="space-y-3">
        <LeaveTypeCard type="Casual Leave" days="12 days/year" desc="For personal matters" />
        <LeaveTypeCard type="Sick Leave" days="10 days/year" desc="For medical reasons" />
        <LeaveTypeCard type="Earned Leave" days="15 days/year" desc="Accumulated leave" />
        <LeaveTypeCard type="WFH" days="2 days/week" desc="Work from home" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Approval Process</h3>
      <div className="space-y-2 text-gray-700">
        <p>1. Employee submits leave request</p>
        <p>2. Manager receives notification</p>
        <p>3. Manager approves/rejects with comments</p>
        <p>4. Employee receives notification</p>
        <p>5. Leave is reflected in calendar</p>
      </div>
    </div>
  );
}

function PerformanceSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">⭐ Performance Reviews</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">Review Cycle</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <CycleCard title="Quarterly Reviews" desc="Every 3 months" />
        <CycleCard title="Annual Reviews" desc="Once a year" />
        <CycleCard title="360° Feedback" desc="Peer reviews" />
        <CycleCard title="Self Assessment" desc="Employee self-review" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Rating Scale</h3>
      <div className="space-y-2">
        <RatingCard rating="5" label="Outstanding" color="green" />
        <RatingCard rating="4" label="Exceeds Expectations" color="blue" />
        <RatingCard rating="3" label="Meets Expectations" color="yellow" />
        <RatingCard rating="2" label="Needs Improvement" color="orange" />
        <RatingCard rating="1" label="Unsatisfactory" color="red" />
      </div>
    </div>
  );
}


function OnboardingSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Onboarding Process</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">Onboarding Steps</h3>
      <div className="space-y-4">
        <OnboardingStep number="1" title="Pre-Joining" desc="Document collection, background verification" />
        <OnboardingStep number="2" title="Day 1" desc="Welcome, ID card, system access" />
        <OnboardingStep number="3" title="Week 1" desc="Team introduction, training sessions" />
        <OnboardingStep number="4" title="Month 1" desc="Goal setting, buddy assignment" />
        <OnboardingStep number="5" title="Month 3" desc="First review, feedback session" />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Required Documents</h3>
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        <li>PAN Card</li>
        <li>Aadhaar Card</li>
        <li>Educational Certificates</li>
        <li>Previous Employment Documents</li>
        <li>Bank Account Details</li>
        <li>Passport Size Photos</li>
      </ul>
    </div>
  );
}

function TroubleshootingSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 Troubleshooting</h2>
      
      <h3 className="text-xl font-semibold mt-6 mb-3">Common Issues</h3>
      
      <div className="space-y-6">
        <TroubleshootCard 
          issue="Cannot Login"
          solutions={[
            'Check email and password are correct',
            'Ensure caps lock is off',
            'Try "Forgot Password" to reset',
            'Contact HR if issue persists'
          ]}
        />
        
        <TroubleshootCard 
          issue="Camera Not Working (Attendance)"
          solutions={[
            'Allow camera permission in browser',
            'Close other apps using camera',
            'Try different browser',
            'Check camera works in other apps'
          ]}
        />
        
        <TroubleshootCard 
          issue="Location Error (Attendance)"
          solutions={[
            'Allow location permission in browser',
            'Enable location services in system settings',
            'Check GPS is working',
            'Try again in a few seconds'
          ]}
        />
        
        <TroubleshootCard 
          issue="Employee Profile Not Found"
          solutions={[
            'Contact admin to create employee profile',
            'Ensure user account is linked to employee',
            'Check with HR department'
          ]}
        />
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-3">Contact Support</h3>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-900 font-semibold">Need More Help?</p>
        <p className="text-blue-800 text-sm mt-2">Email: support@dhanushhealthcare.com</p>
        <p className="text-blue-800 text-sm">Phone: +91 1234567890</p>
        <p className="text-blue-800 text-sm">Hours: Mon-Fri, 9 AM - 6 PM</p>
      </div>
    </div>
  );
}


// Helper Components
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600 mt-1">{desc}</p>
    </div>
  );
}

function RoleCard({ role, color, permissions }) {
  const colors = {
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900'
  };
  
  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <h4 className="font-semibold mb-2">{role}</h4>
      <ul className="text-sm space-y-1">
        {permissions.map((perm, idx) => (
          <li key={idx}>• {perm}</li>
        ))}
      </ul>
    </div>
  );
}

function WorkflowStep({ number, title, desc }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

function StageCard({ stage, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800'
  };
  
  return (
    <div className={`${colors[color]} rounded-lg p-3 text-center font-semibold`}>
      {stage}
    </div>
  );
}

function RuleCard({ icon, title, desc }) {
  return (
    <div className="flex items-start space-x-3 bg-gray-50 rounded-lg p-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

function LeaveTypeCard({ type, days, desc }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-gray-900">{type}</h4>
          <p className="text-sm text-gray-600 mt-1">{desc}</p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">{days}</span>
      </div>
    </div>
  );
}

function CycleCard({ title, desc }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600 mt-1">{desc}</p>
    </div>
  );
}

function RatingCard({ rating, label, color }) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  };
  
  return (
    <div className="flex items-center space-x-3">
      <span className={`${colors[color]} w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg`}>
        {rating}
      </span>
      <span className="font-medium text-gray-900">{label}</span>
    </div>
  );
}

function OnboardingStep({ number, title, desc }) {
  return (
    <div className="flex items-start space-x-4 bg-gray-50 rounded-lg p-4">
      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

function TroubleshootCard({ issue, solutions }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h4 className="font-semibold text-red-900 mb-3">❌ {issue}</h4>
      <div className="space-y-2">
        <p className="text-sm font-medium text-red-800">Solutions:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
          {solutions.map((solution, idx) => (
            <li key={idx}>{solution}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
