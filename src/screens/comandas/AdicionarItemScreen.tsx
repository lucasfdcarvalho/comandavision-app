import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { Produto } from "../../types/Produto";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ComandasStackParamList, 'AdicionarItem'>;

function formatarMoeda(valor: number): string {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function AdicionarItemScreen({ route, navigation }: Props) {
    const { comandaId } = route.params;

    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarProdutos = useCallback(async () => {
        try {
            setCarregando(true);
            setMensagemErro('');
            const dados = await apiService.listarProdutos();
            setProdutos(dados.filter((produto) => produto.ativo));
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar os produtos';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            carregarProdutos();
        }, [carregarProdutos])
    );

    const produtosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) {
            return produtos;
        }
        return produtos.filter((produto) => produto.nome.toLowerCase().includes(termo));
    }, [produtos, busca]);

    if (carregando) {
        return (
            <View style={styles.centro}>
                <ActivityIndicator size="large" color={colors.laranja} />
            </View>
        );
    }

    if (mensagemErro) {
        return (
            <View style={styles.centro}>
                <Text style={styles.mensagemErro}>{mensagemErro}</Text>
                <Pressable style={styles.botaoTentarNovamente} onPress={carregarProdutos}>
                    <Text style={styles.textoBotaoTentarNovamente}>Tentar novamente</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.campoBusca}>
                <Feather name="search" size={18} color={colors.textoSecundario} />
                <TextInput
                    style={styles.busca}
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar produto..."
                />
            </View>
            <FlatList
                data={produtosFiltrados}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listaConteudo}
                ListEmptyComponent={<Text style={styles.textoVazio}>Nenhum produto encontrado</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.cartao}
                        onPress={() => navigation.navigate('ConfirmarItem', {
                            comandaId,
                            produtoId: item.id,
                            produtoNome: item.nome,
                            precoUnitario: item.preco,
                        })}>
                        <Text style={styles.nomeProduto}>{item.nome}</Text>
                        <Text style={styles.precoProduto}>{formatarMoeda(item.preco)}</Text>
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 24,
        backgroundColor: colors.fundo,
    },
    mensagemErro: {
        color: colors.erro,
        fontSize: 14,
        textAlign: 'center',
    },
    botaoTentarNovamente: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
    textoBotaoTentarNovamente: {
        color: colors.superficie,
        fontWeight: '700',
    },
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    campoBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        margin: 16,
        height: 46,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    busca: {
        flex: 1,
        height: '100%',
        color: colors.textoPrimario,
        fontSize: 15,
    },
    listaConteudo: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    textoVazio: {
        color: colors.textoSecundario,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 24,
    },
    cartao: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    nomeProduto: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    precoProduto: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.laranja,
    },
});
