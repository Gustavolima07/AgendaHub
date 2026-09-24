import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Redirect, Slot, Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider, useStore } from '../store';
import { AppActionsProvider } from '../contexts/AppActions';
import { useTheme, contrast } from '../ui';

function Routes() {
  const { user, loading } = useStore();
  const theme = useTheme();
  const pathname = usePathname();
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  return (
    <>
      <StatusBar style={contrast(theme.background) === '#FFFFFF' ? 'light' : 'dark'} />
      {Platform.OS === 'web' ? (
        !user && pathname !== '/login' ? (
          <Redirect href="/login" />
        ) : user && pathname === '/login' ? (
          <Redirect href="/" />
        ) : (
          <Slot />
        )
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(workspace)" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
    </>
  );
}
function Session() {
  const { user } = useStore();
  return (
    <AppActionsProvider key={user?.uid || 'guest'}>
      <Routes />
    </AppActionsProvider>
  );
}
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Session />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
