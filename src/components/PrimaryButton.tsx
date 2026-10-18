import { Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "./ui/Texto";
import type { StyleProp, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { raio, sombras } from "../theme/tokens";

type Props = {
    titulo: string;
    onPress: () => void;
    disabled?: boolean;
    carregando?: boolean;
    icone?: keyof typeof Feather.glyphMap;
    style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ titulo, onPress, disabled, carregando, icone, style }: Props) {
    const inativo = Boolean(disabled || carregando);

    return (
        <Pressable
            onPress={onPress}
            disabled={inativo}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.botao,
                inativo ? styles.botaoInativo : styles.botaoAtivo,
                pressed && !inativo && styles.botaoPressionado,
                style,
            ]}>
            {carregando ? (
                <ActivityIndicator color={inativo ? colors.textoSecundario : colors.grafite} />
            ) : (
                <>
                    {icone ? (
                        <Feather name={icone} size={16} color={inativo ? colors.textoSecundario : colors.grafite} />
                    ) : null}
                    <Text style={[styles.texto, inativo && styles.textoInativo]}>{titulo}</Text>
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    botao: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        borderRadius: raio.md,
    },
    // Texto grafite sobre o laranja (7:1 de contraste), igual ao botão de entrar do login.
    botaoAtivo: {
        backgroundColor: colors.laranja,
        ...sombras.destaque,
    },
    botaoInativo: {
        backgroundColor: colors.borda,
    },
    botaoPressionado: {
        opacity: 0.85,
    },
    texto: {
        color: colors.grafite,
        fontSize: 16,
        fontWeight: '700',
    },
    textoInativo: {
        color: colors.textoSecundario,
    },
});
