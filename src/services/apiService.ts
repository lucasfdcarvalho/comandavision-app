import { UsuarioAutenticado } from "../types/UsuarioAutenticado";
import { Comanda, ComandaAReceber, ComandaDetalhada, DadosNovaComanda } from "../types/Comanda";
import { ItemComanda, DadosNovoItem, DadosAtualizarItem } from "../types/ItemComanda";
import { Produto, DadosNovoProduto, DadosAtualizarProduto } from "../types/Produto";
import { Categoria, DadosNovaCategoria, DadosAtualizarCategoria } from "../types/Categoria";
import { Pagamento, DadosNovoPagamento, DadosCorrecaoPagamento, ResumoPagamentos, CobrancaPix } from "../types/Pagamento";
import { ResumoDashboard, ProdutoMaisVendido, FormaPagamentoResumo, FaturamentoDiario } from "../types/Dashboard";
import { Usuario, DadosNovoUsuario, PapelUsuario } from "../types/Usuario";
import { ComandaEncerradaRelatorio } from "../types/Relatorio";
import { apiClient, ehErroApiStatus } from "./apiClient";

async function buscarUsuarioAutenticado(): Promise<UsuarioAutenticado> {
    return apiClient.requisitar<UsuarioAutenticado>('/api/auth/me');
}

async function listarComandas(): Promise<Comanda[]> {
    return apiClient.requisitar<Comanda[]>('/api/comandas');
}

