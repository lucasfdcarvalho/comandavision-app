import type { FaturamentoDiario } from "../types/Dashboard";
import { paraDataISOBrasil, subtrairDiasData } from "./formatadores";

export type ChavePeriodo = 'hoje' | '7dias' | '30dias' | 'mes';

export type Periodo = { inicio: string; fim: string };

export const PERIODOS: { chave: ChavePeriodo; rotulo: string; descricao: string; comparacao: string }[] = [
    { chave: 'hoje', rotulo: 'Hoje', descricao: 'hoje', comparacao: 'vs. ontem (dia inteiro)' },
    { chave: '7dias', rotulo: '7 dias', descricao: 'nos últimos 7 dias', comparacao: 'vs. 7 dias anteriores' },
    { chave: '30dias', rotulo: '30 dias', descricao: 'nos últimos 30 dias', comparacao: 'vs. 30 dias anteriores' },
    { chave: 'mes', rotulo: 'Este mês', descricao: 'neste mês', comparacao: 'vs. mesmo período do mês passado' },
];

const NOMES_DIA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const NOMES_DIA_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Semana comercial começando na segunda, como o dono costuma pensar o movimento.
const ORDEM_DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function partesData(dataISO: string): [number, number, number] {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    return [ano, mes, dia];
}

function paraISO(ano: number, mes: number, dia: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
    return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// O backend calcula o período em America/Sao_Paulo. Se calculássemos "hoje" com o
// relógio/fuso do próprio dispositivo, um emulador ou celular configurado em outro
// fuso mandaria a data errada e o filtro "Hoje" voltaria vazio mesmo havendo vendas.
export function calcularPeriodo(chave: ChavePeriodo): Periodo {
    const fim = paraDataISOBrasil(new Date());

    if (chave === 'hoje') {
        return { inicio: fim, fim };
    }
    if (chave === '7dias') {
        return { inicio: subtrairDiasData(fim, 6), fim };
    }
    if (chave === '30dias') {
        return { inicio: subtrairDiasData(fim, 29), fim };
    }

    const [ano, mes] = partesData(fim);
    return { inicio: paraISO(ano, mes, 1), fim };
}

// Período de mesmo tamanho logo antes do atual. "Este mês" compara com os mesmos dias do mês passado.
export function calcularPeriodoAnterior(chave: ChavePeriodo, periodo: Periodo): Periodo {
    if (chave === 'mes') {
        const [ano, mes, dia] = partesData(periodo.fim);
        const anoAnterior = mes === 1 ? ano - 1 : ano;
        const mesAnterior = mes === 1 ? 12 : mes - 1;
        const diaFim = Math.min(dia, ultimoDiaDoMes(anoAnterior, mesAnterior));
        return { inicio: paraISO(anoAnterior, mesAnterior, 1), fim: paraISO(anoAnterior, mesAnterior, diaFim) };
    }

    const quantidadeDias = listarDias(periodo.inicio, periodo.fim).length;
    const fim = subtrairDiasData(periodo.inicio, 1);
    return { inicio: subtrairDiasData(fim, quantidadeDias - 1), fim };
}

export function listarDias(inicio: string, fim: string): string[] {
    const dias: string[] = [];
    let atual = inicio;
    // Limite de segurança contra datas inválidas.
    while (atual <= fim && dias.length < 400) {
        dias.push(atual);
        atual = subtrairDiasData(atual, -1);
    }
    return dias;
}

// Garante um registro por dia do período, com zero nos dias sem venda.
export function preencherDiasSemVenda(dados: FaturamentoDiario[], periodo: Periodo): FaturamentoDiario[] {
    const porData = new Map(dados.map((dia) => [dia.data.slice(0, 10), dia]));
    return listarDias(periodo.inicio, periodo.fim).map((data) => ({
        data,
        faturamento: porData.get(data)?.faturamento ?? 0,
        quantidadeVendas: porData.get(data)?.quantidadeVendas ?? 0,
    }));
}

// Variação percentual; null quando não há base de comparação (período anterior zerado).
export function calcularVariacao(atual: number, anterior: number): number | null {
    if (!anterior) {
        return null;
    }
    return ((atual - anterior) / anterior) * 100;
}

export function diaDaSemana(dataISO: string): number {
    const [ano, mes, dia] = partesData(dataISO);
    return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function formatarDiaCurto(dataISO: string): string {
    return `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;
}

export function formatarDiaComSemana(dataISO: string): string {
    return `${NOMES_DIA_SEMANA[diaDaSemana(dataISO)]}, ${formatarDiaCurto(dataISO)}`;
}

export function nomeDiaSemanaCurto(dataISO: string): string {
    return NOMES_DIA_SEMANA_CURTOS[diaDaSemana(dataISO)];
}

// Valores curtos para eixos e destaques: R$ 850, R$ 1,2 mil, R$ 1,5 mi.
export function formatarMoedaCompacta(valor: number): string {
    const absoluto = Math.abs(valor);
    const formatar = (numero: number) => numero.toFixed(numero < 10 ? 1 : 0).replace('.', ',').replace(/,0$/, '');

    if (absoluto >= 1_000_000) {
        return `R$ ${formatar(valor / 1_000_000)} mi`;
    }
    if (absoluto >= 1_000) {
        return `R$ ${formatar(valor / 1_000)} mil`;
    }
    return `R$ ${Math.round(valor)}`;
}

export function formatarPercentual(valor: number): string {
    return `${valor.toFixed(valor !== 0 && Math.abs(valor) < 10 ? 1 : 0).replace('.', ',')}%`;
}

export type MediaDiaSemana = {
    diaSemana: number;
    rotulo: string;
    nome: string;
    media: number;
    ocorrencias: number;
};

// Média de faturamento por dia da semana, contando também os dias sem venda.
export function calcularMediaPorDiaSemana(dias: FaturamentoDiario[]): MediaDiaSemana[] {
    return ORDEM_DIAS_SEMANA.map((diaSemana) => {
        const doDia = dias.filter((dia) => diaDaSemana(dia.data) === diaSemana);
        const total = doDia.reduce((soma, dia) => soma + (dia.faturamento ?? 0), 0);
        return {
            diaSemana,
            rotulo: NOMES_DIA_SEMANA_CURTOS[diaSemana],
            nome: NOMES_DIA_SEMANA[diaSemana],
            media: doDia.length ? total / doDia.length : 0,
            ocorrencias: doDia.length,
        };
    });
}

// Teto "redondo" para o eixo (1, 2, 4 ou 5 vezes uma potência de 10), com metade também redonda.
export function arredondarTetoEixo(valor: number): number {
    if (valor <= 0) {
        return 1;
    }
    const potencia = Math.pow(10, Math.floor(Math.log10(valor)));
    const fator = [1, 2, 4, 5, 10].find((candidato) => candidato * potencia >= valor) ?? 10;
    return fator * potencia;
}
