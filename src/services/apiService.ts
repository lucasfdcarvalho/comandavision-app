import { UsuarioAutenticado } from "../types/UsuarioAutenticado";
import { Comanda, ComandaDetalhada, DadosNovaComanda } from "../types/Comanda";
import { ItemComanda, DadosNovoItem, DadosAtualizarItem } from "../types/ItemComanda";
import { Produto } from "../types/Produto";
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

export const apiService = {
    buscarUsuarioAutenticado,
    listarComandas,
    abrirComanda,
    buscarComanda,
    listarProdutos,
    adicionarItem,
    atualizarItem,
    removerItem,
};
