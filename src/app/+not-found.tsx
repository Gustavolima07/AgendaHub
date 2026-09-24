import { View } from 'react-native';
import { Link } from 'expo-router';
import { T, useTheme } from '../ui';
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
      <T size={25} bold>
        Página não encontrada
      </T>
      <Link href="/" style={{ color: theme.primary, fontSize: 16 }}>
        Voltar para o início
      </Link>
    </View>
  );
}
