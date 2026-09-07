import { createContext, useEffect, useState, ReactNode } from "react";

import { UsuarioAutenticado } from "../types/UsuarioAutenticado";

import { authService } from "../services/authService";

import { apiService } from "../services/apiService";


interface AuthContextData {
    usuario: UsuarioAutenticado | null;
    carregandoSessao: boolean;
    entrar(email: string, senha: string): Promise<void>;
    sair(): Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);


export function AuthProvider({ children }: AuthProviderProps) {
    const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
    const [carregandoSessao, setCarregandoSessao] = useState<boolean>(true);


    useEffect(() => {
        async function carregarDados() {
            try {
                const sessao = await authService.obterSessao();

                if (!sessao) {
                    setUsuario(null);
                    return;
                }

                setUsuario(await apiService.buscarUsuarioAutenticado())


            } catch {
                setUsuario(null);
            } finally {
                setCarregandoSessao(false);
            }
        }
        carregarDados();
    }, []);


    async function entrar(email: string, senha: string) {
        const data = await authService.entrar(email.toLowerCase().trim(), senha);

        if (!data.session) {
            throw new Error('Não foi possível criar a sessão do usuário');
        }

        setUsuario(await apiService.buscarUsuarioAutenticado());
    }

    async function sair() {
        await authService.sair();
        setUsuario(null);
    }

    return (
        <AuthContext.Provider value={{ usuario, carregandoSessao, entrar, sair}}>
            {children}
        </AuthContext.Provider>
    );
}