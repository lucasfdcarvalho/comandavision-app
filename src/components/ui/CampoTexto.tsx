import React, { useState } from "react";
import { View, TextInputProps, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Text, TextInput } from "./Texto";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { espacamento, raio, tipografia } from "../../theme/tokens";

interface CampoTextoProps extends TextInputProps {
    rotulo?: string;
    icone?: keyof typeof Feather.glyphMap;
    iconeDireita?: keyof typeof Feather.glyphMap;
    onPressIconeDireita?: () => void;
    erro?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export const CampoTexto = React.forwardRef<TextInput, CampoTextoProps>(
    (
        {
            rotulo,
            icone,
            iconeDireita,
            onPressIconeDireita,
            erro,
            containerStyle,
            style,
            onFocus,
            onBlur,
            ...rest
        },
        ref
    ) => {
        const [focado, setFocado] = useState(false);

        return (
            <View style={[styles.container, containerStyle]}>
                {rotulo ? <Text style={styles.rotulo}>{rotulo}</Text> : null}
                <View
                    style={[
                        styles.inputWrapper,
                        focado && styles.inputWrapperFocado,
                        Boolean(erro) && styles.inputWrapperErro,
                    ]}>
                    {icone ? (
                        <View style={styles.iconeEsquerda}>
                            <Feather
                                name={icone}
                                size={18}
                                color={focado ? colors.laranja : colors.textoSecundario}
                            />
                        </View>
                    ) : null}
                    <TextInput
                        ref={ref}
                        style={[
                            styles.input,
                            icone ? styles.inputComIcone : null,
                            iconeDireita ? styles.inputComIconeDireita : null,
                            style,
                        ]}
                        placeholderTextColor={colors.textoTerciario}
                        onFocus={(e) => {
                            setFocado(true);
                            onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            setFocado(false);
                            onBlur?.(e);
                        }}
                        {...rest}
                    />
                    {iconeDireita ? (
                        <Pressable
                            onPress={onPressIconeDireita}
                            style={styles.iconeDireita}
                            hitSlop={8}
                            accessibilityRole="button">
                            <Feather
                                name={iconeDireita}
                                size={18}
                                color={colors.textoSecundario}
                            />
                        </Pressable>
                    ) : null}
                </View>
                {erro ? <Text style={styles.textoErro}>{erro}</Text> : null}
            </View>
        );
    }
);

CampoTexto.displayName = 'CampoTexto';

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: espacamento.xs + 2,
    },
    rotulo: {
        ...tipografia.rotuloForte,
        color: colors.textoPrimario,
        letterSpacing: 0.2,
    },
    inputWrapper: {
        width: '100%',
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.superficie,
        borderWidth: 1.5,
        borderColor: colors.borda,
        borderRadius: raio.md,
        paddingHorizontal: espacamento.md,
    },
    inputWrapperFocado: {
        borderColor: colors.laranja,
        backgroundColor: colors.laranjaSubtil,
    },
    inputWrapperErro: {
        borderColor: colors.erro,
        backgroundColor: colors.erroFundo,
    },
    iconeEsquerda: {
        marginRight: espacamento.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconeDireita: {
        padding: espacamento.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        height: '100%',
        color: colors.textoPrimario,
        ...tipografia.corpo,
    },
    inputComIcone: {
        paddingLeft: 2,
    },
    inputComIconeDireita: {
        paddingRight: 2,
    },
    textoErro: {
        ...tipografia.legenda,
        color: colors.erro,
        marginTop: 2,
    },
});
