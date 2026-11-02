const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const {
    calcularIntervalosComparacao,
    calcularPercentuaisFechandoCem,
    calcularVariacao,
    obterComparacaoIndicador,
    calcularPeriodo,
    calcularPeriodoAnterior,
    listarDias,
} = require('../src/utils/dashboard.ts');

test('percentuais de pagamento fecham em 100,0% pelos maiores restos', () => {
    const percentuais = calcularPercentuaisFechandoCem([37, 35, 27]);

    assert.deepEqual(percentuais, [37.4, 35.3, 27.3]);
    assert.equal(
        percentuais.reduce((soma, valor) => soma + Math.round(valor * 10), 0),
        1000,
    );
});

test('percentuais divididos igualmente continuam fechando em 100,0%', () => {
    assert.deepEqual(calcularPercentuaisFechandoCem([1, 1, 1]), [33.4, 33.3, 33.3]);
    assert.deepEqual(calcularPercentuaisFechandoCem([0, 0]), [0, 0]);
});

test('Indicadores exibe os intervalos efetivamente usados e os anuncia na acessibilidade', () => {
    const fonte = readFileSync(
        resolve(__dirname, '../src/screens/indicadores/IndicadoresScreen.tsx'),
        'utf8'
    );

    assert.match(fonte, /setIntervalos\(intervalosConsulta\)/);
    assert.match(fonte, /formatarIntervalo\(intervalos\.atual\)/);
    assert.match(fonte, /formatarIntervalo\(intervalos\.comparacao\)/);
    assert.match(fonte, /accessibilityLiveRegion="polite"/);
    assert.match(fonte, /Período atual:.*Comparado com:/s);
    assert.doesNotMatch(fonte, /Em relação aos 30 dias anteriores/);
});

test('intervalos de comparacao usam as datas exatas enviadas para cada filtro', () => {
    // 02:59:59 UTC ainda é 01/11/2026 em America/Sao_Paulo.
    const agora = new Date('2026-11-02T02:59:59Z');

    assert.deepEqual(calcularIntervalosComparacao('hoje', agora), {
        atual: { inicio: '2026-11-01', fim: '2026-11-01' },
        comparacao: { inicio: '2026-10-31', fim: '2026-10-31' },
    });
    assert.deepEqual(calcularIntervalosComparacao('7dias', agora), {
        atual: { inicio: '2026-10-26', fim: '2026-11-01' },
        comparacao: { inicio: '2026-10-19', fim: '2026-10-25' },
    });
    assert.deepEqual(calcularIntervalosComparacao('30dias', agora), {
        atual: { inicio: '2026-10-03', fim: '2026-11-01' },
        comparacao: { inicio: '2026-09-03', fim: '2026-10-02' },
    });
    assert.deepEqual(calcularIntervalosComparacao('mes', agora), {
        atual: { inicio: '2026-11-01', fim: '2026-11-01' },
        comparacao: { inicio: '2026-10-01', fim: '2026-10-01' },
    });
});

test('comparacao mensal respeita ano anterior e ultimo dia do mes anterior', () => {
    assert.deepEqual(
        calcularIntervalosComparacao('mes', new Date('2027-01-15T15:00:00Z')).comparacao,
        { inicio: '2026-12-01', fim: '2026-12-15' },
    );
    assert.deepEqual(
        calcularIntervalosComparacao('mes', new Date('2028-03-31T15:00:00Z')).comparacao,
        { inicio: '2028-02-01', fim: '2028-02-29' },
    );
});

test('calcularVariacao: aumento percentual', () => {
    assert.equal(calcularVariacao(150, 100), 50);
    assert.equal(calcularVariacao(200, 100), 100);
});

test('calcularVariacao: queda percentual', () => {
    assert.equal(calcularVariacao(80, 100), -20);
    assert.equal(calcularVariacao(0, 100), -100);
});

test('calcularVariacao: estabilidade', () => {
    assert.equal(calcularVariacao(100, 100), 0);
});

test('calcularVariacao: anterior zerado retorna null', () => {
    assert.equal(calcularVariacao(100, 0), null);
    assert.equal(calcularVariacao(0, 0), null);
});

test('obterComparacaoIndicador: calcula variação quando anterior > 0', () => {
    const aumento = obterComparacaoIndicador(120, 100, false);
    assert.deepEqual(aumento, { status: 'sucesso', variacao: 20 });

    const queda = obterComparacaoIndicador(75, 100, false);
    assert.deepEqual(queda, { status: 'sucesso', variacao: -25 });

    const estabilidade = obterComparacaoIndicador(100, 100, false);
    assert.deepEqual(estabilidade, { status: 'sucesso', variacao: 0 });
});

