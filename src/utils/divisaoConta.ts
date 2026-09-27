// Divide um valor em centavos (inteiro) entre N pessoas sem perder centavos por
// arredondamento de ponto flutuante. Os centavos que sobram da divisão inteira
// são distribuídos um a um para as primeiras pessoas da lista, garantindo que
// a soma das parcelas seja sempre exatamente igual ao total original.
// Ex.: dividirCentavosEntrePessoas(10000, 3) -> [3334, 3333, 3333] (soma 10000).
export function dividirCentavosEntrePessoas(totalCentavos: number, quantidadePessoas: number): number[] {
    if (!Number.isFinite(totalCentavos) || totalCentavos < 0 || !Number.isInteger(quantidadePessoas) || quantidadePessoas <= 0) {
        return [];
    }

    const valorBase = Math.floor(totalCentavos / quantidadePessoas);
    const centavosRestantes = totalCentavos - valorBase * quantidadePessoas;

    return Array.from({ length: quantidadePessoas }, (_, indice) =>
        indice < centavosRestantes ? valorBase + 1 : valorBase
    );
}
