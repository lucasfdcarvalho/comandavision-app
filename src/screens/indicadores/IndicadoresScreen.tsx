import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, RefreshControl, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiService } from "../../services/apiService";
import { LoadingState } from "../../components/LoadingState";
import { MensagemErro } from "../../components/MensagemErro";
import { GraficoColunas } from "../../components/dashboard/GraficoColunas";
import { CartaoIndicador } from "../../components/dashboard/CartaoIndicador";
import { BarraProporcional } from "../../components/dashboard/BarraProporcional";
import { colors } from "../../theme/colors";
import { formatarMoeda } from "../../utils/formatadores";
import { ICONE_FORMA, ROTULO_FORMA } from "../../utils/formaPagamento";
import {
    ChavePeriodo,
    PERIODOS,
    calcularMediaPorDiaSemana,
    calcularPeriodo,
    calcularPeriodoAnterior,
    calcularVariacao,
    formatarDiaComSemana,
    formatarDiaCurto,
    formatarPercentual,
    nomeDiaSemanaCurto,
    preencherDiasSemVenda,
} from "../../utils/dashboard";
import { ResumoDashboard, ProdutoMaisVendido, FormaPagamentoResumo, FaturamentoDiario } from "../../types/Dashboard";

// Com menos dias que isso, a média por dia da semana teria uma ocorrência só e enganaria.
const DIAS_MINIMOS_ANALISE_SEMANA = 14;

