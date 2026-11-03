export function criarChaveIdempotencia(): string {
    const cryptoDisponivel = globalThis.crypto;
    if (typeof cryptoDisponivel?.randomUUID === 'function') {
        return cryptoDisponivel.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (typeof cryptoDisponivel?.getRandomValues === 'function') {
        cryptoDisponivel.getRandomValues(bytes);
    } else {
        for (let indice = 0; indice < bytes.length; indice += 1) {
            bytes[indice] = Math.floor(Math.random() * 256);
        }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hexadecimal = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
}

const CHAVE_ARMAZENAMENTO = 'comandavision.pagamento.tentativa-idempotente';

interface TentativaArmazenada {
    chave: string;
    criadaEm: number;
}

type TentativasArmazenadas = Record<string, TentativaArmazenada>;

function hashAssinatura(assinatura: string): string {
    let hash = 2166136261;
    for (let indice = 0; indice < assinatura.length; indice += 1) {
        hash ^= assinatura.charCodeAt(indice);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function obterChaveIdempotenciaPersistida(assinatura: string): Promise<string> {
    const assinaturaHash = hashAssinatura(assinatura);
    try {
        const SecureStore = await import('expo-secure-store');
        const texto = await SecureStore.getItemAsync(CHAVE_ARMAZENAMENTO);
        const tentativas: TentativasArmazenadas = texto ? JSON.parse(texto) : {};
        const anterior = tentativas[assinaturaHash];
        if (typeof anterior?.chave === 'string') {
            return anterior.chave;
        }

        const chave = criarChaveIdempotencia();
        tentativas[assinaturaHash] = { chave, criadaEm: Date.now() };
        const recentes = Object.fromEntries(
            Object.entries(tentativas)
                .sort(([, primeira], [, segunda]) => segunda.criadaEm - primeira.criadaEm)
                .slice(0, 10)
        );
        await SecureStore.setItemAsync(CHAVE_ARMAZENAMENTO, JSON.stringify(recentes));
        return chave;
    } catch {
        // O armazenamento persistente é uma proteção adicional; a chave em memória ainda evita repetição na tela.
        return criarChaveIdempotencia();
    }
}

export async function limparChaveIdempotenciaPersistida(chave: string): Promise<void> {
    try {
        const SecureStore = await import('expo-secure-store');
        const texto = await SecureStore.getItemAsync(CHAVE_ARMAZENAMENTO);
        if (!texto) {
            await SecureStore.deleteItemAsync(CHAVE_ARMAZENAMENTO);
            return;
        }

        const tentativas = JSON.parse(texto) as TentativasArmazenadas;
        const restantes = Object.fromEntries(
            Object.entries(tentativas).filter(([, tentativa]) => tentativa.chave !== chave)
        );
        if (Object.keys(restantes).length === 0) {
            await SecureStore.deleteItemAsync(CHAVE_ARMAZENAMENTO);
        } else {
            await SecureStore.setItemAsync(CHAVE_ARMAZENAMENTO, JSON.stringify(restantes));
        }
    } catch {
        // A operação principal já terminou; falha na limpeza não deve transformá-la em erro.
    }
}
