import { useDialogo } from "../../contexts/DialogoContext";
import { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { colors } from "../../theme/colors";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";

type Props = NativeStackScreenProps<GestaoStackParamList, 'NovaCategoria'>;

export function NovaCategoriaScreen({ navigation }: Props) {
    const { mostrarSucesso } = useDialogo();
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    async function salvar() {
        if (!nome.trim()) {
            setMensagemErro('Informe o nome da categoria');
            return;
        }

        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.criarCategoria({
                nome: nome.trim(),
                descricao: descricao.trim() || undefined,
            });

            mostrarSucesso('Categoria criada', 'A categoria foi criada com sucesso.', () => navigation.popTo('Catalogo'));
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível criar a categoria';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.rotulo}>Nome</Text>
                <TextInput
                    style={styles.campo}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex: Bebidas"
                    autoCapitalize="words"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Descrição (opcional)</Text>
                <TextInput
                    style={styles.campo}
                    value={descricao}
                    onChangeText={setDescricao}
                    placeholder="Ex: Refrigerantes, sucos e água"
                    editable={!carregando}
                />

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

                <View style={styles.botaoContainer}>
                    <PrimaryButton titulo="Criar categoria" onPress={salvar} carregando={carregando} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
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
    botaoContainer: {
        marginTop: 24,
    },
});