async function listarComandasAReceber(): Promise<ComandaAReceber[]> {
    try {
        return await apiClient.requisitar<ComandaAReceber[]>('/api/comandas/a-receber');
    } catch (error: unknown) {
        const rotaAusente = ehErroApiStatus(error, 404)
            || (ehErroApiStatus(error, 400)
                && error.message === "O par\u00e2metro 'id' est\u00e1 em um formato inv\u00e1lido");
        if (!rotaAusente) throw error;
    }

    // Compatibilidade tempor\u00e1ria com a API publicada antes da rota consolidada.
    // Cada resumo vem do servidor; uma falha invalida a lista inteira.
    const comandas = await listarComandas();
    if (!Array.isArray(comandas)) throw new Error('Lista de comandas inv\u00e1lida');
    const fechadas = comandas.filter((comanda) => comanda.status === 'FECHADA');
    if (fechadas.length === 0) return [];

    // O hist\u00f3rico gerencial j\u00e1 agrega os valores no servidor para o papel DONO.
    // Confere os IDs com a listagem completa para n\u00e3o omitir d\u00edvidas antigas.
    if (fechadas.every((comanda) => comanda.fechadaEm)) {
        try {
            const historico = await listarComandasEncerradasRelatorio('1900-01-01', '2100-12-31');
            if (!Array.isArray(historico)) throw new Error('Hist\u00f3rico financeiro inv\u00e1lido');
            const encerradas = historico.filter((comanda) => comanda.status === 'FECHADA');
            const ids = new Set(fechadas.map((comanda) => comanda.id));
            if (encerradas.length !== ids.size || encerradas.some((comanda) => !ids.has(comanda.id))) {
                throw new Error('Hist\u00f3rico financeiro incompleto. Tente atualizar a lista');
            }
            return encerradas.flatMap((comanda): ComandaAReceber[] => {
                const total = Math.round(comanda.total * 100);
                const pago = Math.round(comanda.totalPago * 100);
                if (!Number.isSafeInteger(total) || !Number.isSafeInteger(pago)
                    || total < 0 || pago < 0 || pago > total) {
                    throw new Error('Dados financeiros inconsistentes. Tente atualizar a lista');
                }
                const restante = total - pago;
                return restante > 0 ? [{
                    id: comanda.id,
                    identificacao: comanda.identificacao,
                    fechadaEm: comanda.encerradaEm,
                    total: total / 100,
                    totalPago: pago / 100,
                    saldoRestante: restante / 100,
                    situacaoPagamento: pago > 0 ? 'PARCIAL' : 'NAO_PAGO',
                }] : [];
            });
        } catch (error: unknown) {
            // Se o dashboard negar acesso ou falhar, consulta os resumos das comandas.
            if (!ehErroApiStatus(error, 403)
                && !ehErroApiStatus(error, 404)
                && !ehErroApiStatus(error, 500)) throw error;
        }
    }

    const aReceber: ComandaAReceber[] = [];
    let proxima = 0;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 20_000);

    async function consultarResumos() {
        while (proxima < fechadas.length) {
            const comanda = fechadas[proxima++];
            const resumo = await buscarResumoPagamentos(comanda.id, controlador.signal);
            const total = Math.round(resumo.totalComanda * 100);
            const pago = Math.round(resumo.totalPago * 100);
            const restante = Math.round(resumo.saldoRestante * 100);
            if (resumo.comandaId !== comanda.id
                || ![total, pago, restante].every(Number.isSafeInteger)
                || total < 0 || pago < 0 || restante < 0
                || pago > total || Math.abs(total - pago - restante) > 1) {
                throw new Error('Dados financeiros inconsistentes. Tente atualizar a lista');
            }
            if (restante > 0) {
                aReceber.push({
                    id: comanda.id,
                    identificacao: comanda.identificacao,
                    fechadaEm: comanda.fechadaEm ?? null,
                    total: total / 100,
                    totalPago: pago / 100,
                    saldoRestante: restante / 100,
                    situacaoPagamento: pago > 0 ? 'PARCIAL' : 'NAO_PAGO',
                });
            }
        }
    }

    try {
        await Promise.all(Array.from({ length: Math.min(12, fechadas.length) }, consultarResumos));
    } catch (error: unknown) {
        if (controlador.signal.aborted) {
            throw new Error('Tempo esgotado ao carregar as comandas a receber. Tente novamente');
        }
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
    return aReceber.sort((a, b) =>
        (Date.parse(b.fechadaEm ?? '') || 0) - (Date.parse(a.fechadaEm ?? '') || 0) || b.id - a.id
    );
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

async function criarProduto(dados: DadosNovoProduto): Promise<Produto> {
    return apiClient.requisitar<Produto>('/api/produtos', {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

async function atualizarProduto(id: number, dados: DadosAtualizarProduto): Promise<Produto> {
    return apiClient.requisitar<Produto>(`/api/produtos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

async function listarCategorias(): Promise<Categoria[]> {
    return apiClient.requisitar<Categoria[]>('/api/categorias');
}

async function criarCategoria(dados: DadosNovaCategoria): Promise<Categoria> {
    return apiClient.requisitar<Categoria>('/api/categorias', {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

async function atualizarCategoria(id: number, dados: DadosAtualizarCategoria): Promise<Categoria> {
    return apiClient.requisitar<Categoria>(`/api/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
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

async function registrarPagamento(
    comandaId: number,
    dados: DadosNovoPagamento,
    chaveIdempotencia: string
): Promise<Pagamento> {
    return apiClient.requisitar<Pagamento>(`/api/comandas/${comandaId}/pagamentos`, {
        method: 'POST',
        headers: { 'Idempotency-Key': chaveIdempotencia },
        body: JSON.stringify(dados),
    });
}

async function listarPagamentos(comandaId: number): Promise<Pagamento[]> {
    return apiClient.requisitar<Pagamento[]>(`/api/comandas/${comandaId}/pagamentos`);
}

async function buscarResumoPagamentos(comandaId: number, signal?: AbortSignal): Promise<ResumoPagamentos> {
    return apiClient.requisitar<ResumoPagamentos>(`/api/comandas/${comandaId}/pagamentos/resumo`, { signal });
}

async function corrigirPagamento(
    comandaId: number,
    pagamentoId: number,
    dados: DadosCorrecaoPagamento
): Promise<Pagamento> {
    return apiClient.requisitar<Pagamento>(`/api/comandas/${comandaId}/pagamentos/${pagamentoId}/corrigir`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
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

async function listarComandasEncerradasRelatorio(inicio: string, fim: string): Promise<ComandaEncerradaRelatorio[]> {
    return apiClient.requisitar<ComandaEncerradaRelatorio[]>(`/api/dashboard/comandas?inicio=${inicio}&fim=${fim}`);
}

async function listarUsuarios(): Promise<Usuario[]> {
    return apiClient.requisitar<Usuario[]>('/api/usuarios');
}

async function criarUsuario(dados: DadosNovoUsuario): Promise<Usuario> {
    return apiClient.requisitar<Usuario>('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

async function alterarPapelUsuario(id: string, papel: PapelUsuario): Promise<Usuario> {
    return apiClient.requisitar<Usuario>(`/api/usuarios/${id}/papel`, {
        method: 'PATCH',
        body: JSON.stringify({ papel }),
    });
}

async function desativarUsuario(id: string): Promise<Usuario> {
    return apiClient.requisitar<Usuario>(`/api/usuarios/${id}/desativar`, { method: 'PATCH' });
}

async function reativarUsuario(id: string): Promise<Usuario> {
    return apiClient.requisitar<Usuario>(`/api/usuarios/${id}/reativar`, { method: 'PATCH' });
}

async function gerarPix(comandaId: number, valor: number, chaveIdempotencia: string): Promise<CobrancaPix> {
    return apiClient.requisitar<CobrancaPix>(`/api/comandas/${comandaId}/pagamentos/pix`, {
        method: 'POST',
        headers: { 'Idempotency-Key': chaveIdempotencia },
        body: JSON.stringify({ valor }),
    });
}

// O backend confere no Mercado Pago a cada consulta enquanto o Pix estiver pendente.
async function consultarPix(comandaId: number, pagamentoId: number): Promise<CobrancaPix> {
    return apiClient.requisitar<CobrancaPix>(`/api/comandas/${comandaId}/pagamentos/${pagamentoId}/pix`);
}

async function cancelarPix(comandaId: number, pagamentoId: number): Promise<CobrancaPix> {
    return apiClient.requisitar<CobrancaPix>(`/api/comandas/${comandaId}/pagamentos/${pagamentoId}/pix/cancelar`, {
        method: 'PATCH',
    });
}

export const apiService = {
    buscarUsuarioAutenticado,
    listarComandas,
    listarComandasAReceber,
    abrirComanda,
    buscarComanda,
    listarProdutos,
    criarProduto,
    atualizarProduto,
    listarCategorias,
    criarCategoria,
    atualizarCategoria,
    adicionarItem,
    atualizarItem,
    removerItem,
    fecharComanda,
    cancelarComanda,
    registrarPagamento,
    listarPagamentos,
    buscarResumoPagamentos,
    corrigirPagamento,
    gerarPix,
    consultarPix,
    cancelarPix,
    buscarResumoDashboard,
    listarProdutosMaisVendidos,
    listarFormasPagamento,
    listarFaturamentoDiario,
    listarComandasEncerradasRelatorio,
    listarUsuarios,
    criarUsuario,
    alterarPapelUsuario,
    desativarUsuario,
    reativarUsuario,
};
