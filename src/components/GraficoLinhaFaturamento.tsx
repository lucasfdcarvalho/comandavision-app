import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../theme/colors";

type Ponto = {
    rotulo: string;
    valor: number;
};

type Props = {
    pontos: Ponto[];
    altura?: number;
};

const PADDING_HORIZONTAL = 6;
const PADDING_TOPO = 14;
const ALTURA_ROTULOS = 18;
const MAXIMO_ROTULOS_VISIVEIS = 6;

export function GraficoLinhaFaturamento({ pontos, altura = 170 }: Props) {
    const [largura, setLargura] = useState(0);

    function aoMedir(evento: LayoutChangeEvent) {
        const novaLargura = evento.nativeEvent.layout.width;
        if (novaLargura > 0 && novaLargura !== largura) {
            setLargura(novaLargura);
        }
    }

    if (largura === 0) {
        return <View style={{ height: altura }} onLayout={aoMedir} />;
    }

    const alturaUtil = Math.max(1, altura - PADDING_TOPO - ALTURA_ROTULOS);
    const larguraUtil = Math.max(1, largura - PADDING_HORIZONTAL * 2);
    const valorMaximo = Math.max(1, ...pontos.map((ponto) => ponto.valor));

    const coordenadas = pontos.map((ponto, indice) => {
        const x = pontos.length > 1
            ? PADDING_HORIZONTAL + (larguraUtil * indice) / (pontos.length - 1)
            : PADDING_HORIZONTAL + larguraUtil / 2;
        const y = PADDING_TOPO + alturaUtil - (Math.max(0, ponto.valor) / valorMaximo) * alturaUtil;
        return { x, y };
    });

    const linhaPath = coordenadas.map((ponto, indice) => `${indice === 0 ? 'M' : 'L'} ${ponto.x} ${ponto.y}`).join(' ');
    const linhaBase = PADDING_TOPO + alturaUtil;
    const areaPath = coordenadas.length > 0
        ? `${linhaPath} L ${coordenadas[coordenadas.length - 1].x} ${linhaBase} L ${coordenadas[0].x} ${linhaBase} Z`
        : '';

    // Com muitos dias, mostrar um rótulo por dia amontoaria o eixo X — exibimos só
    // uma amostra espaçada (no máximo ~6), mantendo o espaço reservado nos demais
    // para os rótulos visíveis continuarem alinhados com seus pontos no gráfico.
    const passoRotulo = Math.max(1, Math.ceil(pontos.length / MAXIMO_ROTULOS_VISIVEIS));

    return (
        <View onLayout={aoMedir}>
            <Svg width={largura} height={altura}>
                <Defs>
                    <LinearGradient id="areaFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.laranja} stopOpacity={0.3} />
                        <Stop offset="1" stopColor={colors.laranja} stopOpacity={0} />
                    </LinearGradient>
                </Defs>

                <Line
                    x1={PADDING_HORIZONTAL}
                    y1={linhaBase}
                    x2={largura - PADDING_HORIZONTAL}
                    y2={linhaBase}
                    stroke={colors.borda}
                    strokeWidth={1}
                />

                {areaPath ? <Path d={areaPath} fill="url(#areaFaturamento)" /> : null}
                {linhaPath ? (
                    <Path
                        d={linhaPath}
                        fill="none"
                        stroke={colors.laranja}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                ) : null}

                {coordenadas.map((ponto, indice) => (
                    <Circle
                        key={indice}
                        cx={ponto.x}
                        cy={ponto.y}
                        r={3.5}
                        fill={colors.superficie}
                        stroke={colors.laranja}
                        strokeWidth={2}
                    />
                ))}
            </Svg>

            <View style={styles.rotulos}>
                {pontos.map((ponto, indice) => (
                    <Text
                        key={`${ponto.rotulo}-${indice}`}
                        style={[styles.rotulo, indice % passoRotulo !== 0 && styles.rotuloOculto]}
                        numberOfLines={1}>
                        {ponto.rotulo}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    rotulos: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    rotulo: {
        flex: 1,
        fontSize: 10,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    rotuloOculto: {
        opacity: 0,
    },
});
