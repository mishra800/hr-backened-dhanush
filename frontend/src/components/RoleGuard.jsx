import { useAuth } from '../context/authcontext';

/**
 * Role-based access control component
 * Renders children only if user has required role
 */
export default function RoleGuard({ 
  children, 
  allowedRoles = [], 
  fallback = null,
  showError = false 
}) {
  const { user } = useAuth();
  
  if (!user) {
    return fallback || (showError ? (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    ) : null);
  }
  
  const userRole = user.role;
  
  if (!allowedRoles.includes(userRole)) {
    return fallback || (showError ? (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            Your role <span className="font-semibold text-red-600">"{userRole}"</span> does not have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: {allowedRoles.join(', ')}
          </p>
          {userRole === 'candidate' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Candidates:</strong> You only have access to recruitment-related features. 
                For attendance or HR matters, please contact your HR representative.
              </p>
            </div>
          )}
        </div>
      </div>
    ) : null);
  }
  
  return children;
}

/**
 * Hook to check if user has specific role
 */
export function useRoleCheck() {
  const { user } = useAuth();
  
  const hasRole = (requiredRoles) => {
    if (!user) return false;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  };
  
  const isAdmin = () => hasRole('admin');
  const isHR = () => hasRole('hr');
  const isManager = () => hasRole('manager');
  const isEmployee = () => hasRole('employee');
  const isCandidate = () => hasRole('candidate');
  const isAssetsTeam = () => hasRole('assets_team');
  
  const canAccessAttendance = () => hasRole(['admin', 'hr', 'manager', 'employee', 'assets_team']);
  const canApproveAttendance = () => hasRole(['admin', 'hr', 'manager']);
  const canViewTeamAttendance = () => hasRole(['admin', 'hr', 'manager']);
  const canManageWFH = () => hasRole(['admin', 'hr', 'manager']);
  const canManageAssets = () => hasRole(['admin', 'hr', 'manager', 'assets_team']);
  
  return {
    user,
    hasRole,
    isAdmin,
    isHR,
    isManager,
    isEmployee,
    isCandidate,
    isAssetsTeam,
    canAccessAttendance,
    canApproveAttendance,
    canViewTeamAttendance,
    canManageWFH,
    canManageAssets
  };
}