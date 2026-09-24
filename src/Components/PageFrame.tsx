import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { PageEntrance, ThemedText } from '../ui';
import { navigation, tabSubtitles, NavId } from '../Router/navigation';
export function PageFrame({ id, children }: { id: NavId | 'help'; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const page = navigation.find((n) => n.id === id);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: width >= 900 ? 32 : 18, paddingBottom: 40 }}
    >
      <View style={{ width: '100%', maxWidth: 1350, alignSelf: 'center', gap: 22 }}>
        {id !== 'dashboard' && (
          <View>
            <ThemedText size={29} bold>
              {page?.label || 'Central de ajuda'}
            </ThemedText>
            <ThemedText muted>
              {id === 'help'
                ? 'Encontre orientações para cada recurso do aplicativo.'
                : tabSubtitles[id]}
            </ThemedText>
          </View>
        )}
        <PageEntrance>{children}</PageEntrance>
      </View>
    </ScrollView>
  );
}
