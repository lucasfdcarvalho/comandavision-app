import { View, Pressable, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { PapelUsuario } from "../types/Usuario";
import { colors } from "../theme/colors";

const OPCOES: { papel: PapelUsuario; titulo: string; descricao: string; icone: keyof typeof Feather.glyphMap }[] = [
    { papel: 'FUNCIONARIO', titulo: 'Funcionário', descricao: 'Comandas e pagamentos', icone: 'user' },
    { papel: 'DONO', titulo: 'Dono', descricao: 'Acesso total, incluindo Gestão', icone: 'shield' },
];

type Props = {
    papelSelecionado: PapelUsuario | null;
    onSelecionar: (papel: PapelUsuario) => void;
    desabilitado?: boolean;
};

export function SeletorPapel({ papelSelecionado, onSelecionar, desabilitado }: Props) {
    return (
        <View style={styles.linha}>
            {OPCOES.map((opcao) => {
                const selecionado = opcao.papel === papelSelecionado;
                return (
                    <Pressable
                        key={opcao.papel}
                        style={[styles.opcao, selecionado && styles.opcaoSelecionada, desabilitado && styles.opcaoDesabilitada]}
                        onPress={() => onSelecionar(opcao.papel)}
                        disabled={desabilitado}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selecionado, disabled: desabilitado }}
                        accessibilityLabel={`${opcao.titulo}: ${opcao.descricao}`}>
                        <Feather name={opcao.icone} size={18} color={selecionado ? colors.superficie : colors.laranja} />
                        <Text style={[styles.titulo, selecionado && styles.textoSelecionado]}>{opcao.titulo}</Text>
                        <Text style={[styles.descricao, selecionado && styles.textoSelecionado]}>{opcao.descricao}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    linha: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    opcao: {
        flex: 1,
        gap: 4,
        padding: 12,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 10,
    },
    opcaoSelecionada: {
        backgroundColor: colors.laranja,
        borderColor: colors.laranja,
    },
    opcaoDesabilitada: {
        opacity: 0.6,
    },
    titulo: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    descricao: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    textoSelecionado: {
        color: colors.superficie,
    },
});
