import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, RefreshControl, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { MensagemErro } from "../../components/MensagemErro";
import { colors } from "../../theme/colors";
import { formatarMoeda, paraDataISOBrasil, subtrairDiasData } from "../../utils/formatadores";
import { ICONE_FORMA, ROTULO_FORMA } from "../../utils/formaPagamento";
import { ResumoDashboard, ProdutoMaisVendido, FormaPagamentoResumo, FaturamentoDiario } from "../../types/Dashboard";
import { GraficoLinhaFaturamento } from "../../components/GraficoLinhaFaturamento";

type Props = NativeStackScreenProps<GestaoStackParamList, 'Dashboard'>;

type ChavePeriodo = 'hoje' | '7dias' | '30dias' | 'mes';

const PERIODOS: { chave: ChavePeriodo; rotulo: string }[] = [
    { chave: 'hoje', rotulo: 'Hoje' },
    { chave: '7dias', rotulo: '7 dias' },
    { chave: '30dias', rotulo: '30 dias' },
    { chave: 'mes', rotulo: 'Este mês' },
];

// O backend calcula o período em America/Sao_Paulo. Se calculássemos "hoje" com o
// relógio/fuso do próprio dispositivo, um emulador ou celular configurado em outro
// fuso mandaria a data errada e o filtro "Hoje" voltaria vazio mesmo havendo vendas.
function calcularPeriodo(chave: ChavePeriodo): { inicio: string; fim: string } {
    const fim = paraDataISOBrasil(new Date());

    if (chave === 'hoje') {
        return { inicio: fim, fim };
    }
    if (chave === '7dias') {
        return { inicio: subtrairDiasData(fim, 6), fim };
    }
    if (chave === '30dias') {
        return { inicio: subtrairDiasData(fim, 29), fim };
    }

    const [ano, mes] = fim.split('-');
    return { inicio: `${ano}-${mes}-01`, fim };
}

