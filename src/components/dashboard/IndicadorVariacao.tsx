import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { formatarPercentual } from "../../utils/dashboard";

type Props = {
    // null = sem base de comparação (período anterior sem movimento).
    variacao: number | null;
    comparacao?: string;
    compacto?: boolean;
};

// Direção sempre com seta + sinal + texto, nunca só pela cor.
export function IndicadorVariacao({ variacao, comparacao, compacto }: Props) {
    if (variacao === null) {
        return (
            <Text style={[styles.texto, styles.neutro, compacto && styles.textoCompacto]} numberOfLines={1}>
                {compacto ? 'sem comparação' : `Sem base de comparação ${comparacao ?? ''}`.trim()}
            </Text>
        );
    }

    const estavel = Math.abs(variacao) < 0.5;
    const subiu = variacao > 0;
    const cor = estavel ? colors.textoSecundario : subiu ? colors.sucesso : colors.erro;
    const icone = estavel ? 'minus' : subiu ? 'arrow-up-right' : 'arrow-down-right';
    const sinal = estavel ? '' : subiu ? '+' : '−';

    return (
        <View style={styles.linha}>
            <Feather name={icone} size={compacto ? 12 : 14} color={cor} />
            <Text style={[styles.texto, compacto && styles.textoCompacto, { color: cor }]} numberOfLines={1}>
                {estavel ? 'estável' : `${sinal}${formatarPercentual(Math.abs(variacao))}`}
            </Text>
            {comparacao && !compacto ? (
                <Text style={[styles.texto, styles.neutro]} numberOfLines={1}>{comparacao}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    linha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
    },
    texto: {
        fontSize: 13,
        fontWeight: '600',
    },
    textoCompacto: {
        fontSize: 11,
    },
    neutro: {
        fontWeight: '400',
        color: colors.textoSecundario,
        flexShrink: 1,
    },
});
