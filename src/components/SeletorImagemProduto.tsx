import { useDialogo } from "../contexts/DialogoContext";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../theme/colors";
import { ProdutoImagem } from "./ProdutoImagem";

export type ImagemSelecionada = {
    uri: string;
    mimeType?: string | null;
};

type Props = {
    // URL já salva (remota) ou arquivo escolhido agora (local); null quando não há imagem.
    imagemUri: string | null;
    onSelecionar: (imagem: ImagemSelecionada) => void;
    onRemover: () => void;
    desabilitado?: boolean;
};

export function SeletorImagemProduto({ imagemUri, onSelecionar, onRemover, desabilitado }: Props) {
    const { alertar } = useDialogo();
    async function escolherImagem() {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
            alertar('Permissão necessária', 'Libere o acesso às fotos nas configurações do aparelho para escolher uma imagem.', undefined, 'aviso');
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (resultado.canceled || !resultado.assets[0]) {
            return;
        }

        const { uri, mimeType } = resultado.assets[0];
        onSelecionar({ uri, mimeType });
    }

    return (
        <View style={styles.container}>
            <ProdutoImagem imagemUrl={imagemUri} tamanho={96} />
            <View style={styles.acoes}>
                <Pressable
                    style={styles.botao}
                    onPress={escolherImagem}
                    disabled={desabilitado}
                    accessibilityRole="button"
                    accessibilityLabel={imagemUri ? 'Trocar imagem do produto' : 'Escolher imagem do produto'}>
                    <Feather name="image" size={16} color={colors.laranja} />
                    <Text style={styles.textoBotao}>{imagemUri ? 'Trocar imagem' : 'Escolher imagem'}</Text>
                </Pressable>
                {imagemUri ? (
                    <Pressable
                        style={styles.botao}
                        onPress={onRemover}
                        disabled={desabilitado}
                        accessibilityRole="button"
                        accessibilityLabel="Remover imagem do produto">
                        <Feather name="trash-2" size={16} color={colors.erro} />
                        <Text style={[styles.textoBotao, styles.textoRemover]}>Remover</Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    acoes: {
        flexDirection: 'row',
        gap: 8,
    },
    botao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    textoBotao: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.laranja,
    },
    textoRemover: {
        color: colors.erro,
    },
});
