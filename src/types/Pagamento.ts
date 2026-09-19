export type FormaPagamento = 'PIX' | 'DINHEIRO' | 'DEBITO' | 'CREDITO';

export interface Pagamento {
    id: number;
    comandaId: number;
    forma: FormaPagamento;
    valor: number;
    referenciaExterna?: string;
    estornado: boolean;
    criadoEm: string;
    estornadoEm?: string;
}

export interface DadosNovoPagamento {
    forma: FormaPagamento;
    valor: number;
    referenciaExterna?: string;
}

export interface ResumoPagamentos {
    totalComanda: number;
    totalPago: number;
    restante: number;
    quitado: boolean;
}
