const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
    formatarMoeda,
    formatarDataHora,
    paraDataISOBrasil,
    subtrairDiasData,
    formatarTempoDecorrido,
} = require('../src/utils/formatadores.ts');

// São Paulo é UTC-03:00 o ano todo (sem horário de verão desde 2019).
// Portanto 03:00Z é meia-noite em São Paulo e 02:59:59Z ainda é o dia anterior.

test('formatarMoeda: milhares com separador de ponto', () => {
    assert.equal(formatarMoeda(1234.56), 'R$ 1.234,56');
    assert.equal(formatarMoeda(10000), 'R$ 10.000,00');
    assert.equal(formatarMoeda(1000000), 'R$ 1.000.000,00');
    assert.equal(formatarMoeda(987654321.09), 'R$ 987.654.321,09');
});

test('formatarMoeda: centavos e casas decimais', () => {
    assert.equal(formatarMoeda(0.01), 'R$ 0,01');
    assert.equal(formatarMoeda(0.05), 'R$ 0,05');
    assert.equal(formatarMoeda(0.5), 'R$ 0,50');
    assert.equal(formatarMoeda(5), 'R$ 5,00');
    assert.equal(formatarMoeda(10.99), 'R$ 10,99');
});

test('formatarMoeda: zero, nulo e indefinido', () => {
    assert.equal(formatarMoeda(0), 'R$ 0,00');
    assert.equal(formatarMoeda(-0), 'R$ 0,00');
    assert.equal(formatarMoeda(null), 'R$ 0,00');
    assert.equal(formatarMoeda(undefined), 'R$ 0,00');
});

test('formatarMoeda: valores negativos com sinal antes do R$ e sem zero negativo', () => {
    assert.equal(formatarMoeda(-5.5), '-R$ 5,50');
    assert.equal(formatarMoeda(-1234.56), '-R$ 1.234,56');
    assert.equal(formatarMoeda(-1000000), '-R$ 1.000.000,00');
    assert.equal(formatarMoeda(-0.001), 'R$ 0,00');
    assert.equal(formatarMoeda(-0.004), 'R$ 0,00');
});

test('formatarMoeda: valores inválidos (NaN e Infinity) retornam traço sem texto inválido nem zero', () => {
    assert.equal(formatarMoeda(NaN), '-');
    assert.equal(formatarMoeda(Infinity), '-');
    assert.equal(formatarMoeda(-Infinity), '-');
});

test('paraDataISOBrasil: virada do dia', () => {
    assert.equal(paraDataISOBrasil(new Date('2026-10-12T02:59:59Z')), '2026-10-11');
    assert.equal(paraDataISOBrasil(new Date('2026-10-12T03:00:00Z')), '2026-10-12');
    assert.equal(paraDataISOBrasil(new Date('2026-10-12T14:00:00Z')), '2026-10-12');
    assert.equal(paraDataISOBrasil(new Date('2026-10-12T23:59:59-03:00')), '2026-10-12');
});

test('paraDataISOBrasil: virada do mês', () => {
    assert.equal(paraDataISOBrasil(new Date('2026-10-01T02:59:59Z')), '2026-09-30');
    assert.equal(paraDataISOBrasil(new Date('2026-10-01T03:00:00Z')), '2026-10-01');
    assert.equal(paraDataISOBrasil(new Date('2026-03-01T02:59:59Z')), '2026-02-28');
    assert.equal(paraDataISOBrasil(new Date('2026-03-01T03:00:00Z')), '2026-03-01');
});

test('paraDataISOBrasil: virada do ano', () => {
    assert.equal(paraDataISOBrasil(new Date('2027-01-01T02:59:59Z')), '2026-12-31');
    assert.equal(paraDataISOBrasil(new Date('2027-01-01T03:00:00Z')), '2027-01-01');
});

test('paraDataISOBrasil: ano bissexto', () => {
    assert.equal(paraDataISOBrasil(new Date('2028-03-01T02:59:59Z')), '2028-02-29');
    assert.equal(paraDataISOBrasil(new Date('2028-03-01T03:00:00Z')), '2028-03-01');
});

test('formatarDataHora converte UTC para o horário de São Paulo', () => {
    assert.equal(formatarDataHora('2026-10-12T17:45:00Z'), '12/10 14:45');
    assert.equal(formatarDataHora('2026-07-05T12:07:00Z'), '05/07 09:07');
});

