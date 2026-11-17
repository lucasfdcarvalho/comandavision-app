export function podeCancelarComanda(papel: string | undefined, status: string | undefined): boolean {
    return status === 'ABERTA' && (papel === 'DONO' || papel === 'FUNCIONARIO');
}

export function validarMotivoCancelamento(texto: string): string {
    const tamanho = texto.trim().length;
    return tamanho < 3 || tamanho > 500
        ? 'Informe um motivo entre 3 e 500 caracteres'
        : '';
}
