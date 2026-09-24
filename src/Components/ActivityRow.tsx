import React from 'react';
import { View, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { T, s, useTheme } from '../ui';
import { activities, dateLabel } from '../domain';
export function ActivityRow({
  item,
  onPress,
}: {
  item: ReturnType<typeof activities>[number];
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.row, { paddingVertical: 12, borderBottomWidth: 1, borderColor: t.muted + '20' }]}
    >
      <View style={{ width: 54 }}>
        <T bold>{item.time}</T>
        <T size={10} muted>
          {item.duration} min
        </T>
      </View>
      <View
        style={{
          height: 38,
          width: 3,
          borderRadius: 2,
          backgroundColor: item.kind === 'delivery' ? '#BC9656' : t.primary,
        }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <T bold>{item.label}</T>
        <T size={12} muted>
          {item.kind === 'delivery' ? 'Entrega programada' : 'Compromisso'} • {dateLabel(item.date)}
        </T>
      </View>
      <ArrowRight size={17} color={t.muted} />
    </Pressable>
  );
}
