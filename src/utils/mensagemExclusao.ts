export function mensagemConflitoExclusao(tipo: 'produto' | 'categoria'): string {
    return tipo === 'categoria'
        ? 'Esta categoria tem produtos vinculados, inclusive inativos, e não pode ser excluída. Você pode inativá-la'
        : 'Não é possível excluir este produto. Você pode inativá-lo';
}
export function mensagemErroExclusao(error: unknown): string {
    return (error instanceof Error ? error.message : 'Não foi possível excluir, tente novamente').replace(/[.\s]+$/, '');
}
