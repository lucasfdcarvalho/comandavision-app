import { formatarMoeda, formatarDataHora } from "./formatadores";
import { ROTULO_FORMA } from "./formaPagamento";
import type { FormaPagamento } from "../types/Pagamento";

export interface ItemComprovante {
    produtoNome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
}

export interface PagamentoComprovante {
    forma: FormaPagamento;
    valor: number;
}

export interface DadosComprovante {
    identificacaoComanda: string;
    comandaId: number;
    fechadaEm?: string;
    itens: ItemComprovante[];
    totalComanda: number;
    pagamentos: PagamentoComprovante[];
    totalRecebido: number;
    geradoEm: string;
}

// Único ponto de entrada de texto vindo da API (identificação da comanda, nome
// de produto) para dentro do HTML — nunca interpole essas strings diretamente
// no template abaixo sem passar por aqui, ou caracteres como <, > e & podem
// quebrar a estrutura do comprovante gerado.
function escaparHtml(valor: string): string {
    return valor
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function gerarComprovanteHtml(dados: DadosComprovante): string {
    const linhasItens = dados.itens.map((item) => `
        <tr>
            <td class="col-qtd">${item.quantidade}x</td>
            <td class="col-nome">${escaparHtml(item.produtoNome)}</td>
            <td class="col-valor">${formatarMoeda(item.precoUnitario)}</td>
            <td class="col-valor">${formatarMoeda(item.subtotal)}</td>
        </tr>
    `).join('');

    const linhasPagamentos = dados.pagamentos.map((pagamento) => `
        <div class="linha-pagamento">
            <span>${escaparHtml(ROTULO_FORMA[pagamento.forma])}</span>
            <span>${formatarMoeda(pagamento.valor)}</span>
        </div>
    `).join('');

    const linhaFechamento = dados.fechadaEm
        ? `<div class="linha-info"><span>Fechada em</span><span>${formatarDataHora(dados.fechadaEm)}</span></div>`
        : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        padding: 24px;
        background: #FAF9F6;
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        color: #1F1F1F;
    }
    .comprovante {
        max-width: 480px;
        margin: 0 auto;
        background: #FFFFFF;
        border: 1px solid #EFEFEF;
        border-radius: 16px;
        padding: 28px;
    }
    .cabecalho { text-align: center; margin-bottom: 16px; }
    .marca { font-size: 20px; font-weight: 700; color: #EA8B00; letter-spacing: 0.5px; }
    .subtitulo { font-size: 13px; color: #6B6B6B; margin-top: 4px; }
    .divisor { border-top: 1px dashed #D9D9D9; margin: 16px 0; }
    .linha-info { display: flex; justify-content: space-between; font-size: 13px; color: #1F1F1F; padding: 3px 0; }
    .linha-info span:first-child { color: #6B6B6B; }
    .tabela-itens { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tabela-itens th { text-align: left; font-size: 11px; color: #6B6B6B; padding-bottom: 6px; border-bottom: 1px solid #EFEFEF; }
    .tabela-itens td { padding: 6px 0; border-bottom: 1px solid #F5F5F5; }
    .col-qtd { width: 34px; }
    .col-nome { text-align: left; }
    .col-valor { text-align: right; white-space: nowrap; }
    .linha-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; padding: 4px 0; }
    .secao-titulo { font-size: 13px; font-weight: 700; color: #1F1F1F; margin-bottom: 6px; }
    .linha-pagamento { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; color: #1F1F1F; }
    .linha-total-recebido { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: 6px; padding-top: 6px; border-top: 1px solid #EFEFEF; }
    .status-quitado { text-align: center; font-size: 13px; font-weight: 700; color: #2E7D32; margin-top: 10px; }
    .rodape { text-align: center; margin-top: 4px; }
    .rodape div:first-child { font-size: 11px; color: #6B6B6B; }
    .aviso { font-size: 11px; color: #6B6B6B; font-style: italic; margin-top: 6px; }
</style>
</head>
<body>
    <div class="comprovante">
        <div class="cabecalho">
            <div class="marca">SUPRI CONVENIÊNCIA</div>
            <div class="subtitulo">Comprovante não fiscal</div>
        </div>

        <div class="linha-info"><span>Comanda</span><span>${escaparHtml(dados.identificacaoComanda)}</span></div>
        <div class="linha-info"><span>ID</span><span>#${dados.comandaId}</span></div>
        ${linhaFechamento}

        <div class="divisor"></div>

        <table class="tabela-itens">
            <thead>
                <tr>
                    <th class="col-qtd">Qtd</th>
                    <th class="col-nome">Item</th>
                    <th class="col-valor">Unit.</th>
                    <th class="col-valor">Total</th>
                </tr>
            </thead>
            <tbody>${linhasItens}</tbody>
        </table>

        <div class="divisor"></div>

        <div class="linha-total">
            <span>Total da comanda</span>
            <span>${formatarMoeda(dados.totalComanda)}</span>
        </div>

        <div class="divisor"></div>

        <div class="secao-titulo">Pagamentos</div>
        ${linhasPagamentos}
        <div class="linha-total-recebido">
            <span>Total recebido</span>
            <span>${formatarMoeda(dados.totalRecebido)}</span>
        </div>
        <div class="status-quitado">Pagamento concluído</div>

        <div class="divisor"></div>

        <div class="rodape">
            <div>Comprovante gerado em ${formatarDataHora(dados.geradoEm)}</div>
            <div class="aviso">Este documento não possui valor fiscal.</div>
        </div>
    </div>
</body>
</html>`;
}
