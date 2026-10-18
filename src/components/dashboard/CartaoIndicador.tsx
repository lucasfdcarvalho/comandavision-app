import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SeloVariacao } from "./SeloVariacao";
import type { ResultadoComparacao } from "../../utils/dashboard";

type Props = {
    rotulo: string;
    valor: string;
    comparacao?: ResultadoComparacao;
    variacao?: number | null;
};

// Rótulo curto, valor em destaque e indicador de comparação (variação percentual ou estado explicativo).
export function CartaoIndicador({ rotulo, valor, comparacao, variacao }: Props) {
    const comp: ResultadoComparacao | null = comparacao ?? (
        variacao !== undefined && variacao !== null
            ? { status: 'sucesso', variacao }
            : null
    );

    return (
        <View style={styles.cartao}>
            <Text style={styles.rotulo} numberOfLines={1}>{rotulo}</Text>
            <Text style={styles.valor} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
            
            <View style={styles.areaComparacao}>
                {comp?.status === 'sucesso' ? (
                    <SeloVariacao variacao={comp.variacao} />
                ) : comp?.status === 'sem_base' ? (
                    <View style={styles.seloNeutro} accessibilityLabel="Sem base para comparação">
                        <Feather name="minus" size={12} color={colors.textoSecundario} />
                        <Text
                            style={styles.textoSeloNeutro}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            Sem base para comparação
                        </Text>
                    </View>
                ) : comp?.status === 'indisponivel' ? (
                    <View style={styles.seloIndisponivel} accessibilityLabel="Comparação indisponível">
                        <Feather name="help-circle" size={12} color={colors.textoSecundario} />
                        <Text
                            style={styles.textoSeloNeutro}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            Comparação indisponível
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cartao: {
        flex: 1,
        minHeight: 110,
        gap: 6,
        padding: 14,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        justifyContent: 'space-between',
    },
    rotulo: {
        fontSize: 13,
        color: colors.textoSecundario,
        fontWeight: '500',
    },
    valor: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textoPrimario,
        fontVariant: ['tabular-nums'],
    },
    areaComparacao: {
        minHeight: 24,
        justifyContent: 'center',
    },
    seloNeutro: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: colors.statusFundo.fechada,
    },
    seloIndisponivel: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: colors.fundoSecundario,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    textoSeloNeutro: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textoSecundario,
        flexShrink: 1,
    },
});
