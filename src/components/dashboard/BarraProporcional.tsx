import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
    // Fração entre 0 e 1 do trilho preenchida.
    proporcao: number;
    destaque?: boolean;
};

// Barra horizontal fina: trilho claro da mesma rampa e preenchimento com ponta arredondada.
export function BarraProporcional({ proporcao, destaque = true }: Props) {
    const largura = `${Math.min(100, Math.max(0, proporcao * 100))}%` as const;

    return (
        <View style={styles.trilho}>
            {proporcao > 0 ? (
                <View
                    style={[
                        styles.preenchimento,
                        { width: largura, minWidth: 4 },
                        !destaque && styles.preenchimentoSuave,
                    ]}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    trilho: {
        height: 8,
        backgroundColor: colors.grafico.trilho,
        borderRadius: 4,
        overflow: 'hidden',
    },
    preenchimento: {
        height: '100%',
        backgroundColor: colors.grafico.destaque,
        borderRadius: 4,
    },
    preenchimentoSuave: {
        backgroundColor: colors.grafico.suave,
    },
});
