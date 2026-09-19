import { Text, StyleSheet } from "react-native";
import type { StatusComanda } from "../types/Comanda";
import { colors } from "../theme/colors";

type Props = {
    status: StatusComanda;
};

export function StatusBadge({ status }: Props) {
    const chave = status.toLowerCase() as 'aberta' | 'fechada' | 'cancelada';

    return (
        <Text style={[styles.badge, { color: colors.status[chave], backgroundColor: colors.statusFundo[chave] }]}>
            {status}
        </Text>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: '700',
        overflow: 'hidden',
    },
});
