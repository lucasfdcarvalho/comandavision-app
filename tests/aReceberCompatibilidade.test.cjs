const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregarServico(requisitar) {
    const fonte = readFileSync(resolve(__dirname, '../src/services/apiService.ts'), 'utf8');
    const codigo = ts.transpileModule(fonte, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const exports = {};
    vm.runInNewContext(codigo, {
        exports,
        AbortController,
        setTimeout,
        clearTimeout,
        require(nome) {
            assert.equal(nome, './apiClient');
            return {
                apiClient: { requisitar },
                ehErroApiStatus: (erro, status) => erro?.status === status,
            };
        },
    });
    return exports.apiService;
}

function erroApi(status, mensagem) {
    return Object.assign(new Error(mensagem), { status });
}

test('API antiga usa resumos com concorrencia limitada e exclui comandas quitadas', async () => {
    const caminhos = [];
    let emAndamento = 0;
    let maximo = 0;
    const servico = carregarServico(async (caminho) => {
        caminhos.push(caminho);
        if (caminho === '/api/comandas/a-receber') {
            throw erroApi(400, "O par\u00e2metro 'id' est\u00e1 em um formato inv\u00e1lido");
        }
        if (caminho === '/api/comandas') {
            return [
                ...Array.from({ length: 6 }, (_, indice) => ({
                    id: indice + 1,
                    identificacao: `Mesa ${indice + 1}`,
                    status: 'FECHADA',
                    fechadaEm: `2026-11-05T10:0${indice}:00-03:00`,
                })),
                { id: 7, identificacao: 'Aberta', status: 'ABERTA' },
            ];
        }
        if (caminho.startsWith('/api/dashboard/comandas')) {
            throw erroApi(500, 'Erro interno no dashboard');
        }
        emAndamento++;
        maximo = Math.max(maximo, emAndamento);
        await new Promise((resolve) => setTimeout(resolve, 2));
        emAndamento--;
        const id = Number(caminho.match(/comandas\/(\d+)/)[1]);
        return {
            comandaId: id,
            totalComanda: 100,
            totalPago: id === 1 ? 0 : id === 2 ? 100 : 40,
            saldoRestante: id === 1 ? 100 : id === 2 ? 0 : 60,
        };
    });

    const resultado = await servico.listarComandasAReceber();
    assert.deepEqual(Array.from(resultado, (item) => item.id), [6, 5, 4, 3, 1]);
    assert.equal(resultado.find((item) => item.id === 1).situacaoPagamento, 'NAO_PAGO');
    assert.equal(resultado.find((item) => item.id === 3).saldoRestante, 60);
    assert.equal(maximo, 6);
    assert.equal(caminhos.length, 9);
});

test('erro diferente da rota ausente nao ativa o fallback', async () => {
    const caminhos = [];
    const servico = carregarServico(async (caminho) => {
        caminhos.push(caminho);
        throw erroApi(400, 'Outro problema de valida\u00e7\u00e3o');
    });

    await assert.rejects(() => servico.listarComandasAReceber(), /Outro problema/);
    assert.deepEqual(caminhos, ['/api/comandas/a-receber']);
});

test('falha em um resumo impede lista financeira parcial', async () => {
    const servico = carregarServico(async (caminho) => {
        if (caminho === '/api/comandas/a-receber') throw erroApi(404, 'N\u00e3o encontrada');
        if (caminho === '/api/comandas') return [
            { id: 1, status: 'FECHADA', identificacao: 'Mesa 1', fechadaEm: '2026-11-05T12:00:00-03:00' },
            { id: 2, status: 'FECHADA', identificacao: 'Mesa 2', fechadaEm: '2026-11-05T12:00:00-03:00' },
        ];
        if (caminho.startsWith('/api/dashboard/comandas')) throw erroApi(403, 'Acesso negado');
        if (caminho.endsWith('/1/pagamentos/resumo')) {
            return { comandaId: 1, totalComanda: 100, totalPago: 0, saldoRestante: 100 };
        }
        throw erroApi(500, 'Falha no resumo');
    });

    await assert.rejects(() => servico.listarComandasAReceber(), /Falha no resumo/);
});

test('papel DONO usa historico consolidado sem consultar cada resumo', async () => {
    const caminhos = [];
    const servico = carregarServico(async (caminho) => {
        caminhos.push(caminho);
        if (caminho === '/api/comandas/a-receber') {
            throw erroApi(400, "O par\u00e2metro 'id' est\u00e1 em um formato inv\u00e1lido");
        }
        if (caminho === '/api/comandas') return [
            { id: 1, status: 'FECHADA', identificacao: 'Mesa 1', fechadaEm: '2026-11-05T12:00:00-03:00' },
            { id: 2, status: 'FECHADA', identificacao: 'Mesa 2', fechadaEm: '2026-11-05T13:00:00-03:00' },
        ];
        return [
            { id: 2, status: 'FECHADA', identificacao: 'Mesa 2', encerradaEm: '2026-11-05T13:00:00-03:00', total: 100, totalPago: 100 },
            { id: 1, status: 'FECHADA', identificacao: 'Mesa 1', encerradaEm: '2026-11-05T12:00:00-03:00', total: 100, totalPago: 40 },
        ];
    });

    const resultado = await servico.listarComandasAReceber();
    assert.deepEqual(Array.from(resultado, (item) => item.id), [1]);
    assert.equal(resultado[0].saldoRestante, 60);
    assert.equal(caminhos.length, 3);
});

test('rota nova evita consultas extras quando estiver publicada', async () => {
    const caminhos = [];
    const servico = carregarServico(async (caminho) => {
        caminhos.push(caminho);
        return [{ id: 4, identificacao: 'Mesa 4', saldoRestante: 12 }];
    });

    const resultado = await servico.listarComandasAReceber();
    assert.equal(resultado.length, 1);
    assert.deepEqual(caminhos, ['/api/comandas/a-receber']);
});
