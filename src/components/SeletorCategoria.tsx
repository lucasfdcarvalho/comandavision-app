import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Categoria } from "../types/Categoria";
import { colors } from "../theme/colors";

type Props = {
    categorias: Categoria[];
    categoriaSelecionadaId: number | null;
    onSelecionar: (id: number) => void;
    desabilitado?: boolean;
};

export function SeletorCategoria({ categorias, categoriaSelecionadaId, onSelecionar, desabilitado }: Props) {
    if (categorias.length === 0) {
        return <Text style={styles.textoVazio}>Nenhuma categoria ativa disponível — crie uma categoria antes.</Text>;
    }

    return (
        <View style={styles.lista}>
            {categorias.map((categoria) => {
                const selecionada = categoria.id === categoriaSelecionadaId;
                return (
                    <Pressable
                        key={categoria.id}
                        onPress={() => onSelecionar(categoria.id)}
                        disabled={desabilitado}
                        accessibilityRole="button"
                        accessibilityLabel={`Selecionar categoria ${categoria.nome}`}
                        style={[styles.linha, selecionada && styles.linhaSelecionada]}>
                        <Text style={[styles.texto, selecionada && styles.textoSelecionado]}>{categoria.nome}</Text>
                        {selecionada ? <Feather name="check-circle" size={18} color={colors.laranja} /> : null}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    lista: {
        gap: 8,
    },
    linha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 10,
    },
    linhaSelecionada: {
        borderColor: colors.laranja,
        backgroundColor: '#FDF1E0',
    },
    texto: {
        fontSize: 15,
        color: colors.textoPrimario,
    },
    textoSelecionado: {
        fontWeight: '700',
    },
    textoVazio: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
});
