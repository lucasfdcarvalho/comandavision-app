const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatarTempoRestante, milissegundosAte } = require('../src/utils/pix.ts');

test('formatarTempoRestante: minutos e segundos', () => {
    assert.equal(formatarTempoRestante(30 * 60 * 1000), '30:00');
    assert.equal(formatarTempoRestante(29 * 60 * 1000 + 41 * 1000), '29:41');
    assert.equal(formatarTempoRestante(5 * 1000), '00:05');
});

test('formatarTempoRestante: nunca negativo e arredonda para baixo', () => {
    assert.equal(formatarTempoRestante(-3000), '00:00');
    assert.equal(formatarTempoRestante(999), '00:00');
});

test('formatarTempoRestante: acima de uma hora', () => {
    assert.equal(formatarTempoRestante(61 * 60 * 1000 + 5000), '1:01:05');
});

test('milissegundosAte: data ISO com fuso e data inválida', () => {
    const agora = Date.parse('2026-10-20T20:00:00-03:00');
    assert.equal(milissegundosAte('2026-10-20T20:30:00-03:00', agora), 30 * 60 * 1000);
    assert.equal(milissegundosAte('2026-10-20T23:30:00Z', agora), 30 * 60 * 1000);
    assert.equal(milissegundosAte('não é data', agora), 0);
});
