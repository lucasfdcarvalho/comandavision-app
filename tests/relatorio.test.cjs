const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregarGerador() {
    const codigo = ts.transpileModule(
        readFileSync(resolve(__dirname, '../src/utils/gerarRelatorioHtml.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } }
    ).outputText;
    const exports = {};
    vm.runInNewContext(codigo, {
        exports,
        require(nome) {
            if (nome === './formatadores') {
                return {
                    formatarMoeda: (valor) => `R$ ${Number(valor).toFixed(2).replace('.', ',')}`,
                    formatarData: (data) => data,
                    formatarDataHoraCompleta: (data) => data,
                };
            }
            if (nome === './dashboard') {
                return { formatarPercentual: (valor) => `${valor}%` };
            }
            if (nome === './formaPagamento') {
                return {
                    ROTULO_FORMA: {
                        PIX: 'Pix',
                        DINHEIRO: 'Dinheiro',
                        CARTAO_CREDITO: 'Cr\u00e9dito',
                        CARTAO_DEBITO: 'D\u00e9bito',
                    },
                };
            }
            throw new Error(`Import inesperado: ${nome}`);
        },
    });
    return exports;
}

function dadosBase() {
    return {
        inicio: '2026-10-01',
        fim: '2026-10-31',
        geradoEm: '2026-11-01T12:00:00Z',
        resumo: {
            faturamento: 128.5,
            quantidadeVendas: 1,
            ticketMedio: 128.5,
            quantidadeItensVendidos: 3,
        },
        produtos: [],
        formasPagamento: [],
        faturamentoDiario: [],
        historicoDisponivel: true,
        comandas: [],
    };
}

test('relatorio mantem nota curta de demonstracao e listas vazias', () => {
    const { gerarRelatorioHtml, NOTA_DADOS_DEMONSTRACAO } = carregarGerador();
    const html = gerarRelatorioHtml(dadosBase());

    assert.match(html, /Relat\u00f3rio gerencial/);
    assert.ok(html.includes(NOTA_DADOS_DEMONSTRACAO));
    assert.doesNotMatch(html, /Este ambiente acad\u00eamico pode conter comandas simuladas/);
    assert.doesNotMatch(html, /Crit\u00e9rios dos indicadores/);
    assert.doesNotMatch(html, /Como os n\u00fameros s\u00e3o calculados/);
    assert.match(html, /Nenhuma comanda encerrada no per\u00edodo/);
    assert.match(html, /Nenhum produto vendido no per\u00edodo/);
    assert.match(html, /Nenhum pagamento confirmado no per\u00edodo/);
});

test('relatorio preserva totais recebidos e escapa textos vindos da API', () => {
    const { gerarRelatorioHtml } = carregarGerador();
    const dados = dadosBase();
    dados.produtos = [{
        produtoId: 1,
        produtoNome: 'Combo <Especial>',
        quantidadeVendida: 3,
        faturamento: 128.5,
    }];
    dados.formasPagamento = [{
        forma: 'PIX',
        quantidadePagamentos: 1,
        valorRecebido: 128.5,
        percentual: 100,
    }];
    dados.comandas = [{
        id: 42,
        identificacao: 'Mesa & Balc\u00e3o',
        status: 'FECHADA',
        encerradaEm: '2026-10-18T21:30:00-03:00',
        total: 128.5,
        totalPago: 128.5,
        computadaNosIndicadores: true,
    }];

    const html = gerarRelatorioHtml(dados);

    assert.match(html, /Combo &lt;Especial&gt;/);
    assert.match(html, /Mesa &amp; Balc\u00e3o/);
    assert.match(html, /R\$ 128,50/);
    assert.match(html, /<td>Sim<\/td>/);
    assert.doesNotMatch(html, /<td>Combo <Especial><\/td>/);
});

test('relatorio distingue historico indisponivel de periodo sem comandas', () => {
    const { gerarRelatorioHtml, NOTA_DADOS_DEMONSTRACAO } = carregarGerador();
    const dados = dadosBase();
    dados.historicoDisponivel = false;

    const html = gerarRelatorioHtml(dados);

    assert.ok(html.includes(NOTA_DADOS_DEMONSTRACAO));
    assert.doesNotMatch(html, /Histórico de comandas encerradas/);
    assert.doesNotMatch(html, /Histórico indisponível/);
    assert.doesNotMatch(html, /disponível no servidor/);
    assert.doesNotMatch(html, /Nenhuma comanda encerrada no período/);
});

test('tela nao contem as quatro mensagens removidas', () => {
    const fonte = readFileSync(resolve(__dirname, '../src/screens/relatorios/RelatoriosScreen.tsx'), 'utf8')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, codigo) => String.fromCharCode(Number.parseInt(codigo, 16)));

    assert.doesNotMatch(fonte, /Este ambiente acadêmico pode conter comandas simuladas/);
    assert.doesNotMatch(fonte, /Como os números são calculados/);
    assert.doesNotMatch(fonte, /O histórico ainda não está disponível no servidor/);
    assert.doesNotMatch(fonte, /Histórico de comandas e indicadores reunidos em um PDF/);
    assert.match(fonte, /NOTA_DADOS_DEMONSTRACAO/);
});
