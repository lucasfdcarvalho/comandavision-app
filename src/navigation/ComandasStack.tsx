import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
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
                        <Pressable style={styles.botaoHeaderComIcone} onPress={() => navigation.navigate('NovaComanda')}>
                            <Feather name="plus-circle" size={16} color={styles.botaoHeader.color} />
                            <Text style={styles.botaoHeader}>Nova comanda</Text>
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
                options={{ title: 'Detalhes da comanda' }}
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
    botaoHeaderComIcone: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    botaoHeader: {
        color: colors.laranja,
        fontWeight: '700',
        fontSize: 14,
    },
});
