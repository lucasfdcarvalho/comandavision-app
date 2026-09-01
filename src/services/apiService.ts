import { UsuarioAutenticado } from "../types/UsuarioAutenticado";

const urlBase = process.env.EXPO_PUBLIC_API_URL;


if (!urlBase) {
    throw new Error('API não configurada');
}


async function buscarUsuarioAutenticado(token: string): Promise<UsuarioAutenticado> {
    const response = await fetch(`${urlBase}/api/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Não foi possível consultar a API');
    }

    const usuario: UsuarioAutenticado = await response.json();

    return usuario;
}


export const apiService = {
    buscarUsuarioAutenticado,
};