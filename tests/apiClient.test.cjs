const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregarApiClient(fetchImpl) {
    const codigo = ts.transpileModule(
        readFileSync(resolve(__dirname, '../src/services/apiClient.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } }
    ).outputText;
    const exports = {};
    vm.runInNewContext(codigo, {
        exports,
        fetch: fetchImpl,
        process: { env: { EXPO_PUBLIC_API_URL: 'https://api.exemplo.test' } },
        require(nome) {
            if (nome === './authService') {
                return {
                    authService: {
                        obterSessao: async () => ({ access_token: 'token-de-teste' }),
                    },
                };
            }
            throw new Error(`Import inesperado: ${nome}`);
        },
    });
    return exports;
}

test('apiClient preserva o status HTTP para compatibilidade seletiva com 404', async () => {
    const { apiClient, ErroApi, ehErroApiStatus } = carregarApiClient(async () => ({
        ok: false,
        status: 404,
        json: async () => ({ mensagem: 'Endpoint ainda n\u00e3o publicado' }),
    }));

    await assert.rejects(
        () => apiClient.requisitar('/api/dashboard/comandas'),
        (error) => {
            assert.ok(error instanceof ErroApi);
            assert.equal(error.message, 'Endpoint ainda n\u00e3o publicado');
            assert.equal(ehErroApiStatus(error, 404), true);
            assert.equal(ehErroApiStatus(error, 500), false);
            return true;
        }
    );
});

test('apiClient n\u00e3o confunde erro de servidor com endpoint ausente', async () => {
    const { apiClient, ehErroApiStatus } = carregarApiClient(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ mensagem: 'Falha interna' }),
    }));

    await assert.rejects(
        () => apiClient.requisitar('/api/dashboard/comandas'),
        (error) => {
            assert.equal(ehErroApiStatus(error, 404), false);
            assert.equal(error.status, 500);
            return true;
        }
    );
});
