import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text, StyleSheet } from "react-native";
import { ComandasScreen } from "../screens/comandas/ComandasScreen";
import { NovaComandaScreen } from "../screens/comandas/NovaComandaScreen";
import { DetalhesComandaScreen } from "../screens/comandas/DetalhesComandaScreen";
import { AdicionarItemScreen } from "../screens/comandas/AdicionarItemScreen";
import { ConfirmarItemScreen } from "../screens/comandas/ConfirmarItemScreen";
import { EditarItemScreen } from "../screens/comandas/EditarItemScreen";
import { colors } from "../theme/colors";

export type ComandasStackParamList = {
    Lista: undefined;
    NovaComanda: undefined;
    DetalhesComanda: { comandaId: number };
    AdicionarItem: { comandaId: number };
    ConfirmarItem: { comandaId: number; produtoId: number; produtoNome: string; precoUnitario: number };
    EditarItem: {
        comandaId: number;
        itemId: number;
        produtoNome: string;
        precoUnitario: number;
        quantidadeAtual: number;
        observacaoAtual?: string;
    };
};

const Stack = createNativeStackNavigator<ComandasStackParamList>();

export function ComandasStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Lista"
                component={ComandasScreen}
                options={({ navigation }) => ({
                    title: 'Comandas',
                    headerRight: () => (
                        <Pressable onPress={() => navigation.navigate('NovaComanda')}>
                            <Text style={styles.botaoHeader}>+ Nova comanda</Text>
                        </Pressable>
                    ),
                })}
            />
            <Stack.Screen
                name="NovaComanda"
                component={NovaComandaScreen}
                options={{ title: 'Nova comanda' }}
            />
            <Stack.Screen
                name="DetalhesComanda"
                component={DetalhesComandaScreen}
                options={({ navigation, route }) => ({
                    title: 'Detalhes da comanda',
                    headerRight: () => (
                        <Pressable
                            onPress={() => navigation.navigate('AdicionarItem', { comandaId: route.params.comandaId })}>
                            <Text style={styles.botaoHeader}>+ Item</Text>
                        </Pressable>
                    ),
                })}
            />
            <Stack.Screen
                name="AdicionarItem"
                component={AdicionarItemScreen}
                options={{ title: 'Adicionar item' }}
            />
            <Stack.Screen
                name="ConfirmarItem"
                component={ConfirmarItemScreen}
                options={{ title: 'Confirmar item' }}
            />
            <Stack.Screen
                name="EditarItem"
                component={EditarItemScreen}
                options={{ title: 'Editar item' }}
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    botaoHeader: {
        color: colors.laranja,
        fontWeight: '700',
        fontSize: 14,
    },
});
