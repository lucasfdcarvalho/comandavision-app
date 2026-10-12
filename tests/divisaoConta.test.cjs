const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dividirCentavosEntrePessoas } = require('../src/utils/divisaoConta.ts');

const soma = (parcelas) => parcelas.reduce((total, parcela) => total + parcela, 0);

test('divisão exata não deixa resto', () => {
    assert.deepEqual(dividirCentavosEntrePessoas(10000, 4), [2500, 2500, 2500, 2500]);
    assert.deepEqual(dividirCentavosEntrePessoas(900, 3), [300, 300, 300]);
});

test('centavos restantes vão um a um para as primeiras pessoas', () => {
    assert.deepEqual(dividirCentavosEntrePessoas(10000, 3), [3334, 3333, 3333]);
    assert.deepEqual(dividirCentavosEntrePessoas(10001, 3), [3334, 3334, 3333]);
    assert.deepEqual(dividirCentavosEntrePessoas(1000, 6), [167, 167, 167, 167, 166, 166]);
});

test('total menor que o número de pessoas dá no máximo 1 centavo para cada uma', () => {
    assert.deepEqual(dividirCentavosEntrePessoas(1, 3), [1, 0, 0]);
    assert.deepEqual(dividirCentavosEntrePessoas(2, 5), [1, 1, 0, 0, 0]);
});

test('uma única pessoa recebe o total', () => {
    assert.deepEqual(dividirCentavosEntrePessoas(12345, 1), [12345]);
});

test('total zero gera parcelas zeradas', () => {
    assert.deepEqual(dividirCentavosEntrePessoas(0, 3), [0, 0, 0]);
});

test('a soma é sempre exata e as parcelas diferem em no máximo 1 centavo', () => {
    for (let total = 0; total <= 500; total++) {
        for (let pessoas = 1; pessoas <= 12; pessoas++) {
            const parcelas = dividirCentavosEntrePessoas(total, pessoas);
            assert.equal(parcelas.length, pessoas, `total=${total}, pessoas=${pessoas}`);
            assert.equal(soma(parcelas), total, `total=${total}, pessoas=${pessoas}`);
            assert.ok(Math.max(...parcelas) - Math.min(...parcelas) <= 1, `total=${total}, pessoas=${pessoas}`);
            assert.deepEqual([...parcelas].sort((a, b) => b - a), parcelas, 'as maiores parcelas vêm primeiro');
        }
    }
});

test('valores altos em centavos continuam exatos', () => {
    const parcelas = dividirCentavosEntrePessoas(99999999, 7);
    assert.equal(soma(parcelas), 99999999);
    assert.ok(Math.max(...parcelas) - Math.min(...parcelas) <= 1);
});

test('total inválido retorna lista vazia', () => {
    for (const total of [-1, -0.01, NaN, Infinity, -Infinity]) {
        assert.deepEqual(dividirCentavosEntrePessoas(total, 3), [], `total=${total}`);
    }
});

test('quantidade de pessoas inválida retorna lista vazia', () => {
    for (const pessoas of [0, -1, 1.5, NaN, Infinity]) {
        assert.deepEqual(dividirCentavosEntrePessoas(1000, pessoas), [], `pessoas=${pessoas}`);
    }
});
