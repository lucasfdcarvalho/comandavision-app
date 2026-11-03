const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tela = fs.readFileSync(
    path.join(__dirname, '../src/screens/comandas/DetalhesComandaScreen.tsx'),
    'utf8'
);
const api = fs.readFileSync(path.join(__dirname, '../src/services/apiService.ts'), 'utf8');
const tipos = fs.readFileSync(path.join(__dirname, '../src/types/Pagamento.ts'), 'utf8');

test('correção manual é decidida pelo vínculo da cobrança e não pela forma PIX', () => {
    assert.match(tipos, /pixIntegrado:\s*boolean/);
    assert.match(tela, /confirmado && !pagamento\.pixIntegrado/);
    assert.match(tela, /confirmado && pagamento\.pixIntegrado/);
    assert.doesNotMatch(tela, /pagamento\.forma !== 'PIX'/);
});

test('estorno mantém a linguagem anterior e exige motivo', () => {
    assert.match(api, /pagamentos\/\$\{pagamentoId\}\/corrigir/);
    assert.match(api, /body:\s*JSON\.stringify\(dados\)/);
    assert.match(tela, /Estornar pagamento/);
    assert.match(tela, /Informe o motivo do estorno\s*</);
    assert.doesNotMatch(tela, /Informe o motivo do estorno\./);
    assert.doesNotMatch(tela, /A devolução ao cliente é feita separadamente\./);
    assert.doesNotMatch(tela, /Esta ação anula somente o registro/);
    assert.match(tela, /motivoCorrecao\.trim\(\)\.length < 5/);
});
