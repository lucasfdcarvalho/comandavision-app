import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

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
                <ActivityIndicator color={inativo ? colors.textoSecundario : colors.superficie} />
            ) : (
                <>
                    {icone ? (
                        <Feather name={icone} size={16} color={inativo ? colors.textoSecundario : colors.superficie} />
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
        minHeight: 50,
        borderRadius: 8,
    },
    botaoAtivo: {
        backgroundColor: colors.laranja,
    },
    botaoInativo: {
        backgroundColor: colors.borda,
    },
    botaoPressionado: {
        opacity: 0.85,
    },
    texto: {
        color: colors.superficie,
        fontSize: 16,
        fontWeight: '700',
    },
    textoInativo: {
        color: colors.textoSecundario,
    },
});
