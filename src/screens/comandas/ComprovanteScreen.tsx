import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { comprovanteService } from "../../services/comprovanteService";
import { ComandaDetalhada } from "../../types/Comanda";
import { Pagamento, ResumoPagamentos } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { formatarMoeda, formatarDataHora } from "../../utils/formatadores";
import { avaliarSaldoPagamento } from "../../utils/saldoPagamento";
import { ROTULO_FORMA } from "../../utils/formaPagamento";
import { DadosComprovante } from "../../utils/gerarComprovanteHtml";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";

type Props = NativeStackScreenProps<ComandasStackParamList, 'Comprovante'>;

// Tolerância de 1 centavo para diferenças de arredondamento entre o que a API
// calculou e o que conferimos aqui — o mesmo critério já usado em avaliarSaldoPagamento.
const TOLERANCIA_CENTAVOS = 1;

export function ComprovanteScreen({ route, navigation }: Props) {
    const { comandaId } = route.params;

    const [comanda, setComanda] = useState<ComandaDetalhada | null>(null);
    const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
    const [resumo, setResumo] = useState<ResumoPagamentos | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [mensagemErro, setMensagemErro] = useState('');

    const [gerando, setGerando] = useState(false);
    const [imprimindo, setImprimindo] = useState(false);
    const [mensagemErroAcao, setMensagemErroAcao] = useState('');
    const [avisoCompartilhamento, setAvisoCompartilhamento] = useState('');

    const carregarDados = useCallback(async () => {
        try {
            setCarregando(true);
            setMensagemErro('');
            const [comandaDados, pagamentosDados, resumoDados] = await Promise.all([
                apiService.buscarComanda(comandaId),
                apiService.listarPagamentos(comandaId),
                apiService.buscarResumoPagamentos(comandaId),
            ]);
            setComanda(comandaDados);
            setPagamentos(pagamentosDados);
            setResumo(resumoDados);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar o comprovante';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }, [comandaId]);

    useFocusEffect(
        useCallback(() => {
            carregarDados();
        }, [carregarDados])
    );

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro || !comanda) {
        return <ErrorState texto={mensagemErro || 'Comanda não encontrada'} aoTentarNovamente={carregarDados} />;
    }

    const saldo = avaliarSaldoPagamento(comanda.total, resumo);
    const pagamentosConfirmados = pagamentos.filter((pagamento) => pagamento.status === 'CONFIRMADO');
    const elegivel = comanda.status === 'FECHADA' && saldo.disponivel && saldo.quitado;

    if (!elegivel) {
        return (
            <View style={styles.centro}>
                <Feather name="alert-circle" size={40} color={colors.textoSecundario} />
                <Text style={styles.tituloCentro}>Comprovante indisponível</Text>
                <Text style={styles.textoCentro}>
                    O comprovante só fica disponível quando a comanda está fechada e o pagamento está totalmente concluído.
                </Text>
                <View style={styles.botaoCentroContainer}>
                    <SecondaryButton
                        titulo="Voltar aos detalhes"
                        onPress={() => navigation.popTo('DetalhesComanda', { comandaId })}
                    />
                </View>
            </View>
        );
    }

    // Confere quantidade x preço unitário = total da linha, e que a soma dos
    // pagamentos confirmados bate com o total recebido do resumo. Se algo não
    // fechar, não geramos um comprovante de quitação com números que podem
    // estar desatualizados/inconsistentes.
    const itensConsistentes = comanda.itens.every((item) => {
        const calculado = Math.round(item.quantidade * item.precoUnitario * 100);
        const informado = Math.round(item.subtotal * 100);
        return Math.abs(calculado - informado) <= TOLERANCIA_CENTAVOS;
    });

    const somaPagamentosCentavos = pagamentosConfirmados.reduce(
        (soma, pagamento) => soma + Math.round(pagamento.valor * 100),
        0
    );
    const pagamentosConsistentes = Math.abs(somaPagamentosCentavos - saldo.totalPagoCentavos) <= TOLERANCIA_CENTAVOS;

    if (!itensConsistentes || !pagamentosConsistentes) {
        return (
            <View style={styles.centro}>
                <Feather name="alert-triangle" size={40} color={colors.erro} />
                <Text style={styles.tituloCentro}>Dados inconsistentes</Text>
                <Text style={styles.textoCentro}>
                    Não foi possível confirmar os valores desta comanda. Atualize os dados e tente novamente.
                </Text>
                <View style={styles.botaoCentroContainer}>
                    <PrimaryButton titulo="Atualizar" onPress={carregarDados} />
                </View>
            </View>
        );
    }

    const geradoEm = new Date().toISOString();
    const dadosComprovante: DadosComprovante = {
        identificacaoComanda: comanda.identificacao,
        comandaId: comanda.id,
        fechadaEm: comanda.fechadaEm,
        itens: comanda.itens.map((item) => ({
            produtoNome: item.produtoNome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
        })),
        totalComanda: comanda.total,
        pagamentos: pagamentosConfirmados.map((pagamento) => ({ forma: pagamento.forma, valor: pagamento.valor })),
        totalRecebido: saldo.totalPagoCentavos / 100,
        geradoEm,
    };

    async function compartilhar() {
        if (gerando) {
            return;
        }
        setMensagemErroAcao('');
        setAvisoCompartilhamento('');
        try {
            setGerando(true);
            const resultado = await comprovanteService.compartilhar(dadosComprovante);
            if (!resultado.compartilhado) {
                setAvisoCompartilhamento(
                    'O compartilhamento não está disponível neste dispositivo. Você ainda pode conferir os dados aqui na tela.'
                );
            }
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível gerar o comprovante';
            setMensagemErroAcao(mensagem);
        } finally {
            setGerando(false);
        }
    }

    async function imprimir() {
        if (imprimindo) {
            return;
        }
        setMensagemErroAcao('');
        setAvisoCompartilhamento('');
        try {
            setImprimindo(true);
            await comprovanteService.imprimir(dadosComprovante);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível imprimir o comprovante';
            setMensagemErroAcao(mensagem);
        } finally {
            setImprimindo(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
            <View style={styles.cartao}>
                <View style={styles.cabecalho}>
                    <Text style={styles.marca}>SUPRI CONVENIÊNCIA</Text>
                    <Text style={styles.subtitulo}>Comprovante não fiscal</Text>
                </View>

                <View style={styles.divisor} />

                <View style={styles.linhaInfo}>
                    <Text style={styles.rotuloInfo}>Comanda</Text>
                    <Text style={styles.valorInfo}>{comanda.identificacao}</Text>
                </View>
                <View style={styles.linhaInfo}>
                    <Text style={styles.rotuloInfo}>ID</Text>
                    <Text style={styles.valorInfo}>#{comanda.id}</Text>
                </View>
                {comanda.fechadaEm ? (
                    <View style={styles.linhaInfo}>
                        <Text style={styles.rotuloInfo}>Fechada em</Text>
                        <Text style={styles.valorInfo}>{formatarDataHora(comanda.fechadaEm)}</Text>
                    </View>
                ) : null}

                <View style={styles.divisor} />

                {comanda.itens.map((item) => (
                    <View key={item.id} style={styles.linhaItem}>
                        <Text style={styles.textoItem} numberOfLines={2}>{item.quantidade}x {item.produtoNome}</Text>
                        <Text style={styles.valorItem}>{formatarMoeda(item.subtotal)}</Text>
                    </View>
                ))}

                <View style={styles.divisor} />

                <View style={styles.linhaTotal}>
                    <Text style={styles.rotuloTotal}>Total da comanda</Text>
                    <Text style={styles.valorTotal}>{formatarMoeda(comanda.total)}</Text>
                </View>

                <View style={styles.divisor} />

                <Text style={styles.tituloSecao}>Pagamentos</Text>
                {pagamentosConfirmados.map((pagamento) => (
                    <View key={pagamento.id} style={styles.linhaPagamento}>
                        <Text style={styles.textoPagamento}>{ROTULO_FORMA[pagamento.forma]}</Text>
                        <Text style={styles.textoPagamento}>{formatarMoeda(pagamento.valor)}</Text>
                    </View>
                ))}
                <View style={styles.linhaTotalRecebido}>
                    <Text style={styles.rotuloTotal}>Total recebido</Text>
                    <Text style={styles.valorTotal}>{formatarMoeda(saldo.totalPagoCentavos / 100)}</Text>
                </View>
                <Text style={styles.statusQuitado}>Pagamento concluído</Text>

                <View style={styles.divisor} />

                <Text style={styles.rodapeData}>Comprovante gerado em {formatarDataHora(geradoEm)}</Text>
                <Text style={styles.aviso}>Este documento não possui valor fiscal.</Text>
            </View>

            {mensagemErroAcao ? <View style={styles.mensagemContainer}><MensagemErro texto={mensagemErroAcao} /></View> : null}
            {avisoCompartilhamento ? <Text style={styles.avisoCompartilhamento}>{avisoCompartilhamento}</Text> : null}

            <View style={styles.acoes}>
                <PrimaryButton titulo="Compartilhar PDF" icone="share-2" onPress={compartilhar} carregando={gerando} />
                <SecondaryButton
                    titulo="Voltar aos detalhes"
                    onPress={() => navigation.popTo('DetalhesComanda', { comandaId })}
                />
                <Pressable
                    onPress={imprimir}
                    disabled={imprimindo}
                    style={styles.linkImprimir}
                    accessibilityRole="button"
                    accessibilityLabel="Imprimir comprovante">
                    {imprimindo ? (
                        <ActivityIndicator size="small" color={colors.textoSecundario} />
                    ) : (
                        <Text style={styles.textoLinkImprimir}>Imprimir</Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    conteudo: {
        padding: 20,
        gap: 16,
    },
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
        backgroundColor: colors.fundo,
    },
    tituloCentro: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    textoCentro: {
        fontSize: 14,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    botaoCentroContainer: {
        marginTop: 16,
        width: '100%',
    },
    cartao: {
        backgroundColor: colors.superficie,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borda,
        padding: 20,
    },
    cabecalho: {
        alignItems: 'center',
    },
    marca: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.laranja,
        letterSpacing: 0.5,
    },
    subtitulo: {
        marginTop: 2,
        fontSize: 13,
        color: colors.textoSecundario,
    },
    divisor: {
        borderTopWidth: 1,
        borderTopColor: colors.borda,
        borderStyle: 'dashed',
        marginVertical: 14,
    },
    linhaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    rotuloInfo: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    valorInfo: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    linhaItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        paddingVertical: 4,
    },
    textoItem: {
        flex: 1,
        fontSize: 13,
        color: colors.textoPrimario,
    },
    valorItem: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    linhaTotal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rotuloTotal: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    valorTotal: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    tituloSecao: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textoPrimario,
        marginBottom: 4,
    },
    linhaPagamento: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    textoPagamento: {
        fontSize: 13,
        color: colors.textoPrimario,
    },
    linhaTotalRecebido: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: colors.borda,
    },
    statusQuitado: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '700',
        color: colors.sucesso,
    },
    rodapeData: {
        textAlign: 'center',
        fontSize: 11,
        color: colors.textoSecundario,
    },
    aviso: {
        marginTop: 6,
        textAlign: 'center',
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textoSecundario,
    },
    mensagemContainer: {
        paddingHorizontal: 4,
    },
    avisoCompartilhamento: {
        paddingHorizontal: 4,
        fontSize: 13,
        color: colors.textoSecundario,
    },
    acoes: {
        gap: 10,
        alignItems: 'stretch',
    },
    linkImprimir: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    textoLinkImprimir: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoSecundario,
        textDecorationLine: 'underline',
    },
});
