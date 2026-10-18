import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import type { DimensionValue, StyleProp, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type Props = {
    largura?: DimensionValue;
    altura?: number;
    raio?: number;
    style?: StyleProp<ViewStyle>;
};

// Bloco cinza que pulsa no lugar do conteúdo enquanto ele carrega.
export function Esqueleto({ largura = '100%', altura = 14, raio = 8, style }: Props) {
    const opacidade = useRef(new Animated.Value(0.55)).current;

    useEffect(() => {
        const pulso = Animated.loop(
            Animated.sequence([
                Animated.timing(opacidade, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacidade, { toValue: 0.55, duration: 700, useNativeDriver: true }),
            ])
        );
        pulso.start();
        return () => pulso.stop();
    }, [opacidade]);

    return (
        <Animated.View
            style={[styles.bloco, { width: largura, height: altura, borderRadius: raio, opacity: opacidade }, style]}
        />
    );
}

const styles = StyleSheet.create({
    bloco: {
        backgroundColor: colors.bordaForte,
    },
});
