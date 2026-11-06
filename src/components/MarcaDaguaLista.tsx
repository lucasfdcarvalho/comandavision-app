import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

const PROPORCAO_LOGO = 1591 / 845;

export function MarcaDaguaLista() {
    const { width: larguraTela } = useWindowDimensions();
    const larguraMarca = Math.min(larguraTela * 0.72, 320);
    const alturaMarca = larguraMarca / PROPORCAO_LOGO;

    return (
        <View
            style={styles.container}
            pointerEvents="none"
            accessible={false}
            aria-hidden
            importantForAccessibility="no-hide-descendants">
            <Image
                source={require('../../assets/images/supri-logo-v2.png')}
                style={[styles.logo, { width: larguraMarca, height: alturaMarca }]}
                resizeMode="contain"
                accessible={false}
                aria-hidden
                importantForAccessibility="no"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        opacity: 0.06,
    },
});
