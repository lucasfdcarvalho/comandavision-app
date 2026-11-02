import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

// Cabeçalho limpo: mesma cor do fundo das telas, sem linha de sombra e título na fonte do app.
const cabecalho = {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.fundo },
    headerTintColor: colors.textoPrimario,
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.textoPrimario },
};

export const stackScreenOptions: NativeStackNavigationOptions = {
    ...cabecalho,
    headerBackTitle: 'Voltar',
    // Impede o iOS de trocar o título por "Back" ao calcular o espaço disponível.
    headerBackTitleStyle: { fontSize: 17, fontFamily: 'Inter_400Regular' },
    contentStyle: { backgroundColor: colors.fundo },
};

export const tabScreenOptions: BottomTabNavigationOptions = {
    ...cabecalho,
    sceneStyle: { backgroundColor: colors.fundo },
    // Laranja escuro no rótulo ativo: o laranja da marca tem pouco contraste em texto pequeno.
    tabBarActiveTintColor: colors.laranjaEscuro,
    tabBarInactiveTintColor: colors.textoSecundario,
    tabBarStyle: {
        backgroundColor: colors.superficie,
        borderTopColor: colors.borda,
        borderTopWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabBarItemStyle: { paddingTop: 4 },
    tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 14 },
};