test('obterComparacaoIndicador: retorna sem_base quando anterior é zero', () => {
    const semBaseComVendas = obterComparacaoIndicador(500, 0, false);
    assert.deepEqual(semBaseComVendas, { status: 'sem_base' });

    const semBaseSemVendas = obterComparacaoIndicador(0, 0, false);
    assert.deepEqual(semBaseSemVendas, { status: 'sem_base' });
});

test('obterComparacaoIndicador: retorna indisponivel quando consulta de comparacao falha', () => {
    const falhaConsulta = obterComparacaoIndicador(1000, undefined, true);
    assert.deepEqual(falhaConsulta, { status: 'indisponivel' });

    // Mesmo se por acaso houver valor anterior anterior, a flag de falha prevalece
    const falhaComValor = obterComparacaoIndicador(1000, 500, true);
    assert.deepEqual(falhaComValor, { status: 'indisponivel' });
});

test('obterComparacaoIndicador: retorna indisponivel quando anterior é nulo/indefinido/NaN sem falha explícita', () => {
    assert.deepEqual(obterComparacaoIndicador(100, undefined, false), { status: 'indisponivel' });
    assert.deepEqual(obterComparacaoIndicador(100, null, false), { status: 'indisponivel' });
    assert.deepEqual(obterComparacaoIndicador(100, Number.NaN, false), { status: 'indisponivel' });
    assert.deepEqual(obterComparacaoIndicador(100, 'invalido', false), { status: 'indisponivel' });
});

test('obterComparacaoIndicador: valor atual indefinido é tratado como zero', () => {
    assert.deepEqual(obterComparacaoIndicador(undefined, 100, false), { status: 'sucesso', variacao: -100 });
});

test('calcularPeriodo e calcularPeriodoAnterior: intervalo de 30 dias contíguo', () => {
    const atual = { inicio: '2026-09-17', fim: '2026-10-16' };
    const diasAtual = listarDias(atual.inicio, atual.fim);
    assert.equal(diasAtual.length, 30);

    const anterior = calcularPeriodoAnterior('30dias', atual);
    assert.equal(anterior.fim, '2026-09-16'); // Termina exatamente na véspera do atual
    assert.equal(anterior.inicio, '2026-08-18');
    const diasAnterior = listarDias(anterior.inicio, anterior.fim);
    assert.equal(diasAnterior.length, 30);
});

test('calcularPeriodo e calcularPeriodoAnterior: intervalo de 7 dias contíguo', () => {
    const atual = { inicio: '2026-10-10', fim: '2026-10-16' };
    assert.equal(listarDias(atual.inicio, atual.fim).length, 7);

    const anterior = calcularPeriodoAnterior('7dias', atual);
    assert.equal(anterior.fim, '2026-10-09');
    assert.equal(anterior.inicio, '2026-10-03');
    assert.equal(listarDias(anterior.inicio, anterior.fim).length, 7);
});

test('calcularPeriodo e calcularPeriodoAnterior: este mês compara mesmo intervalo no mês anterior', () => {
    const atual = { inicio: '2026-10-01', fim: '2026-10-16' };
    const anterior = calcularPeriodoAnterior('mes', atual);
    assert.equal(anterior.inicio, '2026-09-01');
    assert.equal(anterior.fim, '2026-09-16');
});

// Regressão: o Hermes (motor JS do app) não entende o texto de toLocaleString em new Date(...),
// o que gerava "NaN-NaN-NaN" e erro 500 nas abas Gestão e Indicadores.
test('calcularPeriodo: datas válidas mesmo sem suporte a toLocaleString com fuso', () => {
    const original = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = () => 'texto que o Hermes não consegue converter';
    try {
        for (const chave of ['hoje', '7dias', '30dias', 'mes']) {
            const { inicio, fim } = calcularPeriodo(chave);
            assert.match(inicio, /^\d{4}-\d{2}-\d{2}$/, `${chave}: inicio`);
            assert.match(fim, /^\d{4}-\d{2}-\d{2}$/, `${chave}: fim`);
        }
    } finally {
        Date.prototype.toLocaleString = original;
    }
});

test('paraDataISOBrasil (dashboard): virada do dia em São Paulo', () => {
    const { paraDataISOBrasil } = require('../src/utils/dashboard.ts');
    assert.equal(paraDataISOBrasil(new Date('2026-10-12T02:59:59Z')), '2026-10-11');
    assert.equal(paraDataISOBrasil(new Date('2026-10-12T03:00:00Z')), '2026-10-12');
    assert.equal(paraDataISOBrasil(new Date('2027-01-01T02:59:59Z')), '2026-12-31');
});
