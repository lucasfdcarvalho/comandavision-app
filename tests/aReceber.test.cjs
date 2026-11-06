const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = path.join(__dirname, '..');

test('busca de comandas aceita nome, número e número com cerquilha', async () => {
    const modulo = await import(pathToFileURL(path.join(raiz, 'src/utils/filtroComandas.ts')).href);
    const comanda = { id: 1042, identificacao: 'Área Externa' };

    assert.equal(modulo.correspondeBuscaComanda(comanda, 'area'), true);
    assert.equal(modulo.correspondeBuscaComanda(comanda, '1042'), true);
    assert.equal(modulo.correspondeBuscaComanda(comanda, '#1042'), true);
    assert.equal(modulo.correspondeBuscaComanda(comanda, '#1043'), false);
});

test('Histórico abre em A receber e preserva o histórico completo', () => {
    const hub = fs.readFileSync(path.join(raiz, 'src/screens/historico/HistoricoHubScreen.tsx'), 'utf8');
    const historico = fs.readFileSync(path.join(raiz, 'src/screens/historico/HistoricoScreen.tsx'), 'utf8');
    const api = fs.readFileSync(path.join(raiz, 'src/services/apiService.ts'), 'utf8');
    const aReceber = fs.readFileSync(path.join(raiz, 'src/screens/historico/AReceberScreen.tsx'), 'utf8');

    assert.match(hub, /useState<ModoHistorico>\('aReceber'\)/);
    assert.match(hub, />A receber</);
    assert.match(hub, />Histórico</);
    assert.match(historico, /apiService\.listarComandas\(\)/);
    assert.match(api, /'\/api\/comandas\/a-receber'/);
    assert.doesNotMatch(hub, /ROTULO_AMBIENTE_DEMONSTRACAO|avisoDemonstracao/);
    assert.match(aReceber, /MarcaDaguaLista/);
    assert.match(historico, /MarcaDaguaLista/);
});

test('cartão e pagamento mostram número, data, total e saldo', () => {
    const card = fs.readFileSync(path.join(raiz, 'src/components/ComandaAReceberCard.tsx'), 'utf8');
    const detalhes = fs.readFileSync(path.join(raiz, 'src/screens/comandas/DetalhesComandaScreen.tsx'), 'utf8');
    const pagamento = fs.readFileSync(path.join(raiz, 'src/screens/comandas/RegistrarPagamentoScreen.tsx'), 'utf8');

    assert.match(card, /#\{comanda\.id\}/);
    assert.match(card, /Fechada em/);
    assert.match(card, /Data de fechamento não registrada/);
    assert.match(card, /Saldo a receber/);
    assert.match(card, /formatarMoeda\(comanda\.total\)/);
    assert.match(card, /AparecerSuave/);
    assert.match(card, /name="file-text"/);
    assert.match(card, /<StatusBadge status="FECHADA" \/>/);
    assert.doesNotMatch(card, /colors\.avisoFundo/);
    assert.match(detalhes, /Comanda número \$\{comanda\.id\}/);
    assert.match(detalhes, /#\{comanda\.id\}/);
    assert.match(pagamento, /comanda número/);
    assert.match(pagamento, /titulo="Registrar pagamento"/);
    assert.match(pagamento, /titulo="Gerar QR Code Pix"/);
    assert.doesNotMatch(pagamento, /Pagamento registrado em/);
    assert.match(pagamento, /Comanda quitada/);
    assert.match(pagamento, /apiService\.buscarComanda\(comandaId\)/);
});
