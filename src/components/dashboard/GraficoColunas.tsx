import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { colors } from "../../theme/colors";
import { arredondarTetoEixo, formatarMoedaCompacta } from "../../utils/dashboard";

export type ItemColuna = {
    chave: string;
    rotulo: string;
    valor: number;
    descricaoAcessivel: string;
};

type Props = {
    itens: ItemColuna[];
    // null = nenhum selecionado: todas as colunas ficam na cor de destaque.
    indiceSelecionado: number | null;
    onSelecionar: (indice: number) => void;
    // Máximo de rótulos no eixo X; com mais itens, mostra uma amostra espaçada.
    maximoRotulos?: number;
    altura?: number;
};

const LARGURA_EIXO_Y = 52;
const ESPACO_TOPO = 10;
// Folga abaixo da linha de base para o rótulo "R$ 0" do eixo não ser cortado.
const ESPACO_BASE = 8;
const ALTURA_EIXO_X = 22;
const LARGURA_ROTULO_X = 44;
const LARGURA_MAXIMA_COLUNA = 24;
const RAIO_PONTA = 4;

// Amostra espaçada (sempre com o primeiro e o último) + o item selecionado, tirando os
// rótulos que encostariam nele. Assim nenhum rótulo se sobrepõe nem é cortado.
function escolherIndicesRotulados(total: number, maximo: number, selecionado: number | null, larguraFaixa: number): number[] {
    if (total <= maximo) {
        return Array.from({ length: total }, (_, indice) => indice);
    }

    const amostra = new Set<number>();
    for (let passo = 0; passo < maximo; passo++) {
        amostra.add(Math.round((passo * (total - 1)) / (maximo - 1)));
    }

    if (selecionado === null) {
        return [...amostra];
    }

    const distanciaMinima = (LARGURA_ROTULO_X + 4) / larguraFaixa;
    return [...amostra]
        .filter((indice) => Math.abs(indice - selecionado) >= distanciaMinima)
        .concat(selecionado);
}

// Coluna com a ponta arredondada e a base reta, crescendo da linha de base.
function caminhoColuna(x: number, largura: number, topo: number, base: number): string {
    const raio = Math.min(RAIO_PONTA, largura / 2, base - topo);
    return [
        `M ${x} ${base}`,
        `V ${topo + raio}`,
        `Q ${x} ${topo} ${x + raio} ${topo}`,
        `H ${x + largura - raio}`,
        `Q ${x + largura} ${topo} ${x + largura} ${topo + raio}`,
        `V ${base}`,
        'Z',
    ].join(' ');
}

export function GraficoColunas({ itens, indiceSelecionado, onSelecionar, maximoRotulos = 5, altura = 180 }: Props) {
    const [largura, setLargura] = useState(0);

    function aoMedir(evento: LayoutChangeEvent) {
        const novaLargura = evento.nativeEvent.layout.width;
        if (novaLargura > 0 && novaLargura !== largura) {
            setLargura(novaLargura);
        }
    }

    const alturaGrafico = altura - ALTURA_EIXO_X;

    if (largura === 0 || itens.length === 0) {
        return <View style={{ height: altura }} onLayout={aoMedir} />;
    }

    const larguraPlot = largura - LARGURA_EIXO_Y;
    const alturaPlot = alturaGrafico - ESPACO_TOPO - ESPACO_BASE;
    const base = ESPACO_TOPO + alturaPlot;
    const teto = arredondarTetoEixo(Math.max(...itens.map((item) => item.valor)));
    const marcas = [0, teto / 2, teto];

    const larguraFaixa = larguraPlot / itens.length;
    // A coluna nunca ocupa a faixa inteira: a sobra vira o espaço de 2px+ entre colunas.
    const larguraColuna = Math.max(2, Math.min(LARGURA_MAXIMA_COLUNA, larguraFaixa * 0.7, larguraFaixa - 2));
    const indicesRotulados = escolherIndicesRotulados(itens.length, maximoRotulos, indiceSelecionado, larguraFaixa);

    return (
        <View onLayout={aoMedir}>
            <Svg width={largura} height={alturaGrafico}>
                {marcas.map((marca) => {
                    const y = base - (marca / teto) * alturaPlot;
                    return (
                        <Line
                            key={`grade-${marca}`}
                            x1={LARGURA_EIXO_Y}
                            y1={y}
                            x2={largura}
                            y2={y}
                            stroke={colors.borda}
                            strokeWidth={1}
                        />
                    );
                })}
                {marcas.map((marca) => (
                    <SvgText
                        key={`rotulo-${marca}`}
                        x={LARGURA_EIXO_Y - 8}
                        y={base - (marca / teto) * alturaPlot + 3.5}
                        fontSize={10}
                        fill={colors.textoSecundario}
                        textAnchor="end">
                        {formatarMoedaCompacta(marca)}
                    </SvgText>
                ))}

                {itens.map((item, indice) => {
                    if (item.valor <= 0) {
                        return null;
                    }
                    const alturaColuna = Math.max(2, (item.valor / teto) * alturaPlot);
                    const x = LARGURA_EIXO_Y + indice * larguraFaixa + (larguraFaixa - larguraColuna) / 2;
                    const selecionada = indice === indiceSelecionado;
                    return (
                        <Path
                            key={item.chave}
                            d={caminhoColuna(x, larguraColuna, base - alturaColuna, base)}
                            fill={selecionada || indiceSelecionado === null ? colors.grafico.destaque : colors.grafico.suave}
                        />
                    );
                })}
            </Svg>

            {/* Área de toque da faixa inteira (maior que a coluna), para dias pequenos ou zerados. */}
            <View style={[styles.camadaToque, { left: LARGURA_EIXO_Y, height: alturaGrafico }]}>
                {itens.map((item, indice) => (
                    <Pressable
                        key={item.chave}
                        style={{ width: larguraFaixa, height: alturaGrafico }}
                        onPress={() => onSelecionar(indice)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: indice === indiceSelecionado }}
                        accessibilityLabel={item.descricaoAcessivel}
                    />
                ))}
            </View>

            <View style={{ height: ALTURA_EIXO_X }}>
                {indicesRotulados.map((indice) => {
                    const item = itens[indice];
                    if (!item) {
                        return null;
                    }
                    const centro = LARGURA_EIXO_Y + indice * larguraFaixa + larguraFaixa / 2;
                    const esquerda = Math.min(
                        Math.max(centro - LARGURA_ROTULO_X / 2, LARGURA_EIXO_Y - 6),
                        largura - LARGURA_ROTULO_X);
                    const selecionado = indice === indiceSelecionado;
                    return (
                        <Text
                            key={item.chave}
                            style={[styles.rotuloX, selecionado && styles.rotuloXSelecionado, { left: esquerda }]}
                            numberOfLines={1}>
                            {item.rotulo}
                        </Text>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    camadaToque: {
        position: 'absolute',
        top: 0,
        right: 0,
        flexDirection: 'row',
    },
    rotuloX: {
        position: 'absolute',
        top: 4,
        width: LARGURA_ROTULO_X,
        fontSize: 11,
        color: colors.textoSecundario,
        textAlign: 'center',
    },
    rotuloXSelecionado: {
        fontWeight: '700',
        color: colors.textoPrimario,
    },
});
