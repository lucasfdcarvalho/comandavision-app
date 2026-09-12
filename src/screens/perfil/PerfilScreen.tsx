import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";

export function PerfilScreen() {
    const { usuario, sair } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.avatar}>
                <Feather name="user" size={32} color="#EA8B00" />
            </View>
            <Text style={styles.texto}>{usuario?.email}</Text>
            <Text style={styles.texto}>Papel: {usuario?.papel}</Text>
            <Pressable style={styles.botao} onPress={sair}>
                <Feather name="log-out" size={16} color="#FFFFFF" />
                <Text style={styles.textoBotao}>Sair</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FAF9F6',
    },
    avatar: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FCEBD1',
        borderRadius: 36,
        marginBottom: 4,
    },
    texto: {
        fontSize: 16,
        color: '#1F1F1F',
    },
    botao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#EA8B00',
        borderRadius: 8,
    },
    textoBotao: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
