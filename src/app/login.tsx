import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreen } from '../Pages/AuthScreen';
import { useTheme } from '../ui';
export default function LoginRoute() {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AuthScreen />
    </SafeAreaView>
  );
}
