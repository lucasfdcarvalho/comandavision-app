import { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { useDialogo } from "../../contexts/DialogoContext";
import type { CobrancaPix } from "../../types/Pagamento";
import { Text } from "../../components/ui/Texto";
import { Cartao } from "../../components/ui/Cartao";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import { MensagemErro } from "../../components/MensagemErro";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { colors } from "../../theme/colors";
import { espacamento, raio, tipografia } from "../../theme/tokens";
import { formatarMoeda } from "../../utils/formatadores";
import { formatarTempoRestante, milissegundosAte } from "../../utils/pix";
import { feedbackTatil } from "../../utils/feedbackTatil";

type Props = NativeStackScreenProps<ComandasStackParamList, 'PagamentoPix'>;

// Intervalo da consulta enquanto a tela está aberta: o backend confere no Mercado Pago a cada pedido.
const INTERVALO_CONSULTA_MS = 4000;

export function PagamentoPixScreen({ route, navigation }: Props) {
    const { comandaId, comandaIdentificacao, pagamentoId } = route.params;
    const { alertar } = useDialogo();

    const [cobranca, setCobranca] = useState<CobrancaPix | null>(route.params.cobranca ?? null);
    const [mensagemErro, setMensagemErro] = useState('');
    const [erroCarregamento, setErroCarregamento] = useState('');
    const [cancelando, setCancelando] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [agora, setAgora] = useState(Date.now());
    const statusAnterior = useRef(cobranca?.status);

    const consultar = useCallback(async () => {
        try {
            const dados = await apiService.consultarPix(comandaId, pagamentoId);
            setCobranca(dados);
            setErroCarregamento('');
        } catch (error: unknown) {
            // Falha passageira de rede durante a espera não interrompe a tela.
            if (!cobranca) {
                setErroCarregamento(error instanceof Error ? error.message : 'Não foi possível carregar o Pix');
            }
        }
    }, [comandaId, pagamentoId, cobranca]);

    // Consulta periódica só enquanto a tela está visível e o Pix aguarda pagamento.
    useFocusEffect(
        useCallback(() => {
            if (!cobranca) {
                consultar();
                return undefined;
            }
            if (cobranca.status !== 'PENDENTE') {
                return undefined;
            }
            const intervalo = setInterval(consultar, INTERVALO_CONSULTA_MS);
            return () => clearInterval(intervalo);
        }, [cobranca, consultar])
    );

    // Relógio do tempo restante.
    useEffect(() => {
        if (cobranca?.status !== 'PENDENTE') {
            return undefined;
        }
        const relogio = setInterval(() => setAgora(Date.now()), 1000);
        return () => clearInterval(relogio);
    }, [cobranca?.status]);

    // Vibra uma vez quando o pagamento é confirmado.
    useEffect(() => {
        if (cobranca?.status === 'CONFIRMADO' && statusAnterior.current !== 'CONFIRMADO') {
            feedbackTatil.sucesso();
        }
        statusAnterior.current = cobranca?.status;
    }, [cobranca?.status]);

    async function copiarCodigo() {
        if (!cobranca) {
            return;
        }
        await Clipboard.setStringAsync(cobranca.qrCode);
        feedbackTatil.selecao();
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
    }

    function confirmarCancelamento() {
        alertar('Cancelar Pix', 'O QR Code deixa de valer e o valor volta para o saldo da comanda.', [
            { text: 'Manter', style: 'cancel' },
            { text: 'Cancelar Pix', style: 'destructive', onPress: cancelar },
        ]);
    }

    async function cancelar() {
        try {
            setCancelando(true);
            setMensagemErro('');
            setCobranca(await apiService.cancelarPix(comandaId, pagamentoId));
        } catch (error: unknown) {
            setMensagemErro(error instanceof Error ? error.message : 'Não foi possível cancelar o Pix');
            // O motivo mais comum é o Pix ter acabado de ser pago: atualiza a tela.
            consultar();
        } finally {
            setCancelando(false);
        }
    }

    if (erroCarregamento) {
        return <ErrorState texto={erroCarregamento} aoTentarNovamente={consultar} />;
    }

    if (!cobranca) {
        return <LoadingState variante="detalhe" />;
    }

    if (cobranca.status === 'CONFIRMADO') {
        return (
            <View style={styles.telaFinal}>
                <View style={[styles.iconeFinal, { backgroundColor: colors.sucessoFundo }]}>
                    <Feather name="check" size={36} color={colors.sucesso} />
                </View>
                <Text style={styles.tituloFinal}>Pix recebido</Text>
                <Text style={styles.valorFinal}>{formatarMoeda(cobranca.valor)}</Text>
                <Text style={styles.textoFinal}>{comandaIdentificacao}</Text>
                <PrimaryButton titulo="Continuar" onPress={() => navigation.goBack()} style={styles.botaoFinal} />
            </View>
        );
    }

    if (cobranca.status !== 'PENDENTE') {
        return (
            <View style={styles.telaFinal}>
                <View style={[styles.iconeFinal, { backgroundColor: colors.statusFundo.fechada }]}>
                    <Feather name="x" size={36} color={colors.textoSecundario} />
                </View>
                <Text style={styles.tituloFinal}>Pix encerrado</Text>
                <Text style={styles.textoFinal}>Este QR Code foi cancelado ou expirou. Gere um novo para cobrar.</Text>
                <PrimaryButton titulo="Voltar" onPress={() => navigation.goBack()} style={styles.botaoFinal} />
            </View>
        );
    }

    const restante = milissegundosAte(cobranca.expiraEm, agora);

    return (
        <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
            <Cartao style={styles.cartao}>
                <Text style={styles.rotulo}>{comandaIdentificacao}</Text>
                <Text style={styles.valor}>{formatarMoeda(cobranca.valor)}</Text>

                <View style={styles.moldura}>
                    <Image
                        source={{ uri: `data:image/png;base64,${cobranca.qrCodeBase64}` }}
                        style={styles.qrCode}
                        resizeMode="contain"
                        accessibilityLabel="QR Code do Pix"
                    />
                </View>

                <View style={styles.linhaStatus}>
                    <ActivityIndicator size="small" color={colors.laranja} />
                    <Text style={styles.textoStatus}>Aguardando pagamento</Text>
                </View>
                <Text style={[styles.tempo, restante <= 60_000 && styles.tempoAcabando]}>
                    {restante > 0 ? `Expira em ${formatarTempoRestante(restante)}` : 'QR Code expirado'}
                </Text>
            </Cartao>

            <PrimaryButton
                titulo={copiado ? 'Código copiado' : 'Copiar código Pix'}
                icone={copiado ? 'check' : 'copy'}
                onPress={copiarCodigo}
            />

            {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

            <SecondaryButton titulo="Cancelar Pix" icone="x-circle" onPress={confirmarCancelamento} carregando={cancelando} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    container: {
        padding: espacamento.lg,
        gap: espacamento.md,
    },
    cartao: {
        alignItems: 'center',
        gap: espacamento.sm,
        paddingVertical: espacamento.xl,
    },
    rotulo: {
        ...tipografia.rotulo,
        color: colors.textoSecundario,
    },
    valor: {
        ...tipografia.destaque,
        color: colors.textoPrimario,
    },
    moldura: {
        marginVertical: espacamento.md,
        padding: espacamento.md,
        backgroundColor: colors.superficie,
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    // Fundo branco e tamanho generoso: o leitor de QR do banco precisa de contraste e área.
    qrCode: {
        width: 232,
        height: 232,
    },
    linhaStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.sm,
    },
    textoStatus: {
        ...tipografia.corpoForte,
        color: colors.textoPrimario,
    },
    tempo: {
        ...tipografia.rotulo,
        ...tipografia.tabular,
        color: colors.textoSecundario,
    },
    tempoAcabando: {
        color: colors.erro,
    },
    telaFinal: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: espacamento.sm,
        padding: espacamento.xxl,
        backgroundColor: colors.fundo,
    },
    iconeFinal: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: espacamento.sm,
        borderRadius: 36,
    },
    tituloFinal: {
        ...tipografia.titulo,
        color: colors.textoPrimario,
    },
    valorFinal: {
        ...tipografia.destaque,
        color: colors.textoPrimario,
    },
    textoFinal: {
        ...tipografia.corpo,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    botaoFinal: {
        alignSelf: 'stretch',
        marginTop: espacamento.xl,
    },
});
