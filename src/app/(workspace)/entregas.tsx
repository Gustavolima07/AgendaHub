import { Deliveries } from '../../Pages/Deliveries';
import { PageFrame } from '../../Components/PageFrame';
import { useAppActions } from '../../contexts/AppActions';
export default function DeliveriesRoute() {
  const actions = useAppActions();
  return (
    <PageFrame id="deliveries">
      <Deliveries {...actions} />
    </PageFrame>
  );
}
