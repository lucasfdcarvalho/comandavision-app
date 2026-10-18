import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "./ui/Texto";
import { PrimaryButton } from "./PrimaryButton";
import { colors } from "../theme/colors";
import { espacamento, tipografia } from "../theme/tokens";
import { feedbackTatil } from "../utils/feedbackTatil";

type Props = {
    texto: string;
    aoTentarNovamente?: () => void;
};

// Tela inteira de falha ao carregar: ícone, título curto, motivo e ação para tentar de novo.
export function ErrorState({ texto, aoTentarNovamente }: Props) {
    useEffect(() => {
        feedbackTatil.erro();
    }, [texto]);

    return (
        <View style={styles.centro} accessibilityRole="alert">
            <View style={styles.icone}>
                <Feather name="cloud-off" size={28} color={colors.erro} />
            </View>
            <Text style={styles.titulo}>Não foi possível carregar</Text>
            <Text style={styles.texto}>{texto}</Text>
            {aoTentarNovamente ? (
                <PrimaryButton
                    titulo="Tentar novamente"
                    icone="refresh-cw"
                    onPress={aoTentarNovamente}
                    style={styles.botao}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: espacamento.sm,
        paddingHorizontal: espacamento.xxl,
        backgroundColor: colors.fundo,
    },
    icone: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: espacamento.sm,
        backgroundColor: colors.erroFundo,
        borderRadius: 32,
    },
    titulo: {
        ...tipografia.subtitulo,
        color: colors.textoPrimario,
        textAlign: 'center',
    },
    texto: {
        ...tipografia.corpo,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    botao: {
        alignSelf: 'stretch',
        marginTop: espacamento.lg,
    },
});
