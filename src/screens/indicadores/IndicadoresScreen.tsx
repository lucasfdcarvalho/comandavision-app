import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, RefreshControl, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiService } from "../../services/apiService";
import { LoadingState } from "../../components/LoadingState";
import { MensagemErro } from "../../components/MensagemErro";
import { GraficoColunas } from "../../components/dashboard/GraficoColunas";
import { IndicadorVariacao } from "../../components/dashboard/IndicadorVariacao";
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
    const [mensagemErroPeriodo, setMensagemErroPeriodo] = useState('');

    const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
    const [resumoAnterior, setResumoAnterior] = useState<ResumoDashboard | null>(null);
    const [produtos, setProdutos] = useState<ProdutoMaisVendido[]>([]);
    const [formas, setFormas] = useState<FormaPagamentoResumo[]>([]);
    const [faturamentoDiario, setFaturamentoDiario] = useState<FaturamentoDiario[]>([]);
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [diaSemanaSelecionado, setDiaSemanaSelecionado] = useState<number | null>(null);

    const carregarPeriodo = useCallback(async (chave: ChavePeriodo) => {
        const atual = calcularPeriodo(chave);
        const anterior = calcularPeriodoAnterior(chave, atual);
        try {
            setMensagemErroPeriodo('');
            const [resumoDados, resumoAnteriorDados, produtosDados, formasDados, faturamentoDados] = await Promise.all([
                apiService.buscarResumoDashboard(atual.inicio, atual.fim),
                // A comparação é um extra: se falhar, o resto do painel continua.
                apiService.buscarResumoDashboard(anterior.inicio, anterior.fim).catch(() => null),
                apiService.listarProdutosMaisVendidos(atual.inicio, atual.fim, 5),
                apiService.listarFormasPagamento(atual.inicio, atual.fim),
                apiService.listarFaturamentoDiario(atual.inicio, atual.fim),
            ]);
            const dias = preencherDiasSemVenda(faturamentoDados, atual);
            setResumo(resumoDados);
            setResumoAnterior(resumoAnteriorDados);
            setProdutos(produtosDados);
            setFormas([...formasDados].sort((a, b) => b.valorRecebido - a.valorRecebido));
            setFaturamentoDiario(dias);
            setDiaSelecionado(dias.length ? dias.length - 1 : null);
            setDiaSemanaSelecionado(null);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar os dados do período';
            setMensagemErroPeriodo(mensagem);
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

    const configuracaoPeriodo = PERIODOS.find((opcao) => opcao.chave === periodo) ?? PERIODOS[0];
    const variacao = (campo: keyof ResumoDashboard) =>
        resumoAnterior ? calcularVariacao(resumo?.[campo] ?? 0, resumoAnterior[campo] ?? 0) : null;

    const totalPeriodo = faturamentoDiario.reduce((soma, dia) => soma + (dia.faturamento ?? 0), 0);
    const diasComVenda = faturamentoDiario.filter((dia) => (dia.faturamento ?? 0) > 0).length;
    const melhorDia = faturamentoDiario.reduce<FaturamentoDiario | null>(
        (melhor, atual) => (!melhor || atual.faturamento > melhor.faturamento ? atual : melhor), null);
    const diaAtual = diaSelecionado !== null ? faturamentoDiario[diaSelecionado] : null;
    const mostrarEvolucao = periodo !== 'hoje' && faturamentoDiario.length > 1;
    const mostrarSemana = faturamentoDiario.length >= DIAS_MINIMOS_ANALISE_SEMANA && totalPeriodo > 0;
    const indiceSemanaExibido = diaSemanaSelecionado ?? indiceMelhorDiaSemana;
    const semanaExibida = mediasSemana[indiceSemanaExibido];
    const maiorQuantidadeProduto = Math.max(1, ...produtos.map((produto) => produto.quantidadeVendida));

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

            {carregandoPeriodo ? (
                <ActivityIndicator color={colors.laranja} style={styles.carregandoPeriodo} />
            ) : mensagemErroPeriodo ? (
                <MensagemErro texto={mensagemErroPeriodo} />
            ) : (
                <>
                    <View style={styles.secao}>
                        <Text style={styles.rotuloSecao}>Faturamento {configuracaoPeriodo.descricao}</Text>
                        <Text style={styles.valorPrincipal} numberOfLines={1} adjustsFontSizeToFit>
                            {formatarMoeda(resumo?.faturamento ?? 0)}
                        </Text>
                        <IndicadorVariacao variacao={variacao('faturamento')} comparacao={configuracaoPeriodo.comparacao} />

                        <View style={styles.divisor} />

                        <View style={styles.linhaIndicadores}>
                            <View style={styles.indicador}>
                                <Text style={styles.rotuloPequeno}>Vendas</Text>
                                <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
                                    {resumo?.quantidadeVendas ?? 0}
                                </Text>
                                <IndicadorVariacao variacao={variacao('quantidadeVendas')} compacto />
                            </View>
                            <View style={styles.indicador}>
                                <Text style={styles.rotuloPequeno}>Ticket médio</Text>
                                <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
                                    {formatarMoeda(resumo?.ticketMedio ?? 0)}
                                </Text>
                                <IndicadorVariacao variacao={variacao('ticketMedio')} compacto />
                            </View>
                            <View style={styles.indicador}>
                                <Text style={styles.rotuloPequeno}>Itens vendidos</Text>
                                <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
                                    {resumo?.quantidadeItensVendidos ?? 0}
                                </Text>
                                <IndicadorVariacao variacao={variacao('quantidadeItensVendidos')} compacto />
                            </View>
                        </View>
                    </View>

                    {mostrarEvolucao ? (
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Faturamento por dia</Text>
                            {totalPeriodo === 0 ? (
                                <Text style={styles.textoVazio}>Nenhum faturamento registrado no período</Text>
                            ) : (
                                <>
                                    {diaAtual ? (
                                        <View style={styles.detalheSelecao}>
                                            <Text style={styles.rotuloSecao}>{formatarDiaComSemana(diaAtual.data)}</Text>
                                            <Text style={styles.valorSelecao}>{formatarMoeda(diaAtual.faturamento)}</Text>
                                            <Text style={styles.rotuloPequeno}>
                                                {diaAtual.quantidadeVendas === 1 ? '1 venda' : `${diaAtual.quantidadeVendas} vendas`}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <GraficoColunas
                                        itens={faturamentoDiario.map((dia) => ({
                                            chave: dia.data,
                                            rotulo: faturamentoDiario.length <= 7 ? nomeDiaSemanaCurto(dia.data) : formatarDiaCurto(dia.data),
                                            valor: dia.faturamento ?? 0,
                                            descricaoAcessivel: `${formatarDiaComSemana(dia.data)}: ${formatarMoeda(dia.faturamento)}`,
                                        }))}
                                        indiceSelecionado={diaSelecionado}
                                        onSelecionar={setDiaSelecionado}
                                        maximoRotulos={faturamentoDiario.length <= 7 ? 7 : 5}
                                    />
                                    <Text style={styles.dica}>Toque numa coluna para ver o dia</Text>

                                    <View style={styles.linhaResumo}>
                                        <View style={styles.itemResumo}>
                                            <Text style={styles.rotuloPequeno}>Média por dia</Text>
                                            <Text style={styles.valorResumo} numberOfLines={1} adjustsFontSizeToFit>
                                                {formatarMoeda(totalPeriodo / faturamentoDiario.length)}
                                            </Text>
                                        </View>
                                        <View style={styles.itemResumo}>
                                            <Text style={styles.rotuloPequeno}>Melhor dia</Text>
                                            <Text style={styles.valorResumo} numberOfLines={1} adjustsFontSizeToFit>
                                                {melhorDia ? formatarDiaCurto(melhorDia.data) : '—'}
                                            </Text>
                                        </View>
                                        <View style={styles.itemResumo}>
                                            <Text style={styles.rotuloPequeno}>Dias com venda</Text>
                                            <Text style={styles.valorResumo}>
                                                {diasComVenda} de {faturamentoDiario.length}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    ) : periodo === 'hoje' ? (
                        <Text style={styles.dicaPeriodo}>
                            Para ver a evolução dia a dia, escolha 7 dias, 30 dias ou Este mês.
                        </Text>
                    ) : null}

                    {mostrarSemana && semanaExibida ? (
                        <View style={styles.secao}>
                            <Text style={styles.secaoTitulo}>Movimento por dia da semana</Text>
                            <View style={styles.detalheSelecao}>
                                <Text style={styles.rotuloSecao}>
                                    {indiceSemanaExibido === indiceMelhorDiaSemana
                                        ? `${semanaExibida.nome} é o dia mais forte`
                                        : semanaExibida.nome}
                                </Text>
                                <Text style={styles.valorSelecao}>{formatarMoeda(semanaExibida.media)}</Text>
                                <Text style={styles.rotuloPequeno}>
                                    média por dia, em {semanaExibida.ocorrencias} {semanaExibida.ocorrencias === 1 ? 'dia' : 'dias'} do período
                                </Text>
                            </View>
                            <GraficoColunas
                                itens={mediasSemana.map((dia) => ({
                                    chave: String(dia.diaSemana),
                                    rotulo: dia.rotulo,
                                    valor: dia.media,
                                    descricaoAcessivel: `${dia.nome}: média de ${formatarMoeda(dia.media)}`,
                                }))}
                                indiceSelecionado={indiceSemanaExibido}
                                onSelecionar={setDiaSemanaSelecionado}
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
                                        <Text style={styles.complementoRanking}>
                                            {formatarMoeda(forma.valorRecebido)} · {forma.quantidadePagamentos}x
                                        </Text>
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
        gap: 14,
    },
    flex: {
        flex: 1,
    },
    rotuloPequeno: {
        fontSize: 12,
        color: colors.textoSecundario,
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
    carregandoPeriodo: {
        marginVertical: 24,
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
    rotuloSecao: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    valorPrincipal: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    divisor: {
        height: 1,
        marginVertical: 4,
        backgroundColor: colors.borda,
    },
    linhaIndicadores: {
        flexDirection: 'row',
        gap: 12,
    },
    indicador: {
        flex: 1,
        gap: 2,
    },
    valorIndicador: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    detalheSelecao: {
        gap: 2,
    },
    valorSelecao: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    dica: {
        fontSize: 12,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    dicaPeriodo: {
        fontSize: 13,
        color: colors.textoSecundario,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    linhaResumo: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borda,
    },
    itemResumo: {
        flex: 1,
        gap: 2,
    },
    valorResumo: {
        fontSize: 14,
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
        minWidth: 92,
        fontSize: 12,
        color: colors.textoSecundario,
        textAlign: 'right',
    },
});
