import { useDialogo } from "../../contexts/DialogoContext";
import { useCallback, useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { imagemProdutoService } from "../../services/imagemProdutoService";
import { Categoria } from "../../types/Categoria";
import { colors } from "../../theme/colors";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SeletorImagemProduto, type ImagemSelecionada } from "../../components/SeletorImagemProduto";
import { SeletorCategoria } from "../../components/SeletorCategoria";
import { LoadingState } from "../../components/LoadingState";

type Props = NativeStackScreenProps<GestaoStackParamList, 'NovoProduto'>;

export function NovoProdutoScreen({ navigation }: Props) {
    const { mostrarSucesso } = useDialogo();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [carregandoCategorias, setCarregandoCategorias] = useState(true);
    const [mensagemErroCategorias, setMensagemErroCategorias] = useState('');

    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [preco, setPreco] = useState('');
    const [categoriaId, setCategoriaId] = useState<number | null>(null);
    const [imagem, setImagem] = useState<ImagemSelecionada | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarCategorias = useCallback(async () => {
        try {
            setMensagemErroCategorias('');
            const dados = await apiService.listarCategorias();
            setCategorias(dados.filter((categoria) => categoria.ativa));
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar as categorias';
            setMensagemErroCategorias(mensagem);
        } finally {
            setCarregandoCategorias(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            carregarCategorias();
        }, [carregarCategorias])
    );

    async function salvar() {
        if (!nome.trim()) {
            setMensagemErro('Informe o nome do produto');
            return;
        }

        const precoNumerico = Number(preco.replace(',', '.'));
        if (!preco.trim() || Number.isNaN(precoNumerico) || precoNumerico <= 0) {
            setMensagemErro('Informe um preço válido, maior que zero');
            return;
        }

        if (categoriaId === null) {
            setMensagemErro('Selecione uma categoria');
            return;
        }

        const precoCentavos = Math.round(precoNumerico * 100);

        setMensagemErro('');

        try {
            setCarregando(true);

            const imagemUrl = imagem ? await imagemProdutoService.enviarImagem(imagem.uri, imagem.mimeType) : null;

            await apiService.criarProduto({
                nome: nome.trim(),
                descricao: descricao.trim() || undefined,
                preco: precoCentavos / 100,
                categoriaId,
                imagemUrl,
            });

            mostrarSucesso('Produto criado', 'O produto foi criado com sucesso.', () => navigation.popTo('Catalogo'));
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível criar o produto';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    if (carregandoCategorias) {
        return <LoadingState />;
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <SeletorImagemProduto
                    imagemUri={imagem?.uri ?? null}
                    onSelecionar={setImagem}
                    onRemover={() => setImagem(null)}
                    desabilitado={carregando}
                />

                <Text style={styles.rotulo}>Nome</Text>
                <TextInput
                    style={styles.campo}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex: Coca-Cola 350ml"
                    autoCapitalize="words"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Descrição (opcional)</Text>
                <TextInput
                    style={styles.campo}
                    value={descricao}
                    onChangeText={setDescricao}
                    placeholder="Ex: Lata gelada"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Preço</Text>
                <TextInput
                    style={styles.campo}
                    value={preco}
                    onChangeText={setPreco}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Categoria</Text>
                {mensagemErroCategorias ? <MensagemErro texto={mensagemErroCategorias} /> : (
                    <SeletorCategoria
                        categorias={categorias}
                        categoriaSelecionadaId={categoriaId}
                        onSelecionar={setCategoriaId}
                        desabilitado={carregando}
                    />
                )}

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

                <View style={styles.botaoContainer}>
                    <PrimaryButton titulo="Criar produto" onPress={salvar} carregando={carregando} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    container: {
        flexGrow: 1,
        padding: 24,
        gap: 8,
        backgroundColor: colors.fundo,
    },
    rotulo: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    campo: {
        height: 50,
        paddingHorizontal: 14,
        color: colors.textoPrimario,
        fontSize: 16,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    botaoContainer: {
        marginTop: 24,
    },
});
