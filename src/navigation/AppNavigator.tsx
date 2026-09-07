import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";

export function AppNavigator() {
    const { usuario, carregandoSessao } = useAuth();

    if (carregandoSessao) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#EA8B00" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {usuario ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
});
