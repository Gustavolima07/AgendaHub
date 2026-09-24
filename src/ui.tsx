import React, { createContext, useContext } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react-native';
import { dateKey, localDate, palettes } from './domain';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}

export const ThemeContext = createContext(palettes[0]);
export const useTheme = () => useContext(ThemeContext);

function WebPageEntrance({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <View
      style={
        {
          opacity: visible ? 1 : 0,
          transform: [{ translateY: visible ? 0 : 12 }],
          transition: 'opacity 260ms ease-out, transform 260ms ease-out',
        } as any
      }
    >
      {children}
    </View>
  );
}

export function PageEntrance({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') return <WebPageEntrance>{children}</WebPageEntrance>;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 260 }}
    >
      {children}
    </MotiView>
  );
}

export function ThemedText({
  children,
  size = 14,
  bold = false,
  muted = false,
  color,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  muted?: boolean;
  color?: string;
  style?: TextStyle;
}) {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size * 1.45,
        fontWeight: bold ? '700' : '400',
        color: color || (muted ? theme.muted : theme.text),
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style, delay = 0 }: CardProps) {
  const theme = useTheme();
  const cardStyle = StyleSheet.flatten([
    {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    style,
  ]);

  // Reanimated's DOM updater can treat Moti's animated style array as CSS
  // properties (0, 1, ...). Keep the web DOM on React Native Web's style path.
  if (Platform.OS === 'web') {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 350, delay }}
      style={cardStyle}
    >
      {children}
    </MotiView>
  );
}

