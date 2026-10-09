import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const stackScreenOptions: NativeStackNavigationOptions = {
    headerBackTitle: 'Voltar',
    // Impede o iOS de trocar o título por "Back" ao calcular o espaço disponível.
    headerBackTitleStyle: { fontSize: 17 },
};