test('formatarDataHora: virada do dia, mês e ano', () => {
    assert.equal(formatarDataHora('2026-10-12T02:59:00Z'), '11/10 23:59');
    assert.equal(formatarDataHora('2026-10-12T03:00:00Z'), '12/10 00:00');
    assert.equal(formatarDataHora('2026-10-01T02:30:00Z'), '30/09 23:30');
    assert.equal(formatarDataHora('2026-03-01T02:59:00Z'), '28/02 23:59');
    assert.equal(formatarDataHora('2027-01-01T02:59:00Z'), '31/12 23:59');
    assert.equal(formatarDataHora('2027-01-01T03:00:00Z'), '01/01 00:00');
});

test('formatarDataHora respeita datas com offset explícito', () => {
    assert.equal(formatarDataHora('2026-03-01T00:30:00-03:00'), '01/03 00:30');
    assert.equal(formatarDataHora('2026-03-01T00:30:00+00:00'), '28/02 21:30');
});

test('subtrairDiasData: dias, meses e anos', () => {
    assert.equal(subtrairDiasData('2026-10-12', 0), '2026-10-12');
    assert.equal(subtrairDiasData('2026-10-12', 1), '2026-10-11');
    assert.equal(subtrairDiasData('2026-10-12', 6), '2026-10-06');
    assert.equal(subtrairDiasData('2026-10-12', 29), '2026-09-13');
    assert.equal(subtrairDiasData('2026-10-01', 1), '2026-09-30');
    assert.equal(subtrairDiasData('2026-03-01', 1), '2026-02-28');
    assert.equal(subtrairDiasData('2028-03-01', 1), '2028-02-29');
    assert.equal(subtrairDiasData('2027-01-01', 1), '2026-12-31');
    assert.equal(subtrairDiasData('2026-03-31', 31), '2026-02-28');
});

test('subtrairDiasData com valor negativo avança no calendário', () => {
    assert.equal(subtrairDiasData('2026-12-31', -1), '2027-01-01');
    assert.equal(subtrairDiasData('2026-02-28', -1), '2026-03-01');
    assert.equal(subtrairDiasData('2028-02-28', -1), '2028-02-29');
    assert.equal(subtrairDiasData('2028-02-29', -1), '2028-03-01');
});

test('o resultado não depende do fuso do aparelho', () => {
    const modulo = path.resolve(__dirname, '../src/utils/formatadores.ts');
    const script = `
        const f = require(${JSON.stringify(modulo)});
        const saida = [
            f.paraDataISOBrasil(new Date('2027-01-01T02:59:59Z')),
            f.paraDataISOBrasil(new Date('2027-01-01T03:00:00Z')),
            f.formatarDataHora('2026-10-12T02:59:00Z'),
            f.formatarDataHora('2026-10-12T03:00:00Z'),
        ];
        console.log(JSON.stringify(saida));
    `;
    const esperado = ['2026-12-31', '2027-01-01', '11/10 23:59', '12/10 00:00'];

    for (const fuso of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'America/Sao_Paulo']) {
        const resposta = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
            env: { ...process.env, TZ: fuso },
            encoding: 'utf8',
        });
        assert.deepEqual(JSON.parse(resposta.trim().split('\n').pop()), esperado, `TZ=${fuso}`);
    }
});

test('formatarTempoDecorrido', (t) => {
    const agora = Date.parse('2026-10-12T15:00:00Z');
    t.mock.method(Date, 'now', () => agora);
    const atras = (minutos) => new Date(agora - minutos * 60000).toISOString();

    assert.equal(formatarTempoDecorrido(atras(0)), 'agora mesmo');
    assert.equal(formatarTempoDecorrido(atras(0.5)), 'agora mesmo');
    assert.equal(formatarTempoDecorrido(atras(1)), 'há 1 min');
    assert.equal(formatarTempoDecorrido(atras(59)), 'há 59 min');
    assert.equal(formatarTempoDecorrido(atras(60)), 'há 1 h');
    assert.equal(formatarTempoDecorrido(atras(23 * 60 + 59)), 'há 23 h');
    assert.equal(formatarTempoDecorrido(atras(24 * 60)), 'há 1 d');
    assert.equal(formatarTempoDecorrido(atras(3 * 24 * 60)), 'há 3 d');
    // Relógio do aparelho adiantado em relação ao servidor não gera tempo negativo.
    assert.equal(formatarTempoDecorrido(atras(-10)), 'agora mesmo');
});
