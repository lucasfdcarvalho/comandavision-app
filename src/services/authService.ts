import { supabase, criarClienteSupabaseIsolado } from "./supabase";
import { criarTrocaDeSenha } from "./trocaSenhaService";

// A sessão principal é só lida aqui; login de conferência e troca acontecem no cliente isolado.
const alterarSenhaPropria = criarTrocaDeSenha({
    async obterUsuarioVerificado() {
        const { data, error } = await supabase.auth.getUser();
        return {
            data: { user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null },
            error,
        };
    },

    async obterIdUsuarioDaSessaoAtual() {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        return data.session?.user.id ?? null;
    },

    criarSessaoIsolada() {
        const { auth } = criarClienteSupabaseIsolado();

        return {
            entrar: (email: string, senha: string) => auth.signInWithPassword({ email, password: senha }),
            atualizarSenha: (novaSenha: string, senhaAtual: string) =>
                auth.updateUser({ password: novaSenha, current_password: senhaAtual }),
            // Nunca 'global' ou 'others': só a sessão criada para a conferência.
            encerrarLocal: () => auth.signOut({ scope: 'local' }),
        };
    },
});

export const authService = {
    alterarSenhaPropria,

    async entrar(email: string, senha: string) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });

        if (error?.code === 'invalid_credentials') {
            throw new Error('E-mail ou senha incorretos');
        }

        // Conta desativada pelo dono na tela Equipe.
        if (error?.code === 'user_banned') {
            throw new Error('Seu acesso foi desativado. Fale com o responsável pelo estabelecimento');
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