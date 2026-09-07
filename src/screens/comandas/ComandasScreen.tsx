import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComandasStackParamList } from "../../navigation/ComandasStack";
import { apiService } from "../../services/apiService";
import { Comanda } from "../../types/Comanda";

type Props = NativeStackScreenProps<ComandasStackParamList, 'Lista'>;

export function ComandasScreen({ navigation }: Props) {
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregarComandas = useCallback(async () => {
        try {
            setMensagemErro('');
            const dados = await apiService.listarComandas();
            setComandas(dados);
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

    if (carregando) {
        return (
            <View style={styles.centro}>
                <ActivityIndicator size="large" color="#EA8B00" />
            </View>
        );
    }

    if (mensagemErro) {
        return (
            <View style={styles.centro}>
                <Text style={styles.mensagemErro}>{mensagemErro}</Text>
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
                <RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={['#EA8B00']} />
            }
            ListEmptyComponent={
                <Text style={styles.textoVazio}>Nenhuma comanda aberta</Text>
            }
            renderItem={({ item }) => (
                <Pressable
                    style={styles.cartao}
                    onPress={() => navigation.navigate('DetalhesComanda', { comandaId: item.id })}>
                    <Text style={styles.identificacao}>{item.identificacao}</Text>
                    <Text style={styles.status}>{item.status}</Text>
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
        backgroundColor: '#FAF9F6',
    },
    mensagemErro: {
        color: '#C62828',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    lista: {
        flex: 1,
        backgroundColor: '#FAF9F6',
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
    textoVazio: {
        color: '#6B6B6B',
        fontSize: 16,
    },
    cartao: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 12,
    },
    identificacao: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F1F1F',
    },
    status: {
        marginTop: 4,
        fontSize: 13,
        color: '#EA8B00',
        fontWeight: '600',
    },
});
