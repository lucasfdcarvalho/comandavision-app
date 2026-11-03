import { useDialogo } from "../../contexts/DialogoContext";
import { useCallback, useLayoutEffect, useState } from "react";
import { View, FlatList, ActivityIndicator, Pressable, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "../../components/ui/Texto";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { useAuth } from "../../hooks/useAuth";
import { apiService } from "../../services/apiService";
import { ComandaDetalhada } from "../../types/Comanda";
import { Pagamento, ResumoPagamentos } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { raio, sombras } from "../../theme/tokens";
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
import { ProdutoImagem } from "../../components/ProdutoImagem";

type Props = NativeStackScreenProps<ComandasStackParamList, 'DetalhesComanda'>;

type AcaoComanda = 'fechar' | 'cancelar' | null;

const ROTULO_STATUS_PAGAMENTO: Partial<Record<Pagamento['status'], string>> = {
    ESTORNADO: 'Estornado',
    PENDENTE: 'Pendente',
    CANCELADO: 'Cancelado',
};

export function DetalhesComandaScreen({ route, navigation }: Props) {
    const { alertar } = useDialogo();
    const { comandaId } = route.params;
    const { usuario } = useAuth();
    const ehDono = usuario?.papel === 'DONO';

    const [comanda, setComanda] = useState<ComandaDetalhada | null>(null);
    const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
    const [resumoPagamentos, setResumoPagamentos] = useState<ResumoPagamentos | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemErroAcao, setMensagemErroAcao] = useState('');
    const [mensagemErroPagamentos, setMensagemErroPagamentos] = useState('');
    const [acaoEmAndamento, setAcaoEmAndamento] = useState<AcaoComanda>(null);
    const [corrigindoId, setCorrigindoId] = useState<number | null>(null);
    const [pagamentoEmCorrecao, setPagamentoEmCorrecao] = useState<Pagamento | null>(null);
    const [motivoCorrecao, setMotivoCorrecao] = useState('');
    const [erroMotivoCorrecao, setErroMotivoCorrecao] = useState('');

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
        alertar(
            'Fechar comanda',
            'Deseja fechar esta comanda? Os itens deixarão de ser editáveis e você poderá registrar o pagamento em seguida.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Fechar comanda', onPress: fechar },
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
        alertar(
            'Cancelar comanda',
            'Deseja cancelar esta comanda? Essa ação não pode ser desfeita.',
            [
                { text: 'Manter comanda', style: 'cancel' },
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

    function abrirCorrecao(pagamento: Pagamento) {
        setPagamentoEmCorrecao(pagamento);
        setMotivoCorrecao('');
        setErroMotivoCorrecao('');
    }

    function fecharCorrecao() {
        if (corrigindoId !== null) return;
        setPagamentoEmCorrecao(null);
        setMotivoCorrecao('');
        setErroMotivoCorrecao('');
    }

    function orientarDevolucaoPix() {
        alertar(
            'Devolução de Pix integrado',
            'A correção local não devolve dinheiro ao cliente. Realize e confira a devolução no Mercado Pago; o ComandaVision só atualizará o estado após a confirmação do provedor.',
            [{ text: 'Entendi' }]
        );
    }

    async function corrigirRegistro() {
        if (!pagamentoEmCorrecao) return;
        const motivo = motivoCorrecao.trim();
        if (motivo.length < 5) {
            setErroMotivoCorrecao('Explique o motivo em pelo menos 5 caracteres.');
            return;
        }

        setMensagemErroPagamentos('');
        setErroMotivoCorrecao('');
        try {
            setCorrigindoId(pagamentoEmCorrecao.id);
            await apiService.corrigirPagamento(comandaId, pagamentoEmCorrecao.id, { motivo });
            setPagamentoEmCorrecao(null);
            setMotivoCorrecao('');
            await carregarPagamentos();
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível estornar o pagamento';
            setErroMotivoCorrecao(mensagem);
        } finally {
            setCorrigindoId(null);
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
        return <LoadingState variante="detalhe" />;
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
                        <ProdutoImagem imagemUrl={item.produtoImagemUrl} tamanho={44} />
                        <View style={styles.itemInfo}>
                            <View style={styles.itemLinha}>
                                <Text style={styles.itemNome}>{item.quantidade}x {item.produtoNome}</Text>
                                <View style={styles.itemValores}>
                                    <Text style={styles.itemSubtotal}>{formatarMoeda(item.subtotal)}</Text>
                                    {comandaAberta ? <Feather name="edit-2" size={14} color={colors.textoSecundario} /> : null}
                                </View>
                            </View>
                            <Text style={styles.itemPrecoUnitario}>{formatarMoeda(item.precoUnitario)} cada</Text>
                            {item.observacao ? <Text style={styles.itemObservacao}>{item.observacao}</Text> : null}
                        </View>
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
                                            <>
                                                <Text style={styles.restanteQuitado}>Pagamento concluído</Text>
                                                <View style={styles.botaoComprovanteContainer}>
                                                    <SecondaryButton
                                                        titulo="Ver comprovante"
                                                        icone="file-text"
                                                        onPress={() => navigation.navigate('Comprovante', { comandaId })}
                                                    />
                                                </View>
                                            </>
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
                                                    <Text style={[styles.pagamentoValor, (pagamento.status === 'ESTORNADO' || pagamento.status === 'CANCELADO') && styles.textoEstornado]}>
                                                        {ROTULO_FORMA[pagamento.forma]} · {formatarMoeda(pagamento.valor)}
                                                    </Text>
                                                    <Text style={styles.pagamentoData}>
                                                        {formatarDataHora(pagamento.pagoEm ?? pagamento.criadoEm)}
                                                    </Text>
                                                    {pagamento.motivoCorrecao ? (
                                                        <Text style={styles.pagamentoCorrecao}>
                                                            Correção: {pagamento.motivoCorrecao}
                                                            {pagamento.corrigidoEm ? ` • ${formatarDataHora(pagamento.corrigidoEm)}` : ''}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                                {confirmado && !pagamento.pixIntegrado ? (
                                                    <Pressable
                                                        onPress={() => abrirCorrecao(pagamento)}
                                                        disabled={corrigindoId === pagamento.id}
                                                        hitSlop={8}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Estornar pagamento">
                                                        {corrigindoId === pagamento.id ? (
                                                            <ActivityIndicator size="small" color={colors.erro} />
                                                        ) : (
                                                            <Feather name="rotate-ccw" size={16} color={colors.erro} />
                                                        )}
                                                    </Pressable>
                                                ) : confirmado && pagamento.pixIntegrado ? (
                                                    <Pressable
                                                        onPress={orientarDevolucaoPix}
                                                        hitSlop={8}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Orientações para devolução do Pix integrado">
                                                        <Feather name="info" size={17} color={colors.textoSecundario} />
                                                    </Pressable>
                                                ) : pagamento.status === 'PENDENTE' && pagamento.forma === 'PIX' ? (
                                                    // Pix aguardando pagamento: reabre a tela do QR Code.
                                                    <Pressable
                                                        onPress={() => navigation.navigate('PagamentoPix', {
                                                            comandaId,
                                                            comandaIdentificacao: comanda.identificacao,
                                                            pagamentoId: pagamento.id,
                                                        })}
                                                        style={styles.seloPixPendente}
                                                        hitSlop={8}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Ver Pix aguardando pagamento">
                                                        <Text style={styles.textoPixPendente}>Ver Pix</Text>
                                                        <Feather name="chevron-right" size={14} color={colors.laranjaTexto} />
                                                    </Pressable>
                                                ) : !confirmado ? (
                                                    <Text style={styles.badgeEstornado}>
                                                        {pagamento.status === 'ESTORNADO'
                                                            ? pagamento.motivoCorrecao ? 'Estornado' : pagamento.pixIntegrado ? 'Devolvido' : 'Anulado'
                                                            : ROTULO_STATUS_PAGAMENTO[pagamento.status]}
                                                    </Text>
                                                ) : null}
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
                                                comandaIdentificacao: comanda.identificacao,
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
                                    {ehDono ? (
                                        <SecondaryButton
                                            titulo="Cancelar comanda"
                                            icone="x-circle"
                                            onPress={confirmarCancelamento}
                                            disabled={acaoEmAndamento !== null}
                                            carregando={acaoEmAndamento === 'cancelar'}
                                        />
                                    ) : null}
                                </View>
                            </View>
                        ) : null}
                    </View>
                }
            />
            <Modal
                transparent
                animationType="fade"
                visible={pagamentoEmCorrecao !== null}
                onRequestClose={fecharCorrecao}>
                <KeyboardAvoidingView
                    style={styles.modalFundo}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={fecharCorrecao}
                        disabled={corrigindoId !== null}
                        accessible={false}
                    />
                    <View style={styles.modalCartao} accessibilityViewIsModal>
                        <Text accessibilityRole="header" style={styles.modalTitulo}>Estornar pagamento</Text>
                        <Text style={styles.modalAviso}>
                            Informe o motivo do estorno
                        </Text>
                        {pagamentoEmCorrecao ? (
                            <Text style={styles.modalPagamento}>
                                {ROTULO_FORMA[pagamentoEmCorrecao.forma]} • {formatarMoeda(pagamentoEmCorrecao.valor)}
                            </Text>
                        ) : null}
                        <TextInput
                            value={motivoCorrecao}
                            onChangeText={(texto) => {
                                setMotivoCorrecao(texto);
                                if (erroMotivoCorrecao) setErroMotivoCorrecao('');
                            }}
                            placeholder="Ex.: valor registrado na forma errada"
                            placeholderTextColor={colors.textoSecundario}
                            multiline
                            maxLength={500}
                            editable={corrigindoId === null}
                            autoFocus
                            accessibilityLabel="Motivo da correção"
                            style={styles.campoMotivo}
                        />
                        <Text style={styles.contadorMotivo}>{motivoCorrecao.length}/500</Text>
                        {erroMotivoCorrecao ? <MensagemErro texto={erroMotivoCorrecao} /> : null}
                        <View style={styles.modalAcoes}>
                            <SecondaryButton
                                titulo="Voltar"
                                onPress={fecharCorrecao}
                                disabled={corrigindoId !== null}
                            />
                            <PrimaryButton
                                titulo="Estornar pagamento"
                                icone="rotate-ccw"
                                onPress={() => { void corrigirRegistro(); }}
                                disabled={motivoCorrecao.trim().length < 5 || corrigindoId !== null}
                                carregando={corrigindoId !== null}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    seloPixPendente: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingVertical: 4,
        paddingHorizontal: 10,
        backgroundColor: colors.laranjaClaro,
        borderRadius: 999,
    },
    textoPixPendente: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.laranjaTexto,
    },
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.superficie,
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        ...sombras.suave,
    },
    itemInfo: {
        flex: 1,
        minWidth: 0,
    },
    itemLinha: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    itemNome: {
        // Reserva espaço legível para o nome; o subtotal desce se não couber.
        flexBasis: 140,
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    itemValores: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '100%',
        flexShrink: 1,
        marginLeft: 'auto',
    },
    itemSubtotal: {
        flexShrink: 1,
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
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
        gap: 10,
        ...sombras.suave,
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
    botaoComprovanteContainer: {
        marginTop: 8,
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
    pagamentoCorrecao: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 17,
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
    modalFundo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(31, 31, 31, 0.5)',
    },
    modalCartao: {
        width: '100%',
        maxWidth: 420,
        padding: 20,
        gap: 12,
        borderRadius: raio.lg,
        borderTopWidth: 4,
        borderTopColor: colors.laranja,
        backgroundColor: colors.superficie,
        ...sombras.media,
    },
    modalTitulo: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    modalAviso: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.textoSecundario,
    },
    modalPagamento: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    campoMotivo: {
        minHeight: 100,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: raio.md,
        color: colors.textoPrimario,
        backgroundColor: colors.fundo,
        textAlignVertical: 'top',
    },
    contadorMotivo: {
        marginTop: -8,
        fontSize: 12,
        textAlign: 'right',
        color: colors.textoSecundario,
    },
    modalAcoes: {
        gap: 10,
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
