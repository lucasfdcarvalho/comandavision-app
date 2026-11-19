import { resultadosTrocaSenha } from "../../services/resultadosTrocaSenha";
import { useResultadoTrocaSenha } from "../../hooks/useResultadoTrocaSenha";
import { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput } from "../../components/ui/Texto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PerfilStackParamList } from "../../navigation/PerfilStack";
import { useAuth } from "../../hooks/useAuth";
import { useDialogo } from "../../contexts/DialogoContext";
import { CampoTexto } from "../../components/ui/CampoTexto";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";
import { authService } from "../../services/authService";
import { ErroTrocaSenha, TAMANHO_MINIMO_SENHA, validarTrocaSenha } from "../../services/trocaSenhaService";
import { colors } from "../../theme/colors";
import { espacamento } from "../../theme/tokens";

type Props = NativeStackScreenProps<PerfilStackParamList, 'AlterarSenha'>;

export function AlterarSenhaScreen({ navigation }: Props) {
    const { usuario } = useAuth();
    useResultadoTrocaSenha(usuario?.usuarioId);
    const { alertar, mostrarSucesso } = useDialogo();

    const novaSenhaRef = useRef<TextInput>(null);
    const confirmacaoRef = useRef<TextInput>(null);
    // Trava síncrona: o estado do React só atualiza no próximo render, então dois toques
    // rápidos poderiam disparar duas trocas.
    const enviando = useRef(false);
    const montada = useRef(true);
    useEffect(() => {
        montada.current = true;
        return () => { montada.current = false; };
    }, []);

    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [senhaAtualVisivel, setSenhaAtualVisivel] = useState(false);
    const [novaSenhaVisivel, setNovaSenhaVisivel] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const limparCampos = useCallback(() => {
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmacao('');
        setSenhaAtualVisivel(false);
        setNovaSenhaVisivel(false);
    }, []);

    // Ao sair da tela (voltar ou trocar de aba), as senhas digitadas não ficam na memória da tela.
    useEffect(() => navigation.addListener('blur', () => {
        limparCampos();
        setMensagemErro('');
    }), [navigation, limparCampos]);

    function aoDigitar(setter: (valor: string) => void) {
        return (texto: string) => {
            setter(texto);
            if (mensagemErro) setMensagemErro('');
        };
    }

    async function salvar() {
        if (enviando.current) {
            return;
        }

        const usuarioId = usuario?.usuarioId;
        if (!usuarioId) return;
        const dados = { senhaAtual, novaSenha, confirmacao };
        const erroValidacao = validarTrocaSenha(dados);
        if (erroValidacao) {
            setMensagemErro(erroValidacao);
            return;
        }

        enviando.current = true;
        setMensagemErro('');
        setCarregando(true);

        try {
            await authService.alterarSenhaPropria(dados);
            if (!montada.current || !navigation.isFocused()) {
                resultadosTrocaSenha.guardar(usuarioId, {
                    titulo: 'Senha alterada', mensagem: 'Use a nova senha no próximo acesso', tipo: 'sucesso',
                });
                return;
            }
            limparCampos();
            mostrarSucesso(
                'Senha alterada',
                'Use a nova senha no próximo acesso',
                () => { if (montada.current && navigation.isFocused()) navigation.goBack(); }
            );
        } catch (error: unknown) {
            if (!montada.current || !navigation.isFocused()) {
                resultadosTrocaSenha.guardar(usuarioId, {
                    titulo: error instanceof ErroTrocaSenha && error.resultadoDesconhecido ? 'Alteração não confirmada' : 'Senha não alterada',
                    mensagem: error instanceof ErroTrocaSenha ? error.message : 'Não foi possível concluir a alteração da senha',
                    tipo: 'aviso',
                });
                return;
            }
            if (error instanceof ErroTrocaSenha && error.resultadoDesconhecido) {
                // Sem repetir sozinho: uma nova tentativa precisa ser decisão da pessoa.
                limparCampos();
                alertar('Alteração não confirmada', error.message, undefined, 'aviso', undefined, 'exclusaoBloqueada');
                return;
            }

            if (error instanceof ErroTrocaSenha && error.motivo === 'senha_atual_incorreta') {
                setSenhaAtual('');
            }

            setMensagemErro(error instanceof ErroTrocaSenha ? error.message : 'Não foi possível concluir a alteração da senha');
        } finally {
            enviando.current = false;
            if (montada.current) setCarregando(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <CampoTexto
                    rotulo="Senha atual"
                    icone="lock"
                    iconeDireita={senhaAtualVisivel ? 'eye-off' : 'eye'}
                    onPressIconeDireita={() => setSenhaAtualVisivel((atual) => !atual)}
                    value={senhaAtual}
                    onChangeText={aoDigitar(setSenhaAtual)}
                    placeholder="Sua senha atual"
                    secureTextEntry={!senhaAtualVisivel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="next"
                    onSubmitEditing={() => novaSenhaRef.current?.focus()}
                    editable={!carregando}
                />

                <CampoTexto
                    ref={novaSenhaRef}
                    rotulo="Nova senha"
                    icone="key"
                    iconeDireita={novaSenhaVisivel ? 'eye-off' : 'eye'}
                    onPressIconeDireita={() => setNovaSenhaVisivel((atual) => !atual)}
                    value={novaSenha}
                    onChangeText={aoDigitar(setNovaSenha)}
                    placeholder={`Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres`}
                    secureTextEntry={!novaSenhaVisivel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmacaoRef.current?.focus()}
                    editable={!carregando}
                />

                <CampoTexto
                    ref={confirmacaoRef}
                    rotulo="Confirmar nova senha"
                    icone="key"
                    value={confirmacao}
                    onChangeText={aoDigitar(setConfirmacao)}
                    placeholder="Repita a nova senha"
                    secureTextEntry={!novaSenhaVisivel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={salvar}
                    editable={!carregando}
                />

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

                <View style={styles.botaoContainer}>
                    <PrimaryButton titulo="Alterar senha" onPress={salvar} carregando={carregando} />
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
        padding: espacamento.xxl,
        gap: espacamento.lg,
        backgroundColor: colors.fundo,
    },
    botaoContainer: {
        marginTop: espacamento.sm,
    },
});
