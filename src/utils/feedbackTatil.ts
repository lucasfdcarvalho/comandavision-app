import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Vibrações curtas que confirmam ações. No Android usa a API recomendada pelo Expo
// (performAndroidHapticsAsync), que imita o retorno tátil do iOS e não precisa de permissão.
// Falhas são ignoradas: aparelho sem motor de vibração ou vibração desligada não é erro.
function executar(android: Haptics.AndroidHaptics, ios: () => Promise<void>) {
    const vibracao = Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(android) : ios();
    vibracao.catch(() => undefined);
}

export const feedbackTatil = {
    sucesso: () => executar(Haptics.AndroidHaptics.Confirm, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    erro: () => executar(Haptics.AndroidHaptics.Reject, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    aviso: () => executar(Haptics.AndroidHaptics.Reject, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    selecao: () => executar(Haptics.AndroidHaptics.Segment_Tick, () => Haptics.selectionAsync()),
};
