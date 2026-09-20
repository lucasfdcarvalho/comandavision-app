import { authService } from "./authService";

const urlBase = process.env.EXPO_PUBLIC_API_URL;

if (!urlBase) {
    throw new Error('API não configurada');
}

async function extrairMensagemErro(response: Response): Promise<string> {
    try {
        // Formato real da API (ErroResponse): { status, erro, mensagem, dataHora, campos }.
        // `message`/`error` ficam como fallback para outros serviços que sigam a convenção em inglês.
        const corpo = await response.json();
        if (typeof corpo?.mensagem === 'string' && corpo.mensagem.trim()) {
            return corpo.mensagem;
        }
        if (typeof corpo?.message === 'string' && corpo.message.trim()) {
            return corpo.message;
        }
        if (typeof corpo?.erro === 'string' && corpo.erro.trim()) {
            return corpo.erro;
        }
        if (typeof corpo?.error === 'string' && corpo.error.trim()) {
            return corpo.error;
        }
    } catch {
        // corpo da resposta não é JSON ou está vazio; usa a mensagem padrão abaixo
    }

    return 'Não foi possível consultar a API';
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
        throw new Error(await extrairMensagemErro(response));
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const apiClient = {
    requisitar,
};
