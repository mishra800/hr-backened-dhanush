import { useAuth } from '../context/authcontext';
import AssetDashboard from '../components/assets/AssetDashboard';
import AssetsTeamDashboard from '../components/assets/AssetsTeamDashboard';
import RoleGuard from '../components/RoleGuard';

export default function Assets() {
  const { user } = useAuth();

  // Show different dashboards based on user role
  if (user?.role === 'assets_team' || user?.role === 'admin') {
    return (
      <RoleGuard allowedRoles={['assets_team', 'admin']}>
        <AssetsTeamDashboard />
      </RoleGuard>
    );
  }

  // Default employee asset dashboard
  return <AssetDashboard />;
}
