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

export type SituacaoPagamentoComanda = 'NAO_PAGO' | 'PARCIAL';

export interface ComandaAReceber {
    id: number;
    identificacao: string;
    fechadaEm: string | null;
    total: number;
    totalPago: number;
    saldoRestante: number;
    situacaoPagamento: SituacaoPagamentoComanda;
}

export interface DadosNovaComanda {
    identificacao: string;
    observacao?: string;
}
