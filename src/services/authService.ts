import { supabase } from "./supabase";

export const authService = {
    async entrar(email: string, senha: string) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });

        if (error?.code === 'invalid_credentials') {
            throw new Error('E-mail ou senha incorretos');
        }

        // Conta desativada pelo dono na tela Equipe.
        if (error?.code === 'user_banned') {
            throw new Error('Seu acesso foi desativado. Fale com o responsável pelo estabelecimento.');
        }

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

    // Encerra só a sessão salva no aparelho: com o token já inválido, o logout no servidor falharia.
    async encerrarSessaoLocal() {
        await supabase.auth.signOut({ scope: 'local' });
    },

    async sair() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }
    }
};