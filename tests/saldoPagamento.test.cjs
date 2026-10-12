const { test } = require('node:test');
const assert = require('node:assert/strict');
const { avaliarSaldoPagamento, centavosParaMoeda } = require('../src/utils/saldoPagamento.ts');

function resumo(totalComanda, totalPago, extras = {}) {
    return { comandaId: 1, totalComanda, totalPago, saldoRestante: totalComanda - totalPago, situacao: 'PARCIAL', ...extras };
}

test('sem resumo o saldo fica indisponível (nunca vira zero)', () => {
    assert.deepEqual(avaliarSaldoPagamento(100, null), { disponivel: false });
});

test('nada pago: saldo integral e não quitado', () => {
    assert.deepEqual(avaliarSaldoPagamento(100, resumo(100, 0)), {
        disponivel: true,
        totalComandaCentavos: 10000,
        totalPagoCentavos: 0,
        restanteCentavos: 10000,
        quitado: false,
    });
});

test('pagamento parcial calcula o restante em centavos', () => {
    assert.deepEqual(avaliarSaldoPagamento(100, resumo(100, 40.5)), {
        disponivel: true,
        totalComandaCentavos: 10000,
        totalPagoCentavos: 4050,
        restanteCentavos: 5950,
        quitado: false,
    });
});

test('pagamento total quita a comanda', () => {
    assert.deepEqual(avaliarSaldoPagamento(100, resumo(100, 100)), {
        disponivel: true,
        totalComandaCentavos: 10000,
        totalPagoCentavos: 10000,
        restanteCentavos: 0,
        quitado: true,
    });
});

test('a soma de parcelas fracionadas fecha exatamente em centavos', () => {
    // 10,10 + 20,20 em ponto flutuante dá 30.299999999999997, não 30.3.
    const totalPago = 10.1 + 20.2;
    assert.notEqual(totalPago, 30.3);
    const saldo = avaliarSaldoPagamento(30.3, resumo(30.3, totalPago));
    assert.equal(saldo.disponivel, true);
    assert.equal(saldo.totalPagoCentavos, 3030);
    assert.equal(saldo.restanteCentavos, 0);
    assert.equal(saldo.quitado, true);
});

test('valores com erro de ponto flutuante são arredondados para o centavo', () => {
    const saldo = avaliarSaldoPagamento(19.99, resumo(19.99, 0));
    assert.equal(saldo.totalComandaCentavos, 1999);
    assert.equal(saldo.restanteCentavos, 1999);
    const outro = avaliarSaldoPagamento(0.3, resumo(0.1 + 0.2, 0));
    assert.equal(outro.totalComandaCentavos, 30);
});

test('os campos saldoRestante e situacao do resumo não são usados como verdade', () => {
    const saldo = avaliarSaldoPagamento(100, resumo(100, 40, { saldoRestante: 0, situacao: 'PAGO' }));
    assert.equal(saldo.disponivel, true);
    assert.equal(saldo.restanteCentavos, 6000);
    assert.equal(saldo.quitado, false);
});

test('comanda de total zero nunca é considerada quitada', () => {
    const saldo = avaliarSaldoPagamento(0, resumo(0, 0));
    assert.equal(saldo.disponivel, true);
    assert.equal(saldo.restanteCentavos, 0);
    assert.equal(saldo.quitado, false);
});

test('total pago acima do total não gera restante negativo', () => {
    const saldo = avaliarSaldoPagamento(100, resumo(100, 120));
    assert.equal(saldo.disponivel, true);
    assert.equal(saldo.restanteCentavos, 0);
    assert.equal(saldo.quitado, true);
});

test('resumo divergente da comanda em mais de 1 centavo fica indisponível', () => {
    assert.deepEqual(avaliarSaldoPagamento(100, resumo(100.02, 0)), { disponivel: false });
    assert.deepEqual(avaliarSaldoPagamento(100, resumo(99.98, 0)), { disponivel: false });
    assert.deepEqual(avaliarSaldoPagamento(100, resumo(150, 150)), { disponivel: false });
});

test('divergência de até 1 centavo é tolerada e usa o total do resumo', () => {
    const saldo = avaliarSaldoPagamento(100, resumo(100.01, 0));
    assert.equal(saldo.disponivel, true);
    assert.equal(saldo.totalComandaCentavos, 10001);
    assert.equal(saldo.restanteCentavos, 10001);
});

test('totais inválidos no resumo deixam o saldo indisponível', () => {
    const invalidos = [NaN, Infinity, -Infinity, -1, '100', null, undefined];
    for (const valor of invalidos) {
        assert.deepEqual(avaliarSaldoPagamento(100, resumo(valor, 0)), { disponivel: false }, `totalComanda=${String(valor)}`);
        assert.deepEqual(avaliarSaldoPagamento(100, resumo(100, valor)), { disponivel: false }, `totalPago=${String(valor)}`);
    }
});

test('total da comanda inválido deixa o saldo indisponível', () => {
    for (const total of [NaN, Infinity, -1, undefined]) {
        assert.deepEqual(avaliarSaldoPagamento(total, resumo(100, 0)), { disponivel: false }, `total=${String(total)}`);
    }
});

test('centavosParaMoeda: milhares com separador de ponto', () => {
    assert.equal(centavosParaMoeda(123456), 'R$ 1.234,56');
    assert.equal(centavosParaMoeda(1000000), 'R$ 10.000,00');
    assert.equal(centavosParaMoeda(100000000), 'R$ 1.000.000,00');
    assert.equal(centavosParaMoeda(98765432109), 'R$ 987.654.321,09');
});

test('centavosParaMoeda: centavos e frações de real', () => {
    assert.equal(centavosParaMoeda(1), 'R$ 0,01');
    assert.equal(centavosParaMoeda(5), 'R$ 0,05');
    assert.equal(centavosParaMoeda(50), 'R$ 0,50');
    assert.equal(centavosParaMoeda(100), 'R$ 1,00');
    assert.equal(centavosParaMoeda(10050), 'R$ 100,50');
    assert.equal(centavosParaMoeda(3334), 'R$ 33,34');
});

test('centavosParaMoeda: zero, nulo e indefinido', () => {
    assert.equal(centavosParaMoeda(0), 'R$ 0,00');
    assert.equal(centavosParaMoeda(-0), 'R$ 0,00');
    assert.equal(centavosParaMoeda(null), 'R$ 0,00');
    assert.equal(centavosParaMoeda(undefined), 'R$ 0,00');
});

test('centavosParaMoeda: valores negativos com sinal antes do R$', () => {
    assert.equal(centavosParaMoeda(-100), '-R$ 1,00');
    assert.equal(centavosParaMoeda(-550), '-R$ 5,50');
    assert.equal(centavosParaMoeda(-123456), '-R$ 1.234,56');
    assert.equal(centavosParaMoeda(-100000000), '-R$ 1.000.000,00');
});

test('centavosParaMoeda: valores inválidos (NaN e Infinity) retornam traço sem texto inválido nem zero', () => {
    assert.equal(centavosParaMoeda(NaN), '-');
    assert.equal(centavosParaMoeda(Infinity), '-');
    assert.equal(centavosParaMoeda(-Infinity), '-');
});
