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

export function T({
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
  const t = useTheme();
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size * 1.45,
        fontWeight: bold ? '700' : '400',
        color: color || (muted ? t.muted : t.text),
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style, delay = 0 }: CardProps) {
  const theme = useTheme();
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 350, delay }}
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
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
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  small?: boolean;
  disabled?: boolean;
  icon?: any;
}) {
  const t = useTheme();
  const color = secondary ? t.primary : contrast(t.primary);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        backgroundColor: secondary ? t.accent : t.primary,
        paddingVertical: small ? 9 : 13,
        paddingHorizontal: small ? 12 : 18,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...(hovered ? { filter: 'brightness(0.96)' } : {}),
      })}
    >
      {Icon && <Icon size={small ? 16 : 18} color={color} />}
      <T color={color} bold size={small ? 12 : 14}>
        {label}
      </T>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 10,
        borderRadius: 10,
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
        backgroundColor: t.background,
      })}
    >
      <Icon size={18} color={t.primary} />
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
  onChange: (s: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  secure?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 7, flex: 1, minWidth: 100 }}>
      <T size={12} bold>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        secureTextEntry={secure}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize={secure || label.toLowerCase().includes('e-mail') ? 'none' : 'sentences'}
        multiline={multiline}
        style={{
          backgroundColor: t.background,
          color: t.text,
          borderColor: t.muted + '40',
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
  onChange: (s: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={s.wrap}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.id }}
          onPress={() => onChange(o.id)}
          style={{
            paddingHorizontal: 13,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: value === o.id ? t.primary : t.background,
            borderWidth: 1,
            borderColor: value === o.id ? t.primary : t.muted + '25',
          }}
        >
          <T size={12} bold={value === o.id} color={value === o.id ? contrast(t.primary) : t.muted}>
            {o.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: t.accent,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 7,
      }}
    >
      <T size={11} color={t.primary} bold>
        {children}
      </T>
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
  const t = useTheme();
  return (
    <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
      <View style={{ padding: 16, backgroundColor: t.accent, borderRadius: 18 }}>
        <Plus color={t.primary} size={25} />
      </View>
      <T bold size={17}>
        {title}
      </T>
      <T muted style={{ textAlign: 'center', maxWidth: 350 }}>
        {description}
      </T>
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
  const t = useTheme();
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
            backgroundColor: t.surface,
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          <View
            style={[
              s.row,
              {
                justifyContent: 'space-between',
                padding: 22,
                borderBottomWidth: 1,
                borderColor: t.muted + '22',
              },
            ]}
          >
            <T size={22} bold>
              {title}
            </T>
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
  onChange: (s: string) => void;
  marked?: string[];
  compact?: boolean;
}) {
  const t = useTheme(),
    d = localDate(value),
    first = new Date(d.getFullYear(), d.getMonth(), 1),
    count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    offset = (first.getDay() + 6) % 7;
  const change = (n: number) => onChange(dateKey(new Date(d.getFullYear(), d.getMonth() + n, 1)));
  return (
    <View style={{ gap: 12 }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <T bold size={15} style={{ textTransform: 'capitalize' }}>
          {d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </T>
        <View style={s.row}>
          <IconButton icon={ChevronLeft} label="Mês anterior" onPress={() => change(-1)} />
          <IconButton icon={ChevronRight} label="Próximo mês" onPress={() => change(1)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x, i) => (
          <View key={i} style={{ width: '14.2857%', alignItems: 'center' }}>
            <T muted size={11}>
              {x}
            </T>
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
              style={{ width: '14.2857%', height: compact ? 36 : 44, padding: 2 }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: selected
                    ? t.primary
                    : key === dateKey()
                      ? t.accent
                      : 'transparent',
                  gap: 2,
                }}
              >
                <T size={12} bold={selected} color={selected ? contrast(t.primary) : t.text}>
                  {valid ? day : ''}
                </T>
                {valid && marked.includes(key) && (
                  <View
                    style={{
                      height: 4,
                      width: 4,
                      borderRadius: 2,
                      backgroundColor: selected ? contrast(t.primary) : t.primary,
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

export function contrast(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3)
    c = c
      .split('')
      .map((x) => x + x)
      .join('');
  const rgb = c.match(/.{2}/g)?.map((x) => parseInt(x, 16)) || [255, 255, 255];
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 160 ? '#14251C' : '#FFFFFF';
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: 18, padding: 22, borderWidth: 1, gap: 16 },
  stack: { gap: 18 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
