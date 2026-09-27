import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { Produto } from "../../types/Produto";
import { Categoria } from "../../types/Categoria";
import { colors } from "../../theme/colors";
import { formatarMoeda } from "../../utils/formatadores";
import { ProdutoImagem } from "../../components/ProdutoImagem";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";

type Props = NativeStackScreenProps<GestaoStackParamList, 'Catalogo'>;

type Aba = 'produtos' | 'categorias';
type FiltroProduto = 'todos' | 'ativos' | 'inativos';
type FiltroCategoria = 'todas' | 'ativas' | 'inativas';

export function CatalogoScreen({ navigation }: Props) {
    const [aba, setAba] = useState<Aba>('produtos');
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [busca, setBusca] = useState('');
    const [filtroProduto, setFiltroProduto] = useState<FiltroProduto>('todos');
    const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>('todas');
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarDados = useCallback(async () => {
        try {
            setMensagemErro('');
            const [produtosDados, categoriasDados] = await Promise.all([
                apiService.listarProdutos(),
                apiService.listarCategorias(),
            ]);
            setProdutos(produtosDados);
            setCategorias(categoriasDados);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar o cardápio';
            setMensagemErro(mensagem);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            async function carregarInicial() {
                setCarregando(true);
                await carregarDados();
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarDados])
    );

    async function atualizar() {
        setAtualizando(true);
        await carregarDados();
        setAtualizando(false);
    }

    // Contagem de produtos por categoria calculada a partir da lista já carregada,
    // sem nenhuma chamada extra por categoria.
    const quantidadePorCategoria = useMemo(() => {
        const contagem = new Map<number, number>();
        produtos.forEach((produto) => {
            contagem.set(produto.categoria.id, (contagem.get(produto.categoria.id) ?? 0) + 1);
        });
        return contagem;
    }, [produtos]);

    const produtosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return produtos.filter((produto) => {
            const combinaBusca = !termo || produto.nome.toLowerCase().includes(termo);
            const combinaFiltro = filtroProduto === 'todos'
                || (filtroProduto === 'ativos' && produto.ativo)
                || (filtroProduto === 'inativos' && !produto.ativo);
            return combinaBusca && combinaFiltro;
        });
    }, [produtos, busca, filtroProduto]);

    const categoriasFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return categorias.filter((categoria) => {
            const combinaBusca = !termo || categoria.nome.toLowerCase().includes(termo);
            const combinaFiltro = filtroCategoria === 'todas'
                || (filtroCategoria === 'ativas' && categoria.ativa)
                || (filtroCategoria === 'inativas' && !categoria.ativa);
            return combinaBusca && combinaFiltro;
        });
    }, [categorias, busca, filtroCategoria]);

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarDados} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.segmentado}>
                <Pressable
                    style={[styles.botaoSegmento, aba === 'produtos' && styles.botaoSegmentoSelecionado]}
                    onPress={() => setAba('produtos')}
                    accessibilityRole="button"
                    accessibilityLabel="Mostrar produtos">
                    <Text style={[styles.textoSegmento, aba === 'produtos' && styles.textoSegmentoSelecionado]}>
                        Produtos
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.botaoSegmento, aba === 'categorias' && styles.botaoSegmentoSelecionado]}
                    onPress={() => setAba('categorias')}
                    accessibilityRole="button"
                    accessibilityLabel="Mostrar categorias">
                    <Text style={[styles.textoSegmento, aba === 'categorias' && styles.textoSegmentoSelecionado]}>
                        Categorias
                    </Text>
                </Pressable>
            </View>

            <View style={styles.linhaBusca}>
                <View style={styles.campoBusca}>
                    <Feather name="search" size={18} color={colors.textoSecundario} />
                    <TextInput
                        style={styles.busca}
                        value={busca}
                        onChangeText={setBusca}
                        placeholder={aba === 'produtos' ? 'Buscar produto...' : 'Buscar categoria...'}
                    />
                </View>
                <Pressable
                    style={styles.botaoNovo}
                    onPress={() => navigation.navigate(aba === 'produtos' ? 'NovoProduto' : 'NovaCategoria')}
                    accessibilityRole="button"
                    accessibilityLabel={aba === 'produtos' ? 'Novo produto' : 'Nova categoria'}>
                    <Feather name="plus" size={22} color={colors.superficie} />
                </Pressable>
            </View>

            {aba === 'produtos' ? (
                <View style={styles.filtros}>
                    {(['todos', 'ativos', 'inativos'] as FiltroProduto[]).map((opcao) => (
                        <Pressable
                            key={opcao}
                            style={[styles.chip, filtroProduto === opcao && styles.chipSelecionado]}
                            onPress={() => setFiltroProduto(opcao)}>
                            <Text style={[styles.textoChip, filtroProduto === opcao && styles.textoChipSelecionado]}>
                                {opcao === 'todos' ? 'Todos' : opcao === 'ativos' ? 'Ativos' : 'Inativos'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            ) : (
                <View style={styles.filtros}>
                    {(['todas', 'ativas', 'inativas'] as FiltroCategoria[]).map((opcao) => (
                        <Pressable
                            key={opcao}
                            style={[styles.chip, filtroCategoria === opcao && styles.chipSelecionado]}
                            onPress={() => setFiltroCategoria(opcao)}>
                            <Text style={[styles.textoChip, filtroCategoria === opcao && styles.textoChipSelecionado]}>
                                {opcao === 'todas' ? 'Todas' : opcao === 'ativas' ? 'Ativas' : 'Inativas'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {aba === 'produtos' ? (
                <FlatList
                    style={styles.lista}
                    data={produtosFiltrados}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listaConteudo}
                    refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}
                    ListEmptyComponent={
                        <EmptyState
                            texto={produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
                        />
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            style={[styles.cartaoProduto, !item.ativo && styles.cartaoInativo]}
                            onPress={() => navigation.navigate('EditarProduto', { produto: item })}>
                            <ProdutoImagem imagemUrl={item.imagemUrl} />
                            <View style={styles.infoProduto}>
                                <Text style={[styles.nomeProduto, !item.ativo && styles.textoInativo]} numberOfLines={1}>
                                    {item.nome}
                                </Text>
                                <Text style={styles.categoriaProduto} numberOfLines={1}>{item.categoria.nome}</Text>
                                <Text style={[styles.precoProduto, !item.ativo && styles.textoInativo]}>
                                    {formatarMoeda(item.preco)}
                                </Text>
                            </View>
                            <View style={styles.colunaAcao}>
                                <View style={[styles.badge, item.ativo ? styles.badgeAtivo : styles.badgeInativo]}>
                                    <Text style={[styles.textoBadge, item.ativo ? styles.textoBadgeAtivo : styles.textoBadgeInativo]}>
                                        {item.ativo ? 'Ativo' : 'Inativo'}
                                    </Text>
                                </View>
                                <Feather name="edit-2" size={16} color={colors.textoSecundario} />
                            </View>
                        </Pressable>
                    )}
                />
            ) : (
                <FlatList
                    style={styles.lista}
                    data={categoriasFiltradas}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listaConteudo}
                    refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}
                    ListEmptyComponent={
                        <EmptyState
                            texto={categorias.length === 0 ? 'Nenhuma categoria cadastrada' : 'Nenhuma categoria encontrada'}
                        />
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            style={[styles.cartaoCategoria, !item.ativa && styles.cartaoInativo]}
                            onPress={() => navigation.navigate('EditarCategoria', { categoria: item })}>
                            <View style={styles.infoCategoria}>
                                <View style={styles.linhaCabecalhoCategoria}>
                                    <Text style={[styles.nomeCategoria, !item.ativa && styles.textoInativo]} numberOfLines={1}>
                                        {item.nome}
                                    </Text>
                                    <View style={[styles.badge, item.ativa ? styles.badgeAtivo : styles.badgeInativo]}>
                                        <Text style={[styles.textoBadge, item.ativa ? styles.textoBadgeAtivo : styles.textoBadgeInativo]}>
                                            {item.ativa ? 'Ativa' : 'Inativa'}
                                        </Text>
                                    </View>
                                </View>
                                {item.descricao ? (
                                    <Text style={styles.descricaoCategoria} numberOfLines={2}>{item.descricao}</Text>
                                ) : null}
                                <Text style={styles.quantidadeProdutos}>
                                    {quantidadePorCategoria.get(item.id) ?? 0} produto(s)
                                </Text>
                            </View>
                            <Feather name="edit-2" size={16} color={colors.textoSecundario} />
                        </Pressable>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    segmentado: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 4,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 10,
        gap: 4,
    },
    botaoSegmento: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    botaoSegmentoSelecionado: {
        backgroundColor: colors.laranja,
    },
    textoSegmento: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    textoSegmentoSelecionado: {
        color: colors.superficie,
    },
    linhaBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    campoBusca: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    botaoNovo: {
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
    filtros: {
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
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
    lista: {
        flex: 1,
        marginTop: 8,
    },
    listaConteudo: {
        padding: 16,
        gap: 12,
    },
    cartaoProduto: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    cartaoInativo: {
        opacity: 0.6,
    },
    infoProduto: {
        flex: 1,
    },
    nomeProduto: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    categoriaProduto: {
        marginTop: 2,
        fontSize: 12,
        color: colors.textoSecundario,
    },
    precoProduto: {
        marginTop: 2,
        fontSize: 14,
        fontWeight: '600',
        color: colors.laranja,
    },
    textoInativo: {
        color: colors.textoSecundario,
    },
    colunaAcao: {
        alignItems: 'flex-end',
        gap: 6,
    },
    badge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    badgeAtivo: {
        backgroundColor: colors.statusFundo.aberta,
    },
    badgeInativo: {
        backgroundColor: colors.statusFundo.fechada,
    },
    textoBadge: {
        fontSize: 11,
        fontWeight: '700',
    },
    textoBadgeAtivo: {
        color: colors.status.aberta,
    },
    textoBadgeInativo: {
        color: colors.status.fechada,
    },
    cartaoCategoria: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    infoCategoria: {
        flex: 1,
        gap: 4,
    },
    linhaCabecalhoCategoria: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    nomeCategoria: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    descricaoCategoria: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    quantidadeProdutos: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
});
