import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { SeloVariacao } from "./SeloVariacao";

type Props = {
    rotulo: string;
    valor: string;
    variacao: number | null;
};

// Rótulo curto, valor em destaque e o selo de variação: o que é, quanto é e se melhorou.
export function CartaoIndicador({ rotulo, valor, variacao }: Props) {
    return (
        <View style={styles.cartao}>
            <Text style={styles.rotulo} numberOfLines={1}>{rotulo}</Text>
            <Text style={styles.valor} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
            <SeloVariacao variacao={variacao} />
        </View>
    );
}

const styles = StyleSheet.create({
    cartao: {
        flex: 1,
        minHeight: 104,
        gap: 6,
        padding: 14,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    rotulo: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    valor: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
});
