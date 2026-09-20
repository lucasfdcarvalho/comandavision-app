import { ResumoPagamentos } from "../types/Pagamento";

export type SaldoPagamento =
    | {
          disponivel: true;
          totalComandaCentavos: number;
          totalPagoCentavos: number;
          restanteCentavos: number;
          quitado: boolean;
      }
    | { disponivel: false };

function paraCentavosValidos(valor: unknown): number | null {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
        return null;
    }
    return Math.round(valor * 100);
}

/**
 * Deriva o saldo da comanda a partir de totalComanda/totalPago em centavos,
 * em vez de confiar cegamente nos campos `restante`/`quitado` do resumo da API.
 * Também cruza o total do resumo com o total já confirmado em ComandaDetalhada:
 * se divergirem, os dados estão desatualizados ou inconsistentes e não arriscamos
 * exibir um saldo (nunca vira R$ 0,00 por padrão).
 */
export function avaliarSaldoPagamento(totalComandaConfiavel: number, resumo: ResumoPagamentos | null): SaldoPagamento {
    if (!resumo) {
        return { disponivel: false };
    }

    const totalComandaCentavos = paraCentavosValidos(resumo.totalComanda);
    const totalPagoCentavos = paraCentavosValidos(resumo.totalPago);
    const totalConfiavelCentavos = paraCentavosValidos(totalComandaConfiavel);

    if (totalComandaCentavos === null || totalPagoCentavos === null || totalConfiavelCentavos === null) {
        return { disponivel: false };
    }

    if (Math.abs(totalComandaCentavos - totalConfiavelCentavos) > 1) {
        return { disponivel: false };
    }

    const restanteCentavos = Math.max(0, totalComandaCentavos - totalPagoCentavos);
    const quitado = totalComandaCentavos > 0 && restanteCentavos === 0;

    return {
        disponivel: true,
        totalComandaCentavos,
        totalPagoCentavos,
        restanteCentavos,
        quitado,
    };
}

export function centavosParaMoeda(centavos: number): string {
    return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}
