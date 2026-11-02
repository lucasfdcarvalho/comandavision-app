const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregarLayout() {
    const codigo = ts.transpileModule(
        readFileSync(resolve(__dirname, '../src/navigation/tabBarLayout.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } }
    ).outputText;
    const exports = {};
    vm.runInNewContext(codigo, { exports, require });
    return exports.calcularLayoutBarraInferior;
}

test('Android com botoes reserva todo o inset do sistema', () => {
    const calcular = carregarLayout();
    assert.deepEqual(
        { ...calcular(48, 'android') },
        { height: 104, paddingBottom: 48 },
    );
});

test('Android por gestos preserva o inset informado', () => {
    const calcular = carregarLayout();
    assert.deepEqual(
        { ...calcular(24, 'android') },
        { height: 80, paddingBottom: 24 },
    );
});

test('Android usa recuo defensivo quando o inset chega zerado', () => {
    const calcular = carregarLayout();
    assert.deepEqual(
        { ...calcular(0, 'android') },
        { height: 68, paddingBottom: 12 },
    );
});

test('iOS preserva o home indicator sem aplicar recuo Android', () => {
    const calcular = carregarLayout();
    assert.deepEqual(
        { ...calcular(34, 'ios') },
        { height: 90, paddingBottom: 34 },
    );
    assert.deepEqual(
        { ...calcular(0, 'ios') },
        { height: 56, paddingBottom: 0 },
    );
});
