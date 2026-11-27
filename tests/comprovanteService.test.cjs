const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

function montar({ os = 'android', disponivel = true, base64 = 'JVBERi0xLjc=' } = {}) {
    const chamadas = [];
    const deps = {
        'react-native': { Platform: { OS: os } },
        'expo-print': {
            async printToFileAsync({ html, base64: incluir }) {
                chamadas.push(['gerar', html, incluir]);
                return { uri: 'file:///print/saida.pdf', base64 };
            },
        },
        'expo-file-system': {
            EncodingType: { Base64: 'base64' },
            Paths: { cache: 'file:///cache' },
            File: class { constructor(cache, nome) { this.uri = cache + '/' + nome; } },
        },
        'expo-file-system/legacy': {
            async writeAsStringAsync(uri, dados, { encoding }) {
                chamadas.push(['gravar', uri, dados, encoding]);
            },
        },
        'expo-sharing': {
            async isAvailableAsync() { return disponivel; },
            async shareAsync(uri, { mimeType }) { chamadas.push(['compartilhar', uri, mimeType]); },
        },
        '../utils/gerarComprovanteHtml': { gerarComprovanteHtml: () => '<html>Teste</html>' },
    };
    const fonte = stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/services/comprovanteService.ts'), 'utf8'))
        .replace(/import \* as (\w+) from "([^"]+)";/g, 'const $1 = require("$2");')
        .replace(/import \{ ([^}]+) \} from "([^"]+)";/g, 'const { $1 } = require("$2");')
        .replace('export const comprovanteService', 'module.exports');
    const module = { exports: {} };
    runInNewContext(fonte, { module, require: (name) => deps[name], Date: { now: () => 123 } });
    return { service: module.exports, chamadas, dados: { identificacaoComanda: 'Teste' } };
}

test('Android compartilha o PDF gravado no cache do app, nao o arquivo temporario do Print', async () => {
    const { service, chamadas, dados } = montar();
    const uri = 'file:///cache/comprovante-123.pdf';
    assert.equal((await service.compartilhar(dados)).compartilhado, true);
    assert.deepEqual(chamadas, [
        ['gerar', '<html>Teste</html>', true],
        ['gravar', uri, 'JVBERi0xLjc=', 'base64'],
        ['compartilhar', uri, 'application/pdf'],
    ]);
});

test('mantem o caminho de compartilhamento no iOS', async () => {
    const { service, chamadas, dados } = montar({ os: 'ios' });
    assert.equal((await service.compartilhar(dados)).compartilhado, true);
    assert.deepEqual(chamadas, [
        ['gerar', '<html>Teste</html>', false],
        ['compartilhar', 'file:///print/saida.pdf', 'application/pdf'],
    ]);
});

test('nao gera PDF quando compartilhar nao esta disponivel', async () => {
    const { service, chamadas, dados } = montar({ disponivel: false });
    assert.equal((await service.compartilhar(dados)).compartilhado, false);
    assert.deepEqual(chamadas, []);
});

