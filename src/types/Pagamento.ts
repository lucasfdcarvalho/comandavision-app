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
    pixIntegrado: boolean;
    motivoCorrecao?: string;
    corrigidoEm?: string;
    pagoEm?: string;
    criadoEm: string;
    atualizadoEm: string;
}

export interface DadosNovoPagamento {
    forma: FormaPagamento;
    valor: number;
    referenciaExterna?: string;
}

export interface DadosCorrecaoPagamento {
    motivo: string;
}

export interface ResumoPagamentos {
    comandaId: number;
    totalComanda: number;
    totalPago: number;
    saldoRestante: number;
    situacao: SituacaoPagamento;
}

// Pix gerado pelo Mercado Pago. Fica PENDENTE até o cliente pagar (ou CANCELADO se expirar).
export interface CobrancaPix {
    pagamentoId: number;
    comandaId: number;
    valor: number;
    status: StatusPagamento;
    // Código "copia e cola".
    qrCode: string;
    // Imagem PNG do QR Code em Base64.
    qrCodeBase64: string;
    expiraEm: string;
}
