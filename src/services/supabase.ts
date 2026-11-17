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

const urlServidor: string = enderecoServidor;
const chavePublica: string = supabaseChavePublica;
let contadorClientesIsolados = 0;

function criarArmazenamentoEmMemoria() {
    const itens = new Map<string, string>();
    return {
        getItem: (chave: string) => itens.get(chave) ?? null,
        setItem: (chave: string, valor: string) => { itens.set(chave, valor); },
        removeItem: (chave: string) => { itens.delete(chave); },
    };
}

// Cliente descartável para operações sensíveis (ex.: troca de senha). Não lê nem grava a
// sessão salva no aparelho, não renova token sozinho e usa uma chave própria, então não
// disputa armazenamento, travas ou eventos com o cliente principal acima.
export function criarClienteSupabaseIsolado() {
    contadorClientesIsolados += 1;
    const sufixo = `${Date.now().toString(36)}-${contadorClientesIsolados}-${Math.random().toString(36).slice(2, 10)}`;

    return createClient(urlServidor, chavePublica, {
        auth: {
            storageKey: `sb-isolado-${sufixo}`,
            storage: criarArmazenamentoEmMemoria(),
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

// Em React Native a renovação automática do token só deve rodar com o app em primeiro plano;
// ao voltar do segundo plano, o token vencido é renovado antes das próximas requisições.
AppState.addEventListener('change', (estado) => {
    if (estado === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
