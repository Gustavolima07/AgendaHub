import { View } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText, useTheme } from '../ui';
export default function NotFound() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        backgroundColor: theme.background,
      }}
    >
      <ThemedText size={25} bold>
        Página não encontrada
      </ThemedText>
      <Link href="/" style={{ color: theme.primary, fontSize: 16 }}>
        Voltar para o início
      </Link>
    </View>
  );
}
