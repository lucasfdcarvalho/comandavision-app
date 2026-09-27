export interface Categoria {
    id: number;
    nome: string;
    descricao?: string;
    ativa: boolean;
}

export interface DadosNovaCategoria {
    nome: string;
    descricao?: string;
}

// O campo `ativa` na atualização não foi confirmado contra o contrato real da
// API (é a única forma de ativar/desativar categoria, já que não existe DELETE
// nem um endpoint dedicado de status) — ver observação no relatório da tarefa.
export interface DadosAtualizarCategoria {
    nome: string;
    descricao?: string;
    ativa: boolean;
}
