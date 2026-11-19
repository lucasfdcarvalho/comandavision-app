import { ehErroApiStatus } from "../../services/apiClient";
import { mensagemConflitoExclusao, mensagemErroExclusao } from "../../utils/mensagemExclusao";
import { useAuth } from "../../hooks/useAuth";
import { useDialogo } from "../../contexts/DialogoContext";
import { useRef, useState } from "react";
import { View, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Text, TextInput } from "../../components/ui/Texto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { colors } from "../../theme/colors";
import { raio } from "../../theme/tokens";
import { MensagemErro } from "../../components/MensagemErro";
import { PrimaryButton } from "../../components/PrimaryButton";

type Props = NativeStackScreenProps<GestaoStackParamList, 'EditarCategoria'>;

export function EditarCategoriaScreen({ route, navigation }: Props) {
    const { alertar, mostrarSucesso } = useDialogo();
    const { categoria } = route.params;
    const { usuario } = useAuth();
    const exclusaoPendente = useRef(false);

    const [nome, setNome] = useState(categoria.nome);
    const [descricao, setDescricao] = useState(categoria.descricao ?? '');
    const [ativa, setAtiva] = useState(categoria.ativa);
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    function confirmarExclusao() {
        if (usuario?.papel !== 'DONO' || carregando || exclusaoPendente.current) return;
        alertar('Excluir categoria?', `Tem certeza de que quer excluir “${categoria.nome}”? Não dá para desfazer essa ação`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: async () => {
                if (exclusaoPendente.current) return;
                exclusaoPendente.current = true; setCarregando(true); setMensagemErro('');
                try { await apiService.excluirCategoria(categoria.id); navigation.popTo('Catalogo', { aba: 'categorias', retorno: Date.now() }); }
                catch (error) { const conflito = ehErroApiStatus(error, 409); alertar('Não foi possível excluir', conflito ? mensagemConflitoExclusao('categoria') : mensagemErroExclusao(error), undefined, conflito ? 'aviso' : 'erro', undefined, conflito ? 'exclusaoBloqueada' : undefined); }
                finally { exclusaoPendente.current = false; setCarregando(false); }
            } },
        ]);
    }

    function confirmarSalvar() {
        if (!nome.trim()) {
            setMensagemErro('Informe o nome da categoria');
            return;
        }

        // Só pede confirmação quando o usuário está desativando agora — editar
        // nome/descrição de uma categoria já inativa não precisa de aviso extra.
        if (categoria.ativa && !ativa) {
            alertar(
                'Desativar categoria',
                'Desativar esta categoria pode afetar a disponibilidade dos produtos vinculados a ela',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Desativar', style: 'destructive', onPress: salvar },
                ]
            );
            return;
        }

        salvar();
    }

    async function salvar() {
        setMensagemErro('');

        try {
            setCarregando(true);

            await apiService.atualizarCategoria(categoria.id, {
                nome: nome.trim(),
                descricao: descricao.trim() || undefined,
                ativa,
            });

            mostrarSucesso('Categoria atualizada', 'As alterações foram salvas com sucesso', () => navigation.popTo('Catalogo'));
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível salvar as alterações';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.rotulo}>Nome</Text>
                <TextInput
                    style={styles.campo}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex: Bebidas"
                    autoCapitalize="words"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Descrição (opcional)</Text>
                <TextInput
                    style={styles.campo}
                    value={descricao}
                    onChangeText={setDescricao}
                    placeholder="Ex: Refrigerantes, sucos e água"
                    editable={!carregando}
                />

                <Text style={styles.rotulo}>Status</Text>
                <View style={styles.statusLinha}>
                    <Pressable
                        style={[styles.botaoStatus, ativa && styles.botaoStatusAtivoSelecionado]}
                        onPress={() => setAtiva(true)}
                        disabled={carregando}
                        accessibilityRole="button"
                        accessibilityLabel="Marcar categoria como ativa">
                        <Feather name="check-circle" size={16} color={ativa ? colors.superficie : colors.status.aberta} />
                        <Text style={[styles.textoBotaoStatus, ativa && styles.textoBotaoStatusSelecionado]}>Ativa</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.botaoStatus, !ativa && styles.botaoStatusInativoSelecionado]}
                        onPress={() => setAtiva(false)}
                        disabled={carregando}
                        accessibilityRole="button"
                        accessibilityLabel="Marcar categoria como inativa">
                        <Feather name="x-circle" size={16} color={!ativa ? colors.superficie : colors.textoSecundario} />
                        <Text style={[styles.textoBotaoStatus, !ativa && styles.textoBotaoStatusSelecionado]}>Inativa</Text>
                    </Pressable>
                </View>

                {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}

                <View style={styles.botaoContainer}>
                    <PrimaryButton titulo="Salvar alterações" onPress={confirmarSalvar} carregando={carregando} />
                </View>
                {usuario?.papel === 'DONO' ? <PrimaryButton titulo="Excluir categoria" onPress={confirmarExclusao} disabled={carregando} style={!carregando ? styles.botaoExcluir : undefined} /> : null}
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
        borderRadius: raio.md,
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
        borderRadius: raio.md,
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
    botaoExcluir: { backgroundColor: colors.erro },
    botaoContainer: {
        marginTop: 24,
    },
});
