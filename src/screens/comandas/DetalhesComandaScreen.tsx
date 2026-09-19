import { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, Alert, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { ComandaDetalhada } from "../../types/Comanda";
import { Pagamento, FormaPagamento } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { StatusBadge } from "../../components/StatusBadge";
import { MensagemErro } from "../../components/MensagemErro";

type Props = NativeStackScreenProps<ComandasStackParamList, 'DetalhesComanda'>;

function formatarMoeda(valor: number): string {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const ICONE_FORMA: Record<FormaPagamento, keyof typeof Feather.glyphMap> = {
    PIX: 'zap',
    DINHEIRO: 'dollar-sign',
    DEBITO: 'credit-card',
    CREDITO: 'repeat',
};

const ROTULO_FORMA: Record<FormaPagamento, string> = {
    PIX: 'Pix',
    DINHEIRO: 'Dinheiro',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
};

export function DetalhesComandaScreen({ route, navigation }: Props) {
    const { comandaId } = route.params;

    const [comanda, setComanda] = useState<ComandaDetalhada | null>(null);
    const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemErroPagamentos, setMensagemErroPagamentos] = useState('');
    const [processandoAcao, setProcessandoAcao] = useState(false);
    const [estornandoId, setEstornandoId] = useState<number | null>(null);

    const carregarComanda = useCallback(async () => {
        try {
            setCarregando(true);
            setMensagemErro('');
            const dados = await apiService.buscarComanda(comandaId);
            setComanda(dados);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar a comanda';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }, [comandaId]);

    const carregarPagamentos = useCallback(async () => {
        try {
            setMensagemErroPagamentos('');
            const dados = await apiService.listarPagamentos(comandaId);
            setPagamentos(dados);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar os pagamentos';
            setMensagemErroPagamentos(mensagem);
        }
    }, [comandaId]);

    useFocusEffect(
        useCallback(() => {
            carregarComanda();
            carregarPagamentos();
        }, [carregarComanda, carregarPagamentos])
    );

    const comandaAberta = comanda?.status === 'ABERTA';

    const totalPago = pagamentos
        .filter((pagamento) => !pagamento.estornado)
        .reduce((soma, pagamento) => soma + pagamento.valor, 0);
    const restante = comanda ? Math.max(0, Math.round((comanda.total - totalPago) * 100) / 100) : 0;

    function confirmarFechamento() {
        Alert.alert(
            'Fechar comanda',
            'Deseja fechar esta comanda? Depois de fechada, os itens não podem mais ser editados.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Fechar', onPress: fechar },
            ]
        );
    }

    async function fechar() {
        setMensagemErro('');
        try {
            setProcessandoAcao(true);
            const atualizada = await apiService.fecharComanda(comandaId);
            setComanda(atualizada);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível fechar a comanda';
            setMensagemErro(mensagem);
        } finally {
            setProcessandoAcao(false);
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
        setMensagemErro('');
        try {
            setProcessandoAcao(true);
            const atualizada = await apiService.cancelarComanda(comandaId);
            setComanda(atualizada);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível cancelar a comanda';
            setMensagemErro(mensagem);
        } finally {
            setProcessandoAcao(false);
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
        return (
            <View style={styles.centro}>
                <ActivityIndicator size="large" color={colors.laranja} />
            </View>
        );
    }

    if (mensagemErro || !comanda) {
        return (
            <View style={styles.centro}>
                <MensagemErro texto={mensagemErro || 'Comanda não encontrada'} />
                <Pressable style={styles.botaoTentarNovamente} onPress={carregarComanda}>
                    <Text style={styles.textoBotaoTentarNovamente}>Tentar novamente</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.cabecalho}>
                <Text style={styles.identificacao}>{comanda.identificacao}</Text>
                <StatusBadge status={comanda.status} />
            </View>

            {comanda.observacao ? <Text style={styles.observacao}>{comanda.observacao}</Text> : null}

            <FlatList
                style={styles.lista}
                data={comanda.itens}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listaConteudo}
                ListEmptyComponent={<Text style={styles.textoVazio}>Nenhum item adicionado</Text>}
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
                        {item.observacao ? <Text style={styles.itemObservacao}>{item.observacao}</Text> : null}
                    </Pressable>
                )}
                ListFooterComponent={
                    <View>
                        <View style={styles.totalLinha}>
                            <Text style={styles.totalRotulo}>Total</Text>
                            <Text style={styles.totalValor}>{formatarMoeda(comanda.total)}</Text>
                        </View>

                        <View style={styles.secao}>
                            <View style={styles.secaoCabecalho}>
                                <Text style={styles.secaoTitulo}>Pagamentos</Text>
                                <Text style={restante > 0 ? styles.restantePendente : styles.restanteQuitado}>
                                    {restante > 0 ? `Restam ${formatarMoeda(restante)}` : 'Quitado'}
                                </Text>
                            </View>

                            {mensagemErroPagamentos ? <MensagemErro texto={mensagemErroPagamentos} /> : null}

                            {pagamentos.length === 0 ? (
                                <Text style={styles.textoVazioPequeno}>Nenhum pagamento registrado</Text>
                            ) : (
                                pagamentos.map((pagamento) => (
                                    <View key={pagamento.id} style={styles.pagamentoLinha}>
                                        <Feather
                                            name={ICONE_FORMA[pagamento.forma]}
                                            size={16}
                                            color={pagamento.estornado ? colors.textoSecundario : colors.laranja}
                                        />
                                        <View style={styles.pagamentoInfo}>
                                            <Text style={[styles.pagamentoValor, pagamento.estornado && styles.textoEstornado]}>
                                                {ROTULO_FORMA[pagamento.forma]} · {formatarMoeda(pagamento.valor)}
                                            </Text>
                                            <Text style={styles.pagamentoData}>{formatarData(pagamento.criadoEm)}</Text>
                                        </View>
                                        {pagamento.estornado ? (
                                            <Text style={styles.badgeEstornado}>Estornado</Text>
                                        ) : (
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
                                        )}
                                    </View>
                                ))
                            )}

                            {comandaAberta ? (
                                <Pressable
                                    style={styles.botaoRegistrarPagamento}
                                    onPress={() => navigation.navigate('RegistrarPagamento', { comandaId, valorSugerido: restante })}>
                                    <Feather name="plus-circle" size={16} color={colors.laranja} />
                                    <Text style={styles.textoBotaoRegistrarPagamento}>Registrar pagamento</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        {comandaAberta ? (
                            <View style={styles.secao}>
                                <Text style={styles.secaoTitulo}>Ações</Text>
                                <View style={styles.acoes}>
                                    <Pressable
                                        style={[styles.botaoAcao, styles.botaoFechar, processandoAcao && styles.botaoDesabilitado]}
                                        onPress={confirmarFechamento}
                                        disabled={processandoAcao}>
                                        <Feather name="lock" size={16} color={colors.superficie} />
                                        <Text style={styles.textoBotaoFechar}>Fechar comanda</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.botaoAcao, styles.botaoCancelar, processandoAcao && styles.botaoDesabilitado]}
                                        onPress={confirmarCancelamento}
                                        disabled={processandoAcao}>
                                        <Feather name="x-circle" size={16} color={colors.erro} />
                                        <Text style={styles.textoBotaoCancelar}>Cancelar comanda</Text>
                                    </Pressable>
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
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 24,
        backgroundColor: colors.fundo,
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
    lista: {
        flex: 1,
        marginTop: 12,
    },
    listaConteudo: {
        padding: 16,
        gap: 12,
    },
    textoVazio: {
        color: colors.textoSecundario,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 24,
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
    secaoCabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    secaoTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    restantePendente: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.erro,
    },
    restanteQuitado: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.status.aberta,
    },
    textoVazioPequeno: {
        fontSize: 14,
        color: colors.textoSecundario,
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
    botaoRegistrarPagamento: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.laranja,
        borderRadius: 8,
    },
    textoBotaoRegistrarPagamento: {
        color: colors.laranja,
        fontSize: 14,
        fontWeight: '700',
    },
    acoes: {
        gap: 10,
    },
    botaoAcao: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        borderRadius: 8,
    },
    botaoDesabilitado: {
        opacity: 0.6,
    },
    botaoFechar: {
        backgroundColor: colors.textoPrimario,
    },
    textoBotaoFechar: {
        color: colors.superficie,
        fontSize: 15,
        fontWeight: '700',
    },
    botaoCancelar: {
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.erro,
    },
    textoBotaoCancelar: {
        color: colors.erro,
        fontSize: 15,
        fontWeight: '700',
    },
});
