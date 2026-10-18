import { View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { espacamento, raio } from "../theme/tokens";
import { Esqueleto } from "./Esqueleto";

// Formato do esqueleto: imita a tela que está carregando para ela "aparecer" pronta mais rápido.
type Variante = 'lista' | 'painel' | 'detalhe' | 'formulario';

type Props = {
    variante?: Variante;
};

function CartaoEsqueleto({ children }: { children: React.ReactNode }) {
    return <View style={styles.cartao}>{children}</View>;
}

function ItemLista() {
    return (
        <CartaoEsqueleto>
            <View style={styles.linha}>
                <Esqueleto largura={44} altura={44} raio={raio.md} />
                <View style={styles.flex}>
                    <Esqueleto largura="60%" altura={14} />
                    <Esqueleto largura="35%" altura={12} />
                </View>
                <Esqueleto largura={56} altura={14} />
            </View>
        </CartaoEsqueleto>
    );
}

export function LoadingState({ variante = 'lista' }: Props) {
    return (
        <View
            style={styles.container}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Carregando">
            {variante === 'lista' ? (
                <>
                    <Esqueleto altura={46} raio={raio.sm} />
                    {Array.from({ length: 6 }, (_, indice) => <ItemLista key={indice} />)}
                </>
            ) : variante === 'painel' ? (
                <>
                    <Esqueleto altura={40} raio={raio.redondo} />
                    <View style={styles.linha}>
                        <CartaoEsqueleto><Esqueleto largura="50%" altura={12} /><Esqueleto largura="80%" altura={22} /></CartaoEsqueleto>
                        <CartaoEsqueleto><Esqueleto largura="50%" altura={12} /><Esqueleto largura="80%" altura={22} /></CartaoEsqueleto>
                    </View>
                    <View style={styles.linha}>
                        <CartaoEsqueleto><Esqueleto largura="50%" altura={12} /><Esqueleto largura="80%" altura={22} /></CartaoEsqueleto>
                        <CartaoEsqueleto><Esqueleto largura="50%" altura={12} /><Esqueleto largura="80%" altura={22} /></CartaoEsqueleto>
                    </View>
                    <CartaoEsqueleto>
                        <Esqueleto largura="40%" altura={14} />
                        <Esqueleto altura={150} raio={raio.sm} />
                    </CartaoEsqueleto>
                </>
            ) : variante === 'detalhe' ? (
                <>
                    <CartaoEsqueleto>
                        <Esqueleto largura="45%" altura={18} />
                        <Esqueleto largura="30%" altura={12} />
                        <Esqueleto largura="55%" altura={28} />
                    </CartaoEsqueleto>
                    {Array.from({ length: 4 }, (_, indice) => <ItemLista key={indice} />)}
                </>
            ) : (
                <>
                    {Array.from({ length: 4 }, (_, indice) => (
                        <View key={indice} style={styles.campo}>
                            <Esqueleto largura="30%" altura={12} />
                            <Esqueleto altura={50} raio={raio.sm} />
                        </View>
                    ))}
                    <Esqueleto altura={52} raio={raio.md} style={styles.botao} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: espacamento.md,
        padding: espacamento.lg,
        backgroundColor: colors.fundo,
    },
    cartao: {
        flex: 1,
        gap: espacamento.sm,
        padding: espacamento.lg,
        backgroundColor: colors.superficie,
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    linha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.md,
    },
    flex: {
        flex: 1,
        gap: espacamento.sm,
    },
    campo: {
        gap: espacamento.sm,
    },
    botao: {
        marginTop: espacamento.lg,
    },
});
