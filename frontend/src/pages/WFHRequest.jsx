import RoleGuard from '../components/RoleGuard';
import WFHRequestManager from '../components/wfh/WFHRequestManager';

function WFHRequestContent() {
  return (
    <div className="max-w-6xl mx-auto">
      <WFHRequestManager />
    </div>
  );
}

export default function WFHRequest() {
  return (
    <RoleGuard 
      allowedRoles={['admin', 'hr', 'manager', 'employee']} 
      showError={true}
    >
      <WFHRequestContent />
    </RoleGuard>
  );
}
