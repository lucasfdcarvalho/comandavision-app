import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function LoadingState() {
    return (
        <View style={styles.centro}>
            <ActivityIndicator size="large" color={colors.laranja} />
        </View>
    );
}

const styles = StyleSheet.create({
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
    },
});
