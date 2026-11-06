import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui/Texto';
import { colors } from '../../theme/colors';
import { raio } from '../../theme/tokens';
import { AReceberScreen } from './AReceberScreen';
import { HistoricoScreen } from './HistoricoScreen';

type ModoHistorico = 'aReceber' | 'historico';

export function HistoricoHubScreen() {
    const [modo, setModo] = useState<ModoHistorico>('aReceber');

    return (
        <View style={styles.container}>
            <View style={styles.seletor} accessibilityRole="tablist">
                <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: modo === 'aReceber' }}
                    onPress={() => setModo('aReceber')}
                    style={[styles.opcao, modo === 'aReceber' && styles.opcaoSelecionada]}>
                    <Text style={[styles.opcaoTexto, modo === 'aReceber' && styles.opcaoTextoSelecionado]}>A receber</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: modo === 'historico' }}
                    onPress={() => setModo('historico')}
                    style={[styles.opcao, modo === 'historico' && styles.opcaoSelecionada]}>
                    <Text style={[styles.opcaoTexto, modo === 'historico' && styles.opcaoTextoSelecionado]}>Histórico</Text>
                </Pressable>
            </View>
            <View style={styles.conteudo}>
                {modo === 'aReceber' ? <AReceberScreen /> : <HistoricoScreen />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.fundo,
    },
    seletor: {
        flexDirection: 'row',
        gap: 6,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 4,
        backgroundColor: colors.fundoSecundario,
        borderRadius: raio.md,
    },
    opcao: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: raio.sm,
    },
    opcaoSelecionada: {
        backgroundColor: colors.superficie,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    opcaoTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    opcaoTextoSelecionado: {
        color: colors.laranjaEscuro,
    },
    conteudo: {
        flex: 1,
    },
});
