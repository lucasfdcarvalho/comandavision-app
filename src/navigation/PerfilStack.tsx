import { stackScreenOptions } from './stackScreenOptions';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PerfilScreen } from "../screens/perfil/PerfilScreen";
import { AlterarSenhaScreen } from "../screens/perfil/AlterarSenhaScreen";

export type PerfilStackParamList = {
    Perfil: undefined;
    AlterarSenha: undefined;
};

const Stack = createNativeStackNavigator<PerfilStackParamList>();

// Disponível para DONO e FUNCIONARIO: cada pessoa só altera a própria senha.
export function PerfilStack() {
    return (
        <Stack.Navigator initialRouteName="Perfil" screenOptions={stackScreenOptions}>
            <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil' }} />
            <Stack.Screen name="AlterarSenha" component={AlterarSenhaScreen} options={{ title: 'Alterar senha' }} />
        </Stack.Navigator>
    );
}
