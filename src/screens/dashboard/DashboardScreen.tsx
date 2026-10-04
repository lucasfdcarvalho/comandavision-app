import { useCallback, useState } from "react";
import { View, Text, RefreshControl, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { IndicadorVariacao } from "../../components/dashboard/IndicadorVariacao";
import { colors } from "../../theme/colors";
import { formatarMoeda } from "../../utils/formatadores";
import { calcularPeriodo, calcularPeriodoAnterior, calcularVariacao } from "../../utils/dashboard";
import type { ResumoDashboard } from "../../types/Dashboard";

type Props = NativeStackScreenProps<GestaoStackParamList, 'Dashboard'>;

// Resumo rápido do dia e atalhos de gestão. A análise completa fica na aba Indicadores.
export function DashboardScreen({ navigation }: Props) {
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');
    const [contagem, setContagem] = useState({ abertas: 0, fechadas: 0, canceladas: 0 });
    const [hoje, setHoje] = useState<ResumoDashboard | null>(null);
    const [ontem, setOntem] = useState<ResumoDashboard | null>(null);

    const carregarDados = useCallback(async () => {
        const periodoHoje = calcularPeriodo('hoje');
        const periodoOntem = calcularPeriodoAnterior('hoje', periodoHoje);
        try {
            setMensagemErro('');
            const [comandas, resumoHoje, resumoOntem] = await Promise.all([
                apiService.listarComandas(),
                apiService.buscarResumoDashboard(periodoHoje.inicio, periodoHoje.fim),
                apiService.buscarResumoDashboard(periodoOntem.inicio, periodoOntem.fim).catch(() => null),
            ]);
            setContagem({
                abertas: comandas.filter((c) => c.status === 'ABERTA').length,
                fechadas: comandas.filter((c) => c.status === 'FECHADA').length,
                canceladas: comandas.filter((c) => c.status === 'CANCELADA').length,
            });
            setHoje(resumoHoje);
            setOntem(resumoOntem);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar o resumo';
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

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarDados} />;
    }

    const variacao = (campo: keyof ResumoDashboard) =>
        ontem ? calcularVariacao(hoje?.[campo] ?? 0, ontem[campo] ?? 0) : null;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}>
            <View style={styles.secao}>
                <Text style={styles.rotulo}>Faturamento de hoje</Text>
                <Text style={styles.valorPrincipal} numberOfLines={1} adjustsFontSizeToFit>
                    {formatarMoeda(hoje?.faturamento ?? 0)}
                </Text>
                <IndicadorVariacao variacao={variacao('faturamento')} comparacao="vs. ontem (dia inteiro)" />

                <View style={styles.linhaIndicadores}>
                    <View style={styles.indicador}>
                        <Text style={styles.rotuloPequeno}>Vendas</Text>
                        <Text style={styles.valorIndicador}>{hoje?.quantidadeVendas ?? 0}</Text>
                    </View>
                    <View style={styles.indicador}>
                        <Text style={styles.rotuloPequeno}>Ticket médio</Text>
                        <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
                            {formatarMoeda(hoje?.ticketMedio ?? 0)}
                        </Text>
                    </View>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.linkIndicadores, pressed && styles.pressionado]}
                    // A aba Indicadores é irmã da Gestão no navegador de abas.
                    onPress={() => navigation.getParent()?.navigate('Indicadores')}
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos os indicadores">
                    <Feather name="bar-chart-2" size={16} color={colors.grafico.destaque} />
                    <Text style={styles.textoLink}>Ver todos os indicadores</Text>
                    <Feather name="chevron-right" size={16} color={colors.textoSecundario} />
                </Pressable>
            </View>

            <Text style={styles.titulo}>Comandas agora</Text>
            <View style={styles.linhaCartoes}>
                <View style={styles.cartaoStatus}>
                    <Feather name="unlock" size={18} color={colors.status.aberta} />
                    <Text style={[styles.valorStatus, { color: colors.status.aberta }]}>{contagem.abertas}</Text>
                    <Text style={styles.rotuloPequeno}>Abertas</Text>
                </View>
                <View style={styles.cartaoStatus}>
                    <Feather name="check-circle" size={18} color={colors.status.fechada} />
                    <Text style={[styles.valorStatus, { color: colors.status.fechada }]}>{contagem.fechadas}</Text>
                    <Text style={styles.rotuloPequeno}>Fechadas</Text>
                </View>
                <View style={styles.cartaoStatus}>
                    <Feather name="x-circle" size={18} color={colors.status.cancelada} />
                    <Text style={[styles.valorStatus, { color: colors.status.cancelada }]}>{contagem.canceladas}</Text>
                    <Text style={styles.rotuloPequeno}>Canceladas</Text>
                </View>
            </View>

            <Text style={styles.titulo}>Gerenciar</Text>
            <Pressable
                style={({ pressed }) => [styles.atalho, pressed && styles.pressionado]}
                onPress={() => navigation.navigate('Catalogo')}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar cardápio">
                <View style={styles.iconeAtalho}>
                    <Feather name="book-open" size={22} color={colors.laranja} />
                </View>
                <View style={styles.flex}>
                    <Text style={styles.tituloAtalho}>Cardápio</Text>
                    <Text style={styles.rotuloPequeno}>Categorias, produtos, preços e disponibilidade</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textoSecundario} />
            </Pressable>
            <Pressable
                style={({ pressed }) => [styles.atalho, pressed && styles.pressionado]}
                onPress={() => navigation.navigate('Equipe')}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar equipe">
                <View style={styles.iconeAtalho}>
                    <Feather name="users" size={22} color={colors.laranja} />
                </View>
                <View style={styles.flex}>
                    <Text style={styles.tituloAtalho}>Equipe</Text>
                    <Text style={styles.rotuloPequeno}>Contas, papéis e acesso dos funcionários</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textoSecundario} />
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    conteudo: {
        padding: 16,
        gap: 12,
    },
    flex: {
        flex: 1,
    },
    titulo: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    secao: {
        padding: 16,
        gap: 8,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    rotulo: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    rotuloPequeno: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    valorPrincipal: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    linhaIndicadores: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borda,
    },
    indicador: {
        flex: 1,
        gap: 2,
    },
    valorIndicador: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    linkIndicadores: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: colors.grafico.trilho,
    },
    textoLink: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    pressionado: {
        opacity: 0.8,
    },
    linhaCartoes: {
        flexDirection: 'row',
        gap: 10,
    },
    cartaoStatus: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: 12,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    valorStatus: {
        fontSize: 20,
        fontWeight: '700',
    },
    atalho: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    iconeAtalho: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
        borderRadius: 10,
    },
    tituloAtalho: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
});
