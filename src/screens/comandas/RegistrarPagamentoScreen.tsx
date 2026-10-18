import { useCallback, useState } from "react";
import { View, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Text, TextInput } from "../../components/ui/Texto";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { FormaPagamento, ResumoPagamentos } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { raio, sombras } from "../../theme/tokens";
import { centavosParaMoeda, avaliarSaldoPagamento, SaldoPagamento } from "../../utils/saldoPagamento";
import { ICONE_FORMA, ROTULO_FORMA } from "../../utils/formaPagamento";
import { MensagemErro } from "../../components/MensagemErro";
import { MensagemSucesso } from "../../components/MensagemSucesso";
import { LoadingState } from "../../components/LoadingState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import { DividirSaldoPainel } from "../../components/DividirSaldoPainel";

type Props = NativeStackScreenProps<ComandasStackParamList, 'RegistrarPagamento'>;

const FORMAS: FormaPagamento[] = ['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO'];

function centavosParaValorEditavel(centavos: number): string {
    return centavos > 0 ? (centavos / 100).toFixed(2).replace('.', ',') : '';
}

export function RegistrarPagamentoScreen({ route, navigation }: Props) {
    const { comandaId, comandaIdentificacao, valorSugerido } = route.params;

    const [resumo, setResumo] = useState<ResumoPagamentos | null>(null);
    const [carregandoResumo, setCarregandoResumo] = useState(true);

    const [forma, setForma] = useState<FormaPagamento>('PIX');
    const [valor, setValor] = useState(valorSugerido > 0 ? valorSugerido.toFixed(2).replace('.', ',') : '');
    const [referenciaExterna, setReferenciaExterna] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemSucesso, setMensagemSucesso] = useState('');
    const [mostrarDivisao, setMostrarDivisao] = useState(false);

    const buscarResumo = useCallback(async () => {
        const dados = await apiService.buscarResumoPagamentos(comandaId);
        setResumo(dados);
        return dados;
    }, [comandaId]);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setCarregandoResumo(true);
                try {
                    const dados = await buscarResumo();
                    // Ao voltar da tela do Pix, o saldo mudou: sugere o novo restante.
                    const saldoAtual = avaliarSaldoPagamento(dados.totalComanda, dados);
                    if (saldoAtual.disponivel) {
                        setValor((anterior) => {
                            const anteriorCentavos = Math.round(Number(anterior.replace(',', '.')) * 100);
                            return anteriorCentavos > saldoAtual.restanteCentavos
                                ? centavosParaValorEditavel(saldoAtual.restanteCentavos)
                                : anterior;
                        });
                    }
                } catch {
                    // O resumo é só informativo aqui; a validação de saldo real acontece no backend e na tela de detalhes.
                } finally {
                    setCarregandoResumo(false);
                }
            })();
        }, [buscarResumo])
    );

    // Deriva os valores de totalComanda/totalPago em vez de confiar cegamente em
    // resumo.saldoRestante/resumo.situacao — se os números não forem válidos,
    // não mostramos o cartão em vez de arriscar exibir R$ 0,00 incorreto.
    const saldo = resumo ? avaliarSaldoPagamento(resumo.totalComanda, resumo) : { disponivel: false as const };
    const pagamentoConcluido = saldo.disponivel && saldo.quitado;

    function usarValorDivisao(centavos: number) {
        setValor(centavosParaValorEditavel(centavos));
        setMostrarDivisao(false);
        setMensagemErro('');
        setMensagemSucesso('');
    }

    // Valida o campo Valor e devolve os centavos, ou null (com a mensagem de erro já exibida).
    function validarValor(): number | null {
        const valorNumerico = Number(valor.replace(',', '.'));

        if (!valor.trim() || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
            setMensagemSucesso('');
            setMensagemErro('Informe um valor válido, maior que zero');
            return null;
        }

        const valorCentavos = Math.round(valorNumerico * 100);

        // O backend rejeita (409) um valor que ultrapasse o saldo restante — não há
        // suporte a "troco". Avisamos antes de disparar uma requisição fadada a falhar.
        if (saldo.disponivel && valorCentavos > saldo.restanteCentavos) {
            setMensagemSucesso('');
            setMensagemErro(`O valor não pode ultrapassar o saldo restante de ${centavosParaMoeda(saldo.restanteCentavos)}`);
            return null;
        }

        setMensagemErro('');
        setMensagemSucesso('');
        return valorCentavos;
    }

    // Pix pelo Mercado Pago: gera o QR Code e abre a tela que acompanha o pagamento.
    async function gerarQrCodePix() {
        const valorCentavos = validarValor();
        if (valorCentavos === null) {
            return;
        }

        try {
            setCarregando(true);
            const cobranca = await apiService.gerarPix(comandaId, valorCentavos / 100);
            navigation.navigate('PagamentoPix', {
                comandaId,
                comandaIdentificacao,
                pagamentoId: cobranca.pagamentoId,
                cobranca,
            });
        } catch (error: unknown) {
            setMensagemErro(error instanceof Error ? error.message : 'Não foi possível gerar o Pix');
        } finally {
            setCarregando(false);
        }
    }

    async function registrar() {
        const valorCentavos = validarValor();
        if (valorCentavos === null) {
            return;
        }

        try {
            setCarregando(true);

            await apiService.registrarPagamento(comandaId, {
                forma,
                valor: valorCentavos / 100,
                referenciaExterna: forma === 'DINHEIRO' ? undefined : (referenciaExterna.trim() || undefined),
            });

            // Usamos o resumo recém-buscado diretamente (em vez do `saldo` derivado do
            // estado anterior) porque `setResumo` é assíncrono: ler `saldo` aqui ainda
            // devolveria o saldo de ANTES deste pagamento, e o campo "Valor" ficaria
            // sugerindo o valor errado para a próxima parcela.
            let saldoAtualizado: SaldoPagamento = { disponivel: false };
            try {
                const resumoAtualizado = await buscarResumo();
                saldoAtualizado = avaliarSaldoPagamento(resumoAtualizado.totalComanda, resumoAtualizado);
            } catch {
                // O pagamento já foi registrado com sucesso; o resumo é só informativo.
            }

            setValor(saldoAtualizado.disponivel ? centavosParaValorEditavel(saldoAtualizado.restanteCentavos) : '');
            setReferenciaExterna('');
            setMostrarDivisao(false);
            setMensagemSucesso('Pagamento registrado com sucesso.');
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível registrar o pagamento';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    if (carregandoResumo) {
        return <LoadingState variante="formulario" />;
    }

    if (pagamentoConcluido) {
        return (
            <PagamentoConcluido
                comandaIdentificacao={comandaIdentificacao}
                totalPagoCentavos={saldo.totalPagoCentavos}
                onVerComprovante={() => navigation.navigate('Comprovante', { comandaId })}
                onVerDetalhes={() => navigation.popTo('DetalhesComanda', { comandaId })}
                onVoltarComandas={() => navigation.popTo('Lista')}
            />
        );
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {saldo.disponivel ? (
                    <View style={styles.resumo}>
                        <View style={styles.resumoLinha}>
                            <Text style={styles.resumoRotulo}>Total da comanda</Text>
                            <Text style={styles.resumoValor}>{centavosParaMoeda(saldo.totalComandaCentavos)}</Text>
                        </View>
                        <View style={styles.resumoLinha}>
                            <Text style={styles.resumoRotulo}>Total pago</Text>
                            <Text style={styles.resumoValor}>{centavosParaMoeda(saldo.totalPagoCentavos)}</Text>
                        </View>
                        <View style={[styles.resumoLinha, styles.resumoLinhaDestaque]}>
                            <Text style={styles.resumoRotuloDestaque}>Saldo restante</Text>
                            <Text style={styles.resumoValorDestaque}>{centavosParaMoeda(saldo.restanteCentavos)}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.resumo}>
                        <Text style={styles.resumoIndisponivel}>Saldo indisponível</Text>
                    </View>
                )}

                {saldo.disponivel && saldo.restanteCentavos > 0 ? (
                    <View style={styles.acaoDividir}>
                        <SecondaryButton
                            titulo={mostrarDivisao ? 'Ocultar divisão' : 'Dividir saldo'}
                            icone="users"
                            onPress={() => setMostrarDivisao((atual) => !atual)}
                        />
                        {mostrarDivisao ? (
                            <DividirSaldoPainel
                                saldoRestanteCentavos={saldo.restanteCentavos}
                                onUsarValor={usarValorDivisao}
                                desabilitado={carregando}
                            />
                        ) : null}
                    </View>
                ) : null}

                <Text style={styles.rotulo}>Forma de pagamento</Text>
                <View style={styles.formas}>
                    {FORMAS.map((opcao) => {
                        const selecionada = opcao === forma;
                        return (
                            <Pressable
                                key={opcao}
                                onPress={() => setForma(opcao)}
                                disabled={carregando}
                                accessibilityRole="button"
                                accessibilityLabel={`Selecionar forma de pagamento ${ROTULO_FORMA[opcao]}`}
                                style={[styles.botaoForma, selecionada && styles.botaoFormaSelecionada]}>
                                <MaterialCommunityIcons name={ICONE_FORMA[opcao]} size={18} color={colors.laranja} />
                                <Text style={styles.textoBotaoForma}>{ROTULO_FORMA[opcao]}</Text>
                                <View style={[styles.indicador, selecionada && styles.indicadorSelecionado]} />
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.rotulo}>Valor</Text>
                <TextInput
                    style={styles.campo}
                    value={valor}
                    onChangeText={setValor}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                    editable={!carregando}
                />

                {forma !== 'DINHEIRO' && forma !== 'PIX' ? (
                    <>
                        <Text style={styles.rotulo}>Referência externa (opcional)</Text>
                        <TextInput
                            style={styles.campo}
                            value={referenciaExterna}
                            onChangeText={setReferenciaExterna}
                            placeholder="Ex: código da transação"
                            maxLength={255}
                            editable={!carregando}
                        />
                    </>
                ) : null}

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}
                {!mensagemErro && mensagemSucesso ? <MensagemSucesso texto={mensagemSucesso} /> : null}

                <View style={styles.botaoRegistrarContainer}>
                    {forma === 'PIX' ? (
                        <>
                            <PrimaryButton titulo="Gerar QR Code Pix" icone="maximize" onPress={gerarQrCodePix} carregando={carregando} />
                            {/* Alternativa para Pix pago direto na chave do estabelecimento, sem QR Code do app. */}
                            <Pressable
                                onPress={registrar}
                                disabled={carregando}
                                style={styles.linkPixManual}
                                accessibilityRole="button">
                                <Text style={styles.textoLinkPixManual}>Registrar Pix recebido por fora</Text>
                            </Pressable>
                        </>
                    ) : (
                        <PrimaryButton titulo="Registrar pagamento" onPress={registrar} carregando={carregando} />
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

type PagamentoConcluidoProps = {
    comandaIdentificacao: string;
    totalPagoCentavos: number;
    onVerComprovante: () => void;
    onVerDetalhes: () => void;
    onVoltarComandas: () => void;
};

function PagamentoConcluido({
    comandaIdentificacao,
    totalPagoCentavos,
    onVerComprovante,
    onVerDetalhes,
    onVoltarComandas,
}: PagamentoConcluidoProps) {
    return (
        <View style={styles.telaConcluida}>
            <Feather name="check-circle" size={72} color={colors.sucesso} />
            <Text style={styles.tituloConcluido}>Pagamento concluído</Text>
            <Text style={styles.identificacaoConcluida}>{comandaIdentificacao}</Text>

            <View style={styles.totalPagoCard}>
                <Text style={styles.rotuloTotalPago}>Total pago</Text>
                <Text style={styles.valorTotalPago}>{centavosParaMoeda(totalPagoCentavos)}</Text>
            </View>

            <View style={styles.botoesConcluidoContainer}>
                <PrimaryButton titulo="Ver comprovante" icone="file-text" onPress={onVerComprovante} />
                <SecondaryButton titulo="Ver detalhes" onPress={onVerDetalhes} />
                <Pressable onPress={onVoltarComandas} style={styles.linkVoltarComandas} accessibilityRole="button">
                    <Text style={styles.textoLinkVoltarComandas}>Voltar para comandas</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    linkPixManual: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    textoLinkPixManual: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoSecundario,
        textDecorationLine: 'underline',
    },
    flex: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    container: {
        flexGrow: 1,
        padding: 24,
        gap: 8,
        backgroundColor: colors.fundo,
    },
    resumo: {
        marginBottom: 12,
        padding: 16,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: raio.lg,
        gap: 6,
        ...sombras.suave,
    },
    resumoLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    resumoLinhaDestaque: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borda,
    },
    resumoRotulo: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
    resumoValor: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    resumoRotuloDestaque: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    resumoValorDestaque: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.laranja,
    },
    resumoIndisponivel: {
        fontSize: 14,
        fontStyle: 'italic',
        color: colors.textoSecundario,
    },
    acaoDividir: {
        marginBottom: 4,
    },
    rotulo: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    formas: {
        gap: 8,
        marginTop: 8,
    },
    botaoForma: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: raio.md,
    },
    botaoFormaSelecionada: {
        borderColor: colors.laranja,
        backgroundColor: colors.laranjaClaro,
    },
    textoBotaoForma: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    indicador: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: colors.borda,
    },
    indicadorSelecionado: {
        borderColor: colors.laranja,
        backgroundColor: colors.laranja,
    },
    campo: {
        height: 50,
        paddingHorizontal: 14,
        color: colors.textoPrimario,
        fontSize: 16,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: raio.md,
    },
    botaoRegistrarContainer: {
        marginTop: 24,
    },
    telaConcluida: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
        backgroundColor: colors.fundo,
    },
    tituloConcluido: {
        marginTop: 8,
        fontSize: 22,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    identificacaoConcluida: {
        fontSize: 15,
        color: colors.textoSecundario,
    },
    totalPagoCard: {
        marginTop: 16,
        marginBottom: 8,
        width: '100%',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 16,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 12,
    },
    rotuloTotalPago: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    valorTotalPago: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.sucesso,
    },
    botoesConcluidoContainer: {
        width: '100%',
        gap: 10,
    },
    linkVoltarComandas: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    textoLinkVoltarComandas: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoSecundario,
        textDecorationLine: 'underline',
    },
});
