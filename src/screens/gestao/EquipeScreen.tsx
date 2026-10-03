import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { useAuth } from "../../hooks/useAuth";
import type { Usuario } from "../../types/Usuario";
import { colors } from "../../theme/colors";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";

type Props = NativeStackScreenProps<GestaoStackParamList, 'Equipe'>;

export function EquipeScreen({ navigation }: Props) {
    const { usuario: usuarioLogado } = useAuth();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarDados = useCallback(async () => {
        try {
            setMensagemErro('');
            setUsuarios(await apiService.listarUsuarios());
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar a equipe';
            setMensagemErro(mensagem);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            async function carregarInicial() {
                setCarregando(true);
                await carregarDados();
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarDados])
    );

    async function atualizar() {
        setAtualizando(true);
        await carregarDados();
        setAtualizando(false);
    }

    const usuariosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) {
            return usuarios;
        }
        return usuarios.filter((usuario) =>
            (usuario.nome ?? '').toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo));
    }, [usuarios, busca]);

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarDados} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.linhaBusca}>
                <View style={styles.campoBusca}>
                    <Feather name="search" size={18} color={colors.textoSecundario} />
                    <TextInput
                        style={styles.busca}
                        value={busca}
                        onChangeText={setBusca}
                        placeholder="Buscar por nome ou e-mail..."
                        autoCapitalize="none"
                    />
                </View>
                <Pressable
                    style={styles.botaoNovo}
                    onPress={() => navigation.navigate('NovoUsuario')}
                    accessibilityRole="button"
                    accessibilityLabel="Novo usuário">
                    <Feather name="user-plus" size={20} color={colors.superficie} />
                </Pressable>
            </View>

            <FlatList
                style={styles.lista}
                data={usuariosFiltrados}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listaConteudo}
                refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}
                ListEmptyComponent={
                    <EmptyState texto={usuarios.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado'} />
                }
                renderItem={({ item }) => {
                    const ehVoce = item.id === usuarioLogado?.usuarioId;
                    return (
                        <Pressable
                            style={[styles.cartao, !item.ativo && styles.cartaoInativo]}
                            onPress={() => navigation.navigate('GerenciarUsuario', { usuario: item })}
                            accessibilityRole="button"
                            accessibilityLabel={`Gerenciar ${item.nome ?? item.email}`}>
                            <View style={styles.avatar}>
                                <Feather name={item.papel === 'DONO' ? 'shield' : 'user'} size={20} color={colors.laranja} />
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.nome, !item.ativo && styles.textoInativo]} numberOfLines={1}>
                                    {item.nome ?? 'Sem nome'}{ehVoce ? ' (você)' : ''}
                                </Text>
                                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                                <View style={styles.badges}>
                                    <View style={[styles.badge, item.papel ? styles.badgePapel : styles.badgeAlerta]}>
                                        <Text style={[styles.textoBadge, item.papel ? styles.textoBadgePapel : styles.textoBadgeAlerta]}>
                                            {item.papel === 'DONO' ? 'Dono' : item.papel === 'FUNCIONARIO' ? 'Funcionário' : 'Sem papel'}
                                        </Text>
                                    </View>
                                    {!item.ativo ? (
                                        <View style={[styles.badge, styles.badgeInativo]}>
                                            <Text style={[styles.textoBadge, styles.textoBadgeInativo]}>Desativado</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.textoSecundario} />
                        </Pressable>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    linhaBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    campoBusca: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 46,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 8,
    },
    busca: {
        flex: 1,
        height: '100%',
        color: colors.textoPrimario,
        fontSize: 15,
    },
    botaoNovo: {
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
    lista: {
        flex: 1,
    },
    listaConteudo: {
        padding: 16,
        gap: 10,
    },
    cartao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 12,
    },
    cartaoInativo: {
        opacity: 0.7,
    },
    avatar: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
        borderRadius: 22,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    nome: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    textoInativo: {
        color: colors.textoSecundario,
    },
    email: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    badges: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    badge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    badgePapel: {
        backgroundColor: colors.fundo,
    },
    badgeAlerta: {
        backgroundColor: colors.statusFundo.cancelada,
    },
    badgeInativo: {
        backgroundColor: colors.statusFundo.fechada,
    },
    textoBadge: {
        fontSize: 12,
        fontWeight: '600',
    },
    textoBadgePapel: {
        color: colors.textoPrimario,
    },
    textoBadgeAlerta: {
        color: colors.erro,
    },
    textoBadgeInativo: {
        color: colors.textoSecundario,
    },
});
