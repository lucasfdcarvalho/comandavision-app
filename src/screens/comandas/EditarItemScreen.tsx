import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { colors } from "../../theme/colors";
import { formatarMoeda } from "../../utils/formatadores";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";

type Props = NativeStackScreenProps<ComandasStackParamList, 'EditarItem'>;

export function EditarItemScreen({ route, navigation }: Props) {
    const { comandaId, itemId, produtoNome, precoUnitario, quantidadeAtual, observacaoAtual } = route.params;

    const [quantidade, setQuantidade] = useState(quantidadeAtual);
    const [observacao, setObservacao] = useState(observacaoAtual ?? '');
    const [carregando, setCarregando] = useState(false);
    const [removendo, setRemovendo] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    function diminuir() {
        setQuantidade((valor) => Math.max(1, valor - 1));
    }

    function aumentar() {
        setQuantidade((valor) => valor + 1);
    }

    async function salvar() {
        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.atualizarItem(comandaId, itemId, {
                quantidade,
                observacao: observacao.trim() || undefined,
            });

            navigation.popTo('DetalhesComanda', { comandaId });
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível salvar as alterações';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    function confirmarRemocao() {
        Alert.alert(
            'Remover item',
            `Deseja remover ${produtoNome} da comanda?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: remover },
            ]
        );
    }

    async function remover() {
        setMensagemErro('');

        try {
            setRemovendo(true);
            await apiService.removerItem(comandaId, itemId);
            navigation.popTo('DetalhesComanda', { comandaId });
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível remover o item';
            setMensagemErro(mensagem);
        } finally {
            setRemovendo(false);
        }
    }

    const desabilitado = carregando || removendo;

    return (
        <View style={styles.container}>
            <Text style={styles.nomeProduto}>{produtoNome}</Text>
            <Text style={styles.preco}>{formatarMoeda(precoUnitario)} / unidade</Text>

            <Text style={styles.rotulo}>Quantidade</Text>
            <View style={styles.stepper}>
                <Pressable style={styles.botaoStepper} onPress={diminuir} disabled={desabilitado}>
                    <Feather name="minus-circle" size={22} color={colors.laranja} />
                </Pressable>
                <Text style={styles.valorStepper}>{quantidade}</Text>
                <Pressable style={styles.botaoStepper} onPress={aumentar} disabled={desabilitado}>
                    <Feather name="plus-circle" size={22} color={colors.laranja} />
                </Pressable>
            </View>

            <Text style={styles.rotulo}>Observação (opcional)</Text>
            <TextInput
                style={styles.campo}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Ex: Sem gelo"
            />

            {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

            <View style={styles.botaoSalvarContainer}>
                <PrimaryButton
                    titulo="Salvar alterações"
                    onPress={salvar}
                    disabled={desabilitado}
                    carregando={carregando}
                />
            </View>

            <View style={styles.botaoRemoverContainer}>
                <SecondaryButton
                    titulo="Remover item"
                    icone="trash-2"
                    onPress={confirmarRemocao}
                    disabled={desabilitado}
                    carregando={removendo}
                />
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
    botaoSalvarContainer: {
        marginTop: 24,
    },
    botaoRemoverContainer: {
        marginTop: 12,
    },
});
