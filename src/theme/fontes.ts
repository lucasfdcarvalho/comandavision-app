import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import type { TextStyle } from "react-native";

// Arquivos da Inter carregados na abertura do app (App.tsx).
export const ARQUIVOS_FONTE = {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
};

// Cada peso é uma família própria: no Android, fontWeight sobre uma fonte customizada
// não troca o arquivo e ainda pode aplicar um negrito "falso" por cima.
export function familiaPorPeso(peso: TextStyle['fontWeight']): string {
    switch (String(peso ?? '400')) {
        case '500':
            return 'Inter_500Medium';
        case '600':
            return 'Inter_600SemiBold';
        case 'bold':
        case '700':
            return 'Inter_700Bold';
        case '800':
        case '900':
            return 'Inter_800ExtraBold';
        default:
            return 'Inter_400Regular';
    }
}
