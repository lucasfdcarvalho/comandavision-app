import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "./ui/Texto";
import { Feather } from "@expo/vector-icons";
import type { Comanda } from "../types/Comanda";
import { colors } from "../theme/colors";
import { raio, sombras } from "../theme/tokens";
import { StatusBadge } from "./StatusBadge";
import { AparecerSuave } from "./ui/AparecerSuave";

type Props = {
    comanda: Comanda;
    subtitulo: string;
    onPress: () => void;
    mostrarNumero?: boolean;
};

export function ComandaCard({ comanda, subtitulo, onPress, mostrarNumero = false }: Props) {
    return (
        <AparecerSuave>
            <Pressable
                style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}
                onPress={onPress}
                accessibilityRole="button">
                <View style={styles.icone}>
                    <Feather name="file-text" size={20} color={colors.laranja} />
                </View>
                <View style={styles.info}>
                    <View style={styles.linhaCabecalho}>
                        <View style={styles.identificacaoContainer}>
                            <Text style={styles.identificacao}>{comanda.identificacao}</Text>
                            {mostrarNumero ? <Text style={styles.numero}>#{comanda.id}</Text> : null}
                        </View>
                        <StatusBadge status={comanda.status} />
                    </View>
                    <Text style={styles.subtitulo}>{subtitulo}</Text>
                </View>
            </Pressable>
        </AparecerSuave>
    );
}

const styles = StyleSheet.create({
    cartaoPressionado: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    cartao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.superficie,
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        ...sombras.suave,
    },
    icone: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
        borderRadius: 20,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    linhaCabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    identificacao: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    identificacaoContainer: {
        flex: 1,
        gap: 2,
    },
    numero: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    subtitulo: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
});
