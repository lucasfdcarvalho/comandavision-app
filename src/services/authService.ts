import { supabase } from "./supabase";

export const authService = {
    async entrar(email: string, senha: string) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });

        if (error) {
            throw error;
        }

        return data;
    },

    async obterSessao() {
        const { error, data } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        return data.session;
    },

    async sair() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }
    }
};