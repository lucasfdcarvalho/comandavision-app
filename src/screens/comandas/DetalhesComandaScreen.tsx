import { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, Alert, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { ComandaDetalhada } from "../../types/Comanda";
import { Pagamento, ResumoPagamentos } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { formatarMoeda, formatarDataHora } from "../../utils/formatadores";
import { avaliarSaldoPagamento, centavosParaMoeda } from "../../utils/saldoPagamento";
import { ICONE_FORMA, ROTULO_FORMA } from "../../utils/formaPagamento";
import { StatusBadge } from "../../components/StatusBadge";
import { MensagemErro } from "../../components/MensagemErro";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";

type Props = NativeStackScreenProps<ComandasStackParamList, 'DetalhesComanda'>;

type AcaoComanda = 'fechar' | 'cancelar' | null;

const ROTULO_STATUS_PAGAMENTO: Partial<Record<Pagamento['status'], string>> = {
    ESTORNADO: 'Estornado',
    PENDENTE: 'Pendente',
    CANCELADO: 'Cancelado',
};

export function DetalhesComandaScreen({ route, navigation }: Props) {
    const { comandaId } = route.params;

    const [comanda, setComanda] = useState<ComandaDetalhada | null>(null);
    const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
    const [resumoPagamentos, setResumoPagamentos] = useState<ResumoPagamentos | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemErroAcao, setMensagemErroAcao] = useState('');
    const [mensagemErroPagamentos, setMensagemErroPagamentos] = useState('');
    const [acaoEmAndamento, setAcaoEmAndamento] = useState<AcaoComanda>(null);
    const [estornandoId, setEstornandoId] = useState<number | null>(null);

    const carregarComanda = useCallback(async (): Promise<ComandaDetalhada | null> => {
        try {
            setCarregando(true);
            setMensagemErro('');
            const dados = await apiService.buscarComanda(comandaId);
            setComanda(dados);
            return dados;
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar a comanda';
            setMensagemErro(mensagem);
            return null;
        } finally {
            setCarregando(false);
        }
    }, [comandaId]);

    const carregarPagamentos = useCallback(async () => {
        try {
            setMensagemErroPagamentos('');
            const [dadosPagamentos, dadosResumo] = await Promise.all([
                apiService.listarPagamentos(comandaId),
                apiService.buscarResumoPagamentos(comandaId),
            ]);
            setPagamentos(dadosPagamentos);
            setResumoPagamentos(dadosResumo);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar os pagamentos';
            setMensagemErroPagamentos(mensagem);
        }
    }, [comandaId]);

    useFocusEffect(
        useCallback(() => {
            let cancelado = false;

            (async () => {
                const dados = await carregarComanda();
                if (cancelado) {
                    return;
                }
                // A API só permite pagamentos depois que a comanda deixa de estar ABERTA
                // (ver "não pode receber pagamentos" retornado pelo endpoint de pagamentos).
                // Consultar o resumo enquanto ABERTA retorna dados que não representam a
                // comanda ainda em edição, então nem buscamos nesse estado.
                if (dados && dados.status !== 'ABERTA') {
                    await carregarPagamentos();
                } else {
                    setPagamentos([]);
                    setResumoPagamentos(null);
                }
            })();

            return () => {
                cancelado = true;
            };
        }, [carregarComanda, carregarPagamentos])
    );

    const comandaAberta = comanda?.status === 'ABERTA';
    const comandaCancelada = comanda?.status === 'CANCELADA';
    const comandaSemItens = comandaAberta && (comanda?.itens.length ?? 0) === 0;
    const saldo = comanda ? avaliarSaldoPagamento(comanda.total, resumoPagamentos) : { disponivel: false as const };

    function confirmarFechamento() {
        Alert.alert(
            'Fechar comanda',
            'Deseja fechar esta comanda? Os itens deixarão de ser editáveis e você poderá registrar o pagamento em seguida.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Fechar', onPress: fechar },
            ]
        );
    }

    async function fechar() {
        setMensagemErroAcao('');
        try {
            setAcaoEmAndamento('fechar');
            const atualizada = await apiService.fecharComanda(comandaId);
            setComanda(atualizada);
            await carregarPagamentos();
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível fechar a comanda';
            setMensagemErroAcao(mensagem);
        } finally {
            setAcaoEmAndamento(null);
        }
    }

    function confirmarCancelamento() {
        Alert.alert(
            'Cancelar comanda',
            'Deseja cancelar esta comanda? Essa ação não pode ser desfeita.',
            [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Cancelar comanda', style: 'destructive', onPress: cancelar },
            ]
        );
    }

    async function cancelar() {
        setMensagemErroAcao('');
        try {
            setAcaoEmAndamento('cancelar');
            const atualizada = await apiService.cancelarComanda(comandaId);
            setComanda(atualizada);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível cancelar a comanda';
            setMensagemErroAcao(mensagem);
        } finally {
            setAcaoEmAndamento(null);
        }
    }

    function confirmarEstorno(pagamento: Pagamento) {
        Alert.alert(
            'Estornar pagamento',
            `Deseja estornar o pagamento de ${formatarMoeda(pagamento.valor)} (${ROTULO_FORMA[pagamento.forma]})?`,
            [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Estornar', style: 'destructive', onPress: () => estornar(pagamento.id) },
            ]
        );
    }

    async function estornar(pagamentoId: number) {
        setMensagemErroPagamentos('');
        try {
            setEstornandoId(pagamentoId);
            await apiService.estornarPagamento(comandaId, pagamentoId);
            await carregarPagamentos();
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível estornar o pagamento';
            setMensagemErroPagamentos(mensagem);
        } finally {
            setEstornandoId(null);
        }
    }

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: comandaAberta
                ? () => (
                    <Pressable
                        style={styles.botaoHeaderComIcone}
                        onPress={() => navigation.navigate('AdicionarItem', { comandaId })}>
                        <Feather name="plus-circle" size={16} color={colors.laranja} />
                        <Text style={styles.botaoHeader}>Item</Text>
                    </Pressable>
                )
                : undefined,
        });
    }, [navigation, comandaId, comandaAberta]);

    if (carregando) {
        return <LoadingState />;
    }

    if (!comanda) {
        return <ErrorState texto={mensagemErro || 'Comanda não encontrada'} aoTentarNovamente={carregarComanda} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.cabecalho}>
                <Text style={styles.identificacao}>{comanda.identificacao}</Text>
                <StatusBadge status={comanda.status} />
            </View>

            {mensagemErro ? <View style={styles.avisoRecarregamento}><MensagemErro texto={mensagemErro} /></View> : null}
            {comanda.observacao ? <Text style={styles.observacao}>{comanda.observacao}</Text> : null}

            <FlatList
                style={styles.lista}
                data={comanda.itens}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listaConteudo}
                ListEmptyComponent={<EmptyState texto="Nenhum item adicionado" />}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.itemCartao}
                        disabled={!comandaAberta}
                        onPress={() => navigation.navigate('EditarItem', {
                            comandaId,
                            itemId: item.id,
                            produtoNome: item.produtoNome,
                            precoUnitario: item.precoUnitario,
                            quantidadeAtual: item.quantidade,
                            observacaoAtual: item.observacao,
                        })}>
                        <View style={styles.itemLinha}>
                            <Text style={styles.itemNome}>{item.quantidade}x {item.produtoNome}</Text>
                            <View style={styles.itemValores}>
                                <Text style={styles.itemSubtotal}>{formatarMoeda(item.subtotal)}</Text>
                                {comandaAberta ? <Feather name="edit-2" size={14} color={colors.textoSecundario} /> : null}
                            </View>
                        </View>
                        <Text style={styles.itemPrecoUnitario}>{formatarMoeda(item.precoUnitario)} cada</Text>
                        {item.observacao ? <Text style={styles.itemObservacao}>{item.observacao}</Text> : null}
                    </Pressable>
                )}
                ListFooterComponent={
                    <View>
                        <View style={styles.totalLinha}>
                            <Text style={styles.totalRotulo}>Total da comanda</Text>
                            <Text style={styles.totalValor}>{formatarMoeda(comanda.total)}</Text>
                        </View>

                        {comandaAberta ? (
                            <View style={styles.botaoAdicionarItemContainer}>
                                <PrimaryButton
                                    titulo="Adicionar item"
                                    icone="plus-circle"
                                    onPress={() => navigation.navigate('AdicionarItem', { comandaId })}
                                />
                            </View>
                        ) : null}

                        {!comandaCancelada ? (
                            <View style={styles.secao}>
                                <Text style={styles.secaoTitulo}>Pagamentos</Text>

                                {comandaAberta ? (
                                    <Text style={styles.textoInfoPagamento}>
                                        Feche a comanda para poder registrar pagamentos.
                                    </Text>
                                ) : saldo.disponivel ? (
                                    <View style={styles.resumoPagamentos}>
                                        <View style={styles.linhaResumo}>
                                            <Text style={styles.rotuloResumo}>Total recebido</Text>
                                            <Text style={styles.valorResumo}>{centavosParaMoeda(saldo.totalPagoCentavos)}</Text>
                                        </View>
                                        {saldo.quitado ? (
                                            <Text style={styles.restanteQuitado}>Pagamento concluído</Text>
                                        ) : (
                                            <View style={styles.linhaResumo}>
                                                <Text style={styles.rotuloResumoDestaque}>Saldo pendente</Text>
                                                <Text style={styles.restantePendente}>
                                                    {centavosParaMoeda(saldo.restanteCentavos)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={styles.textoIndisponivel}>Saldo indisponível</Text>
                                )}

                                {mensagemErroPagamentos ? <MensagemErro texto={mensagemErroPagamentos} /> : null}

                                {pagamentos.length > 0 ? (
                                    pagamentos.map((pagamento) => {
                                        const confirmado = pagamento.status === 'CONFIRMADO';
                                        return (
                                            <View key={pagamento.id} style={styles.pagamentoLinha}>
                                                <MaterialCommunityIcons
                                                    name={ICONE_FORMA[pagamento.forma]}
                                                    size={16}
                                                    color={confirmado ? colors.laranja : colors.textoSecundario}
                                                />
                                                <View style={styles.pagamentoInfo}>
                                                    <Text style={[styles.pagamentoValor, !confirmado && styles.textoEstornado]}>
                                                        {ROTULO_FORMA[pagamento.forma]} · {formatarMoeda(pagamento.valor)}
                                                    </Text>
                                                    <Text style={styles.pagamentoData}>
                                                        {formatarDataHora(pagamento.pagoEm ?? pagamento.criadoEm)}
                                                    </Text>
                                                </View>
                                                {confirmado ? (
                                                    <Pressable
                                                        onPress={() => confirmarEstorno(pagamento)}
                                                        disabled={estornandoId === pagamento.id}
                                                        hitSlop={8}>
                                                        {estornandoId === pagamento.id ? (
                                                            <ActivityIndicator size="small" color={colors.erro} />
                                                        ) : (
                                                            <Feather name="rotate-ccw" size={16} color={colors.erro} />
                                                        )}
                                                    </Pressable>
                                                ) : (
                                                    <Text style={styles.badgeEstornado}>
                                                        {ROTULO_STATUS_PAGAMENTO[pagamento.status]}
                                                    </Text>
                                                )}
                                            </View>
                                        );
                                    })
                                ) : null}

                                {!comandaAberta && !(saldo.disponivel && saldo.quitado) ? (
                                    <View style={styles.botaoRegistrarPagamentoContainer}>
                                        <PrimaryButton
                                            titulo="Registrar pagamento"
                                            icone="plus-circle"
                                            onPress={() => navigation.navigate('RegistrarPagamento', {
                                                comandaId,
                                                valorSugerido: saldo.disponivel ? saldo.restanteCentavos / 100 : 0,
                                            })}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        {comandaAberta ? (
                            <View style={styles.secao}>
                                <Text style={styles.secaoTitulo}>Ações</Text>

                                {mensagemErroAcao ? <MensagemErro texto={mensagemErroAcao} /> : null}

                                {comandaSemItens ? (
                                    <Text style={styles.avisoFechamento}>
                                        Adicione ao menos um item antes de fechar a comanda.
                                    </Text>
                                ) : null}

                                <View style={styles.acoes}>
                                    <PrimaryButton
                                        titulo="Fechar comanda"
                                        icone="lock"
                                        onPress={confirmarFechamento}
                                        disabled={acaoEmAndamento !== null || comandaSemItens}
                                        carregando={acaoEmAndamento === 'fechar'}
                                    />
                                    <SecondaryButton
                                        titulo="Cancelar comanda"
                                        icone="x-circle"
                                        onPress={confirmarCancelamento}
                                        disabled={acaoEmAndamento !== null}
                                        carregando={acaoEmAndamento === 'cancelar'}
                                    />
                                </View>
                            </View>
                        ) : null}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    botaoHeaderComIcone: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    botaoHeader: {
        color: colors.laranja,
        fontWeight: '700',
        fontSize: 14,
    },
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    identificacao: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    observacao: {
        marginTop: 4,
        paddingHorizontal: 16,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    avisoRecarregamento: {
        marginTop: 8,
        paddingHorizontal: 16,
    },
    lista: {
        flex: 1,
        marginTop: 12,
    },
    listaConteudo: {
        padding: 16,
        gap: 12,
    },
    itemCartao: {
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    itemLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemNome: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    itemValores: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemSubtotal: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    itemPrecoUnitario: {
        marginTop: 2,
        fontSize: 12,
        color: colors.textoSecundario,
    },
    itemObservacao: {
        marginTop: 4,
        fontSize: 13,
        color: colors.textoSecundario,
    },
    totalLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.borda,
        backgroundColor: colors.superficie,
    },
    totalRotulo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    totalValor: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.laranja,
    },
    botaoAdicionarItemContainer: {
        marginTop: 12,
        marginHorizontal: 16,
    },
    secao: {
        marginTop: 16,
        marginHorizontal: 16,
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
    textoInfoPagamento: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
    textoIndisponivel: {
        fontSize: 14,
        fontStyle: 'italic',
        color: colors.textoSecundario,
    },
    resumoPagamentos: {
        gap: 6,
    },
    linhaResumo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rotuloResumo: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    rotuloResumoDestaque: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    valorResumo: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    restantePendente: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.erro,
    },
    restanteQuitado: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.sucesso,
    },
    pagamentoLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    pagamentoInfo: {
        flex: 1,
    },
    pagamentoValor: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    pagamentoData: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    textoEstornado: {
        textDecorationLine: 'line-through',
        color: colors.textoSecundario,
    },
    badgeEstornado: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textoSecundario,
    },
    botaoRegistrarPagamentoContainer: {
        marginTop: 4,
    },
    avisoFechamento: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    acoes: {
        gap: 10,
    },
});
