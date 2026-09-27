import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { centavosParaMoeda } from "../utils/saldoPagamento";
import { dividirCentavosEntrePessoas } from "../utils/divisaoConta";

const MINIMO_PESSOAS = 2;
const MAXIMO_PESSOAS = 20;

type Props = {
    saldoRestanteCentavos: number;
    onUsarValor: (centavos: number) => void;
    desabilitado?: boolean;
};

export function DividirSaldoPainel({ saldoRestanteCentavos, onUsarValor, desabilitado }: Props) {
    const [quantidadePessoas, setQuantidadePessoas] = useState(MINIMO_PESSOAS);

    const parcelas = dividirCentavosEntrePessoas(saldoRestanteCentavos, quantidadePessoas);
    const noLimiteMinimo = quantidadePessoas <= MINIMO_PESSOAS;
    const noLimiteMaximo = quantidadePessoas >= MAXIMO_PESSOAS;

    function diminuir() {
        setQuantidadePessoas((valor) => Math.max(MINIMO_PESSOAS, valor - 1));
    }

    function aumentar() {
        setQuantidadePessoas((valor) => Math.min(MAXIMO_PESSOAS, valor + 1));
    }

    return (
        <View style={styles.container}>
            <View style={styles.linha}>
                <Text style={styles.rotulo}>Saldo restante</Text>
                <Text style={styles.valorDestaque}>{centavosParaMoeda(saldoRestanteCentavos)}</Text>
            </View>

            <View style={styles.linha}>
                <Text style={styles.rotulo}>Dividir entre</Text>
                <View style={styles.stepper}>
                    <Pressable
                        onPress={diminuir}
                        disabled={desabilitado || noLimiteMinimo}
                        accessibilityRole="button"
                        accessibilityLabel="Diminuir quantidade de pessoas"
                        hitSlop={8}>
                        <Feather name="minus-circle" size={22} color={noLimiteMinimo ? colors.textoSecundario : colors.laranja} />
                    </Pressable>
                    <Text style={styles.quantidadePessoas}>{quantidadePessoas} pessoas</Text>
                    <Pressable
                        onPress={aumentar}
                        disabled={desabilitado || noLimiteMaximo}
                        accessibilityRole="button"
                        accessibilityLabel="Aumentar quantidade de pessoas"
                        hitSlop={8}>
                        <Feather name="plus-circle" size={22} color={noLimiteMaximo ? colors.textoSecundario : colors.laranja} />
                    </Pressable>
                </View>
            </View>
            <Text style={styles.textoLimite}>Mínimo 2, máximo 20 pessoas</Text>

            <View style={styles.lista}>
                {parcelas.map((centavos, indice) => {
                    const semValor = centavos <= 0;
                    return (
                        <View key={indice} style={styles.linhaParcela}>
                            <Text style={styles.rotuloParcela}>Pessoa {indice + 1}</Text>
                            <Text style={styles.valorParcela}>{centavosParaMoeda(centavos)}</Text>
                            <Pressable
                                onPress={() => onUsarValor(centavos)}
                                disabled={desabilitado || semValor}
                                accessibilityRole="button"
                                accessibilityLabel={`Usar ${centavosParaMoeda(centavos)} da pessoa ${indice + 1} no pagamento`}
                                style={({ pressed }) => [
                                    styles.botaoUsar,
                                    (desabilitado || semValor) && styles.botaoUsarDesabilitado,
                                    pressed && !(desabilitado || semValor) && styles.botaoUsarPressionado,
                                ]}>
                                <Text style={styles.textoBotaoUsar}>Usar</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        padding: 16,
        backgroundColor: colors.fundo,
        borderWidth: 1,
        borderColor: colors.borda,
        borderRadius: 12,
        gap: 10,
    },
    linha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rotulo: {
        fontSize: 14,
        color: colors.textoSecundario,
    },
    valorDestaque: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.laranja,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    quantidadePessoas: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textoPrimario,
        minWidth: 76,
        textAlign: 'center',
    },
    textoLimite: {
        marginTop: -4,
        fontSize: 12,
        color: colors.textoSecundario,
    },
    lista: {
        marginTop: 4,
        gap: 8,
    },
    linhaParcela: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.superficie,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.borda,
    },
    rotuloParcela: {
        flex: 1,
        fontSize: 14,
        color: colors.textoPrimario,
    },
    valorParcela: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textoPrimario,
    },
    botaoUsar: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: colors.laranja,
        borderRadius: 999,
    },
    botaoUsarDesabilitado: {
        opacity: 0.5,
    },
    botaoUsarPressionado: {
        opacity: 0.8,
    },
    textoBotaoUsar: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.superficie,
    },
});
