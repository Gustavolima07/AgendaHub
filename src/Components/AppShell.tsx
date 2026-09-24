import React from 'react';
import { View, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Link, Slot, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Bell, LogOut, Leaf } from 'lucide-react-native';
import { useStore } from '../store';
import { T, Button, IconButton, s, contrast, useTheme } from '../ui';
import { navigation, paths } from '../Router/navigation';
import { useAppActions } from '../contexts/AppActions';

export function AppShell() {
  const { user, account, online, ready, error, logout } = useStore();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const pathname = usePathname();
  const { showAlerts, notify } = useAppActions();
  const current = navigation.find((n) => paths[n.id] === pathname) || navigation[0];
  const exit = () => {
    void logout().catch(() => notify('Não foi possível sair da conta.'));
  };
  const links = (desktop: boolean) =>
    navigation.map((n) => {
      const active = current.id === n.id;
      return (
        <Link key={n.id} href={paths[n.id]} asChild>
          <Pressable
            accessibilityLabel={n.label}
            accessibilityState={{ selected: active }}
            style={
              desktop
                ? [
                    s.row,
                    {
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: active ? theme.accent : 'transparent',
                    },
                  ]
                : { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, minHeight: 48 }
            }
          >
            <n.icon size={20} color={active ? theme.primary : theme.muted} />
            <T bold={active} size={desktop ? 13 : 10} color={active ? theme.primary : theme.muted}>
              {desktop ? n.label : n.short}
            </T>
          </Pressable>
        </Link>
      );
    });
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide && (
          <View
            style={{
              width: 238,
              backgroundColor: theme.surface,
              borderRightWidth: 1,
              borderColor: theme.muted + '22',
              padding: 22,
              gap: 35,
            }}
          >
            <View style={[s.row, { paddingTop: 12 }]}>
              <View style={{ backgroundColor: theme.primary, padding: 9, borderRadius: 12 }}>
                <CalendarDays size={23} color={contrast(theme.primary)} />
              </View>
              <T size={23} bold>
                AgendaHub.
              </T>
            </View>
            <View style={{ gap: 8 }}>
              <T size={10} bold muted style={{ letterSpacing: 2, marginBottom: 8 }}>
                SEU ESPAÇO
              </T>
              {links(true)}
            </View>
            <View style={{ flex: 1 }} />
            <View
              style={{ backgroundColor: theme.background, borderRadius: 16, padding: 16, gap: 9 }}
            >
              <Leaf size={23} color={theme.primary} />
              <T bold size={13}>
                Organizar é cuidar.
              </T>
              <T muted size={12}>
                Um passo de cada vez, tudo no seu lugar.
              </T>
            </View>
            <Button label="Sair da conta" small secondary icon={LogOut} onPress={exit} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={[
              s.between,
              {
                backgroundColor: theme.surface,
                paddingHorizontal: wide ? 34 : 18,
                paddingVertical: 18,
                borderBottomWidth: 1,
                borderColor: theme.muted + '20',
              },
            ]}
          >
            <View>
              <T size={wide ? 16 : 20} bold>
                {wide ? current.label : 'AgendaHub.'}
              </T>
              {wide && (
                <T size={11} muted>
                  Seu negócio, conectado.
                </T>
              )}
            </View>
            <View style={s.row}>
              {wide && (
                <T size={12} muted>
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </T>
              )}
              <IconButton icon={Bell} label="Ver lembretes" onPress={showAlerts} />
              {!wide && <IconButton icon={LogOut} label="Sair da conta" onPress={exit} />}
              <View
                style={{
                  backgroundColor: theme.accent,
                  borderRadius: 20,
                  width: 38,
                  height: 38,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <T color={theme.primary} bold>
                  {(account.settings.name || user?.displayName || user?.email || 'A')
                    .charAt(0)
                    .toUpperCase()}
                </T>
              </View>
            </View>
          </View>
          {!online && (
            <View style={{ padding: 10, backgroundColor: '#FFF0D5' }}>
              <T color="#775922" size={12}>
                Sem conexão • reconecte-se para salvar alterações.
              </T>
            </View>
          )}
          {error && (
            <View style={{ padding: 12 }}>
              <T color="#B33D3D">{error}</T>
            </View>
          )}
          {ready ? (
            <Slot />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <ActivityIndicator color={theme.primary} />
              <T muted>Sincronizando sua conta…</T>
            </View>
          )}
          {!wide && (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.surface,
                borderTopWidth: 1,
                borderColor: theme.muted + '22',
                paddingVertical: 5,
              }}
            >
              {links(false)}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
