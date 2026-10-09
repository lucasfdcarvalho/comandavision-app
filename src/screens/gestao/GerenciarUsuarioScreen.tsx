import { useDialogo } from "../../contexts/DialogoContext";
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { useAuth } from "../../hooks/useAuth";
import type { PapelUsuario, Usuario } from "../../types/Usuario";
import { colors } from "../../theme/colors";
import { formatarDataHora } from "../../utils/formatadores";
import { MensagemErro } from "../../components/MensagemErro";
import { MensagemSucesso } from "../../components/MensagemSucesso";
import { SecondaryButton } from "../../components/SecondaryButton";
import { SeletorPapel } from "../../components/SeletorPapel";

type Props = NativeStackScreenProps<GestaoStackParamList, 'GerenciarUsuario'>;

const NOME_PAPEL: Record<PapelUsuario, string> = {
    DONO: 'Dono',
    FUNCIONARIO: 'Funcionário',
};

export function GerenciarUsuarioScreen({ route }: Props) {
    const { alertar } = useDialogo();
    const { usuario: usuarioLogado } = useAuth();
    const [usuario, setUsuario] = useState<Usuario>(route.params.usuario);
    const [carregando, setCarregando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemSucesso, setMensagemSucesso] = useState('');

    // A API também recusa, mas aqui já evitamos o dono se trancar fora do app.
    const ehVoce = usuario.id === usuarioLogado?.usuarioId;
    const nomeExibido = usuario.nome ?? usuario.email;

    async function executar(acao: () => Promise<Usuario>, sucesso: string) {
        try {
            setCarregando(true);
            setMensagemErro('');
            setMensagemSucesso('');
            setUsuario(await acao());
            setMensagemSucesso(sucesso);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível concluir a operação';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    function confirmarPapel(papel: PapelUsuario) {
        if (papel === usuario.papel) {
            return;
        }

        alertar(
            'Alterar papel',
            `${nomeExibido} passará a ser ${NOME_PAPEL[papel]}. A mudança passa a valer em até 1 hora, quando o login da pessoa for renovado.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Alterar papel',
                    onPress: () => executar(
                        () => apiService.alterarPapelUsuario(usuario.id, papel),
                        `Papel alterado para ${NOME_PAPEL[papel]}`),
                },
            ]
        );
    }

    function confirmarDesativar() {
        alertar(
            'Desativar usuário',
            `${nomeExibido} não conseguirá mais entrar no app. O histórico de comandas é mantido e você pode reativar depois.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desativar',
                    style: 'destructive',
                    onPress: () => executar(() => apiService.desativarUsuario(usuario.id), 'Usuário desativado'),
                },
            ]
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.cabecalho}>
                <View style={styles.avatar}>
                    <Feather name={usuario.papel === 'DONO' ? 'shield' : 'user'} size={28} color={colors.laranja} />
                </View>
                <Text style={styles.nome}>{usuario.nome ?? 'Sem nome'}{ehVoce ? ' (você)' : ''}</Text>
                <Text style={styles.email}>{usuario.email}</Text>
                <Text style={styles.detalhe}>
                    {usuario.ativo ? 'Ativo' : 'Desativado'}
                    {usuario.ultimoAcesso ? ` · Último acesso: ${formatarDataHora(usuario.ultimoAcesso)}` : ' · Nunca entrou'}
                </Text>
            </View>

            {ehVoce ? (
                <View style={styles.aviso}>
                    <Feather name="info" size={16} color={colors.textoSecundario} />
                    <Text style={styles.textoAviso}>Você não pode alterar o papel nem desativar a sua própria conta.</Text>
                </View>
            ) : null}

            <Text style={styles.rotulo}>Papel</Text>
            {!usuario.papel ? (
                <Text style={styles.semPapel}>Esta conta ainda não tem papel e não consegue usar o app. Escolha um abaixo.</Text>
            ) : null}
            <SeletorPapel
                papelSelecionado={usuario.papel}
                onSelecionar={confirmarPapel}
                desabilitado={carregando || ehVoce}
            />

            {mensagemErro ? <MensagemErro texto={mensagemErro} /> : null}
            {mensagemSucesso ? <MensagemSucesso texto={mensagemSucesso} /> : null}

            {!ehVoce ? (
                <View style={styles.botaoContainer}>
                    {usuario.ativo ? (
                        <SecondaryButton titulo="Desativar acesso" icone="user-x" onPress={confirmarDesativar} carregando={carregando} />
                    ) : (
                        <SecondaryButton
                            titulo="Reativar acesso"
                            icone="user-check"
                            onPress={() => executar(() => apiService.reativarUsuario(usuario.id), 'Usuário reativado')}
                            carregando={carregando}
                        />
                    )}
                </View>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        gap: 8,
        backgroundColor: colors.fundo,
    },
    cabecalho: {
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    avatar: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 32,
    },
    nome: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textoPrimario,
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
    detalhe: {
        fontSize: 13,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    aviso: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    textoAviso: {
        flex: 1,
        fontSize: 13,
        color: colors.textoSecundario,
    },
    rotulo: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    semPapel: {
        fontSize: 13,
        color: colors.erro,
    },
    botaoContainer: {
        marginTop: 24,
    },
});
