import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui/Texto';
import type { ComandaAReceber } from '../types/Comanda';
import { colors } from '../theme/colors';
import { raio, sombras } from '../theme/tokens';
import { formatarDataHoraCompleta, formatarMoeda } from '../utils/formatadores';
import { AparecerSuave } from './ui/AparecerSuave';
import { StatusBadge } from './StatusBadge';

type Props = {
    comanda: ComandaAReceber;
    onPress: () => void;
};

export function ComandaAReceberCard({ comanda, onPress }: Props) {
    const situacao = comanda.situacaoPagamento === 'PARCIAL' ? 'Pagamento parcial' : 'Não pago';
    const fechamento = comanda.fechadaEm ? formatarDataHoraCompleta(comanda.fechadaEm) : null;
    const contextoFechamento = fechamento ? `fechada em ${fechamento}` : 'sem data de fechamento registrada';
    const rotuloAcessivel = `${comanda.identificacao}, comanda número ${comanda.id}, ${contextoFechamento}, total ${formatarMoeda(comanda.total)}, saldo ${formatarMoeda(comanda.saldoRestante)}, ${situacao}`;

    return (
        <AparecerSuave>
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={rotuloAcessivel}
                style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}>
                <View style={styles.icone}>
                    <Feather name="file-text" size={20} color={colors.laranja} />
                </View>
                <View style={styles.info}>
                    <View style={styles.cabecalho}>
                        <View style={styles.identificacaoContainer}>
                            <Text style={styles.identificacao}>{comanda.identificacao}</Text>
                            <Text style={styles.numero}>#{comanda.id} · {situacao}</Text>
                        </View>
                        <StatusBadge status="FECHADA" />
                    </View>

                    <Text style={styles.data}>
                        {fechamento ? `Fechada em ${fechamento}` : 'Data de fechamento não registrada'}
                    </Text>

                    <View style={styles.valores}>
                        <View style={styles.valorGrupo}>
                            <Text style={styles.valorRotulo}>Total</Text>
                            <Text style={styles.valor}>{formatarMoeda(comanda.total)}</Text>
                        </View>
                        <View style={[styles.valorGrupo, styles.saldoContainer]}>
                            <Text style={styles.saldoRotulo}>Saldo a receber</Text>
                            <Text style={styles.saldo}>{formatarMoeda(comanda.saldoRestante)}</Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </AparecerSuave>
    );
}

const styles = StyleSheet.create({
    cartao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.superficie,
        borderRadius: raio.lg,
        borderWidth: 1,
        borderColor: colors.borda,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        ...sombras.suave,
    },
    cartaoPressionado: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    icone: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fundo,
        borderRadius: 20,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    identificacaoContainer: {
        flex: 1,
        gap: 2,
    },
    identificacao: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    numero: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textoSecundario,
    },
    data: {
        fontSize: 13,
        color: colors.textoSecundario,
    },
    valores: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 4,
    },
    valorGrupo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    valorRotulo: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    valor: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textoPrimario,
    },
    saldoContainer: {
        justifyContent: 'flex-end',
    },
    saldoRotulo: {
        fontSize: 12,
        color: colors.textoSecundario,
    },
    saldo: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.laranjaEscuro,
    },
});
