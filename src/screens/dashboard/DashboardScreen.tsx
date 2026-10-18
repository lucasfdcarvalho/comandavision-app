import React, { useCallback, useState } from "react";
import { View, RefreshControl, ScrollView, Pressable, StyleSheet } from "react-native";
import { Text } from "../../components/ui/Texto";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { GestaoStackParamList } from "../../navigation/GestaoStack";
import { apiService } from "../../services/apiService";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { SeloVariacao } from "../../components/dashboard/SeloVariacao";
import { Cartao } from "../../components/ui/Cartao";
import { colors } from "../../theme/colors";
import { espacamento, raio, sombras, tipografia } from "../../theme/tokens";
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
        return <LoadingState variante="painel" />;
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
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={atualizando}
                    onRefresh={atualizar}
                    colors={[colors.laranja]}
                    tintColor={colors.laranja}
                />
            }>
            
            {/* Cartão de Destaque Executivo (Faturamento Hoje) */}
            <Cartao variante="grafite" style={styles.heroCard}>
                <View style={styles.heroTopo}>
                    <View style={styles.heroEtiqueta}>
                        <View style={styles.iconeHero}>
                            <Feather name="trending-up" size={16} color={colors.laranja} />
                        </View>
                        <Text style={styles.heroRotulo}>Faturamento hoje</Text>
                    </View>
                </View>

                <Text
                    style={styles.heroValorPrincipal}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {formatarMoeda(hoje?.faturamento ?? 0)}
                </Text>

                {variacao('faturamento') !== null ? (
                    <View style={styles.linhaHeroVariacao}>
                        <SeloVariacao variacao={variacao('faturamento')} variante="escuro" />
                        <Text style={styles.heroTextoVariacao}>em relação a ontem</Text>
                    </View>
                ) : null}

                {/* Sub-indicadores: Vendas e Ticket Médio */}
                <View style={styles.heroDivisor} />
                
                <View style={styles.heroGradeMetricas}>
                    <View style={styles.heroMetrica}>
                        <View style={styles.heroMetricaHeader}>
                            <Feather name="shopping-bag" size={14} color={colors.grafiteTextoSecundario} />
                            <Text style={styles.heroMetricaRotulo}>Vendas</Text>
                        </View>
                        <Text style={styles.heroMetricaValor}>
                            {hoje?.quantidadeVendas ?? 0}
                        </Text>
                    </View>

                    <View style={styles.heroSeparadorVertical} />

                    <View style={styles.heroMetrica}>
                        <View style={styles.heroMetricaHeader}>
                            <Feather name="tag" size={14} color={colors.grafiteTextoSecundario} />
                            <Text style={styles.heroMetricaRotulo}>Ticket médio</Text>
                        </View>
                        <Text
                            style={styles.heroMetricaValor}
                            numberOfLines={1}
                            adjustsFontSizeToFit>
                            {formatarMoeda(hoje?.ticketMedio ?? 0)}
                        </Text>
                    </View>
                </View>

                {/* Atalho para Indicadores completos */}
                <Pressable
                    style={({ pressed }) => [
                        styles.heroBotaoIndicadores,
                        pressed && styles.pressionado,
                    ]}
                    onPress={() => navigation.getParent()?.navigate('Indicadores')}
                    accessibilityRole="button"
                    accessibilityLabel="Ver indicadores">
                    <Feather name="bar-chart-2" size={16} color={colors.laranja} />
                    <Text style={styles.heroTextoBotaoIndicadores}>
                        Ver indicadores
                    </Text>
                    <Feather name="chevron-right" size={16} color={colors.grafiteTextoSecundario} />
                </Pressable>
            </Cartao>

            {/* Seção de Comandas Operacionais */}
            <View style={styles.secao}>
                <View style={styles.secaoTituloLinha}>
                    <Text style={styles.secaoTitulo}>Comandas agora</Text>
                </View>

                <View style={styles.linhaCartoesStatus}>
                    <Cartao style={styles.cartaoStatus}>
                        <View style={[styles.iconeStatusCirculo, { backgroundColor: colors.statusFundo.aberta }]}>
                            <Feather name="unlock" size={18} color={colors.status.aberta} />
                        </View>
                        <Text style={[styles.valorStatus, { color: colors.status.aberta }]}>
                            {contagem.abertas}
                        </Text>
                        <Text style={styles.rotuloStatus}>Abertas</Text>
                    </Cartao>

                    <Cartao style={styles.cartaoStatus}>
                        <View style={[styles.iconeStatusCirculo, { backgroundColor: colors.statusFundo.fechada }]}>
                            <Feather name="check-circle" size={18} color={colors.status.fechada} />
                        </View>
                        <Text style={[styles.valorStatus, { color: colors.textoPrimario }]}>
                            {contagem.fechadas}
                        </Text>
                        <Text style={styles.rotuloStatus}>Fechadas</Text>
                    </Cartao>

                    <Cartao style={styles.cartaoStatus}>
                        <View style={[styles.iconeStatusCirculo, { backgroundColor: colors.statusFundo.cancelada }]}>
                            <Feather name="x-circle" size={18} color={colors.status.cancelada} />
                        </View>
                        <Text style={[styles.valorStatus, { color: colors.status.cancelada }]}>
                            {contagem.canceladas}
                        </Text>
                        <Text style={styles.rotuloStatus}>Canceladas</Text>
                    </Cartao>
                </View>
            </View>

            {/* Seção de Atalhos Gerenciais */}
            <View style={styles.secao}>
                <View style={styles.secaoTituloLinha}>
                    <Text style={styles.secaoTitulo}>Gerenciar</Text>
                </View>

                <View style={styles.gradeAtalhos}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.cartaoAtalho,
                            pressed && styles.cartaoAtalhoPressionado,
                        ]}
                        onPress={() => navigation.navigate('Catalogo')}
                        accessibilityRole="button"
                        accessibilityLabel="Gerenciar cardápio, produtos e categorias">
                        <View style={styles.iconeAtalhoCirculo}>
                            <Feather name="book-open" size={22} color={colors.laranja} />
                        </View>
                        <View style={styles.infoAtalho}>
                            <Text style={styles.tituloAtalho}>Cardápio</Text>
                            <Text style={styles.descricaoAtalho}>
                                Produtos, categorias e preços
                            </Text>
                        </View>
                        <View style={styles.setaAtalho}>
                            <Feather name="chevron-right" size={18} color={colors.textoSecundario} />
                        </View>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.cartaoAtalho,
                            pressed && styles.cartaoAtalhoPressionado,
                        ]}
                        onPress={() => navigation.navigate('Equipe')}
                        accessibilityRole="button"
                        accessibilityLabel="Gerenciar equipe de funcionários">
                        <View style={styles.iconeAtalhoCirculo}>
                            <Feather name="users" size={22} color={colors.laranja} />
                        </View>
                        <View style={styles.infoAtalho}>
                            <Text style={styles.tituloAtalho}>Equipe</Text>
                            <Text style={styles.descricaoAtalho}>
                                Contas e permissões
                            </Text>
                        </View>
                        <View style={styles.setaAtalho}>
                            <Feather name="chevron-right" size={18} color={colors.textoSecundario} />
                        </View>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    conteudo: {
        padding: espacamento.lg,
        paddingBottom: espacamento.xxxl,
        gap: espacamento.xl,
    },
    heroCard: {
        padding: espacamento.xl,
        borderRadius: raio.xl,
        gap: espacamento.md,
    },
    heroTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroEtiqueta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.sm,
    },
    iconeHero: {
        width: 28,
        height: 28,
        borderRadius: raio.sm,
        backgroundColor: 'rgba(234, 139, 0, 0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroRotulo: {
        ...tipografia.rotulo,
        color: colors.grafiteTextoSecundario,
    },
    heroValorPrincipal: {
        ...tipografia.destaque,
        color: colors.textoBranco,
        fontSize: 34,
        lineHeight: 40,
    },
    linhaHeroVariacao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.sm,
    },
    heroTextoVariacao: {
        ...tipografia.rotulo,
        color: colors.grafiteTextoSecundario,
    },
    heroDivisor: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        marginVertical: espacamento.xs,
    },
    heroGradeMetricas: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: espacamento.xs,
    },
    heroMetrica: {
        flex: 1,
        gap: 3,
    },
    heroMetricaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    heroMetricaRotulo: {
        ...tipografia.rotulo,
        color: colors.grafiteTextoSecundario,
    },
    heroMetricaValor: {
        ...tipografia.subtitulo,
        ...tipografia.tabular,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textoBranco,
    },
    heroSeparadorVertical: {
        width: 1,
        height: 36,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        marginHorizontal: espacamento.md,
    },
    heroBotaoIndicadores: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: espacamento.md,
        paddingHorizontal: espacamento.lg,
        borderRadius: raio.md,
        marginTop: espacamento.xs,
    },
    heroTextoBotaoIndicadores: {
        flex: 1,
        ...tipografia.rotuloForte,
        color: colors.textoBranco,
        marginHorizontal: espacamento.sm,
    },
    secao: {
        gap: espacamento.md,
    },
    secaoTituloLinha: {
        gap: 2,
    },
    secaoTitulo: {
        ...tipografia.subtitulo,
        color: colors.textoPrimario,
    },
    linhaCartoesStatus: {
        flexDirection: 'row',
        gap: espacamento.md,
    },
    cartaoStatus: {
        flex: 1,
        padding: espacamento.md,
        alignItems: 'center',
        gap: espacamento.xs,
        borderRadius: raio.lg,
    },
    iconeStatusCirculo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    valorStatus: {
        ...tipografia.subtitulo,
        ...tipografia.tabular,
        fontSize: 22,
        fontWeight: '700',
    },
    rotuloStatus: {
        ...tipografia.legenda,
        color: colors.textoSecundario,
    },
    gradeAtalhos: {
        gap: espacamento.md,
    },
    cartaoAtalho: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacamento.lg,
        padding: espacamento.lg,
        backgroundColor: colors.superficie,
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
        ...sombras.suave,
    },
    cartaoAtalhoPressionado: {
        opacity: 0.88,
        transform: [{ scale: 0.995 }],
    },
    iconeAtalhoCirculo: {
        width: 46,
        height: 46,
        borderRadius: raio.md,
        backgroundColor: colors.laranjaClaro,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoAtalho: {
        flex: 1,
        gap: 2,
    },
    tituloAtalho: {
        ...tipografia.corpoForte,
        fontSize: 16,
        color: colors.textoPrimario,
    },
    descricaoAtalho: {
        ...tipografia.rotulo,
        color: colors.textoSecundario,
    },
    setaAtalho: {
        width: 32,
        height: 32,
        borderRadius: raio.sm,
        backgroundColor: colors.fundoSecundario,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressionado: {
        opacity: 0.82,
    },
});
