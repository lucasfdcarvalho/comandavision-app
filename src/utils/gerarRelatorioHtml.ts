import type { DadosRelatorioGerencial } from "../types/Relatorio";
import { formatarData, formatarDataHoraCompleta, formatarMoeda } from "./formatadores";
import { calcularPercentuaisFechandoCem, formatarPercentualParticipacao } from "./dashboard";
import { ROTULO_FORMA } from "./formaPagamento";

export const NOTA_DADOS_DEMONSTRACAO =
    'Dados acad\u00eamicos de demonstra\u00e7\u00e3o; n\u00e3o representam vendas reais verificadas.';

function escaparHtml(valor: string): string {
    return valor
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function linhaVazia(texto: string, colunas: number): string {
    return `<tr><td class="vazio" colspan="${colunas}">${escaparHtml(texto)}</td></tr>`;
}

export function gerarRelatorioHtml(dados: DadosRelatorioGerencial): string {
    const historicoDisponivel = dados.historicoDisponivel;
    const linhasProdutos = dados.produtos.length > 0
        ? dados.produtos.map((produto, indice) => `
            <tr>
                <td>${indice + 1}</td>
                <td>${escaparHtml(produto.produtoNome)}</td>
                <td class="numero">${produto.quantidadeVendida}</td>
                <td class="numero">${formatarMoeda(produto.faturamento)}</td>
            </tr>`).join('')
        : linhaVazia('Nenhum produto vendido no per\u00edodo.', 4);

    const percentuaisFormas = calcularPercentuaisFechandoCem(
        dados.formasPagamento.map((forma) => forma.valorRecebido)
    );
    const linhasFormas = dados.formasPagamento.length > 0
        ? dados.formasPagamento.map((forma, indice) => `
            <tr>
                <td>${escaparHtml(ROTULO_FORMA[forma.forma])}</td>
                <td class="numero">${forma.quantidadePagamentos}</td>
                <td class="numero">${formatarMoeda(forma.valorRecebido)}</td>
                <td class="numero">${formatarPercentualParticipacao(percentuaisFormas[indice])}</td>
            </tr>`).join('')
        : linhaVazia('Nenhum pagamento confirmado no per\u00edodo.', 4);

    const linhasFaturamento = dados.faturamentoDiario.length > 0
        ? dados.faturamentoDiario.map((dia) => `
            <tr>
                <td>${formatarData(dia.data)}</td>
                <td class="numero">${dia.quantidadeVendas}</td>
                <td class="numero">${formatarMoeda(dia.faturamento)}</td>
            </tr>`).join('')
        : linhaVazia('Nenhum dia dispon\u00edvel para o per\u00edodo.', 3);

    const linhasComandas = dados.comandas.length > 0
        ? dados.comandas.map((comanda) => `
            <tr>
                <td>#${comanda.id}</td>
                <td>${escaparHtml(comanda.identificacao)}</td>
                <td>${comanda.status === 'FECHADA' ? 'Fechada' : 'Cancelada'}</td>
                <td>${formatarDataHoraCompleta(comanda.encerradaEm)}</td>
                <td class="numero">${formatarMoeda(comanda.total)}</td>
                <td class="numero">${formatarMoeda(comanda.totalPago)}</td>
                <td>${comanda.computadaNosIndicadores ? 'Sim' : 'N\u00e3o'}</td>
            </tr>`).join('')
        : linhaVazia('Nenhuma comanda encerrada no per\u00edodo.', 7);

    const quantidadeCanceladas = dados.comandas.filter((comanda) => comanda.status === 'CANCELADA').length;
    const quantidadeComputadas = dados.comandas.filter((comanda) => comanda.computadaNosIndicadores).length;

    const resumoHistoricoHtml = historicoDisponivel ? `
    <div class="resumo-historico">
        <span><strong>${dados.comandas.length}</strong> comandas encerradas</span>
        <span><strong>${quantidadeComputadas}</strong> computadas nos indicadores</span>
        <span><strong>${quantidadeCanceladas}</strong> canceladas</span>
    </div>` : '';

    const secaoHistoricoHtml = historicoDisponivel ? `
    <section>
        <h2>Hist\u00f3rico de comandas encerradas</h2>
        <table>
            <thead>
                <tr><th>ID</th><th>Identifica\u00e7\u00e3o</th><th>Status</th><th>Encerrada em</th><th class="numero">Total</th><th class="numero">Pago conf.</th><th>Indicadores</th></tr>
            </thead>
            <tbody>${linhasComandas}</tbody>
        </table>
    </section>` : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1F1F1F; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.45; }
    h1, h2, p { margin: 0; }
    .cabecalho { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid #EA8B00; }
    .marca { color: #C46F00; font-size: 13px; font-weight: 800; letter-spacing: .08em; }
    h1 { margin-top: 3px; font-size: 23px; line-height: 1.2; }
    .meta { text-align: right; color: #6B6B6B; white-space: nowrap; }
    .meta strong { color: #1F1F1F; }
    .metricas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
    .metrica { padding: 11px; border: 1px solid #ECE9E2; border-radius: 9px; background: #FFFEFC; }
    .metrica span { display: block; color: #6B6B6B; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
    .metrica strong { display: block; margin-top: 4px; font-size: 16px; font-variant-numeric: tabular-nums; }
    .resumo-historico { display: flex; gap: 16px; margin-top: 8px; color: #6B6B6B; }
    .resumo-historico strong { color: #1F1F1F; }
    section { margin-top: 18px; break-inside: auto; }
    h2 { margin-bottom: 7px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th { padding: 5px 6px; background: #F4F2EC; border-bottom: 1px solid #DAD6CC; color: #4D4D4D; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .03em; }
    td { padding: 4px 6px; border-bottom: 1px solid #ECE9E2; vertical-align: top; }
    .numero { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .vazio { padding: 13px; color: #6B6B6B; text-align: center; }
    .duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .rodape { margin-top: 18px; padding-top: 9px; border-top: 1px solid #DAD6CC; color: #6B6B6B; font-size: 9px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
    <header class="cabecalho">
        <div>
            <div class="marca">SUPRI CONVENI\u00caNCIA</div>
            <h1>Relat\u00f3rio gerencial</h1>
        </div>
        <div class="meta">
            <div><strong>Per\u00edodo</strong></div>
            <div>${formatarData(dados.inicio)} a ${formatarData(dados.fim)}</div>
            <div style="margin-top: 5px">Gerado em ${formatarDataHoraCompleta(dados.geradoEm)}</div>
        </div>
    </header>

    <div class="metricas">
        <div class="metrica"><span>Faturamento</span><strong>${formatarMoeda(dados.resumo.faturamento)}</strong></div>
        <div class="metrica"><span>Vendas</span><strong>${dados.resumo.quantidadeVendas}</strong></div>
        <div class="metrica"><span>Ticket m\u00e9dio</span><strong>${formatarMoeda(dados.resumo.ticketMedio)}</strong></div>
        <div class="metrica"><span>Itens vendidos</span><strong>${dados.resumo.quantidadeItensVendidos}</strong></div>
    </div>
    ${resumoHistoricoHtml}

    <section class="duas-colunas">
        <div>
            <h2>Produtos mais vendidos</h2>
            <table>
                <thead><tr><th>#</th><th>Produto</th><th class="numero">Qtd.</th><th class="numero">Faturamento</th></tr></thead>
                <tbody>${linhasProdutos}</tbody>
            </table>
        </div>
        <div>
            <h2>Formas de pagamento</h2>
            <table>
                <thead><tr><th>Forma</th><th class="numero">Pag.</th><th class="numero">Recebido</th><th class="numero">Part.</th></tr></thead>
                <tbody>${linhasFormas}</tbody>
            </table>
        </div>
    </section>

    <section>
        <h2>Faturamento di\u00e1rio</h2>
        <table>
            <thead><tr><th>Data</th><th class="numero">Vendas</th><th class="numero">Faturamento</th></tr></thead>
            <tbody>${linhasFaturamento}</tbody>
        </table>
    </section>

    ${secaoHistoricoHtml}

    <footer class="rodape">
        ${escaparHtml(NOTA_DADOS_DEMONSTRACAO)} Documento gerencial gerado pelo ComandaVision. N\u00e3o possui valor fiscal ou cont\u00e1bil.
    </footer>
</body>
</html>`;
}
