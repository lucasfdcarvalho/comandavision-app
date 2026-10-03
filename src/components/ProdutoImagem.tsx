import { useEffect, useState } from "react";
import { Image, View, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle, ImageStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
    imagemUrl?: string | null;
    tamanho?: number;
    style?: StyleProp<ViewStyle>;
};

export function ProdutoImagem({ imagemUrl, tamanho = 44, style }: Props) {
    const [falhouCarregamento, setFalhouCarregamento] = useState(false);

    useEffect(() => {
        setFalhouCarregamento(false);
    }, [imagemUrl]);

    const dimensoes = { width: tamanho, height: tamanho, borderRadius: tamanho * 0.2 };
    const mostrarFallback = !imagemUrl || falhouCarregamento;

    if (mostrarFallback) {
        return (
            <View style={[styles.placeholder, dimensoes, style]}>
                <Feather name="package" size={tamanho * 0.45} color={colors.textoSecundario} />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: imagemUrl }}
            style={[dimensoes, style as StyleProp<ImageStyle>]}
            resizeMode="cover"
            onError={() => setFalhouCarregamento(true)}
        />
    );
}

const styles = StyleSheet.create({
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
    },
});
