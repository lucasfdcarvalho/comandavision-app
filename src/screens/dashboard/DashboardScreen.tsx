import { View, Text, StyleSheet } from "react-native";

export function DashboardScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.texto}>Gestão (em construção)</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF9F6',
    },
    texto: {
        fontSize: 16,
        color: '#1F1F1F',
    },
});
