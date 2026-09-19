import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
    texto: string;
};

export function MensagemErro({ texto }: Props) {
    return (
        <View style={styles.container}>
            <Feather name="alert-circle" size={16} color={colors.erro} />
            <Text style={styles.texto}>{texto}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    texto: {
        flex: 1,
        color: colors.erro,
        fontSize: 14,
    },
});
