import { UsuarioAutenticado } from "../types/UsuarioAutenticado";
import { Comanda, ComandaDetalhada, DadosNovaComanda } from "../types/Comanda";
import { ItemComanda, DadosNovoItem, DadosAtualizarItem } from "../types/ItemComanda";
import { Produto } from "../types/Produto";
import { Pagamento, DadosNovoPagamento, ResumoPagamentos } from "../types/Pagamento";
import { ResumoDashboard, ProdutoMaisVendido, FormaPagamentoResumo, FaturamentoDiario } from "../types/Dashboard";
import { apiClient } from "./apiClient";

async function buscarUsuarioAutenticado(): Promise<UsuarioAutenticado> {
    return apiClient.requisitar<UsuarioAutenticado>('/api/auth/me');
}

async function listarComandas(): Promise<Comanda[]> {
    return apiClient.requisitar<Comanda[]>('/api/comandas');
}

async function abrirComanda(dados: DadosNovaComanda): Promise<Comanda> {
    return apiClient.requisitar<Comanda>('/api/comandas', {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

async function buscarComanda(id: number): Promise<ComandaDetalhada> {
    return apiClient.requisitar<ComandaDetalhada>(`/api/comandas/${id}`);
}

async function listarProdutos(): Promise<Produto[]> {
    return apiClient.requisitar<Produto[]>('/api/produtos');
}

async function adicionarItem(comandaId: number, dados: DadosNovoItem): Promise<ItemComanda> {
    return apiClient.requisitar<ItemComanda>(`/api/comandas/${comandaId}/itens`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

async function atualizarItem(comandaId: number, itemId: number, dados: DadosAtualizarItem): Promise<ItemComanda> {
    return apiClient.requisitar<ItemComanda>(`/api/comandas/${comandaId}/itens/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

async function removerItem(comandaId: number, itemId: number): Promise<void> {
    return apiClient.requisitar<void>(`/api/comandas/${comandaId}/itens/${itemId}`, {
        method: 'DELETE',
    });
}

async function fecharComanda(id: number): Promise<ComandaDetalhada> {
    return apiClient.requisitar<ComandaDetalhada>(`/api/comandas/${id}/fechar`, {
        method: 'PATCH',
    });
}

async function cancelarComanda(id: number): Promise<ComandaDetalhada> {
    return apiClient.requisitar<ComandaDetalhada>(`/api/comandas/${id}/cancelar`, {
        method: 'PATCH',
    });
}

async function registrarPagamento(comandaId: number, dados: DadosNovoPagamento): Promise<Pagamento> {
    return apiClient.requisitar<Pagamento>(`/api/comandas/${comandaId}/pagamentos`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

async function listarPagamentos(comandaId: number): Promise<Pagamento[]> {
    return apiClient.requisitar<Pagamento[]>(`/api/comandas/${comandaId}/pagamentos`);
}

async function buscarResumoPagamentos(comandaId: number): Promise<ResumoPagamentos> {
    return apiClient.requisitar<ResumoPagamentos>(`/api/comandas/${comandaId}/pagamentos/resumo`);
}

async function estornarPagamento(comandaId: number, pagamentoId: number): Promise<Pagamento> {
    return apiClient.requisitar<Pagamento>(`/api/comandas/${comandaId}/pagamentos/${pagamentoId}/estornar`, {
        method: 'PATCH',
    });
}

async function buscarResumoDashboard(inicio: string, fim: string): Promise<ResumoDashboard> {
    return apiClient.requisitar<ResumoDashboard>(`/api/dashboard/resumo?inicio=${inicio}&fim=${fim}`);
}

async function listarProdutosMaisVendidos(inicio: string, fim: string, limite = 5): Promise<ProdutoMaisVendido[]> {
    return apiClient.requisitar<ProdutoMaisVendido[]>(
        `/api/dashboard/produtos-mais-vendidos?inicio=${inicio}&fim=${fim}&limite=${limite}`
    );
}

async function listarFormasPagamento(inicio: string, fim: string): Promise<FormaPagamentoResumo[]> {
    return apiClient.requisitar<FormaPagamentoResumo[]>(`/api/dashboard/formas-pagamento?inicio=${inicio}&fim=${fim}`);
}

async function listarFaturamentoDiario(inicio: string, fim: string): Promise<FaturamentoDiario[]> {
    return apiClient.requisitar<FaturamentoDiario[]>(`/api/dashboard/faturamento-diario?inicio=${inicio}&fim=${fim}`);
}

export const apiService = {
    buscarUsuarioAutenticado,
    listarComandas,
    abrirComanda,
    buscarComanda,
    listarProdutos,
    adicionarItem,
    atualizarItem,
    removerItem,
    fecharComanda,
    cancelarComanda,
    registrarPagamento,
    listarPagamentos,
    buscarResumoPagamentos,
    estornarPagamento,
    buscarResumoDashboard,
    listarProdutosMaisVendidos,
    listarFormasPagamento,
    listarFaturamentoDiario,
};
