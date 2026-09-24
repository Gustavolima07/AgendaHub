import { Settings } from '../../Pages/Settings';
import { PageFrame } from '../../Components/PageFrame';
import { useAppActions } from '../../contexts/AppActions';
export default function SettingsRoute() {
  const { notify } = useAppActions();
  return (
    <PageFrame id="settings">
      <Settings notify={notify} />
    </PageFrame>
  );
}
