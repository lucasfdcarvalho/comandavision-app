const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { StackRouter, CommonActions } = require('@react-navigation/routers');

// Executa a configuração real das telas sem carregar módulos nativos ou acessar a API.
function carregarNavegador(arquivo) {
    const codigo = ts.transpileModule(readFileSync(resolve(__dirname, '..', arquivo), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    vm.runInNewContext(codigo, {
        exports,
        require(nome) {
            if (nome === 'react/jsx-runtime') return require(nome);
            if (nome === 'react-native') return { Platform: { OS: 'android' }, StyleSheet: { create: (s) => s } };
            if (nome === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 48 }) };
            if (nome === '@react-navigation/native-stack') {
                return { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }) };
            }
            if (nome === '@react-navigation/bottom-tabs') {
                return { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Screen' }) };
            }
            if (nome.endsWith('/useAuth')) return { useAuth: () => ({ usuario: { papel: 'DONO' } }) };
            if (nome.endsWith('/tabBarLayout')) {
                return { calcularLayoutBarraInferior: (bottom) => ({ height: 56 + bottom, paddingBottom: bottom }) };
            }
            // Identidades estáveis permitem verificar o componente associado a cada rota.
            return new Proxy({}, { get: (_, chave) => chave });
        },
    });
    return exports;
}

const navegadores = carregarNavegador('src/navigation/ComandasStack.tsx');
function pilha(nome) {
    const wrapper = navegadores[nome]();
    const arvore = wrapper.type(wrapper.props);
    const telas = arvore.props.children;
    const routeNames = telas.map((tela) => tela.props.name);
    const opcoes = { routeNames, routeParamList: {}, routeGetIdList: {} };
    const router = StackRouter({ initialRouteName: arvore.props.initialRouteName });
    return { telas, opcoes, router, estado: router.getInitialState(opcoes) };
}
function navegar(pilha, nome, params) {
    pilha.estado = pilha.router.getStateForAction(pilha.estado, CommonActions.navigate(nome, params), pilha.opcoes);
}
function voltar(pilha) {
    pilha.estado = pilha.router.getStateForAction(pilha.estado, CommonActions.goBack(), pilha.opcoes);
}

test('Histórico usa pilha própria com lista correta e sem cabeçalho duplicado', () => {
    const historico = pilha('HistoricoStack');
    assert.equal(historico.telas[0].props.component, 'HistoricoHubScreen');
    assert.equal(historico.telas[0].props.options({}).title, 'Histórico');
    assert.equal(historico.telas[0].props.options({}).headerRight, undefined);
    const abas = carregarNavegador('src/navigation/MainTabs.tsx').MainTabs();
    const aba = abas.props.children.find((tela) => tela?.props.name === 'Historico');
    assert.equal(aba.props.component, 'HistoricoStack');
    assert.equal(aba.props.options.headerShown, false);
    const tela = readFileSync(resolve(__dirname, '../src/screens/historico/HistoricoScreen.tsx'), 'utf8');
    assert.match(tela, /navigation\.navigate\('DetalhesComanda', \{ comandaId: item\.id \}\)/);
    assert.doesNotMatch(tela, /navigate\('Comandas'/);
});

test('voltar nativo dos detalhes restaura a mesma raiz do Histórico em visitas repetidas', () => {
    const historico = pilha('HistoricoStack');
    const raiz = historico.estado.routes[0].key;
    for (const comandaId of [10, 20, 10]) {
        navegar(historico, 'DetalhesComanda', { comandaId });
        assert.equal(historico.estado.routes.at(-1).params.comandaId, comandaId);
        voltar(historico);
        assert.equal(historico.estado.routes.length, 1);
        assert.equal(historico.estado.routes[0].key, raiz);
    }
});

test('pagamento, Pix e comprovante voltam aos detalhes antes do Histórico', () => {
    for (const destino of ['RegistrarPagamento', 'PagamentoPix', 'Comprovante']) {
        const historico = pilha('HistoricoStack');
        navegar(historico, 'DetalhesComanda', { comandaId: 10 });
        navegar(historico, destino, { comandaId: 10 });
        voltar(historico);
        assert.equal(historico.estado.routes.at(-1).name, 'DetalhesComanda');
        voltar(historico);
        assert.equal(historico.estado.routes.at(-1).name, 'Lista');
    }
});

test('visitas no Histórico não alteram a pilha da aba Comandas', () => {
    const comandas = pilha('ComandasStack');
    const historico = pilha('HistoricoStack');
    assert.equal(comandas.telas[0].props.component, 'ComandasScreen');
    navegar(comandas, 'DetalhesComanda', { comandaId: 1 });
    const estadoComandas = JSON.stringify(comandas.estado);
    navegar(historico, 'DetalhesComanda', { comandaId: 2 });
    voltar(historico);
    assert.equal(JSON.stringify(comandas.estado), estadoComandas);
    voltar(comandas);
    assert.equal(comandas.estado.routes.at(-1).name, 'Lista');
});
