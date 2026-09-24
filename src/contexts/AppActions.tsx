import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Editor, EditorSheet } from '../Components/EditorSheet';
import { PageProps } from '../Pages/types';
import { T, s, ThemeContext, Sheet, Card } from '../ui';
import { useStore } from '../store';
import { activities, localDate, dateLabel, emptyAccount } from '../domain';
import { syncNotifications } from '../notifications';
import { paths, NavId } from '../Router/navigation';
import { useNow } from '../hooks/useNow';

type AppActions = PageProps & { showAlerts: () => void };
const Context = createContext<AppActions | null>(null);
export function useAppActions() {
  const value = useContext(Context);
  if (!value) throw Error('AppActionsProvider não encontrado.');
  return value;
}

export function AppActionsProvider({ children }: { children: React.ReactNode }) {
  const now = useNow();
  const { user, account } = useStore();
  const theme = account.settings.palette;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [toast, setToast] = useState('');
  const [alerts, setAlerts] = useState(false);
  const { width } = useWindowDimensions();
  const go = useCallback((id: string) => {
    const href = paths[id as NavId];
    if (href) router.navigate(href);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    void syncNotifications(user ? account : emptyAccount()).catch(() => {
      if (user && account.settings.notifications) {
        setToast('Não foi possível atualizar os lembretes. Confira as permissões do aparelho.');
      }
    });
  }, [user, account]);

  const upcoming = activities(account).filter(
    (item) => localDate(item.date, item.time).getTime() - now <= 24 * 3600000,
  );
  return (
    <ThemeContext.Provider value={theme}>
      <Context.Provider
        value={{ edit: setEditor, notify: setToast, go, showAlerts: () => setAlerts(true) }}
      >
        {children}
        {!!toast && (
          <View
            accessibilityRole="alert"
            style={{
              position: 'absolute',
              bottom: width >= 900 ? 24 : 90,
              left: 20,
              right: 20,
              alignItems: 'center',
            }}
          >
            <View
              style={[
                s.row,
                { backgroundColor: theme.text, padding: 16, borderRadius: 14, maxWidth: 680 },
              ]}
            >
              <T color={theme.surface} style={{ flex: 1 }}>
                {toast}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar aviso"
                onPress={() => setToast('')}
              >
                <X color={theme.surface} size={18} />
              </Pressable>
            </View>
          </View>
        )}
        {user && editor && (
          <EditorSheet editor={editor} onClose={() => setEditor(null)} onSaved={setToast} />
        )}
        {user && alerts && (
          <Sheet title="Seus lembretes" onClose={() => setAlerts(false)}>
            <T muted>Atividades pendentes e próximas 24 horas.</T>
            {upcoming.length ? (
              upcoming.map((item) => (
                <Card key={item.id}>
                  <T bold>{item.label}</T>
                  <T muted>
                    {dateLabel(item.date)} • {item.time}
                  </T>
                  <T size={12} color={theme.primary}>
                    {localDate(item.date, item.time).getTime() < now
                      ? 'Horário passado • revise o status'
                      : 'Em breve'}
                  </T>
                </Card>
              ))
            ) : (
              <T>Nenhum lembrete por enquanto. Seu dia está em ordem.</T>
            )}
          </Sheet>
        )}
      </Context.Provider>
    </ThemeContext.Provider>
  );
}
