import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

// Cabeçalho branco e tipografia nativa, como nas telas de referência.
const cabecalho = {
    headerShadowVisible: true,
    headerStyle: { backgroundColor: colors.superficie },
    headerTintColor: colors.textoPrimario,
    headerTitleStyle: { fontSize: 20, fontWeight: '500' as const, color: colors.textoPrimario },
};

export const stackScreenOptions: NativeStackNavigationOptions = {
    ...cabecalho,
    headerBackTitle: 'Voltar',
    // Impede o iOS de trocar o título por "Back" ao calcular o espaço disponível.
    headerBackTitleStyle: { fontSize: 17 },
    contentStyle: { backgroundColor: colors.fundo },
};

export const tabScreenOptions: BottomTabNavigationOptions = {
    ...cabecalho,
    sceneStyle: { backgroundColor: colors.fundo },
    tabBarActiveTintColor: colors.laranja,
    tabBarInactiveTintColor: '#8E8E8F',
    tabBarStyle: {
        backgroundColor: colors.superficie,
        borderTopColor: colors.borda,
        borderTopWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabBarItemStyle: { paddingTop: 4 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '400', lineHeight: 13 },
};
