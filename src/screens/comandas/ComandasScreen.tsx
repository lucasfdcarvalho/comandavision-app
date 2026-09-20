import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, RefreshControl, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { Comanda } from "../../types/Comanda";
import { ComandaCard } from "../../components/ComandaCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { colors } from "../../theme/colors";
import { formatarTempoDecorrido } from "../../utils/formatadores";

type Props = NativeStackScreenProps<ComandasStackParamList, 'Lista'>;

export function ComandasScreen({ navigation }: Props) {
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarComandas = useCallback(async () => {
        try {
            setMensagemErro('');
            const dados = await apiService.listarComandas();
            const abertas = dados
                .filter((comanda) => comanda.status === 'ABERTA')
                .sort((a, b) => new Date(b.abertaEm).getTime() - new Date(a.abertaEm).getTime());
            setComandas(abertas);
        } catch (error: unknown) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar as comandas';
            setMensagemErro(mensagem);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            async function carregarInicial() {
                setCarregando(true);
                await carregarComandas();
                setCarregando(false);
            }
            carregarInicial();
        }, [carregarComandas])
    );

    async function atualizar() {
        setAtualizando(true);
        await carregarComandas();
        setAtualizando(false);
    }

    // Busca local: filtra apenas as comandas já carregadas nesta tela, por identificação.
    // Não há endpoint de busca no backend para este recurso.
    const comandasFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) {
            return comandas;
        }
        return comandas.filter((comanda) => comanda.identificacao.toLowerCase().includes(termo));
    }, [comandas, busca]);

    if (carregando) {
        return <LoadingState />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregarComandas} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.cabecalho}>
                <Text style={styles.contagem}>{comandas.length} {comandas.length === 1 ? 'aberta' : 'abertas'}</Text>
            </View>

            <View style={styles.campoBusca}>
                <Feather name="search" size={18} color={colors.textoSecundario} />
                <TextInput
                    style={styles.busca}
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar por identificação..."
                />
            </View>

            <FlatList
                style={styles.lista}
                data={comandasFiltradas}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={comandasFiltradas.length === 0 ? styles.listaVazia : styles.listaConteudo}
                refreshControl={
                    <RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />
                }
                ListEmptyComponent={
                    <EmptyState
                        texto={busca ? 'Nenhuma comanda encontrada para a busca' : 'Nenhuma comanda aberta'}
                    />
                }
                renderItem={({ item }) => (
                    <ComandaCard
                        comanda={item}
                        subtitulo={`Aberta ${formatarTempoDecorrido(item.abertaEm)}`}
                        onPress={() => navigation.navigate('DetalhesComanda', { comandaId: item.id })}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    cabecalho: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    contagem: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    campoBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
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
    lista: {
        flex: 1,
        marginTop: 8,
    },
    listaConteudo: {
        padding: 16,
        gap: 12,
    },
    listaVazia: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
