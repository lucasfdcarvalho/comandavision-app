import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { espacamento, raio, sombras } from "../../theme/tokens";

interface CartaoProps extends ViewProps {
    variante?: 'padrao' | 'elevado' | 'destaque' | 'grafite';
}

export function Cartao({ variante = 'padrao', style, children, ...rest }: CartaoProps) {
    const estiloVariante = 
        variante === 'grafite' ? styles.cartaoGrafite :
        variante === 'destaque' ? styles.cartaoDestaque :
        variante === 'elevado' ? styles.cartaoElevado :
        styles.cartaoPadrao;

    return (
        <View style={[styles.base, estiloVariante, style]} {...rest}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: raio.lg,
        padding: espacamento.lg,
    },
    cartaoPadrao: {
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        ...sombras.suave,
    },
    cartaoElevado: {
        backgroundColor: colors.superficieElevada,
        borderWidth: 1,
        borderColor: colors.borda,
        ...sombras.media,
    },
    cartaoDestaque: {
        backgroundColor: colors.superficie,
        borderWidth: 1.5,
        borderColor: colors.laranjaBorda,
        ...sombras.destaque,
    },
    cartaoGrafite: {
        backgroundColor: colors.grafite,
        borderWidth: 1,
        borderColor: colors.grafiteBorda,
        ...sombras.media,
    },
});
