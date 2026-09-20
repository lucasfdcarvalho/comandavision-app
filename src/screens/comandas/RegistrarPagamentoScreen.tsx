import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { FormaPagamento, ResumoPagamentos } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { centavosParaMoeda, avaliarSaldoPagamento } from "../../utils/saldoPagamento";
import { ICONE_FORMA, ROTULO_FORMA } from "../../utils/formaPagamento";
import { MensagemErro } from "../../components/MensagemErro";
import { LoadingState } from "../../components/LoadingState";
import { PrimaryButton } from "../../components/PrimaryButton";

type Props = NativeStackScreenProps<ComandasStackParamList, 'RegistrarPagamento'>;

const FORMAS: FormaPagamento[] = ['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO'];

export function RegistrarPagamentoScreen({ route, navigation }: Props) {
    const { comandaId, valorSugerido } = route.params;

    const [resumo, setResumo] = useState<ResumoPagamentos | null>(null);
    const [carregandoResumo, setCarregandoResumo] = useState(true);

    const [forma, setForma] = useState<FormaPagamento>('PIX');
    const [valor, setValor] = useState(valorSugerido > 0 ? valorSugerido.toFixed(2).replace('.', ',') : '');
    const [referenciaExterna, setReferenciaExterna] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarResumo = useCallback(async () => {
        try {
            setCarregandoResumo(true);
            const dados = await apiService.buscarResumoPagamentos(comandaId);
            setResumo(dados);
        } catch {
            // O resumo é só informativo aqui; a validação de saldo real acontece no backend e na tela de detalhes.
        } finally {
            setCarregandoResumo(false);
        }
    }, [comandaId]);

    useFocusEffect(
        useCallback(() => {
            carregarResumo();
        }, [carregarResumo])
    );

    // Deriva os valores de totalComanda/totalPago em vez de confiar cegamente em
    // resumo.saldoRestante/resumo.situacao — se os números não forem válidos,
    // não mostramos o cartão em vez de arriscar exibir R$ 0,00 incorreto.
    const saldo = resumo ? avaliarSaldoPagamento(resumo.totalComanda, resumo) : { disponivel: false as const };

    async function registrar() {
        const valorNumerico = Number(valor.replace(',', '.'));

        if (!valor.trim() || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
            setMensagemErro('Informe um valor válido, maior que zero');
            return;
        }

        const valorCentavos = Math.round(valorNumerico * 100);

        // O backend rejeita (409) um valor que ultrapasse o saldo restante — não há
        // suporte a "troco". Avisamos antes de disparar uma requisição fadada a falhar.
        if (saldo.disponivel && valorCentavos > saldo.restanteCentavos) {
            setMensagemErro(`O valor não pode ultrapassar o saldo restante de ${centavosParaMoeda(saldo.restanteCentavos)}`);
            return;
        }

        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.registrarPagamento(comandaId, {
                forma,
                valor: valorCentavos / 100,
                referenciaExterna: forma === 'DINHEIRO' ? undefined : (referenciaExterna.trim() || undefined),
            });

            navigation.popTo('DetalhesComanda', { comandaId });
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível registrar o pagamento';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    if (carregandoResumo) {
        return <LoadingState />;
    }

    return (
        <View style={styles.container}>
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

            <Text style={styles.rotulo}>Forma de pagamento</Text>
            <View style={styles.formas}>
                {FORMAS.map((opcao) => {
                    const selecionada = opcao === forma;
                    return (
                        <Pressable
                            key={opcao}
                            onPress={() => setForma(opcao)}
                            disabled={carregando}
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
            />

            {forma !== 'DINHEIRO' ? (
                <>
                    <Text style={styles.rotulo}>Referência externa (opcional)</Text>
                    <TextInput
                        style={styles.campo}
                        value={referenciaExterna}
                        onChangeText={setReferenciaExterna}
                        placeholder="Ex: código da transação"
                        maxLength={255}
                    />
                </>
            ) : null}

            {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

            <View style={styles.botaoRegistrarContainer}>
                <PrimaryButton titulo="Registrar pagamento" onPress={registrar} carregando={carregando} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        borderRadius: 12,
        gap: 6,
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
        borderRadius: 10,
    },
    botaoFormaSelecionada: {
        borderColor: colors.laranja,
        backgroundColor: '#FDF1E0',
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
        borderRadius: 8,
    },
    botaoRegistrarContainer: {
        marginTop: 24,
    },
});