export function Button({
  label,
  onPress,
  secondary = false,
  small = false,
  disabled = false,
  icon: IconComponent,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  small?: boolean;
  disabled?: boolean;
  icon?: any;
}) {
  const theme = useTheme();
  const color = secondary ? theme.primary : contrast(theme.primary);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        backgroundColor: secondary ? theme.accent : theme.primary,
        paddingVertical: small ? 9 : 13,
        paddingHorizontal: small ? 12 : 18,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        ...interactiveZoom(pressed, hovered),
        ...(hovered ? { filter: 'brightness(0.96)' } : {}),
      })}
    >
      {IconComponent && <IconComponent size={small ? 16 : 18} color={color} />}
      <ThemedText color={color} bold size={small ? 12 : 14}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function IconButton({
  icon: IconComponent,
  label,
  onPress,
  disabled = false,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        padding: 10,
        borderRadius: 10,
        opacity: disabled ? 0.3 : pressed ? 0.72 : 1,
        backgroundColor: theme.background,
        ...interactiveZoom(pressed, !disabled && hovered, 0.92, 1.06),
      })}
    >
      <IconComponent size={18} color={theme.primary} />
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder = '',
  numeric = false,
  multiline = false,
  secure = false,
}: {
  label: string;
  value: string;
  onChange: (nextText: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  secure?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 7, flex: 1, minWidth: 100 }}>
      <ThemedText size={12} bold>
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        secureTextEntry={secure}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize={secure || label.toLowerCase().includes('e-mail') ? 'none' : 'sentences'}
        multiline={multiline}
        style={{
          backgroundColor: theme.background,
          color: theme.text,
          borderColor: theme.muted + '40',
          borderWidth: 1,
          borderRadius: 10,
          padding: 13,
          fontSize: 14,
          minHeight: multiline ? 85 : 46,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (nextOptionId: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={layoutStyles.wrap}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.id }}
          onPress={() => onChange(option.id)}
          style={({ pressed, hovered }: any) => ({
            paddingHorizontal: 13,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: value === option.id ? theme.primary : theme.background,
            borderWidth: 1,
            borderColor: value === option.id ? theme.primary : theme.muted + '25',
            opacity: pressed ? 0.82 : 1,
            ...interactiveZoom(pressed, hovered, 0.96, 1.025),
          })}
        >
          <ThemedText
            size={12}
            bold={value === option.id}
            color={value === option.id ? contrast(theme.primary) : theme.muted}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: theme.accent,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 7,
      }}
    >
      <ThemedText size={11} color={theme.primary} bold>
        {children}
      </ThemedText>
    </View>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
      <View style={{ padding: 16, backgroundColor: theme.accent, borderRadius: 18 }}>
        <Plus color={theme.primary} size={25} />
      </View>
      <ThemedText bold size={17}>
        {title}
      </ThemedText>
      <ThemedText muted style={{ textAlign: 'center', maxWidth: 350 }}>
        {description}
      </ThemedText>
      {action && <Button label="Adicionar agora" onPress={action} secondary />}
    </View>
  );
}

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: '#10221988',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '94%',
            backgroundColor: theme.surface,
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          <View
            style={[
              layoutStyles.row,
              {
                justifyContent: 'space-between',
                padding: 22,
                borderBottomWidth: 1,
                borderColor: theme.muted + '22',
              },
            ]}
          >
            <ThemedText size={22} bold>
              {title}
            </ThemedText>
            <IconButton icon={X} label="Fechar" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 22, gap: 18 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Calendar({
  value,
  onChange,
  marked = [],
  compact = false,
}: {
  value: string;
  onChange: (nextDate: string) => void;
  marked?: string[];
  compact?: boolean;
}) {
  const theme = useTheme(),
    selectedDate = localDate(value),
    first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    count = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate(),
    offset = (first.getDay() + 6) % 7;
  const changeMonth = (monthOffset: number) =>
    onChange(
      dateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + monthOffset, 1)),
    );
  return (
    <View style={{ gap: 12 }}>
      <View style={[layoutStyles.row, { justifyContent: 'space-between' }]}>
        <ThemedText bold size={15} style={{ textTransform: 'capitalize' }}>
          {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </ThemedText>
        <View style={layoutStyles.row}>
          <IconButton icon={ChevronLeft} label="Mês anterior" onPress={() => changeMonth(-1)} />
          <IconButton icon={ChevronRight} label="Próximo mês" onPress={() => changeMonth(1)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((weekdayLabel, index) => (
          <View key={index} style={{ width: '14.2857%', alignItems: 'center' }}>
            <ThemedText muted size={11}>
              {weekdayLabel}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => {
          const day = i - offset + 1,
            key = `${value.slice(0, 7)}-${String(day).padStart(2, '0')}`,
            valid = day > 0 && day <= count,
            selected = value === key;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={valid ? `Selecionar ${key}` : 'Fora do mês'}
              disabled={!valid}
              onPress={() => onChange(key)}
              style={({ pressed, hovered }: any) => ({
                width: '14.2857%',
                height: compact ? 36 : 44,
                padding: 2,
                ...interactiveZoom(pressed, valid && hovered, 0.94, 1.06),
              })}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: selected
                    ? theme.primary
                    : key === dateKey()
                      ? theme.accent
                      : 'transparent',
                  gap: 2,
                }}
              >
                <ThemedText
                  size={12}
                  bold={selected}
                  color={selected ? contrast(theme.primary) : theme.text}
                >
                  {valid ? day : ''}
                </ThemedText>
                {valid && marked.includes(key) && (
                  <View
                    style={{
                      height: 4,
                      width: 4,
                      borderRadius: 2,
                      backgroundColor: selected ? contrast(theme.primary) : theme.primary,
                    }}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function contrast(hexColor: string) {
  let normalizedHex = hexColor.replace('#', '');
  if (normalizedHex.length === 3)
    normalizedHex = normalizedHex
      .split('')
      .map((character) => character + character)
      .join('');
  const rgb = normalizedHex.match(/.{2}/g)?.map((channel) => parseInt(channel, 16)) || [
    255, 255, 255,
  ];
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 160 ? '#14251C' : '#FFFFFF';
}

export function interactiveZoom(
  pressed: boolean,
  hovered = false,
  pressedScale = 0.97,
  hoveredScale = 1.025,
): ViewStyle {
  return {
    transform: [{ scale: pressed ? pressedScale : hovered ? hoveredScale : 1 }],
    ...(Platform.OS === 'web' ? ({ transition: 'transform 150ms ease-out' } as any) : {}),
  };
}

export const layoutStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: 18, padding: 22, borderWidth: 1, gap: 16 },
  stack: { gap: 18 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
