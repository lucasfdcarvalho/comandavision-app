const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Contrato dos estilos reais; não substitui validação visual em Android/iOS.
const source = fs.readFileSync(path.join(__dirname, '../src/screens/comandas/DetalhesComandaScreen.tsx'), 'utf8');
const styles = vm.runInNewContext(source.slice(source.indexOf('const styles =')) + '\nstyles;', {
    StyleSheet: { create: value => value },
    colors: {}, raio: {}, sombras: {},
});

test('item permite reacomodar subtotal e restringe o nome à largura disponível', () => {
    assert.equal(styles.itemInfo.minWidth, 0);
    assert.equal(styles.itemLinha.flexWrap, 'wrap');
    assert.ok(styles.itemLinha.gap > 0);
    assert.ok(styles.itemNome.flexBasis > 0);
    assert.equal(styles.itemNome.flexGrow, 1);
    assert.equal(styles.itemNome.flexShrink, 1);
    assert.equal(styles.itemNome.minWidth, 0);
});

test('subtotal e ícone permanecem limitados ao espaço do cartão', () => {
    assert.equal(styles.itemValores.maxWidth, '100%');
    assert.equal(styles.itemValores.flexShrink, 1);
    assert.equal(styles.itemSubtotal.flexShrink, 1);
});

test('nome completo e escala de fonte não são cortados para ocultar overflow', () => {
    const nome = source.match(/<Text\s+style=\{styles.itemNome\}[^>]*>/)?.[0];
    assert.ok(nome);
    assert.doesNotMatch(nome, /numberOfLines|ellipsizeMode|adjustsFontSizeToFit|allowFontScaling|maxFontSizeMultiplier/);
    for (const key of ['itemCartao', 'itemInfo', 'itemLinha', 'itemNome']) {
        assert.equal(styles[key].height, undefined);
        assert.notEqual(styles[key].overflow, 'hidden');
    }
});
