import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { ComandasStack, HistoricoStack } from "./ComandasStack";
import { GestaoStack } from "./GestaoStack";
import { IndicadoresScreen } from "../screens/indicadores/IndicadoresScreen";
import { PerfilScreen } from "../screens/perfil/PerfilScreen";
import { tabScreenOptions } from "./stackScreenOptions";
import { feedbackTatil } from "../utils/feedbackTatil";

const Tab = createBottomTabNavigator();

export function MainTabs() {
    const { usuario } = useAuth();

    return (
        <Tab.Navigator screenOptions={tabScreenOptions} screenListeners={{ tabPress: () => feedbackTatil.selecao() }}>
            <Tab.Screen
                name="Comandas"
                component={ComandasStack}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Historico"
                component={HistoricoStack}
                options={{
                    title: 'Histórico',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />,
                }}
            />
            {usuario?.papel === 'DONO' && (
                <Tab.Screen
                    name="Indicadores"
                    component={IndicadoresScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
                    }}
                />
            )}
            {usuario?.papel === 'DONO' && (
                <Tab.Screen
                    name="Gestao"
                    component={GestaoStack}
                    options={{
                        title: 'Gestão',
                        headerShown: false,
                        tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} />,
                    }}
                />
            )}
            <Tab.Screen
                name="Perfil"
                component={PerfilScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
}
