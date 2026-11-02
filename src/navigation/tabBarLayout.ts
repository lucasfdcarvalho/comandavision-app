export type PlataformaBarraInferior = 'android' | 'ios' | 'web';

const ALTURA_CONTEUDO_ABAS = 56;
const RECUO_MINIMO_ANDROID = 12;

export function calcularLayoutBarraInferior(
    insetInferior: number,
    plataforma: PlataformaBarraInferior,
) {
    const insetSeguro = Number.isFinite(insetInferior) ? Math.max(0, insetInferior) : 0;
    const paddingBottom = plataforma === 'android'
        ? Math.max(insetSeguro, RECUO_MINIMO_ANDROID)
        : insetSeguro;

    return {
        height: ALTURA_CONTEUDO_ABAS + paddingBottom,
        paddingBottom,
    };
}
