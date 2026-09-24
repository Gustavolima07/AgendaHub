import { Dashboard } from '../../Pages/Dashboard';
import { PageFrame } from '../../Components/PageFrame';
import { useAppActions } from '../../contexts/AppActions';
export default function DashboardRoute() {
  const actions = useAppActions();
  return (
    <PageFrame id="dashboard">
      <Dashboard {...actions} />
    </PageFrame>
  );
}
