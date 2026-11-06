type ComandaIdentificavel = {
    id: number;
    identificacao: string;
};

function normalizar(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

export function correspondeBuscaComanda(comanda: ComandaIdentificavel, busca: string): boolean {
    const termo = normalizar(busca);
    if (!termo) {
        return true;
    }

    const termoSemPrefixo = termo.replace(/^#\s*/, '');
    const correspondeNumero = /^\d+$/.test(termoSemPrefixo) && String(comanda.id) === termoSemPrefixo;

    return correspondeNumero || normalizar(comanda.identificacao).includes(termo);
}
