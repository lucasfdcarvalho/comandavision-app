const { test } = require('node:test');
const assert = require('node:assert/strict');
const { criarChaveIdempotencia } = require('../src/utils/idempotencia.ts');

test('gera UUID v4 único para identificar cada intenção de pagamento', () => {
    const chaves = Array.from({ length: 100 }, criarChaveIdempotencia);
    const formatoUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    assert.equal(new Set(chaves).size, chaves.length);
    for (const chave of chaves) {
        assert.match(chave, formatoUuidV4);
    }
});
