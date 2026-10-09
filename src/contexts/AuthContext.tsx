import { useDialogo } from "./DialogoContext";
import { createContext, useEffect, useRef, useState, ReactNode } from "react";

import { UsuarioAutenticado } from "../types/UsuarioAutenticado";

import { authService } from "../services/authService";

import { apiService } from "../services/apiService";

import { apiClient } from "../services/apiClient";

import { supabase } from "../services/supabase";


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
    const { alertar } = useDialogo();
    const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
    const [carregandoSessao, setCarregandoSessao] = useState<boolean>(true);
    // Evita vários avisos quando requisições paralelas recebem 401 ao mesmo tempo.
    const encerrandoSessao = useRef(false);
    const usuarioAtual = useRef(usuario);
    usuarioAtual.current = usuario;

    useEffect(() => {
        apiClient.definirAoExpirarSessao(() => {
            if (encerrandoSessao.current) {
                return;
            }

            encerrandoSessao.current = true;
            // Lido antes do signOut, que dispara SIGNED_OUT e zera o usuário.
            const estavaLogado = usuarioAtual.current !== null;
            authService.encerrarSessaoLocal()
                .catch(() => undefined)
                .finally(() => {
                    if (estavaLogado) {
                        alertar('Sessão expirada', 'Sua sessão expirou. Entre novamente para continuar.', undefined, 'aviso');
                    }
                    setUsuario(null);
                    encerrandoSessao.current = false;
                });
        });

        // Cobre o caso em que o Supabase não consegue renovar o token e encerra a sessão sozinho.
        const { data } = supabase.auth.onAuthStateChange((evento) => {
            if (evento === 'SIGNED_OUT') {
                setUsuario(null);
            }
        });

        return () => {
            apiClient.definirAoExpirarSessao(null);
            data.subscription.unsubscribe();
        };
    }, [alertar]);


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
