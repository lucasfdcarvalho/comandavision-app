import type { FaturamentoDiario } from "../types/Dashboard";
// Cópia de paraDataISOBrasil (formatadores.ts) mantida aqui porque os testes carregam este
// arquivo direto no Node, que não resolve imports .ts sem extensão.
// NÃO usar toLocaleString/Intl com timeZone + new Date(texto): no Hermes o texto não é
// entendido, a data vira "NaN-NaN-NaN" e a API responde 500 nas abas Gestão e Indicadores.
// O backend agrega em America/Sao_Paulo, que é -03:00 fixo (sem horário de verão desde 2019).
const OFFSET_BRASIL_MS = -3 * 60 * 60 * 1000;

export function paraDataISOBrasil(data: Date): string {
    const horario = new Date(data.getTime() + OFFSET_BRASIL_MS);
    const ano = horario.getUTCFullYear();
    const mes = String(horario.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(horario.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function subtrairDiasData(dataISO: string, dias: number): string {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia - dias));
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`;
}

export type ChavePeriodo = 'hoje' | '7dias' | '30dias' | 'mes';

export type Periodo = { inicio: string; fim: string };

// `referencia` aparece uma única vez, abaixo do seletor, explicando com o que os selos comparam.
export const PERIODOS: { chave: ChavePeriodo; rotulo: string; referencia: string }[] = [
    { chave: 'hoje', rotulo: 'Hoje', referencia: 'Em relação a ontem' },
    { chave: '7dias', rotulo: '7 dias', referencia: 'Em relação aos 7 dias anteriores' },
    { chave: '30dias', rotulo: '30 dias', referencia: 'Em relação aos 30 dias anteriores' },
    { chave: 'mes', rotulo: 'Este mês', referencia: 'Em relação ao mesmo período do mês passado' },
]

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

export type ResultadoComparacao =
    | { status: 'sucesso'; variacao: number }
    | { status: 'sem_base' }
    | { status: 'indisponivel' };

// Avalia a comparação de uma métrica distinguindo explicitamente três cenários:
// 1. Falha de comunicação/API: status 'indisponivel' ("Comparação indisponível")
// 2. Consulta bem-sucedida com valor anterior zero: status 'sem_base' ("Sem base para comparação")
// 3. Consulta bem-sucedida com valor anterior diferente de zero: status 'sucesso' com variação percentual
export function obterComparacaoIndicador(
    atual: number | undefined,
    anterior: number | undefined,
    falhaConsultaAnterior: boolean
): ResultadoComparacao {
    if (
        falhaConsultaAnterior ||
        anterior === undefined ||
        anterior === null ||
        typeof anterior !== 'number' ||
        Number.isNaN(anterior)
    ) {
        return { status: 'indisponivel' };
    }
    if (anterior === 0) {
        return { status: 'sem_base' };
    }
    const valorAtual = typeof atual === 'number' && !Number.isNaN(atual) ? atual : 0;
    const variacao = ((valorAtual - anterior) / anterior) * 100;
    return { status: 'sucesso', variacao };
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

export function formatarPercentualParticipacao(valor: number): string {
    return `${valor.toFixed(1).replace('.', ',')}%`;
}

// Distribui os décimos de ponto percentual pelo método dos maiores restos.
// Assim a exibição continua proporcional aos valores recebidos e fecha em
// exatamente 100,0%, sem esconder uma diferença de arredondamento em um item.
export function calcularPercentuaisFechandoCem(valores: number[]): number[] {
    const valoresEmCentavos = valores.map((valor) =>
        Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : 0
    );
    const totalEmCentavos = valoresEmCentavos.reduce((soma, valor) => soma + valor, 0);

    if (totalEmCentavos === 0) {
        return valores.map(() => 0);
    }

    const UNIDADES_PERCENTUAIS = 1000; // 100,0% em décimos de ponto percentual.
    const distribuicao = valoresEmCentavos.map((valor, indice) => {
        const unidadesExatas = (valor * UNIDADES_PERCENTUAIS) / totalEmCentavos;
        const unidadesInteiras = Math.floor(unidadesExatas);
        return {
            indice,
            unidadesInteiras,
            resto: unidadesExatas - unidadesInteiras,
        };
    });

    let unidadesRestantes = UNIDADES_PERCENTUAIS
        - distribuicao.reduce((soma, item) => soma + item.unidadesInteiras, 0);

    [...distribuicao]
        .sort((a, b) => b.resto - a.resto || a.indice - b.indice)
        .forEach((item) => {
            if (unidadesRestantes > 0) {
                distribuicao[item.indice].unidadesInteiras += 1;
                unidadesRestantes -= 1;
            }
        });

    return distribuicao.map((item) => item.unidadesInteiras / 10);
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
