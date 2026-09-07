import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../hooks/useAuth";
import { ComandasStack } from "./ComandasStack";
import { HistoricoScreen } from "../screens/historico/HistoricoScreen";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { PerfilScreen } from "../screens/perfil/PerfilScreen";

const Tab = createBottomTabNavigator();

export function MainTabs() {
    const { usuario } = useAuth();

    return (
        <Tab.Navigator screenOptions={{ headerTintColor: '#1F1F1F' }}>
            <Tab.Screen name="Comandas" component={ComandasStack} options={{ headerShown: false }} />
            <Tab.Screen name="Historico" component={HistoricoScreen} options={{ title: 'Histórico' }} />
            {usuario?.papel === 'DONO' && (
                <Tab.Screen name="Gestao" component={DashboardScreen} options={{ title: 'Gestão' }} />
            )}
            <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}
