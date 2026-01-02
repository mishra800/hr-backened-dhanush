import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout';
import ProtectedRoute from './components/protectedroute';
import Dashboard from './pages/dashboard';
import Welcome from './pages/welcome';
import Careers from './pages/careers';
import Apply from './pages/apply';
import Login from './pages/login';
import Signup from './pages/signup';
import Recruitment from './pages/recruitment';
import AIInterview from './pages/aiinterview';
import Employees from './pages/employees';

import Attendance from './pages/Attendance';
import WFHRequest from './pages/WFHRequest';
import Onboarding from './pages/onboarding';

import Performance from './pages/performance';
import Engagement from './pages/engagement';
import Learning from './pages/learning';
import Analysis from './pages/analysis';
import Career from './pages/career';
import Leave from './pages/leave';
import Payroll from './pages/payroll';
import Assets from './pages/assets';
import AssetAcknowledgment from './pages/AssetAcknowledgment';
import Announcements from './pages/announcements';
import Profile from './pages/Profile';
import Documents from './pages/documents';
import Meetings from './pages/meetings';
import SuperAdmin from './pages/superadmin';
import Help from './pages/Help';
import Notifications from './pages/Notifications';
import { AuthProvider } from './context/authcontext';














function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/apply/:linkCode" element={<Apply />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Root redirect to welcome */}
          <Route path="/" element={<Welcome />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="recruitment/interview/:applicationId" element={<AIInterview />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="wfh-request" element={<WFHRequest />} />
            <Route path="onboarding" element={<Onboarding />} />

            <Route path="performance" element={<Performance />} />
            <Route path="engagement" element={<Engagement />} />
            <Route path="learning" element={<Learning />} />
            <Route path="career" element={<Career />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="assets" element={<Assets />} />
            <Route path="asset-acknowledgment" element={<AssetAcknowledgment />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
            <Route path="documents" element={<Documents />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="superadmin" element={<SuperAdmin />} />
            <Route path="help" element={<Help />} />
            <Route path="notifications" element={<Notifications />} />
            {/* Add other routes here */}










          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
