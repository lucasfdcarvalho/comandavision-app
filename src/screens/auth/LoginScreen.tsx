import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../../hooks/useAuth";


export function LoginScreen() {
    const { entrar: autenticar } = useAuth();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
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
            <Text style={styles.titulo}>ComandaVision</Text>
            <TextInput style={styles.campo} value={email} onChangeText={setEmail} placeholder="Digite o seu e-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}></TextInput>
            <TextInput style={styles.campo} value={senha} onChangeText={setSenha} placeholder="Digite a sua senha" secureTextEntry autoCapitalize="none"></TextInput>
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

    titulo: {
        marginBottom: 18,
        color: '#1F1F1F',
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
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