import React from 'react';
import { View, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { ThemedText, layoutStyles, interactiveZoom, useTheme } from '../ui';
import { activities, dateLabel } from '../domain';
export function ActivityRow({
  item,
  onPress,
}: {
  item: ReturnType<typeof activities>[number];
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        ...layoutStyles.row,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: theme.muted + '20',
        opacity: pressed ? 0.86 : 1,
        ...interactiveZoom(pressed, hovered, 0.985, 1.01),
      })}
    >
      <View style={{ width: 54 }}>
        <ThemedText bold>{item.time}</ThemedText>
        <ThemedText size={10} muted>
          {item.duration} min
        </ThemedText>
      </View>
      <View
        style={{
          height: 38,
          width: 3,
          borderRadius: 2,
          backgroundColor: item.kind === 'delivery' ? '#BC9656' : theme.primary,
        }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText bold>{item.label}</ThemedText>
        <ThemedText size={12} muted>
          {item.kind === 'delivery' ? 'Entrega programada' : 'Compromisso'} • {dateLabel(item.date)}
        </ThemedText>
      </View>
      <ArrowRight size={17} color={theme.muted} />
    </Pressable>
  );
}
