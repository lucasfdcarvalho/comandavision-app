import { ActivityIndicator, View, StyleSheet } from "react-native";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import type { Theme } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/colors";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";

// Fundo e cores da navegação iguais aos das telas, para não piscar branco nas transições.
const tema: Theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.laranja,
        background: colors.fundo,
        card: colors.fundo,
        text: colors.textoPrimario,
        border: colors.borda,
    },
};

export function AppNavigator() {
    const { usuario, carregandoSessao } = useAuth();

    if (carregandoSessao) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.laranja} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={tema}>
            {usuario ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
    },
});