// Aba exclusiva do DONO com a análise completa do período. O resumo rápido fica na aba Gestão.
export function IndicadoresScreen() {
    const [periodo, setPeriodo] = useState<ChavePeriodo>('30dias');
    const [carregando, setCarregando] = useState(true);
    const [carregandoPeriodo, setCarregandoPeriodo] = useState(false);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
    const [resumoAnterior, setResumoAnterior] = useState<ResumoDashboard | null>(null);
    const [produtos, setProdutos] = useState<ProdutoMaisVendido[]>([]);
    const [formas, setFormas] = useState<FormaPagamentoResumo[]>([]);
    const [faturamentoDiario, setFaturamentoDiario] = useState<FaturamentoDiario[]>([]);
    // null = nada selecionado: o topo do gráfico mostra o total e todas as colunas ficam em destaque.
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [diaSemanaSelecionado, setDiaSemanaSelecionado] = useState<number | null>(null);

    const carregarPeriodo = useCallback(async (chave: ChavePeriodo) => {
        const atual = calcularPeriodo(chave);
        const anterior = calcularPeriodoAnterior(chave, atual);
        try {
            setMensagemErro('');
            const [resumoDados, resumoAnteriorDados, produtosDados, formasDados, faturamentoDados] = await Promise.all([
                apiService.buscarResumoDashboard(atual.inicio, atual.fim),
                // A comparação é um extra: se falhar, o resto do painel continua.
                apiService.buscarResumoDashboard(anterior.inicio, anterior.fim).catch(() => null),
                apiService.listarProdutosMaisVendidos(atual.inicio, atual.fim, 5),
                apiService.listarFormasPagamento(atual.inicio, atual.fim),
                apiService.listarFaturamentoDiario(atual.inicio, atual.fim),
            ]);
            setResumo(resumoDados);
            setResumoAnterior(resumoAnteriorDados);
            setProdutos(produtosDados);
            setFormas([...formasDados].sort((a, b) => b.valorRecebido - a.valorRecebido));
            setFaturamentoDiario(preencherDiasSemVenda(faturamentoDados, atual));
            setDiaSelecionado(null);
            setDiaSemanaSelecionado(null);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar os indicadores';
            setMensagemErro(mensagem);
        }
    }, []);

    const periodoRef = useRef(periodo);
    useEffect(() => {
        periodoRef.current = periodo;
    }, [periodo]);

    useFocusEffect(
        useCallback(() => {
            async function carregarInicial() {
                setCarregando(true);
                await carregarPeriodo(periodoRef.current);
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarPeriodo])
    );

    async function selecionarPeriodo(chave: ChavePeriodo) {
        setPeriodo(chave);
        setCarregandoPeriodo(true);
        await carregarPeriodo(chave);
        setCarregandoPeriodo(false);
    }

    async function atualizar() {
        setAtualizando(true);
        await carregarPeriodo(periodo);
        setAtualizando(false);
    }

    const mediasSemana = useMemo(() => calcularMediaPorDiaSemana(faturamentoDiario), [faturamentoDiario]);
    const indiceMelhorDiaSemana = useMemo(() => {
        let melhor = 0;
        mediasSemana.forEach((dia, indice) => {
            if (dia.media > mediasSemana[melhor].media) {
                melhor = indice;
            }
        });
        return melhor;
    }, [mediasSemana]);

    if (carregando) {
        return <LoadingState />;
    }

    const referencia = PERIODOS.find((opcao) => opcao.chave === periodo)?.referencia ?? '';
    const variacao = (campo: keyof ResumoDashboard) =>
        resumoAnterior ? calcularVariacao(resumo?.[campo] ?? 0, resumoAnterior[campo] ?? 0) : null;

    const totalPeriodo = faturamentoDiario.reduce((soma, dia) => soma + (dia.faturamento ?? 0), 0);
    const diaAtual = diaSelecionado !== null ? faturamentoDiario[diaSelecionado] : null;
    const mostrarEvolucao = periodo !== 'hoje' && faturamentoDiario.length > 1 && totalPeriodo > 0;
    const mostrarSemana = faturamentoDiario.length >= DIAS_MINIMOS_ANALISE_SEMANA && totalPeriodo > 0;
    const semanaExibida = mediasSemana[diaSemanaSelecionado ?? indiceMelhorDiaSemana];
    const maiorQuantidadeProduto = Math.max(1, ...produtos.map((produto) => produto.quantidadeVendida));

    // Tocar de novo na coluna já selecionada volta para o total do período.
    const alternarSelecao = (atual: number | null, indice: number) => (atual === indice ? null : indice);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}>
            <View style={styles.periodos}>
                {PERIODOS.map((opcao) => {
                    const selecionado = opcao.chave === periodo;
                    return (
                        <Pressable
                            key={opcao.chave}
                            onPress={() => selecionarPeriodo(opcao.chave)}
                            disabled={carregandoPeriodo}
                            accessibilityRole="button"
                            accessibilityState={{ selected: selecionado }}
                            style={[styles.botaoPeriodo, selecionado && styles.botaoPeriodoSelecionado]}>
                            <Text style={[styles.textoBotaoPeriodo, selecionado && styles.textoBotaoPeriodoSelecionado]}>
                                {opcao.rotulo}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            <Text style={styles.referencia}>{referencia}</Text>

            {carregandoPeriodo ? (
                <ActivityIndicator color={colors.laranja} style={styles.carregandoPeriodo} />
            ) : mensagemErro ? (
                <MensagemErro texto={mensagemErro} />
            ) : (
                <>
                    <View style={styles.grade}>
                        <CartaoIndicador rotulo="Faturamento" valor={formatarMoeda(resumo?.faturamento ?? 0)} variacao={variacao('faturamento')} />
                        <CartaoIndicador rotulo="Vendas" valor={String(resumo?.quantidadeVendas ?? 0)} variacao={variacao('quantidadeVendas')} />
                    </View>
                    <View style={styles.grade}>
                        <CartaoIndicador rotulo="Ticket médio" valor={formatarMoeda(resumo?.ticketMedio ?? 0)} variacao={variacao('ticketMedio')} />
                        <CartaoIndicador rotulo="Itens vendidos" valor={String(resumo?.quantidadeItensVendidos ?? 0)} variacao={variacao('quantidadeItensVendidos')} />
                    </View>

                    {mostrarEvolucao ? (
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Faturamento por dia</Text>
                            <View style={styles.cabecalhoGrafico}>
                                <Text style={styles.rotuloGrafico}>
                                    {diaAtual ? formatarDiaComSemana(diaAtual.data) : 'Total no período'}
                                </Text>
                                <Text style={styles.valorGrafico}>{formatarMoeda(diaAtual ? diaAtual.faturamento : totalPeriodo)}</Text>
                            </View>
                            <GraficoColunas
                                itens={faturamentoDiario.map((dia) => ({
                                    chave: dia.data,
                                    rotulo: faturamentoDiario.length <= 7 ? nomeDiaSemanaCurto(dia.data) : formatarDiaCurto(dia.data),
                                    valor: dia.faturamento ?? 0,
                                    descricaoAcessivel: `${formatarDiaComSemana(dia.data)}: ${formatarMoeda(dia.faturamento)}`,
                                }))}
                                indiceSelecionado={diaSelecionado}
                                onSelecionar={(indice) => setDiaSelecionado((atual) => alternarSelecao(atual, indice))}
                                maximoRotulos={faturamentoDiario.length <= 7 ? 7 : 5}
                            />
                        </View>
                    ) : null}

                    {mostrarSemana && semanaExibida ? (
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Média por dia da semana</Text>
                            <View style={styles.cabecalhoGrafico}>
                                <Text style={styles.rotuloGrafico}>
                                    {diaSemanaSelecionado === null ? `Melhor dia: ${semanaExibida.nome}` : semanaExibida.nome}
                                </Text>
                                <Text style={styles.valorGrafico}>{formatarMoeda(semanaExibida.media)}</Text>
                            </View>
                            <GraficoColunas
                                itens={mediasSemana.map((dia) => ({
                                    chave: String(dia.diaSemana),
                                    rotulo: dia.rotulo,
                                    valor: dia.media,
                                    descricaoAcessivel: `${dia.nome}: média de ${formatarMoeda(dia.media)}`,
                                }))}
                                indiceSelecionado={diaSemanaSelecionado}
                                onSelecionar={(indice) => setDiaSemanaSelecionado((atual) => alternarSelecao(atual, indice))}
                                maximoRotulos={7}
                                altura={150}
                            />
                        </View>
                    ) : null}

                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Produtos mais vendidos</Text>
                        {produtos.length === 0 ? (
                            <Text style={styles.textoVazio}>Nenhuma venda no período</Text>
                        ) : (
                            produtos.map((produto, indice) => (
                                <View key={produto.produtoId} style={styles.itemRanking}>
                                    <View style={styles.linhaRanking}>
                                        <Text style={styles.posicao}>{indice + 1}</Text>
                                        <Text style={styles.nomeRanking} numberOfLines={1}>{produto.produtoNome}</Text>
                                        <Text style={styles.valorRanking}>{produto.quantidadeVendida} un</Text>
                                    </View>
                                    <View style={styles.linhaBarra}>
                                        <View style={styles.flex}>
                                            <BarraProporcional proporcao={produto.quantidadeVendida / maiorQuantidadeProduto} />
                                        </View>
                                        <Text style={styles.complementoRanking}>{formatarMoeda(produto.faturamento)}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>

                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Formas de pagamento</Text>
                        {formas.length === 0 ? (
                            <Text style={styles.textoVazio}>Nenhum pagamento no período</Text>
                        ) : (
                            formas.map((forma) => (
                                <View key={forma.forma} style={styles.itemRanking}>
                                    <View style={styles.linhaRanking}>
                                        <MaterialCommunityIcons name={ICONE_FORMA[forma.forma]} size={18} color={colors.textoSecundario} />
                                        <Text style={styles.nomeRanking}>{ROTULO_FORMA[forma.forma]}</Text>
                                        <Text style={styles.valorRanking}>{formatarPercentual(forma.percentual)}</Text>
                                    </View>
                                    <View style={styles.linhaBarra}>
                                        <View style={styles.flex}>
                                            <BarraProporcional proporcao={forma.percentual / 100} />
                                        </View>
                                        <Text style={styles.complementoRanking}>{formatarMoeda(forma.valorRecebido)}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    conteudo: {
        padding: 16,
        gap: 12,
    },
    flex: {
        flex: 1,
    },
    periodos: {
        flexDirection: 'row',
        gap: 8,
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
    referencia: {
        marginTop: -4,
        fontSize: 12,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    carregandoPeriodo: {
        marginVertical: 24,
    },
    grade: {
        flexDirection: 'row',
        gap: 12,
    },
    secao: {
        padding: 16,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        gap: 10,
    },
    secaoTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    cabecalhoGrafico: {
        gap: 2,
    },
    rotuloGrafico: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    valorGrafico: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    textoVazio: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
    itemRanking: {
        gap: 6,
    },
    linhaRanking: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    posicao: {
        width: 18,
        fontSize: 13,
        fontWeight: '700',
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    nomeRanking: {
        flex: 1,
        fontSize: 14,
        color: colors.textoPrimario,
    },
    valorRanking: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    linhaBarra: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    complementoRanking: {
        minWidth: 84,
        fontSize: 12,
        color: colors.textoSecundario,
        textAlign: 'right',
    },
});
