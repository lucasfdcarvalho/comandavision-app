import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, TextInput } from '../../components/ui/Texto';
import { ComandaAReceberCard } from '../../components/ComandaAReceberCard';
import { MarcaDaguaLista } from '../../components/MarcaDaguaLista';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import type { ComandasStackParamList } from '../../navigation/ComandasStack';
import { apiService } from '../../services/apiService';
import type { ComandaAReceber } from '../../types/Comanda';
import { colors } from '../../theme/colors';
import { raio } from '../../theme/tokens';
import { correspondeBuscaComanda } from '../../utils/filtroComandas';

export function AReceberScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<ComandasStackParamList, 'Lista'>>();
    const [comandas, setComandas] = useState<ComandaAReceber[]>([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carregar = useCallback(async () => {
        try {
            setMensagemErro('');
            setComandas(await apiService.listarComandasAReceber());
        } catch (error: unknown) {
            setMensagemErro(error instanceof Error ? error.message : 'Não foi possível carregar as comandas a receber');
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            let ativo = true;
            setCarregando(true);
            carregar().finally(() => {
                if (ativo) setCarregando(false);
            });
            return () => { ativo = false; };
        }, [carregar])
    );

    const comandasFiltradas = useMemo(
        () => comandas.filter((comanda) => correspondeBuscaComanda(comanda, busca)),
        [comandas, busca]
    );

    async function atualizar() {
        setAtualizando(true);
        await carregar();
        setAtualizando(false);
    }

    if (carregando) {
        return <LoadingState variante="lista" />;
    }

    if (mensagemErro) {
        return <ErrorState texto={mensagemErro} aoTentarNovamente={carregar} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.campoBusca}>
                <Feather name="search" size={18} color={colors.textoSecundario} />
                <TextInput
                    style={styles.busca}
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar por nome ou número..."
                    accessibilityLabel="Buscar comanda a receber por nome ou número"
                />
            </View>

            <View style={styles.areaLista}>
                <MarcaDaguaLista />
                <FlatList
                    style={styles.lista}
                    data={comandasFiltradas}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={comandasFiltradas.length === 0 ? styles.listaVazia : styles.listaConteudo}
                    refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[colors.laranja]} />}
                    ListEmptyComponent={busca.trim()
                        ? <Text style={styles.avisoVazio}>Nenhuma comanda encontrada para esta busca</Text>
                        : undefined}
                    accessibilityLabel={`${comandasFiltradas.length} ${comandasFiltradas.length === 1 ? 'comanda a receber' : 'comandas a receber'}`}
                    renderItem={({ item }) => (
                        <ComandaAReceberCard
                            comanda={item}
                            onPress={() => navigation.navigate('DetalhesComanda', { comandaId: item.id })}
                        />
                    )}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    campoBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 46,
        marginHorizontal: 16,
        marginTop: 12,
        paddingHorizontal: 14,
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: raio.md,
    },
    busca: {
        flex: 1,
        height: '100%',
        color: colors.textoPrimario,
        fontSize: 15,
    },
    areaLista: {
        flex: 1,
        marginTop: 8,
        position: 'relative',
    },
    lista: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    listaConteudo: {
        padding: 16,
        paddingBottom: 24,
    },
    listaVazia: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    avisoVazio: {
        fontSize: 14,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
});
