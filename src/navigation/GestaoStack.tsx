import { View, Text, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { CatalogoScreen } from "../screens/gestao/CatalogoScreen";
import { NovoProdutoScreen } from "../screens/gestao/NovoProdutoScreen";
import { EditarProdutoScreen } from "../screens/gestao/EditarProdutoScreen";
import { NovaCategoriaScreen } from "../screens/gestao/NovaCategoriaScreen";
import { EditarCategoriaScreen } from "../screens/gestao/EditarCategoriaScreen";
import type { Produto } from "../types/Produto";
import type { Categoria } from "../types/Categoria";
import { colors } from "../theme/colors";

export type GestaoStackParamList = {
    Dashboard: undefined;
    Catalogo: undefined;
    NovoProduto: undefined;
    EditarProduto: { produto: Produto };
    NovaCategoria: undefined;
    EditarCategoria: { categoria: Categoria };
};

const Stack = createNativeStackNavigator<GestaoStackParamList>();

// Camada extra de proteção: a aba "Gestao" já só é renderizada para DONO em
// MainTabs.tsx, então isso normalmente nunca chega a aparecer. Mas se o papel
// do usuário mudar (ex.: reautenticação com outra conta) enquanto esta stack
// ainda está montada, este guard garante que nenhuma tela de gerenciamento
// fique acessível — a autorização definitiva continua sendo do backend.
export function GestaoStack() {
    const { usuario } = useAuth();

    if (usuario?.papel !== 'DONO') {
        return (
            <View style={styles.acessoRestrito}>
                <Feather name="lock" size={40} color={colors.textoSecundario} />
                <Text style={styles.tituloRestrito}>Acesso restrito</Text>
                <Text style={styles.textoRestrito}>Esta área é exclusiva para o papel DONO.</Text>
            </View>
        );
    }

    return (
        <Stack.Navigator>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Gestão' }} />
            <Stack.Screen name="Catalogo" component={CatalogoScreen} options={{ title: 'Cardápio' }} />
            <Stack.Screen name="NovoProduto" component={NovoProdutoScreen} options={{ title: 'Novo produto' }} />
            <Stack.Screen name="EditarProduto" component={EditarProdutoScreen} options={{ title: 'Editar produto' }} />
            <Stack.Screen name="NovaCategoria" component={NovaCategoriaScreen} options={{ title: 'Nova categoria' }} />
            <Stack.Screen name="EditarCategoria" component={EditarCategoriaScreen} options={{ title: 'Editar categoria' }} />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    acessoRestrito: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
        backgroundColor: colors.fundo,
    },
    tituloRestrito: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    textoRestrito: {
        fontSize: 14,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
});
