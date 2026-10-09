import { useDialogo } from "../../contexts/DialogoContext";
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import type { PapelUsuario } from "../../types/Usuario";
import { colors } from "../../theme/colors";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SeletorPapel } from "../../components/SeletorPapel";

type Props = NativeStackScreenProps<GestaoStackParamList, 'NovoUsuario'>;

const TAMANHO_MINIMO_SENHA = 6;

export function NovoUsuarioScreen({ navigation }: Props) {
    const { mostrarSucesso } = useDialogo();
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(true);
    const [papel, setPapel] = useState<PapelUsuario>('FUNCIONARIO');
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    async function salvar() {
        if (!nome.trim()) {
            setMensagemErro('Informe o nome');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setMensagemErro('Informe um e-mail válido');
            return;
        }

        if (senha.length < TAMANHO_MINIMO_SENHA) {
            setMensagemErro(`A senha provisória deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`);
            return;
        }

        setMensagemErro('');

        try {
            setCarregando(true);

            const usuario = await apiService.criarUsuario({
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                senha,
                papel,
            });

            mostrarSucesso(
                'Usuário criado',
                `Passe para ${usuario.nome ?? 'o usuário'} o e-mail ${usuario.email} e a senha provisória para o primeiro acesso.`,
                () => navigation.popTo('Equipe')
            );
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível criar o usuário';
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
                    placeholder="Ex: Maria Souza"
                    autoCapitalize="words"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>E-mail</Text>
                <TextInput
                    style={styles.campo}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Ex: maria@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Senha provisória</Text>
                <View style={styles.campoSenha}>
                    <TextInput
                        style={styles.inputSenha}
                        value={senha}
                        onChangeText={setSenha}
                        placeholder={`Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres`}
                        secureTextEntry={!mostrarSenha}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!carregando}
                    />
                    <Pressable
                        onPress={() => setMostrarSenha((atual) => !atual)}
                        accessibilityRole="button"
                        accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                        <Feather name={mostrarSenha ? 'eye-off' : 'eye'} size={18} color={colors.textoSecundario} />
                    </Pressable>
                </View>
                <Text style={styles.dica}>Você vai repassar essa senha para a pessoa entrar pela primeira vez.</Text>

                <Text style={styles.rotulo}>Papel</Text>
                <SeletorPapel papelSelecionado={papel} onSelecionar={setPapel} desabilitado={carregando} />

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

                <View style={styles.botaoContainer}>
                    <PrimaryButton titulo="Criar usuário" onPress={salvar} carregando={carregando} />
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
    campoSenha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 50,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    inputSenha: {
        flex: 1,
        height: '100%',
        color: colors.textoPrimario,
        fontSize: 16,
    },
    dica: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    botaoContainer: {
        marginTop: 24,
    },
});
