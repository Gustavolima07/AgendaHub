import { Agenda } from '../../Pages/Agenda';
import { PageFrame } from '../../Components/PageFrame';
import { useAppActions } from '../../contexts/AppActions';
import { router, useLocalSearchParams } from 'expo-router';
import { dateKey, localDate } from '../../domain';
export default function AgendaRoute() {
  const actions = useAppActions();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const valid =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    dateKey(localDate(date)) === date;
  return (
    <PageFrame id="agenda">
      <Agenda
        {...actions}
        selectedDate={valid ? date : dateKey()}
        onDateChange={(date) => router.setParams({ date })}
      />
    </PageFrame>
  );
}
