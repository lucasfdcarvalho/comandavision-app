export interface ItemComanda {
    id: number;
    comandaId: number;
    produtoId: number;
    produtoNome: string;
    // Mesma pendência de backend do campo em Produto: ainda não é retornado aqui.
    produtoImagemUrl?: string | null;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
    observacao?: string;
    criadoEm: string;
    atualizadoEm: string;
}

export interface DadosNovoItem {
    produtoId: number;
    quantidade: number;
    observacao?: string;
}

export interface DadosAtualizarItem {
    quantidade: number;
    observacao?: string;
}
