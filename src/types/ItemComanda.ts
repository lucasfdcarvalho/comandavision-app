export interface ItemComanda {
    id: number;
    comandaId: number;
    produtoId: number;
    produtoNome: string;
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
