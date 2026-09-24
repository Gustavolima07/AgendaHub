import { Platform } from 'react-native';
import { Account } from './types';
import { activities, localDate } from './domain';
export async function enableNotifications() {
  if (Platform.OS === 'web')
    throw Error(
      'Na versão web, os alertas aparecem no painel enquanto o app está aberto. Instale a versão Android/iOS para receber notificações locais.',
    );
  const N = await import('expo-notifications');
  if (Platform.OS === 'android')
    await N.setNotificationChannelAsync('agenda', {
      name: 'Agenda e entregas',
      importance: N.AndroidImportance.HIGH,
    });
  const permission = await N.requestPermissionsAsync();
  if (!permission.granted)
    throw Error('Notificações não autorizadas nas configurações do aparelho.');
}
let queue = Promise.resolve();
export function syncNotifications(a: Account) {
  queue = queue
    .catch(() => {})
    .then(async () => {
      if (Platform.OS === 'web') return;
      const N = await import('expo-notifications');
      await N.cancelAllScheduledNotificationsAsync();
      if (!a.settings.notifications) return;
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      if (!(await N.getPermissionsAsync()).granted) return;
      const upcoming = activities(a)
        .map((x) => ({
          x,
          date: new Date(localDate(x.date, x.time).getTime() - x.reminder * 60000),
        }))
        .filter((x) => x.date.getTime() > Date.now())
        .sort((a, b) => +a.date - +b.date)
        .slice(0, 60);
      for (const { x, date } of upcoming)
        await N.scheduleNotificationAsync({
          identifier: x.id,
          content: {
            title: x.label,
            body: `${x.time} • Abra o AgendaHub para ver os detalhes.`,
            data: { id: x.id },
          },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date, channelId: 'agenda' },
        });
    });
  return queue;
}
