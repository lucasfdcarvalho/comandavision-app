import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Image, StyleSheet, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";

const PROPORCAO_LOGO = 1591 / 845;

export function LoginScreen() {
    const { entrar: autenticar } = useAuth();
    const { width: larguraTela } = useWindowDimensions();
    const larguraLogo = Math.min(larguraTela * 0.65, 260);

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
        <View style={styles.container}>
            <Image
                source={require('../../../assets/images/supri-logo-v2.png')}
                style={[styles.logo, { width: larguraLogo, height: larguraLogo / PROPORCAO_LOGO }]}
                resizeMode="contain"
            />
            <TextInput style={styles.campo} value={email} onChangeText={setEmail} placeholder="Digite o seu e-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}></TextInput>
            <View style={styles.campoSenha}>
                <Feather name="lock" size={18} color="#6B6B6B" />
                <TextInput
                    style={styles.campoSenhaTexto}
                    value={senha}
                    onChangeText={setSenha}
                    placeholder="Digite a sua senha"
                    secureTextEntry={!senhaVisivel}
                    autoCapitalize="none"
                />
                <Pressable onPress={() => setSenhaVisivel((visivel) => !visivel)} hitSlop={8}>
                    <Feather name={senhaVisivel ? 'eye-off' : 'eye'} size={18} color="#6B6B6B" />
                </Pressable>
            </View>
            {mensagemErro ? (<Text style={styles.mensagemErro}>{mensagemErro}</Text>) : null}
            <Pressable
                onPress={entrar}
                disabled={carregando}
                style={({ pressed }) => [
                    styles.botao,
                    pressed && !carregando && styles.botaoPressionado,
                    carregando && styles.botaoDesabilitado,
                ]}>
                {carregando ? (<ActivityIndicator color="#FFFFFF" />) : (<Text style={styles.textoBotao}>Entrar</Text>)}
            </Pressable>
        </View>
    )

}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#FAF9F6',
        gap: 14,
    },

    logo: {
        alignSelf: 'center',
        marginBottom: 22,
    },

    campo: {
        width: '100%',
        height: 50,
        paddingHorizontal: 14,
        color: '#1F1F1F',
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
    },

    campoSenha: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
    },

    campoSenhaTexto: {
        flex: 1,
        height: '100%',
        color: '#1F1F1F',
        fontSize: 16,
    },

    mensagemErro: {
        color: '#C62828',
        fontSize: 14,
        textAlign: 'center',
    },

    botao: {
        width: '100%',
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        backgroundColor: '#EA8B00',
        borderRadius: 8,
    },

    botaoPressionado: {
        opacity: 0.8,
    },

    botaoDesabilitado: {
        opacity: 0.6,
    },

    textoBotao: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});