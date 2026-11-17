// Resultado pendente em memoria, nunca senha, token ou armazenamento persistente.
export type ResultadoTrocaSenha = { titulo: string; mensagem: string; tipo: 'sucesso' | 'aviso' | 'erro' };
export function criarResultadosTrocaSenha() {
    const resultados = new Map<string, ResultadoTrocaSenha>();
    const ouvintes = new Set<() => void>();
    return {
        guardar(usuarioId: string, resultado: ResultadoTrocaSenha) {
            resultados.set(usuarioId, resultado);
            for (const ouvir of ouvintes) ouvir();
        },
        consumir(usuarioId: string): ResultadoTrocaSenha | undefined {
            const resultado = resultados.get(usuarioId);
            resultados.delete(usuarioId);
            return resultado;
        },
        observar(ouvir: () => void) {
            ouvintes.add(ouvir);
            return () => { ouvintes.delete(ouvir); };
        },
    };
}
export const resultadosTrocaSenha = criarResultadosTrocaSenha();