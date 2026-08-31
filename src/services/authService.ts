import { supabase } from "./supabase";

export const authService = {
    async entrar(email: string, senha: string) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });

        if (error) {
            throw error;
        }

        return data;
    }
};