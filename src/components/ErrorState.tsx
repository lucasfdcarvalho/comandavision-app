import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { MensagemErro } from "./MensagemErro";

type Props = {
    texto: string;
    aoTentarNovamente?: () => void;
};

export function ErrorState({ texto, aoTentarNovamente }: Props) {
    return (
        <View style={styles.centro}>
            <MensagemErro texto={texto} />
            {aoTentarNovamente ? (
                <Pressable style={styles.botao} onPress={aoTentarNovamente} accessibilityRole="button">
                    <Text style={styles.textoBotao}>Tentar novamente</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 24,
        backgroundColor: colors.fundo,
    },
    botao: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
    textoBotao: {
        color: colors.superficie,
        fontWeight: '700',
    },
});
