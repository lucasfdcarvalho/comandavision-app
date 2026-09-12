import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ComandasStackParamList, 'ConfirmarItem'>;

function formatarMoeda(valor: number): string {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function ConfirmarItemScreen({ route, navigation }: Props) {
    const { comandaId, produtoId, produtoNome, precoUnitario } = route.params;

    const [quantidade, setQuantidade] = useState(1);
    const [observacao, setObservacao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    function diminuir() {
        setQuantidade((valor) => Math.max(1, valor - 1));
    }

    function aumentar() {
        setQuantidade((valor) => valor + 1);
    }

    async function confirmar() {
        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.adicionarItem(comandaId, {
                produtoId,
                quantidade,
                observacao: observacao.trim() || undefined,
            });

            Alert.alert('Item adicionado', `${quantidade}x ${produtoNome} foi adicionado à comanda.`, [
                { text: 'OK', onPress: () => navigation.popTo('DetalhesComanda', { comandaId }) },
            ]);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível adicionar o item';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.nomeProduto}>{produtoNome}</Text>
            <Text style={styles.preco}>{formatarMoeda(precoUnitario)} / unidade</Text>

            <Text style={styles.rotulo}>Quantidade</Text>
            <View style={styles.stepper}>
                <Pressable style={styles.botaoStepper} onPress={diminuir}>
                    <Text style={styles.textoBotaoStepper}>-</Text>
                </Pressable>
                <Text style={styles.valorStepper}>{quantidade}</Text>
                <Pressable style={styles.botaoStepper} onPress={aumentar}>
                    <Text style={styles.textoBotaoStepper}>+</Text>
                </Pressable>
            </View>

            <Text style={styles.rotulo}>Observação (opcional)</Text>
            <TextInput
                style={styles.campo}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Ex: Sem gelo"
            />

            {mensagemErro ? <Text style={styles.mensagemErro}>{mensagemErro}</Text> : null}

            <Pressable
                onPress={confirmar}
                disabled={carregando}
                style={({ pressed }) => [
                    styles.botaoConfirmar,
                    pressed && !carregando && styles.botaoPressionado,
                    carregando && styles.botaoDesabilitado,
                ]}>
                {carregando ? (
                    <ActivityIndicator color={colors.superficie} />
                ) : (
                    <Text style={styles.textoBotaoConfirmar}>Adicionar item</Text>
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
    nomeProduto: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    preco: {
        fontSize: 14,
        color: colors.textoSecundario,
        marginBottom: 12,
    },
    rotulo: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 8,
    },
    botaoStepper: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    textoBotaoStepper: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.laranja,
    },
    valorStepper: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textoPrimario,
        minWidth: 32,
        textAlign: 'center',
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
    mensagemErro: {
        marginTop: 8,
        color: colors.erro,
        fontSize: 14,
    },
    botaoConfirmar: {
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
    textoBotaoConfirmar: {
        color: colors.superficie,
        fontSize: 16,
        fontWeight: '700',
    },
});