export function DashboardScreen({ navigation }: Props) {
    const [periodo, setPeriodo] = useState<ChavePeriodo>('30dias');
    const [carregando, setCarregando] = useState(true);
    const [carregandoPeriodo, setCarregandoPeriodo] = useState(false);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemErroPeriodo, setMensagemErroPeriodo] = useState('');

    const [contagem, setContagem] = useState({ abertas: 0, fechadas: 0, canceladas: 0 });
    const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
    const [produtos, setProdutos] = useState<ProdutoMaisVendido[]>([]);
    const [formas, setFormas] = useState<FormaPagamentoResumo[]>([]);
    const [faturamentoDiario, setFaturamentoDiario] = useState<FaturamentoDiario[]>([]);

    const carregarSnapshot = useCallback(async () => {
        try {
            setMensagemErro('');
            const comandas = await apiService.listarComandas();
            setContagem({
                abertas: comandas.filter((c) => c.status === 'ABERTA').length,
                fechadas: comandas.filter((c) => c.status === 'FECHADA').length,
                canceladas: comandas.filter((c) => c.status === 'CANCELADA').length,
            });
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar o resumo';
            setMensagemErro(mensagem);
        }
    }, []);

    const carregarPeriodo = useCallback(async (chave: ChavePeriodo) => {
        const { inicio, fim } = calcularPeriodo(chave);
        try {
            setMensagemErroPeriodo('');
            const [resumoDados, produtosDados, formasDados, faturamentoDados] = await Promise.all([
                apiService.buscarResumoDashboard(inicio, fim),
                apiService.listarProdutosMaisVendidos(inicio, fim, 5),
                apiService.listarFormasPagamento(inicio, fim),
                apiService.listarFaturamentoDiario(inicio, fim),
            ]);
            setResumo(resumoDados);
            setProdutos(produtosDados);
            setFormas(formasDados);
            setFaturamentoDiario(faturamentoDados);
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
                await Promise.all([carregarSnapshot(), carregarPeriodo(periodoRef.current)]);
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarSnapshot, carregarPeriodo])
    );

    async function selecionarPeriodo(chave: ChavePeriodo) {
        setPeriodo(chave);
        setCarregandoPeriodo(true);
        await carregarPeriodo(chave);
        setCarregandoPeriodo(false);
    }

    async function atualizar() {
        setAtualizando(true);
        await Promise.all([carregarSnapshot(), carregarPeriodo(periodo)]);
        setAtualizando(false);
    }

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarSnapshot} />;
    }

    const DIAS_EXIBIDOS_NO_GRAFICO = 14;
    const temFaturamentoNoPeriodo = faturamentoDiario.some((dia) => (dia.faturamento ?? 0) > 0);
    const diasExibidos = faturamentoDiario.length > DIAS_EXIBIDOS_NO_GRAFICO
        ? faturamentoDiario.slice(-DIAS_EXIBIDOS_NO_GRAFICO)
        : faturamentoDiario;
    const totalExibido = diasExibidos.reduce((soma, dia) => soma + (dia.faturamento ?? 0), 0);
    const melhorDia = diasExibidos.reduce<FaturamentoDiario | null>((melhor, atual) => {
        if (!melhor || (atual.faturamento ?? 0) > (melhor.faturamento ?? 0)) {
            return atual;
        }
        return melhor;
    }, null);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}>
            <Text style={styles.titulo}>Agora</Text>
            <View style={styles.linhaCartoes}>
                <View style={styles.cartao}>
                    <Feather name="unlock" size={20} color={colors.status.aberta} />
                    <Text style={[styles.valorCartao, { color: colors.status.aberta }]}>{contagem.abertas}</Text>
                    <Text style={styles.rotuloCartao}>Abertas</Text>
                </View>
                <View style={styles.cartao}>
                    <Feather name="check-circle" size={20} color={colors.status.fechada} />
                    <Text style={[styles.valorCartao, { color: colors.status.fechada }]}>{contagem.fechadas}</Text>
                    <Text style={styles.rotuloCartao}>Fechadas</Text>
                </View>
                <View style={styles.cartao}>
                    <Feather name="x-circle" size={20} color={colors.status.cancelada} />
                    <Text style={[styles.valorCartao, { color: colors.status.cancelada }]}>{contagem.canceladas}</Text>
                    <Text style={styles.rotuloCartao}>Canceladas</Text>
                </View>
            </View>

            <Pressable
                style={({ pressed }) => [styles.cartaoCardapio, pressed && styles.cartaoCardapioPressionado]}
                onPress={() => navigation.navigate('Catalogo')}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar cardápio">
                <View style={styles.iconeCardapio}>
                    <Feather name="book-open" size={22} color={colors.laranja} />
                </View>
                <View style={styles.infoCardapio}>
                    <Text style={styles.tituloCardapio}>Gerenciar cardápio</Text>
                    <Text style={styles.subtituloCardapio}>Categorias, produtos, preços e disponibilidade</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textoSecundario} />
            </Pressable>

            <View style={styles.periodos}>
                {PERIODOS.map((opcao) => {
                    const selecionado = opcao.chave === periodo;
                    return (
                        <Pressable
                            key={opcao.chave}
                            onPress={() => selecionarPeriodo(opcao.chave)}
                            disabled={carregandoPeriodo}
                            style={[styles.botaoPeriodo, selecionado && styles.botaoPeriodoSelecionado]}>
                            <Text style={[styles.textoBotaoPeriodo, selecionado && styles.textoBotaoPeriodoSelecionado]}>
                                {opcao.rotulo}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {carregandoPeriodo ? (
                <ActivityIndicator color={colors.laranja} />
            ) : mensagemErroPeriodo ? (
                <MensagemErro texto={mensagemErroPeriodo} />
            ) : (
                <>
                    <View style={styles.linhaCartoes}>
                        <View style={styles.cartao}>
                            <Feather name="dollar-sign" size={20} color={colors.laranja} />
                            <Text style={styles.valorCartao}>{formatarMoeda(resumo?.faturamento ?? 0)}</Text>
                            <Text style={styles.rotuloCartao}>Faturamento</Text>
                        </View>
                        <View style={styles.cartao}>
                            <Feather name="shopping-bag" size={20} color={colors.laranja} />
                            <Text style={styles.valorCartao}>{resumo?.quantidadeVendas ?? 0}</Text>
                            <Text style={styles.rotuloCartao}>Vendas</Text>
                        </View>
                        <View style={styles.cartao}>
                            <Feather name="trending-up" size={20} color={colors.laranja} />
                            <Text style={styles.valorCartao}>{formatarMoeda(resumo?.ticketMedio ?? 0)}</Text>
                            <Text style={styles.rotuloCartao}>Ticket médio</Text>
                        </View>
                    </View>

                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Produtos mais vendidos</Text>
                        {produtos.length === 0 ? (
                            <Text style={styles.textoVazio}>Nenhuma venda no período</Text>
                        ) : (
                            produtos.map((produto) => (
                                <View key={produto.produtoId} style={styles.linhaProduto}>
                                    <Text style={styles.nomeProduto} numberOfLines={1}>{produto.produtoNome}</Text>
                                    <Text style={styles.quantidadeProduto}>{produto.quantidadeVendida}x</Text>
                                    <Text style={styles.totalProduto}>{formatarMoeda(produto.faturamento)}</Text>
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
                                <View key={forma.forma} style={styles.linhaForma}>
                                    <MaterialCommunityIcons name={ICONE_FORMA[forma.forma]} size={16} color={colors.laranja} />
                                    <Text style={styles.rotuloForma}>{ROTULO_FORMA[forma.forma]}</Text>
                                    <Text style={styles.quantidadeForma}>{forma.quantidadePagamentos}x</Text>
                                    <Text style={styles.totalForma}>{formatarMoeda(forma.valorRecebido)}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    <View style={styles.secao}>
                        <Text style={styles.secaoTitulo}>Faturamento diário</Text>
                        {faturamentoDiario.length === 0 || !temFaturamentoNoPeriodo ? (
                            <Text style={styles.textoVazio}>Nenhum faturamento registrado no período</Text>
                        ) : (
                            <>
                                {faturamentoDiario.length > DIAS_EXIBIDOS_NO_GRAFICO ? (
                                    <Text style={styles.textoAvisoCompacto}>
                                        Mostrando os últimos {DIAS_EXIBIDOS_NO_GRAFICO} dias
                                    </Text>
                                ) : null}

                                <GraficoLinhaFaturamento
                                    pontos={diasExibidos.map((dia) => ({
                                        rotulo: `${dia.data.slice(8, 10)}/${dia.data.slice(5, 7)}`,
                                        valor: dia.faturamento ?? 0,
                                    }))}
                                />

                                <View style={styles.resumoGrafico}>
                                    <Text style={styles.textoResumoGrafico}>
                                        Total no período: <Text style={styles.textoResumoGraficoDestaque}>{formatarMoeda(totalExibido)}</Text>
                                    </Text>
                                    {melhorDia ? (
                                        <Text style={styles.textoResumoGrafico}>
                                            Melhor dia: {melhorDia.data.slice(8, 10)}/{melhorDia.data.slice(5, 7)} —{' '}
                                            <Text style={styles.textoResumoGraficoDestaque}>{formatarMoeda(melhorDia.faturamento)}</Text>
                                        </Text>
                                    ) : null}
                                </View>
                            </>
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
        gap: 16,
    },
    titulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    linhaCartoes: {
        flexDirection: 'row',
        gap: 12,
    },
    cartao: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 16,
        paddingHorizontal: 4,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    valorCartao: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
        textAlign: 'center',
    },
    rotuloCartao: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    cartaoCardapio: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    cartaoCardapioPressionado: {
        opacity: 0.8,
    },
    iconeCardapio: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
        borderRadius: 10,
    },
    infoCardapio: {
        flex: 1,
    },
    tituloCardapio: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    subtituloCardapio: {
        marginTop: 2,
        fontSize: 13,
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
    textoVazio: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
    textoAvisoCompacto: {
        fontSize: 12,
        fontStyle: 'italic',
        color: colors.textoSecundario,
    },
    linhaProduto: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    nomeProduto: {
        flex: 1,
        fontSize: 14,
        color: colors.textoPrimario,
    },
    quantidadeProduto: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    totalProduto: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
        minWidth: 80,
        textAlign: 'right',
    },
    linhaForma: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rotuloForma: {
        flex: 1,
        fontSize: 14,
        color: colors.textoPrimario,
    },
    quantidadeForma: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    totalForma: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
        minWidth: 80,
        textAlign: 'right',
    },
    resumoGrafico: {
        marginTop: 4,
        gap: 2,
    },
    textoResumoGrafico: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    textoResumoGraficoDestaque: {
        fontWeight: '700',
        color: colors.textoPrimario,
    },
});
