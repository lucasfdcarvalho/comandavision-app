import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { ComandaDetalhada } from "../../types/Comanda";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ComandasStackParamList, 'DetalhesComanda'>;

function formatarMoeda(valor: number): string {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function DetalhesComandaScreen({ route }: Props) {
    const { comandaId } = route.params;

    const [comanda, setComanda] = useState<ComandaDetalhada | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarComanda = useCallback(async () => {
        try {
            setCarregando(true);
            setMensagemErro('');
            const dados = await apiService.buscarComanda(comandaId);
            setComanda(dados);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar a comanda';
            setMensagemErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }, [comandaId]);

    useFocusEffect(
        useCallback(() => {
            carregarComanda();
        }, [carregarComanda])
    );

    if (carregando) {
        return (
            <View style={styles.centro}>
                <ActivityIndicator size="large" color={colors.laranja} />
            </View>
        );
    }

    if (mensagemErro || !comanda) {
        return (
            <View style={styles.centro}>
                <Text style={styles.mensagemErro}>{mensagemErro || 'Comanda não encontrada'}</Text>
                <Pressable style={styles.botaoTentarNovamente} onPress={carregarComanda}>
                    <Text style={styles.textoBotaoTentarNovamente}>Tentar novamente</Text>
                </Pressable>
            </View>
        );
    }

    const corStatus = colors.status[comanda.status.toLowerCase() as 'aberta' | 'fechada' | 'cancelada'];

    return (
        <View style={styles.container}>
            <View style={styles.cabecalho}>
                <Text style={styles.identificacao}>{comanda.identificacao}</Text>
                <Text style={[styles.status, { color: corStatus }]}>{comanda.status}</Text>
            </View>

            {comanda.observacao ? <Text style={styles.observacao}>{comanda.observacao}</Text> : null}

            <FlatList
                style={styles.lista}
                data={comanda.itens}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listaConteudo}
                ListEmptyComponent={<Text style={styles.textoVazio}>Nenhum item adicionado</Text>}
                renderItem={({ item }) => (
                    <View style={styles.itemCartao}>
                        <View style={styles.itemLinha}>
                            <Text style={styles.itemNome}>{item.quantidade}x {item.produtoNome}</Text>
                            <Text style={styles.itemSubtotal}>{formatarMoeda(item.subtotal)}</Text>
                        </View>
                        {item.observacao ? <Text style={styles.itemObservacao}>{item.observacao}</Text> : null}
                    </View>
                )}
            />

            <View style={styles.totalLinha}>
                <Text style={styles.totalRotulo}>Total</Text>
                <Text style={styles.totalValor}>{formatarMoeda(comanda.total)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 24,
        backgroundColor: colors.fundo,
    },
    mensagemErro: {
        color: colors.erro,
        fontSize: 14,
        textAlign: 'center',
    },
    botaoTentarNovamente: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: colors.laranja,
        borderRadius: 8,
    },
    textoBotaoTentarNovamente: {
        color: colors.superficie,
        fontWeight: '700',
    },
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    identificacao: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    status: {
        fontSize: 13,
        fontWeight: '700',
    },
    observacao: {
        marginTop: 4,
        paddingHorizontal: 16,
        fontSize: 14,
        color: colors.textoSecundario,
    },
    lista: {
        flex: 1,
        marginTop: 12,
    },
    listaConteudo: {
        padding: 16,
        gap: 12,
    },
    textoVazio: {
        color: colors.textoSecundario,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 24,
    },
    itemCartao: {
        backgroundColor: colors.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    itemLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemNome: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    itemSubtotal: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    itemObservacao: {
        marginTop: 4,
        fontSize: 13,
        color: colors.textoSecundario,
    },
    totalLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.borda,
        backgroundColor: colors.superficie,
    },
    totalRotulo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    totalValor: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.laranja,
    },
});
