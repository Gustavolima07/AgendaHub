import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Bell, LogOut, Leaf, CircleHelp } from 'lucide-react-native';
import { useStore } from '../store';
import {
  ThemedText,
  Button,
  IconButton,
  layoutStyles,
  contrast,
  interactiveZoom,
  useTheme,
} from '../ui';
import { helpPath, navigation, paths } from '../Router/navigation';
import { useAppActions } from '../contexts/AppActions';

export function AppShell() {
  const { user, account, online, ready, error, logout } = useStore();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const pathname = usePathname();
  const { showAlerts, notify } = useAppActions();
  const current = navigation.find((n) => paths[n.id] === pathname) || navigation[0];
  const currentTitle = pathname === helpPath ? 'Central de ajuda' : current.label;
  const exit = () => {
    void logout().catch(() => notify('Não foi possível sair da conta.'));
  };
  const links = (desktop: boolean) =>
    navigation.map((n) => {
      const active = current.id === n.id;
      const linkStyle: ViewStyle = desktop
        ? StyleSheet.flatten<ViewStyle>([
            layoutStyles.row,
            {
              padding: 14,
              borderRadius: 12,
              backgroundColor: active ? theme.accent : 'transparent',
            },
          ])
        : { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, minHeight: 48 };
      return (
        <Pressable
          key={n.id}
          accessibilityRole="link"
          accessibilityLabel={n.label}
          accessibilityState={{ selected: active }}
          onPress={() => router.navigate(paths[n.id])}
          style={({ pressed, hovered }: any) => ({
            ...linkStyle,
            ...interactiveZoom(pressed, hovered),
          })}
        >
          <n.icon size={20} color={active ? theme.primary : theme.muted} />
          <ThemedText
            bold={active}
            size={desktop ? 13 : 10}
            color={active ? theme.primary : theme.muted}
          >
            {desktop ? n.label : n.short}
          </ThemedText>
        </Pressable>
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
            <View style={[layoutStyles.row, { paddingTop: 12 }]}>
              <View style={{ backgroundColor: theme.primary, padding: 9, borderRadius: 12 }}>
                <CalendarDays size={23} color={contrast(theme.primary)} />
              </View>
              <ThemedText size={23} bold>
                AgendaHub.
              </ThemedText>
            </View>
            <View style={{ gap: 8 }}>
              <ThemedText size={10} bold muted style={{ letterSpacing: 2, marginBottom: 8 }}>
                SEU ESPAÇO
              </ThemedText>
              {links(true)}
            </View>
            <View style={{ flex: 1 }} />
            <View
              style={{ backgroundColor: theme.background, borderRadius: 16, padding: 16, gap: 9 }}
            >
              <Leaf size={23} color={theme.primary} />
              <ThemedText bold size={13}>
                Organizar é cuidar.
              </ThemedText>
              <ThemedText muted size={12}>
                Um passo de cada vez, tudo no seu lugar.
              </ThemedText>
            </View>
            <Button label="Sair da conta" small secondary icon={LogOut} onPress={exit} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={[
              layoutStyles.between,
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
              <ThemedText size={wide ? 16 : 20} bold>
                {wide ? currentTitle : 'AgendaHub.'}
              </ThemedText>
              {wide && (
                <ThemedText size={11} muted>
                  Seu negócio, conectado.
                </ThemedText>
              )}
            </View>
            <View style={layoutStyles.row}>
              {wide && (
                <ThemedText size={12} muted>
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </ThemedText>
              )}
              <IconButton icon={Bell} label="Ver lembretes" onPress={showAlerts} />
              <IconButton
                icon={CircleHelp}
                label="Ajuda"
                onPress={() => router.navigate(helpPath as Href)}
              />
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
                <ThemedText color={theme.primary} bold>
                  {(account.settings.name || user?.displayName || user?.email || 'A')
                    .charAt(0)
                    .toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>
          {!online && (
            <View style={{ padding: 10, backgroundColor: '#FFF0D5' }}>
              <ThemedText color="#775922" size={12}>
                Sem conexão • reconecte-se para salvar alterações.
              </ThemedText>
            </View>
          )}
          {error && (
            <View style={{ padding: 12 }}>
              <ThemedText color="#B33D3D">{error}</ThemedText>
            </View>
          )}
          {ready ? (
            <Slot />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText muted>Sincronizando sua conta…</ThemedText>
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
