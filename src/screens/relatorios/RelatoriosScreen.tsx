import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "../../components/ui/Texto";
import { Cartao } from "../../components/ui/Cartao";
import { CartaoIndicador } from "../../components/dashboard/CartaoIndicador";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AparecerSuave } from "../../components/ui/AparecerSuave";
import { useDialogo } from "../../contexts/DialogoContext";
import { ehErroApiStatus } from "../../services/apiClient";
import { apiService } from "../../services/apiService";
import { relatorioService } from "../../services/relatorioService";
import type { DadosRelatorioGerencial } from "../../types/Relatorio";
import { colors } from "../../theme/colors";
import { espacamento, raio, tipografia } from "../../theme/tokens";
import {
    ChavePeriodo,
    PERIODOS,
    calcularPercentuaisFechandoCem,
    calcularPeriodo,
    formatarPercentualParticipacao,
} from "../../utils/dashboard";
import { formatarData, formatarDataHoraCompleta, formatarMoeda } from "../../utils/formatadores";
import { ROTULO_FORMA } from "../../utils/formaPagamento";
import { feedbackTatil } from "../../utils/feedbackTatil";

const LIMITE_PREVIA_COMANDAS = 5;

export function RelatoriosScreen() {
    const { alertar, mostrarSucesso } = useDialogo();
    const [periodo, setPeriodo] = useState<ChavePeriodo>('30dias');
    const [dados, setDados] = useState<DadosRelatorioGerencial | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [carregandoPeriodo, setCarregandoPeriodo] = useState(false);
    const [atualizando, setAtualizando] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarPeriodo = useCallback(async (chave: ChavePeriodo) => {
        const intervalo = calcularPeriodo(chave);
        try {
            setMensagemErro('');
            const [resumo, produtos, formasPagamento, faturamentoDiario, historico] = await Promise.all([
                apiService.buscarResumoDashboard(intervalo.inicio, intervalo.fim),
                apiService.listarProdutosMaisVendidos(intervalo.inicio, intervalo.fim, 5),
                apiService.listarFormasPagamento(intervalo.inicio, intervalo.fim),
                apiService.listarFaturamentoDiario(intervalo.inicio, intervalo.fim),
                apiService.listarComandasEncerradasRelatorio(intervalo.inicio, intervalo.fim)
                    .then((comandas) => ({ disponivel: true, comandas }))
                    .catch((error: unknown) => {
                        // Compatibilidade temporaria com a API publicada antes
                        // da criacao do endpoint de historico. Outros erros
                        // continuam interrompendo o carregamento normalmente.
                        if (ehErroApiStatus(error, 404)) {
                            return { disponivel: false, comandas: [] };
                        }
                        throw error;
                    }),
            ]);

            setDados({
                inicio: intervalo.inicio,
                fim: intervalo.fim,
                geradoEm: new Date().toISOString(),
                resumo,
                produtos,
                formasPagamento: [...formasPagamento].sort((a, b) => b.valorRecebido - a.valorRecebido),
                faturamentoDiario,
                historicoDisponivel: historico.disponivel,
                comandas: historico.comandas,
            });
        } catch (error: unknown) {
            setDados(null);
            setMensagemErro(error instanceof Error ? error.message : 'N\u00e3o foi poss\u00edvel montar o relat\u00f3rio');
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
        if (chave === periodo || carregandoPeriodo) {
            return;
        }
        feedbackTatil.selecao();
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

    async function exportarPdf() {
        if (!dados || exportando) {
            return;
        }
        setExportando(true);
        try {
            const resultado = await relatorioService.exportar({ ...dados, geradoEm: new Date().toISOString() });
            if (resultado === 'compartilhado') {
                mostrarSucesso('PDF pronto', 'O relat\u00f3rio foi gerado e aberto para compartilhamento');
            } else {
                mostrarSucesso('Relat\u00f3rio aberto', 'Use o di\u00e1logo do sistema para salvar ou imprimir o PDF');
            }
        } catch (error: unknown) {
            alertar(
                'N\u00e3o foi poss\u00edvel gerar o PDF',
                error instanceof Error ? error.message : 'Tente novamente em instantes',
                undefined,
                'erro'
            );
        } finally {
            setExportando(false);
        }
    }

    const resumoHistorico = useMemo(() => {
        const comandas = dados?.comandas ?? [];
        return {
            encerradas: comandas.length,
            computadas: comandas.filter((comanda) => comanda.computadaNosIndicadores).length,
            canceladas: comandas.filter((comanda) => comanda.status === 'CANCELADA').length,
        };
    }, [dados?.comandas]);

    const percentuaisFormas = useMemo(
        () => calcularPercentuaisFechandoCem(
            (dados?.formasPagamento ?? []).map((forma) => forma.valorRecebido)
        ),
        [dados?.formasPagamento]
    );

    if (carregando) {
        return <LoadingState variante="painel" />;
    }

    if (mensagemErro && !dados) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={() => carregarPeriodo(periodo)} />;
    }

    if (!dados) {
        return null;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}>
            <View style={styles.introducao}>
                <View style={styles.iconeIntroducao}>
                    <Feather name="file-text" size={22} color={colors.laranjaEscuro} />
                </View>
                <View style={styles.flex}>
                    <Text style={styles.titulo}>{'Relat\u00f3rio gerencial'}</Text>
                </View>
            </View>

            <View style={styles.periodos} accessibilityRole="tablist">
                {PERIODOS.map((opcao) => {
                    const selecionado = opcao.chave === periodo;
                    return (
                        <Pressable
                            key={opcao.chave}
                            onPress={() => selecionarPeriodo(opcao.chave)}
                            disabled={carregandoPeriodo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: selecionado, disabled: carregandoPeriodo }}
                            style={[styles.botaoPeriodo, selecionado && styles.botaoPeriodoSelecionado]}>
                            <Text style={[styles.textoPeriodo, selecionado && styles.textoPeriodoSelecionado]}>
                                {opcao.rotulo}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            <Text style={styles.intervalo}>{formatarData(dados.inicio)} a {formatarData(dados.fim)}</Text>

            {carregandoPeriodo ? (
                <ActivityIndicator color={colors.laranja} style={styles.carregandoPeriodo} />
            ) : (
                <AparecerSuave style={styles.blocoConteudo}>
                    <View style={styles.grade}>
                        <CartaoIndicador rotulo="Faturamento" valor={formatarMoeda(dados.resumo.faturamento)} />
                        <CartaoIndicador rotulo="Vendas" valor={String(dados.resumo.quantidadeVendas)} />
                    </View>
                    <View style={styles.grade}>
                        <CartaoIndicador rotulo={'Ticket m\u00e9dio'} valor={formatarMoeda(dados.resumo.ticketMedio)} />
                        <CartaoIndicador rotulo="Itens vendidos" valor={String(dados.resumo.quantidadeItensVendidos)} />
                    </View>

                    {dados.historicoDisponivel ? (
                    <Cartao style={styles.secao}>
                        <View style={styles.secaoCabecalho}>
                            <View style={styles.flex}>
                                <Text style={styles.secaoTitulo}>{'Hist\u00f3rico encerrado'}</Text>
                                <Text style={styles.secaoDescricao}>{`A pr\u00e9via mostra at\u00e9 ${LIMITE_PREVIA_COMANDAS}; o PDF inclui todas.`}</Text>
                            </View>
                            <View style={styles.contador}>
                                <Text style={styles.contadorTexto}>{resumoHistorico.encerradas}</Text>
                            </View>
                        </View>

                        <View style={styles.resumoHistorico}>
                            <View style={styles.resumoItem}>
                                <Text style={styles.resumoValor}>{resumoHistorico.computadas}</Text>
                                <Text style={styles.resumoRotulo}>nos indicadores</Text>
                            </View>
                            <View style={styles.divisorVertical} />
                            <View style={styles.resumoItem}>
                                <Text style={styles.resumoValor}>{resumoHistorico.canceladas}</Text>
                                <Text style={styles.resumoRotulo}>canceladas</Text>
                            </View>
                        </View>

                        {dados.comandas.length === 0 ? (
                            <View style={styles.estadoVazio}>
                                <Feather name="inbox" size={24} color={colors.textoTerciario} />
                                <Text style={styles.textoVazio}>{'Nenhuma comanda encerrada neste per\u00edodo'}</Text>
                            </View>
                        ) : (
                            dados.comandas.slice(0, LIMITE_PREVIA_COMANDAS).map((comanda) => (
                                <View key={comanda.id} style={styles.linhaComanda}>
                                    <View style={styles.flex}>
                                        <Text style={styles.comandaNome} numberOfLines={1}>{comanda.identificacao}</Text>
                                        <Text style={styles.comandaMeta}>#{comanda.id} {'\u2022'} {formatarDataHoraCompleta(comanda.encerradaEm)}</Text>
                                        <Text style={[styles.comandaCriterio, comanda.status === 'CANCELADA' && styles.textoCancelada]}>
                                            {comanda.status === 'CANCELADA'
                                                ? 'Cancelada \u2014 fora do faturamento'
                                                : comanda.computadaNosIndicadores
                                                    ? 'Computada nos indicadores'
                                                    : 'Fora dos indicadores'}
                                        </Text>
                                    </View>
                                    <Text style={styles.comandaTotal}>{formatarMoeda(comanda.total)}</Text>
                                </View>
                            ))
                        )}
                        {dados.comandas.length > LIMITE_PREVIA_COMANDAS ? (
                            <Text style={styles.maisItens}>+ {dados.comandas.length - LIMITE_PREVIA_COMANDAS} comandas no PDF</Text>
                        ) : null}
                    </Cartao>
                    ) : null}

                    <View style={styles.duasSecoes}>
                        <Cartao style={[styles.secao, styles.secaoMetade]}>
                            <Text style={styles.secaoTitulo}>Produtos</Text>
                            {dados.produtos.length === 0 ? (
                                <Text style={styles.textoVazio}>{'Nenhuma venda no per\u00edodo'}</Text>
                            ) : dados.produtos.map((produto, indice) => (
                                <View key={produto.produtoId} style={styles.linhaCompacta}>
                                    <Text style={styles.posicao}>{indice + 1}</Text>
                                    <Text style={styles.nomeCompacto} numberOfLines={1}>{produto.produtoNome}</Text>
                                    <Text style={styles.valorCompacto}>{produto.quantidadeVendida} un</Text>
                                </View>
                            ))}
                        </Cartao>

                        <Cartao style={[styles.secao, styles.secaoMetade]}>
                            <Text style={styles.secaoTitulo}>Pagamentos</Text>
                            {dados.formasPagamento.length === 0 ? (
                                <Text style={styles.textoVazio}>{'Nenhum pagamento no per\u00edodo'}</Text>
                            ) : dados.formasPagamento.map((forma, indice) => (
                                <View key={forma.forma} style={styles.linhaCompacta}>
                                    <Text style={styles.nomeCompacto}>{ROTULO_FORMA[forma.forma]}</Text>
                                    <Text style={styles.valorCompacto}>
                                        {formatarPercentualParticipacao(percentuaisFormas[indice])}
                                    </Text>
                                </View>
                            ))}
                        </Cartao>
                    </View>

                    <PrimaryButton titulo="Gerar e compartilhar PDF" icone="share-2" onPress={exportarPdf} carregando={exportando} />
                </AparecerSuave>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.fundo },
    conteudo: { padding: espacamento.lg, paddingBottom: espacamento.xxxl, gap: espacamento.md },
    flex: { flex: 1 },
    introducao: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
    iconeIntroducao: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: raio.md, backgroundColor: colors.laranjaClaro },
    titulo: { ...tipografia.titulo, color: colors.textoPrimario },
    periodos: { flexDirection: 'row', gap: espacamento.sm, marginTop: espacamento.xs },
    botaoPeriodo: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espacamento.xs, borderWidth: 1, borderColor: colors.borda, borderRadius: raio.redondo, backgroundColor: colors.superficie },
    botaoPeriodoSelecionado: { backgroundColor: colors.laranja, borderColor: colors.laranja },
    textoPeriodo: { ...tipografia.rotuloForte, color: colors.textoSecundario, textAlign: 'center' },
    textoPeriodoSelecionado: { color: colors.grafite },
    intervalo: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center' },
    carregandoPeriodo: { marginVertical: espacamento.xxxl },
    blocoConteudo: { gap: espacamento.md },
    grade: { flexDirection: 'row', gap: espacamento.md },
    secao: { gap: espacamento.md },
    secaoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
    secaoTitulo: { ...tipografia.corpoForte, color: colors.textoPrimario },
    secaoDescricao: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
    contador: { minWidth: 34, height: 34, paddingHorizontal: espacamento.sm, borderRadius: raio.redondo, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fundoSecundario },
    contadorTexto: { ...tipografia.rotuloForte, color: colors.textoPrimario },
    resumoHistorico: { flexDirection: 'row', alignItems: 'center', paddingVertical: espacamento.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borda },
    resumoItem: { flex: 1, alignItems: 'center', gap: 1 },
    resumoValor: { ...tipografia.subtitulo, ...tipografia.tabular, color: colors.textoPrimario },
    resumoRotulo: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center' },
    divisorVertical: { width: 1, height: 30, backgroundColor: colors.borda },
    estadoVazio: { alignItems: 'center', gap: espacamento.sm, paddingVertical: espacamento.xl },
    textoVazio: { ...tipografia.rotulo, color: colors.textoSecundario },
    linhaComanda: { flexDirection: 'row', alignItems: 'flex-start', gap: espacamento.md, paddingBottom: espacamento.md, borderBottomWidth: 1, borderBottomColor: colors.borda },
    comandaNome: { ...tipografia.corpoForte, color: colors.textoPrimario },
    comandaMeta: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 1 },
    comandaCriterio: { ...tipografia.legenda, color: colors.sucessoTexto, marginTop: 3 },
    textoCancelada: { color: colors.erroTexto },
    comandaTotal: { ...tipografia.corpoForte, ...tipografia.tabular, color: colors.textoPrimario },
    maisItens: { ...tipografia.legenda, color: colors.laranjaTexto, textAlign: 'center' },
    duasSecoes: { gap: espacamento.md },
    secaoMetade: { flex: 1 },
    linhaCompacta: { flexDirection: 'row', alignItems: 'center', gap: espacamento.sm },
    posicao: { width: 20, ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center' },
    nomeCompacto: { flex: 1, ...tipografia.rotulo, color: colors.textoPrimario },
    valorCompacto: { ...tipografia.rotuloForte, ...tipografia.tabular, color: colors.textoPrimario },
});
