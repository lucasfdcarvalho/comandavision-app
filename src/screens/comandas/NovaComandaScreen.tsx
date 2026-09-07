import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ComandasStackParamList, 'NovaComanda'>;

export function NovaComandaScreen({ navigation }: Props) {
    const [identificacao, setIdentificacao] = useState('');
    const [observacao, setObservacao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    async function abrirComanda() {
        if (!identificacao.trim()) {
            setMensagemErro('Informe a identificação da comanda');
            return;
        }

        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.abrirComanda({
                identificacao: identificacao.trim(),
                observacao: observacao.trim() || undefined,
            });

            Alert.alert('Comanda aberta', 'A comanda foi aberta com sucesso.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível abrir a comanda';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.rotulo}>Mesa ou identificação</Text>
            <TextInput
                style={styles.campo}
                value={identificacao}
                onChangeText={setIdentificacao}
                placeholder="Ex: Mesa 12"
                autoCapitalize="words"
            />

            <Text style={styles.rotulo}>Observação (opcional)</Text>
            <TextInput
                style={styles.campo}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Ex: Aniversário"
            />

            {mensagemErro ? <Text style={styles.mensagemErro}>{mensagemErro}</Text> : null}

            <Pressable
                onPress={abrirComanda}
                disabled={carregando}
                style={({ pressed }) => [
                    styles.botao,
                    pressed && !carregando && styles.botaoPressionado,
                    carregando && styles.botaoDesabilitado,
                ]}>
                {carregando ? (
                    <ActivityIndicator color={colors.superficie} />
                ) : (
                    <Text style={styles.textoBotao}>Abrir comanda</Text>
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
    botao: {
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
    textoBotao: {
        color: colors.superficie,
        fontSize: 16,
        fontWeight: '700',
    },
});
