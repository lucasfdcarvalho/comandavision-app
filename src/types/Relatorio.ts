import type {
    FaturamentoDiario,
    FormaPagamentoResumo,
    ProdutoMaisVendido,
    ResumoDashboard,
} from "./Dashboard";

export interface ComandaEncerradaRelatorio {
    id: number;
    identificacao: string;
    status: 'FECHADA' | 'CANCELADA';
    encerradaEm: string;
    total: number;
    totalPago: number;
    computadaNosIndicadores: boolean;
}

export interface DadosRelatorioGerencial {
    inicio: string;
    fim: string;
    geradoEm: string;
    resumo: ResumoDashboard;
    produtos: ProdutoMaisVendido[];
    formasPagamento: FormaPagamentoResumo[];
    faturamentoDiario: FaturamentoDiario[];
    historicoDisponivel: boolean;
    comandas: ComandaEncerradaRelatorio[];
}
