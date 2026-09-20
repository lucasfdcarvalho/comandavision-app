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

export function SecondaryButton({ titulo, onPress, disabled, carregando, icone, style }: Props) {
    const inativo = Boolean(disabled || carregando);

    return (
        <Pressable
            onPress={onPress}
            disabled={inativo}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.botao,
                pressed && !inativo && styles.botaoPressionado,
                inativo && styles.botaoInativo,
                style,
            ]}>
            {carregando ? (
                <ActivityIndicator color={colors.erro} />
            ) : (
                <>
                    {icone ? <Feather name={icone} size={16} color={colors.erro} /> : null}
                    <Text style={styles.texto}>{titulo}</Text>
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
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.erro,
        borderRadius: 8,
    },
    botaoInativo: {
        opacity: 0.6,
    },
    botaoPressionado: {
        opacity: 0.85,
    },
    texto: {
        color: colors.erro,
        fontSize: 15,
        fontWeight: '700',
    },
});
