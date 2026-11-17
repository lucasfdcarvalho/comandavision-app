const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { podeCancelarComanda, validarMotivoCancelamento } = require('../src/utils/cancelamentoComanda.ts');

test('dono e funcionário cancelam somente abertas, com ou sem itens', () => {
    for (const papel of ['DONO', 'FUNCIONARIO']) {
        assert.equal(podeCancelarComanda(papel, 'ABERTA'), true);
        for (const status of ['FECHADA', 'CANCELADA', undefined]) assert.equal(podeCancelarComanda(papel, status), false);
    }
    for (const papel of [undefined, 'ADMIN', '']) assert.equal(podeCancelarComanda(papel, 'ABERTA'), false);
});
test('motivo aparado tem limites 3 e 500', () => {
    for (const texto of ['', '   ', ' ab ', 'a'.repeat(501)]) assert.notEqual(validarMotivoCancelamento(texto), '');
    for (const texto of [' abc ', 'a'.repeat(500)]) assert.equal(validarMotivoCancelamento(texto), '');
});
test('contrato envia motivo e tela preserva erro, confirmação e trava de duplicação', () => {
    const api = fs.readFileSync('src/services/apiService.ts', 'utf8');
    const tela = fs.readFileSync('src/screens/comandas/DetalhesComandaScreen.tsx', 'utf8');
    assert.match(api, /async function cancelarComanda\(id: number, motivo: string\)/);
    assert.match(api, /body: JSON.stringify\(\{ motivo: motivo.trim\(\) \}\)/);
    assert.match(tela, /cancelamentoPendente.current \|\| !confirmandoCancelamento/);
    assert.match(tela, /setErroCancelamento\(mensagem\)/);
    assert.match(tela, /setConfirmandoCancelamento\(false\)/);
    assert.match(tela, /Confirmar cancelamento/);
    assert.match(tela, /comanda.canceladaEm/);
    assert.match(tela, /comanda.canceladaPorNome/);
    assert.match(tela, /comanda.motivoCancelamento/);
});
