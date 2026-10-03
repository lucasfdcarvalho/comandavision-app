import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
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

type Props = NativeStackScreenProps<GestaoStackParamList, 'EditarProduto'>;

export function EditarProdutoScreen({ route, navigation }: Props) {
    const { produto } = route.params;

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [carregandoCategorias, setCarregandoCategorias] = useState(true);
    const [mensagemErroCategorias, setMensagemErroCategorias] = useState('');

    const [nome, setNome] = useState(produto.nome);
    const [descricao, setDescricao] = useState(produto.descricao ?? '');
    const [preco, setPreco] = useState(produto.preco.toFixed(2).replace('.', ','));
    const [categoriaId, setCategoriaId] = useState<number | null>(produto.categoria.id);
    const [ativo, setAtivo] = useState(produto.ativo);
    // `imagemAtualUrl` é a URL já salva; `imagemNova` só existe quando o usuário escolhe outra foto.
    const [imagemAtualUrl, setImagemAtualUrl] = useState<string | null>(produto.imagemUrl ?? null);
    const [imagemNova, setImagemNova] = useState<ImagemSelecionada | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarCategorias = useCallback(async () => {
        try {
            setMensagemErroCategorias('');
            const dados = await apiService.listarCategorias();
            // Mantém a categoria atual do produto na lista mesmo que ela tenha sido
            // desativada depois — senão o seletor ficaria sem nenhuma opção marcada.
            setCategorias(dados.filter((categoria) => categoria.ativa || categoria.id === produto.categoria.id));
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar as categorias';
            setMensagemErroCategorias(mensagem);
        } finally {
            setCarregandoCategorias(false);
        }
    }, [produto.categoria.id]);

    useFocusEffect(
        useCallback(() => {
            carregarCategorias();
        }, [carregarCategorias])
    );

    function confirmarSalvar() {
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

        setMensagemErro('');

        if (produto.ativo && !ativo) {
            Alert.alert(
                'Desativar produto',
                'Este produto deixará de aparecer para adição em novas comandas.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Desativar', style: 'destructive', onPress: () => salvar(precoNumerico) },
                ]
            );
            return;
        }

        salvar(precoNumerico);
    }

    async function salvar(precoNumerico: number) {
        const precoCentavos = Math.round(precoNumerico * 100);

        try {
            setCarregando(true);

            const imagemUrl = imagemNova
                ? await imagemProdutoService.enviarImagem(imagemNova.uri, imagemNova.mimeType)
                : imagemAtualUrl;

            await apiService.atualizarProduto(produto.id, {
                nome: nome.trim(),
                descricao: descricao.trim() || undefined,
                preco: precoCentavos / 100,
                categoriaId: categoriaId as number,
                ativo,
                imagemUrl,
            });

            Alert.alert('Produto atualizado', 'As alterações foram salvas com sucesso.', [
                { text: 'OK', onPress: () => navigation.popTo('Catalogo') },
            ]);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível salvar as alterações';
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
                    imagemUri={imagemNova?.uri ?? imagemAtualUrl}
                    onSelecionar={setImagemNova}
                    onRemover={() => {
                        setImagemNova(null);
                        setImagemAtualUrl(null);
                    }}
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

                <Text style={styles.rotulo}>Status</Text>
                <View style={styles.statusLinha}>
                    <Pressable
                        style={[styles.botaoStatus, ativo && styles.botaoStatusAtivoSelecionado]}
                        onPress={() => setAtivo(true)}
                        disabled={carregando}
                        accessibilityRole="button"
                        accessibilityLabel="Marcar produto como ativo">
                        <Feather name="check-circle" size={16} color={ativo ? colors.superficie : colors.status.aberta} />
                        <Text style={[styles.textoBotaoStatus, ativo && styles.textoBotaoStatusSelecionado]}>Ativo</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.botaoStatus, !ativo && styles.botaoStatusInativoSelecionado]}
                        onPress={() => setAtivo(false)}
                        disabled={carregando}
                        accessibilityRole="button"
                        accessibilityLabel="Marcar produto como inativo">
                        <Feather name="x-circle" size={16} color={!ativo ? colors.superficie : colors.textoSecundario} />
                        <Text style={[styles.textoBotaoStatus, !ativo && styles.textoBotaoStatusSelecionado]}>Inativo</Text>
                    </Pressable>
                </View>

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

                <View style={styles.botaoContainer}>
                    <PrimaryButton titulo="Salvar alterações" onPress={confirmarSalvar} carregando={carregando} />
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
    statusLinha: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    botaoStatus: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 10,
    },
    botaoStatusAtivoSelecionado: {
        backgroundColor: colors.status.aberta,
        borderColor: colors.status.aberta,
    },
    botaoStatusInativoSelecionado: {
        backgroundColor: colors.textoSecundario,
        borderColor: colors.textoSecundario,
    },
    textoBotaoStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    textoBotaoStatusSelecionado: {
        color: colors.superficie,
    },
    botaoContainer: {
        marginTop: 24,
    },
});
