import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ui';
import { navigation, tabSubtitles, NavId } from '../Router/navigation';
export function PageFrame({ id, children }: { id: NavId; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const page = navigation.find((n) => n.id === id)!;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: width >= 900 ? 32 : 18, paddingBottom: 40 }}
    >
      <View style={{ width: '100%', maxWidth: 1350, alignSelf: 'center', gap: 22 }}>
        {id !== 'dashboard' && (
          <View>
            <ThemedText size={29} bold>
              {page.label}
            </ThemedText>
            <ThemedText muted>{tabSubtitles[id]}</ThemedText>
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}
