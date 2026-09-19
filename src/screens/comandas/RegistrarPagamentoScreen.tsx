import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { FormaPagamento } from "../../types/Pagamento";
import { colors } from "../../theme/colors";
import { MensagemErro } from "../../components/MensagemErro";

type Props = NativeStackScreenProps<ComandasStackParamList, 'RegistrarPagamento'>;

const FORMAS: { valor: FormaPagamento; rotulo: string; icone: keyof typeof Feather.glyphMap }[] = [
    { valor: 'PIX', rotulo: 'Pix', icone: 'zap' },
    { valor: 'DINHEIRO', rotulo: 'Dinheiro', icone: 'dollar-sign' },
    { valor: 'DEBITO', rotulo: 'Débito', icone: 'credit-card' },
    { valor: 'CREDITO', rotulo: 'Crédito', icone: 'repeat' },
];

export function RegistrarPagamentoScreen({ route, navigation }: Props) {
    const { comandaId, valorSugerido } = route.params;

    const [forma, setForma] = useState<FormaPagamento>('PIX');
    const [valor, setValor] = useState(valorSugerido > 0 ? valorSugerido.toFixed(2).replace('.', ',') : '');
    const [referenciaExterna, setReferenciaExterna] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    async function registrar() {
        const valorNumerico = Number(valor.replace(',', '.'));

        if (!valor.trim() || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
            setMensagemErro('Informe um valor válido, maior que zero');
            return;
        }

        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.registrarPagamento(comandaId, {
                forma,
                valor: Math.round(valorNumerico * 100) / 100,
                referenciaExterna: referenciaExterna.trim() || undefined,
            });

            navigation.popTo('DetalhesComanda', { comandaId });
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível registrar o pagamento';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.rotulo}>Forma de pagamento</Text>
            <View style={styles.formas}>
                {FORMAS.map((opcao) => {
                    const selecionada = opcao.valor === forma;
                    return (
                        <Pressable
                            key={opcao.valor}
                            onPress={() => setForma(opcao.valor)}
                            disabled={carregando}
                            style={[styles.botaoForma, selecionada && styles.botaoFormaSelecionada]}>
                            <Feather name={opcao.icone} size={18} color={selecionada ? colors.superficie : colors.laranja} />
                            <Text style={[styles.textoBotaoForma, selecionada && styles.textoBotaoFormaSelecionada]}>
                                {opcao.rotulo}
                            </Text>
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

            <Text style={styles.rotulo}>Referência externa (opcional)</Text>
            <TextInput
                style={styles.campo}
                value={referenciaExterna}
                onChangeText={setReferenciaExterna}
                placeholder="Ex: código da transação"
                maxLength={255}
            />

            {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

            <Pressable
                onPress={registrar}
                disabled={carregando}
                style={({ pressed }) => [
                    styles.botaoRegistrar,
                    pressed && !carregando && styles.botaoPressionado,
                    carregando && styles.botaoDesabilitado,
                ]}>
                {carregando ? (
                    <ActivityIndicator color={colors.superficie} />
                ) : (
                    <Text style={styles.textoBotaoRegistrar}>Registrar pagamento</Text>
                )}
            </Pressable>
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
    rotulo: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    formas: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    botaoForma: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 999,
    },
    botaoFormaSelecionada: {
        backgroundColor: colors.laranja,
        borderColor: colors.laranja,
    },
    textoBotaoForma: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.laranja,
    },
    textoBotaoFormaSelecionada: {
        color: colors.superficie,
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
    botaoRegistrar: {
        marginTop: 24,
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
    botaoPressionado: {
        opacity: 0.8,
    },
    botaoDesabilitado: {
        opacity: 0.6,
    },
    textoBotaoRegistrar: {
        color: colors.superficie,
        fontSize: 16,
        fontWeight: '700',
    },
});
