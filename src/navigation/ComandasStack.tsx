import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ComandasScreen } from "../screens/comandas/ComandasScreen";
import { NovaComandaScreen } from "../screens/comandas/NovaComandaScreen";
import { DetalhesComandaScreen } from "../screens/comandas/DetalhesComandaScreen";
import { AdicionarItemScreen } from "../screens/comandas/AdicionarItemScreen";
import { ConfirmarItemScreen } from "../screens/comandas/ConfirmarItemScreen";
import { EditarItemScreen } from "../screens/comandas/EditarItemScreen";
import { RegistrarPagamentoScreen } from "../screens/comandas/RegistrarPagamentoScreen";
import { colors } from "../theme/colors";

export type ComandasStackParamList = {
    Lista: undefined;
    NovaComanda: undefined;
    DetalhesComanda: { comandaId: number };
    AdicionarItem: { comandaId: number };
    ConfirmarItem: {
        comandaId: number;
        produtoId: number;
        produtoNome: string;
        precoUnitario: number;
        produtoImagemUrl?: string | null;
    };
    EditarItem: {
        comandaId: number;
        itemId: number;
        produtoNome: string;
        precoUnitario: number;
        quantidadeAtual: number;
        observacaoAtual?: string;
    };
    RegistrarPagamento: { comandaId: number; comandaIdentificacao: string; valorSugerido: number };
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
                        <Pressable
                            style={({ pressed }) => [styles.botaoHeaderIcone, pressed && styles.botaoHeaderIconePressionado]}
                            onPress={() => navigation.navigate('NovaComanda')}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Nova comanda">
                            <Feather name="plus-circle" size={24} color={colors.laranja} />
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
            <Stack.Screen
                name="RegistrarPagamento"
                component={RegistrarPagamentoScreen}
                options={{ title: 'Registrar pagamento' }}
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    botaoHeaderIcone: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    botaoHeaderIconePressionado: {
        opacity: 0.6,
    },
});
