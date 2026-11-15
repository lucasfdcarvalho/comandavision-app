const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('visual original usa fonte nativa e cabeçalhos brancos sem perder o retorno nativo', () => {
  const texto = read('src/components/ui/Texto.tsx');
  const navegacao = read('src/navigation/stackScreenOptions.ts');
  assert.match(texto, /export \{ Text, TextInput \} from 'react-native'/);
  assert.match(navegacao, /headerStyle: \{ backgroundColor: colors\.superficie \}/);
  assert.match(navegacao, /headerBackTitle: 'Voltar'/);
  assert.doesNotMatch(navegacao, /Inter_/);
});

test('gestão clara mantém o resumo, a comparação, a atualização e os três atalhos', () => {
  const tela = read('src/screens/dashboard/DashboardScreen.tsx');
  assert.match(tela, /apiService\.buscarResumoDashboard/);
  assert.match(tela, /calcularPeriodoAnterior/);
  assert.match(tela, /onRefresh=\{atualizar\}/);
  for (const destino of ['Relatorios', 'Catalogo', 'Equipe']) {
    assert.ok(tela.includes("navigation.navigate('" + destino + "')"));
  }
  assert.match(tela, /getParent\(\)\?\.navigate\('Indicadores'\)/);
  assert.doesNotMatch(tela, /variante="grafite"/);
});

test('botões e filtros ativos retomam texto branco no laranja', () => {
  const botao = read('src/components/PrimaryButton.tsx');
  assert.match(botao, /backgroundColor: colors\.laranja/);
  assert.match(botao, /color: colors\.superficie/);
  assert.match(botao, /disabled=\{inativo\}/);
  assert.match(botao, /onPress=\{onPress\}/);
  assert.doesNotMatch(botao, /sombras\.destaque/);
});
