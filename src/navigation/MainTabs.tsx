import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { ComandasStack } from "./ComandasStack";
import { HistoricoScreen } from "../screens/historico/HistoricoScreen";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { PerfilScreen } from "../screens/perfil/PerfilScreen";

const Tab = createBottomTabNavigator();

export function MainTabs() {
    const { usuario } = useAuth();

    return (
        <Tab.Navigator screenOptions={{ headerTintColor: '#1F1F1F', tabBarActiveTintColor: '#EA8B00' }}>
            <Tab.Screen
                name="Comandas"
                component={ComandasStack}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Historico"
                component={HistoricoScreen}
                options={{
                    title: 'Histórico',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" size={size} color={color} />,
                }}
            />
            {usuario?.papel === 'DONO' && (
                <Tab.Screen
                    name="Gestao"
                    component={DashboardScreen}
                    options={{
                        title: 'Gestão',
                        tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
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
