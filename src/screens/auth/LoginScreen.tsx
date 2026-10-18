import React, { useRef, useState } from "react";
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Image,
    StyleSheet,
    useWindowDimensions,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { CampoTexto } from "../../components/ui/CampoTexto";
import { Cartao } from "../../components/ui/Cartao";
import { colors } from "../../theme/colors";
import { espacamento, raio, sombras, tipografia } from "../../theme/tokens";

const PROPORCAO_LOGO = 1591 / 845;

export function LoginScreen() {
    const { entrar: autenticar } = useAuth();
    const { width: larguraTela } = useWindowDimensions();
    const larguraLogo = Math.min(larguraTela * 0.62, 240);

    const senhaInputRef = useRef<TextInput>(null);

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [senhaVisivel, setSenhaVisivel] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    async function entrar() {
        if (!email.trim()) {
            setMensagemErro('E-mail inválido');
            return;
        }
        if (!senha.trim()) {
            setMensagemErro('Senha inválida');
            return;
        }

        setMensagemErro('');

        try {
            setCarregando(true);
            await autenticar(email, senha);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível realizar a operação';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}>
            <ScrollView
                contentContainerStyle={styles.scrollConteudo}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                
                {/* Cabeçalho da Marca */}
                <View style={styles.headerMarca}>
                    <Image
                        source={require('../../../assets/images/supri-logo-v2.png')}
                        style={[
                            styles.logo,
                            {
                                width: larguraLogo,
                                height: larguraLogo / PROPORCAO_LOGO,
                            },
                        ]}
                        resizeMode="contain"
                        accessibilityLabel="Logo Supri Conveniência"
                    />
                    
                    <View style={styles.badgeApp}>
                        <View style={styles.pontoAtivo} />
                        <Text style={styles.textoBadgeApp}>ComandaVision</Text>
                    </View>
                </View>

                {/* Card de Autenticação */}
                <Cartao variante="elevado" style={styles.cartaoLogin}>
                    <View style={styles.cabecalhoForm}>
                        <Text style={styles.tituloForm}>Acesse sua conta</Text>
                        <Text style={styles.subtituloForm}>
                            Gerenciamento digital de comandas e salão
                        </Text>
                    </View>

                    <View style={styles.formulario}>
                        <CampoTexto
                            rotulo="E-MAIL"
                            icone="mail"
                            value={email}
                            onChangeText={(texto) => {
                                setEmail(texto);
                                if (mensagemErro) setMensagemErro('');
                            }}
                            placeholder="seu@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={() => senhaInputRef.current?.focus()}
                            editable={!carregando}
                        />

                        <CampoTexto
                            ref={senhaInputRef}
                            rotulo="SENHA"
                            icone="lock"
                            iconeDireita={senhaVisivel ? 'eye-off' : 'eye'}
                            onPressIconeDireita={() => setSenhaVisivel((v) => !v)}
                            value={senha}
                            onChangeText={(texto) => {
                                setSenha(texto);
                                if (mensagemErro) setMensagemErro('');
                            }}
                            placeholder="Sua senha de acesso"
                            secureTextEntry={!senhaVisivel}
                            autoCapitalize="none"
                            returnKeyType="done"
                            onSubmitEditing={entrar}
                            editable={!carregando}
                        />

                        {mensagemErro ? (
                            <View
                                style={styles.alertaErro}
                                accessible
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <Feather name="alert-circle" size={18} color={colors.erro} />
                                <Text style={styles.textoAlertaErro}>{mensagemErro}</Text>
                            </View>
                        ) : null}

                        <Pressable
                            onPress={entrar}
                            disabled={carregando}
                            accessibilityRole="button"
                            accessibilityLabel="Entrar no aplicativo"
                            style={({ pressed }) => [
                                styles.botaoEntrar,
                                pressed && !carregando && styles.botaoEntrarPressionado,
                                carregando && styles.botaoEntrarDesabilitado,
                            ]}>
                            {carregando ? (
                                <ActivityIndicator color={colors.grafite} size="small" />
                            ) : (
                                <>
                                    <Text style={styles.textoBotaoEntrar}>Entrar</Text>
                                    <Feather name="arrow-right" size={18} color={colors.grafite} />
                                </>
                            )}
                        </Pressable>
                    </View>
                </Cartao>

                {/* Rodapé institucional */}
                <View style={styles.rodape}>
                    <Feather name="shield" size={14} color={colors.textoTerciario} />
                    <Text style={styles.textoRodape}>
                        Exclusivo para equipe Supri Conveniência
                    </Text>
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
    scrollConteudo: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: espacamento.xl,
        paddingVertical: espacamento.xxl,
    },
    headerMarca: {
        alignItems: 'center',
        marginBottom: espacamento.xl,
        gap: espacamento.sm,
    },
    logo: {
        alignSelf: 'center',
    },
    badgeApp: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.xs + 2,
        backgroundColor: colors.laranjaClaro,
        paddingVertical: 5,
        paddingHorizontal: espacamento.md,
        borderRadius: raio.redondo,
        borderWidth: 1,
        borderColor: colors.laranjaBorda,
    },
    pontoAtivo: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.laranja,
    },
    textoBadgeApp: {
        ...tipografia.rotuloForte,
        color: colors.laranjaTexto,
        letterSpacing: 0.3,
    },
    cartaoLogin: {
        padding: espacamento.xxl,
        borderRadius: raio.xl,
    },
    cabecalhoForm: {
        marginBottom: espacamento.xl,
        gap: espacamento.xs,
    },
    tituloForm: {
        ...tipografia.titulo,
        color: colors.textoPrimario,
    },
    subtituloForm: {
        ...tipografia.rotulo,
        color: colors.textoSecundario,
    },
    formulario: {
        gap: espacamento.lg,
    },
    alertaErro: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.sm,
        padding: espacamento.md,
        backgroundColor: colors.erroFundo,
        borderRadius: raio.md,
        borderWidth: 1,
        borderColor: colors.erroBorda,
    },
    textoAlertaErro: {
        flex: 1,
        ...tipografia.corpo,
        fontSize: 14,
        color: colors.erroTexto,
        fontWeight: '500',
    },
    botaoEntrar: {
        width: '100%',
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: espacamento.sm,
        backgroundColor: colors.laranja,
        borderRadius: raio.md,
        marginTop: espacamento.xs,
        ...sombras.destaque,
    },
    botaoEntrarPressionado: {
        opacity: 0.88,
        transform: [{ scale: 0.99 }],
    },
    botaoEntrarDesabilitado: {
        opacity: 0.65,
    },
    textoBotaoEntrar: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.grafite,
        letterSpacing: 0.2,
    },
    rodape: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: espacamento.xs + 2,
        marginTop: espacamento.xxl,
    },
    textoRodape: {
        ...tipografia.legenda,
        color: colors.textoTerciario,
    },
});