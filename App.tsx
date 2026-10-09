import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogoProvider } from './src/contexts/DialogoContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <DialogoProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </DialogoProvider>
    </SafeAreaProvider>
  )
}
