import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { Produto } from "../../types/Produto";
import { colors } from "../../theme/colors";
import { formatarMoeda } from "../../utils/formatadores";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";

type Props = NativeStackScreenProps<ComandasStackParamList, 'AdicionarItem'>;

const TODAS_CATEGORIAS = 'TODAS';

type ChipCategoria = { id: number | typeof TODAS_CATEGORIAS; nome: string };

export function AdicionarItemScreen({ route, navigation }: Props) {
    const { comandaId } = route.params;

    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [busca, setBusca] = useState('');
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | typeof TODAS_CATEGORIAS>(TODAS_CATEGORIAS);
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

    // Categorias derivadas dos produtos já carregados (não existe endpoint próprio de categorias).
    const categorias = useMemo(() => {
        const vistas = new Map<number, string>();
        produtos.forEach((produto) => vistas.set(produto.categoria.id, produto.categoria.nome));
        return Array.from(vistas.entries()).map(([id, nome]) => ({ id, nome }));
    }, [produtos]);

    const produtosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return produtos.filter((produto) => {
            const combinaBusca = !termo || produto.nome.toLowerCase().includes(termo);
            const combinaCategoria = categoriaSelecionada === TODAS_CATEGORIAS || produto.categoria.id === categoriaSelecionada;
            return combinaBusca && combinaCategoria;
        });
    }, [produtos, busca, categoriaSelecionada]);

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarProdutos} />;
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

            {categorias.length > 0 ? (
                <FlatList<ChipCategoria>
                    style={styles.chipsLista}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ id: TODAS_CATEGORIAS, nome: 'Todos' }, ...categorias]}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.chipsConteudo}
                    renderItem={({ item }) => {
                        const selecionado = item.id === categoriaSelecionada;
                        return (
                            <Pressable
                                onPress={() => setCategoriaSelecionada(item.id)}
                                style={[styles.chip, selecionado && styles.chipSelecionado]}>
                                <Text style={[styles.textoChip, selecionado && styles.textoChipSelecionado]}>
                                    {item.nome}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            ) : null}

            <FlatList
                style={styles.listaProdutos}
                data={produtosFiltrados}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listaConteudo}
                ListEmptyComponent={
                    <EmptyState
                        texto={
                            produtos.length === 0
                                ? 'Nenhum produto cadastrado'
                                : 'Nenhum produto encontrado'
                        }
                    />
                }
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.cartao}
                        onPress={() => navigation.navigate('ConfirmarItem', {
                            comandaId,
                            produtoId: item.id,
                            produtoNome: item.nome,
                            precoUnitario: item.preco,
                        })}>
                        <View style={styles.placeholderImagem}>
                            <Feather name="package" size={20} color={colors.textoSecundario} />
                        </View>
                        <View style={styles.infoProduto}>
                            <Text style={styles.nomeProduto}>{item.nome}</Text>
                            <Text style={styles.precoProduto}>{formatarMoeda(item.preco)}</Text>
                        </View>
                        <View style={styles.botaoAdicionar}>
                            <Feather name="plus" size={20} color={colors.superficie} />
                        </View>
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    campoBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        margin: 16,
        marginBottom: 0,
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
    chipsLista: {
        flexGrow: 0,
        flexShrink: 0,
        maxHeight: 52,
    },
    chipsConteudo: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingRight: 32,
        paddingVertical: 12,
        gap: 8,
    },
    chip: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 999,
    },
    chipSelecionado: {
        backgroundColor: colors.laranja,
        borderColor: colors.laranja,
    },
    textoChip: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    textoChipSelecionado: {
        color: colors.superficie,
    },
    listaProdutos: {
        flex: 1,
    },
    listaConteudo: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    cartao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    placeholderImagem: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
        borderRadius: 8,
    },
    infoProduto: {
        flex: 1,
    },
    nomeProduto: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    precoProduto: {
        marginTop: 2,
        fontSize: 14,
        fontWeight: '600',
        color: colors.laranja,
    },
    botaoAdicionar: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
});
