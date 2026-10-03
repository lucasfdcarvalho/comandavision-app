import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

import 'react-native-url-polyfill/auto';

import { SecureSessionAdapter } from "./secureSessionAdapter";

const enderecoServidor = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseChavePublica = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!enderecoServidor) {
    throw new Error("Endereço não configurado");
}

if (!supabaseChavePublica) {
    throw new Error("Chave não configurada");
}

export const supabase = createClient(enderecoServidor, supabaseChavePublica, {
    auth: {
        storage: SecureSessionAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
});

// Em React Native a renovação automática do token só deve rodar com o app em primeiro plano;
// ao voltar do segundo plano, o token vencido é renovado antes das próximas requisições.
AppState.addEventListener('change', (estado) => {
    if (estado === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
