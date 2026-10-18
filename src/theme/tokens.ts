import { Platform, ViewStyle, TextStyle } from "react-native";
import { colors } from "./colors";

export const espacamento = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const raio = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    redondo: 999,
} as const;

export const sombras = {
    nenhuma: {} as ViewStyle,
    suave: Platform.select<ViewStyle>({
        ios: {
            shadowColor: '#1F1F1F',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
        },
        android: {
            elevation: 2,
        },
        default: {
            // Web
            boxShadow: '0 2px 8px rgba(31, 31, 31, 0.05)',
        } as unknown as ViewStyle,
    }) || {},
    media: Platform.select<ViewStyle>({
        ios: {
            shadowColor: '#1F1F1F',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
        },
        android: {
            elevation: 4,
        },
        default: {
            boxShadow: '0 4px 14px rgba(31, 31, 31, 0.08)',
        } as unknown as ViewStyle,
    }) || {},
    destaque: Platform.select<ViewStyle>({
        ios: {
            shadowColor: '#EA8B00',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.16,
            shadowRadius: 12,
        },
        android: {
            elevation: 5,
        },
        default: {
            boxShadow: '0 4px 12px rgba(234, 139, 0, 0.20)',
        } as unknown as ViewStyle,
    }) || {},
} as const;

export const tipografia = {
    destaque: {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 38,
        letterSpacing: -0.5,
        fontVariant: ['tabular-nums'],
    } as TextStyle,
    titulo: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 28,
        letterSpacing: -0.3,
    } as TextStyle,
    subtitulo: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 22,
        letterSpacing: -0.2,
    } as TextStyle,
    corpo: {
        fontSize: 15,
        fontWeight: '400',
        lineHeight: 21,
    } as TextStyle,
    corpoForte: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 21,
    } as TextStyle,
    rotulo: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    } as TextStyle,
    rotuloForte: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    } as TextStyle,
    legenda: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    } as TextStyle,
    tabular: {
        fontVariant: ['tabular-nums'],
    } as TextStyle,
} as const;
