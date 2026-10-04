import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { formatarPercentual } from "../../utils/dashboard";

type Props = {
    // null = sem base de comparação: o selo não aparece.
    variacao: number | null;
};

// Selo com fundo tingido, seta e percentual (padrão de cartões de métrica da Shopify).
// A direção é dada pela seta, não só pela cor.
export function SeloVariacao({ variacao }: Props) {
    if (variacao === null) {
        return null;
    }

    const estavel = Math.abs(variacao) < 0.5;
    const subiu = variacao > 0;
    const corTexto = estavel ? colors.textoSecundario : subiu ? colors.sucesso : colors.erro;
    const corFundo = estavel ? colors.statusFundo.fechada : subiu ? colors.statusFundo.aberta : colors.statusFundo.cancelada;
    const icone = estavel ? 'minus' : subiu ? 'arrow-up' : 'arrow-down';

    return (
        <View
            style={[styles.selo, { backgroundColor: corFundo }]}
            accessibilityLabel={estavel ? 'Estável' : `${subiu ? 'Subiu' : 'Caiu'} ${formatarPercentual(Math.abs(variacao))}`}>
            <Feather name={icone} size={14} color={corTexto} />
            {!estavel ? (
                <Text style={[styles.texto, { color: corTexto }]}>{formatarPercentual(Math.abs(variacao))}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    selo: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 3,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    texto: {
        fontSize: 13,
        fontWeight: '700',
    },
});
