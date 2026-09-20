import { Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = {
    texto: string;
};

export function EmptyState({ texto }: Props) {
    return <Text style={styles.texto}>{texto}</Text>;
}

const styles = StyleSheet.create({
    texto: {
        color: colors.textoSecundario,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 24,
    },
});
