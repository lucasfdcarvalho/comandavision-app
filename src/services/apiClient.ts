import { authService } from "./authService";

const urlBase = process.env.EXPO_PUBLIC_API_URL;

if (!urlBase) {
    throw new Error('API não configurada');
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
    const sessao = await authService.obterSessao();

    if (!sessao) {
        throw new Error('Sessão não encontrada');
    }

    const response = await fetch(`${urlBase}${caminho}`, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...opcoes.headers,
            Authorization: `Bearer ${sessao.access_token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Não foi possível consultar a API');
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const apiClient = {
    requisitar,
};
