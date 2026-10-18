import { forwardRef } from "react";
import {
    Text as TextoNativo,
    TextInput as CampoNativo,
    StyleSheet,
} from "react-native";
import type { TextProps, TextInputProps, TextStyle } from "react-native";
import { familiaPorPeso } from "../../theme/fontes";

// Converte o fontWeight do estilo na família da Inter correspondente.
// Quem já define fontFamily explicitamente mantém a sua.
function aplicarFonte(style: TextProps['style']): TextStyle[] {
    const achatado = (StyleSheet.flatten(style) ?? {}) as TextStyle;
    if (achatado.fontFamily) {
        return [achatado];
    }
    return [{ ...achatado, fontFamily: familiaPorPeso(achatado.fontWeight), fontWeight: undefined }];
}

// Substitutos de Text e TextInput do React Native com a fonte do app.
// As telas importam daqui em vez de "react-native".
export const Text = forwardRef<TextoNativo, TextProps>(function Text({ style, ...props }, ref) {
    return <TextoNativo ref={ref} {...props} style={aplicarFonte(style)} />;
});

export const TextInput = forwardRef<CampoNativo, TextInputProps>(function TextInput({ style, ...props }, ref) {
    return <CampoNativo ref={ref} {...props} style={aplicarFonte(style)} />;
});

export type Text = TextoNativo;
export type TextInput = CampoNativo;
