import { Clients } from '../../Pages/Clients';
import { PageFrame } from '../../Components/PageFrame';
import { useAppActions } from '../../contexts/AppActions';
export default function ClientsRoute() {
  const actions = useAppActions();
  return (
    <PageFrame id="clients">
      <Clients {...actions} />
    </PageFrame>
  );
}
