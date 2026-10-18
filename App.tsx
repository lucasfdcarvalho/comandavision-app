import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogoProvider } from './src/contexts/DialogoContext';
import { ARQUIVOS_FONTE } from './src/theme/fontes';

// Fora do componente, para rodar antes de a tela de abertura nativa sumir.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontesCarregadas, erroFontes] = useFonts(ARQUIVOS_FONTE);
  // Se a fonte falhar, o app abre mesmo assim com a fonte do sistema.
  const pronto = fontesCarregadas || Boolean(erroFontes);

  useEffect(() => {
    if (pronto) {
      SplashScreen.hide();
    }
  }, [pronto]);

  if (!pronto) {
    return null;
  }

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
