// Tempo restante do QR Code no formato mm:ss (ou h:mm:ss acima de uma hora).
export function formatarTempoRestante(milissegundos: number): string {
    const totalSegundos = Math.max(0, Math.floor(milissegundos / 1000));
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    const mmss = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    return horas > 0 ? `${horas}:${mmss}` : mmss;
}

export function milissegundosAte(dataIso: string, agora: number = Date.now()): number {
    const alvo = new Date(dataIso).getTime();
    return Number.isNaN(alvo) ? 0 : alvo - agora;
}
