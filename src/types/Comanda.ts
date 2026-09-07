import { ItemComanda } from "./ItemComanda";

export type StatusComanda = 'ABERTA' | 'FECHADA' | 'CANCELADA';

export interface Comanda {
    id: number;
    identificacao: string;
    status: StatusComanda;
    observacao?: string;
    abertaEm: string;
    fechadaEm?: string;
    atualizadoEm: string;
}

export interface ComandaDetalhada extends Comanda {
    itens: ItemComanda[];
    total: number;
}

export interface DadosNovaComanda {
    identificacao: string;
    observacao?: string;
}
