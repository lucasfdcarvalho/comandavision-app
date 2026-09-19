import { FormaPagamento } from "./Pagamento";

export interface ResumoDashboard {
    faturamentoTotal: number;
    quantidadeComandas: number;
    ticketMedio: number;
}

export interface ProdutoMaisVendido {
    produtoId: number;
    produtoNome: string;
    quantidadeVendida: number;
    totalVendido: number;
}

export interface FormaPagamentoResumo {
    forma: FormaPagamento;
    total: number;
    quantidade: number;
}

export interface FaturamentoDiario {
    data: string;
    total: number;
}
