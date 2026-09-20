import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, RefreshControl, Pressable, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { apiService } from "../../services/apiService";
import { Comanda } from "../../types/Comanda";
import { ComandaCard } from "../../components/ComandaCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { colors } from "../../theme/colors";
import { formatarDataHora } from "../../utils/formatadores";

// Limitação conhecida: /api/comandas (usado aqui) retorna apenas o tipo `Comanda`,
// sem total nem formas de pagamento — esses dados só existem em ComandaDetalhada
// (buscarComanda) e no recurso de pagamentos, um por comanda. Buscar isso para
// cada item da lista exigiria N chamadas extras à API, então o cartão do
// histórico mostra apenas identificação, status e data, que é o que a listagem
// realmente retorna. Total e forma de pagamento aparecem ao abrir os detalhes.

type ChavePeriodo = 'todos' | 'hoje' | '7dias' | '30dias';

const PERIODOS: { chave: ChavePeriodo; rotulo: string }[] = [
    { chave: 'todos', rotulo: 'Tudo' },
    { chave: 'hoje', rotulo: 'Hoje' },
    { chave: '7dias', rotulo: '7 dias' },
    { chave: '30dias', rotulo: '30 dias' },
];

function dataDeReferencia(comanda: Comanda): string {
    return comanda.status === 'FECHADA' && comanda.fechadaEm ? comanda.fechadaEm : comanda.atualizadoEm;
}

function estaDentroDoPeriodo(dataIso: string, chave: ChavePeriodo): boolean {
    if (chave === 'todos') {
        return true;
    }
    const dias = chave === 'hoje' ? 1 : chave === '7dias' ? 7 : 30;
    const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
    return new Date(dataIso).getTime() >= limite;
}

export function HistoricoScreen() {
    const navigation = useNavigation();

    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [busca, setBusca] = useState('');
    const [periodo, setPeriodo] = useState<ChavePeriodo>('todos');
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarHistorico = useCallback(async () => {
        try {
            setMensagemErro('');
            const dados = await apiService.listarComandas();
            const encerradas = dados
                .filter((comanda) => comanda.status !== 'ABERTA')
                .sort((a, b) => new Date(dataDeReferencia(b)).getTime() - new Date(dataDeReferencia(a)).getTime());
            setComandas(encerradas);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar o histórico';
            setMensagemErro(mensagem);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            async function carregarInicial() {
                setCarregando(true);
                await carregarHistorico();
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarHistorico])
    );

    async function atualizar() {
        setAtualizando(true);
        await carregarHistorico();
        setAtualizando(false);
    }

    // Busca e período são filtros locais sobre os dados já carregados
    // (a API de listagem não aceita parâmetros de busca ou intervalo de data).
    const comandasFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return comandas.filter((comanda) => {
            const combinaBusca = !termo || comanda.identificacao.toLowerCase().includes(termo);
            const combinaPeriodo = estaDentroDoPeriodo(dataDeReferencia(comanda), periodo);
            return combinaBusca && combinaPeriodo;
        });
    }, [comandas, busca, periodo]);

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarHistorico} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.campoBusca}>
                <Feather name="search" size={18} color={colors.textoSecundario} />
                <TextInput
                    style={styles.busca}
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar comanda..."
                />
            </View>

            <View style={styles.periodos}>
                {PERIODOS.map((opcao) => {
                    const selecionado = opcao.chave === periodo;
                    return (
                        <Pressable
                            key={opcao.chave}
                            onPress={() => setPeriodo(opcao.chave)}
                            style={[styles.botaoPeriodo, selecionado && styles.botaoPeriodoSelecionado]}>
                            <Text style={[styles.textoBotaoPeriodo, selecionado && styles.textoBotaoPeriodoSelecionado]}>
                                {opcao.rotulo}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <FlatList
                style={styles.lista}
                data={comandasFiltradas}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={comandasFiltradas.length === 0 ? styles.listaVazia : styles.listaConteudo}
                refreshControl={
                    <RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />
                }
                ListEmptyComponent={
                    <EmptyState
                        texto={
                            busca || periodo !== 'todos'
                                ? 'Nenhuma comanda encontrada para esse filtro'
                                : 'Nenhuma comanda fechada ou cancelada ainda'
                        }
                    />
                }
                renderItem={({ item }) => (
                    <ComandaCard
                        comanda={item}
                        subtitulo={
                            item.status === 'FECHADA' && item.fechadaEm
                                ? `Fechada em ${formatarDataHora(item.fechadaEm)}`
                                : `Atualizada em ${formatarDataHora(item.atualizadoEm)}`
                        }
                        onPress={() => (navigation as any).navigate('Comandas', {
                            screen: 'DetalhesComanda',
                            params: { comandaId: item.id },
                        })}
                    />
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
        marginHorizontal: 16,
        marginTop: 12,
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
    periodos: {
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    botaoPeriodo: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 999,
    },
    botaoPeriodoSelecionado: {
        backgroundColor: colors.laranja,
        borderColor: colors.laranja,
    },
    textoBotaoPeriodo: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    textoBotaoPeriodoSelecionado: {
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
    listaVazia: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
});
