export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';

export type StatusPagamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'ESTORNADO';

export type SituacaoPagamento = 'NAO_PAGO' | 'PARCIAL' | 'PAGO';

export interface Pagamento {
    id: number;
    comandaId: number;
    forma: FormaPagamento;
    status: StatusPagamento;
    valor: number;
    referenciaExterna?: string;
    pagoEm?: string;
    criadoEm: string;
    atualizadoEm: string;
}

export interface DadosNovoPagamento {
    forma: FormaPagamento;
    valor: number;
    referenciaExterna?: string;
}

export interface ResumoPagamentos {
    comandaId: number;
    totalComanda: number;
    totalPago: number;
    saldoRestante: number;
    situacao: SituacaoPagamento;
}
