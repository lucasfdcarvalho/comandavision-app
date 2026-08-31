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


