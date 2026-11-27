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
    assert.match(tela, /formatarDataHoraCompleta\(comanda.canceladaEm\)/);
    assert.match(tela, /comanda\?\.canceladaPorNome\?\.trim\(\)/);
    assert.match(tela, /comanda\?\.canceladaPor === usuario\.usuarioId/);
    assert.doesNotMatch(tela, /comanda\.canceladaPorNome \|\| comanda\.canceladaPor/);
    assert.doesNotMatch(tela, /Os itens e o hist.rico foram preservados/);
    assert.match(tela, /comanda.motivoCancelamento/);
});

test('cancelamento auditavel usa rota dedicada sem fallback legado', async () => {
 const ts=require('typescript'),vm=require('node:vm');const fonte=fs.readFileSync('src/services/apiService.ts','utf8');const codigo=ts.transpileModule(fonte,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;const chamadas=[];const erro=Object.assign(new Error('rota indisponivel'),{status:404});const exports={};vm.runInNewContext(codigo,{exports,AbortController,setTimeout,clearTimeout,require(nome){assert.equal(nome,'./apiClient');return {apiClient:{async requisitar(rota,opcoes){chamadas.push({rota,opcoes});throw erro;}},ehErroApiStatus:(e,status)=>e.status===status};}});await assert.rejects(exports.apiService.cancelarComanda(7,'  Motivo teste  '),e=>e===erro);assert.equal(chamadas.length,1);assert.equal(chamadas[0].rota,'/api/comandas/7/cancelar-com-motivo');assert.equal(chamadas[0].opcoes.method,'PATCH');assert.deepEqual(JSON.parse(chamadas[0].opcoes.body),{motivo:'Motivo teste'});
});
