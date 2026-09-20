import { FormaPagamento } from "./Pagamento";

export interface ResumoDashboard {
    faturamento: number;
    quantidadeVendas: number;
    ticketMedio: number;
    quantidadeItensVendidos: number;
}

export interface ProdutoMaisVendido {
    produtoId: number;
    produtoNome: string;
    quantidadeVendida: number;
    faturamento: number;
}

export interface FormaPagamentoResumo {
    forma: FormaPagamento;
    quantidadePagamentos: number;
    valorRecebido: number;
    percentual: number;
}

export interface FaturamentoDiario {
    data: string;
    faturamento: number;
    quantidadeVendas: number;
}
