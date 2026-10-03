export type PapelUsuario = 'DONO' | 'FUNCIONARIO';

export interface Usuario {
    id: string;
    nome?: string | null;
    email: string;
    // Nulo quando a conta existe no Supabase mas ainda não recebeu papel (não consegue usar o app).
    papel: PapelUsuario | null;
    ativo: boolean;
    ultimoAcesso?: string | null;
    criadoEm: string;
}

export interface DadosNovoUsuario {
    nome: string;
    email: string;
    senha: string;
    papel: PapelUsuario;
}
