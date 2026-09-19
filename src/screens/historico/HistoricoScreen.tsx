import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiService } from "../../services/apiService";
import { Comanda } from "../../types/Comanda";
import { StatusBadge } from "../../components/StatusBadge";
import { MensagemErro } from "../../components/MensagemErro";
import { colors } from "../../theme/colors";

function formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function HistoricoScreen() {
    const navigation = useNavigation();

    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarHistorico = useCallback(async () => {
        try {
            setMensagemErro('');
            const dados = await apiService.listarComandas();
            const encerradas = dados
                .filter((comanda) => comanda.status !== 'ABERTA')
                .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
            setComandas(encerradas);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar o histórico';
            setMensagemErro(mensagem);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            async function carregarInicial() {
                setCarregando(true);
                await carregarHistorico();
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarHistorico])
    );

    async function atualizar() {
        setAtualizando(true);
        await carregarHistorico();
        setAtualizando(false);
    }

    if (carregando) {
        return (
            <View style={styles.centro}>
                <ActivityIndicator size="large" color={colors.laranja} />
            </View>
        );
    }

    if (mensagemErro) {
        return (
            <View style={styles.centro}>
                <MensagemErro texto={mensagemErro} />
            </View>
        );
    }

    return (
        <FlatList
            style={styles.lista}
            data={comandas}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={comandas.length === 0 ? styles.listaVazia : styles.listaConteudo}
            refreshControl={
                <RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />
            }
            ListEmptyComponent={
                <Text style={styles.textoVazio}>Nenhuma comanda fechada ou cancelada ainda</Text>
            }
            renderItem={({ item }) => (
                <Pressable
                    style={styles.cartao}
                    onPress={() => (navigation as any).navigate('Comandas', {
                        screen: 'DetalhesComanda',
                        params: { comandaId: item.id },
                    })}>
                    <View style={styles.linhaCabecalho}>
                        <Text style={styles.identificacao}>{item.identificacao}</Text>
                        <StatusBadge status={item.status} />
                    </View>
                    <Text style={styles.data}>
                        {item.status === 'FECHADA' && item.fechadaEm
                            ? `Fechada em ${formatarData(item.fechadaEm)}`
                            : `Atualizada em ${formatarData(item.atualizadoEm)}`}
                    </Text>
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: colors.fundo,
    },
    lista: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    listaConteudo: {
        padding: 16,
        gap: 12,
    },
    listaVazia: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    textoVazio: {
        color: colors.textoSecundario,
        fontSize: 16,
        textAlign: 'center',
    },
    cartao: {
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 12,
        gap: 6,
    },
    linhaCabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    identificacao: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    data: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
});
