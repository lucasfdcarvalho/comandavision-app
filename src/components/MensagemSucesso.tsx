import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
    texto: string;
};

export function MensagemSucesso({ texto }: Props) {
    return (
        <View style={styles.container}>
            <Feather name="check-circle" size={16} color={colors.sucesso} />
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
        color: colors.sucesso,
        fontSize: 14,
    },
});
