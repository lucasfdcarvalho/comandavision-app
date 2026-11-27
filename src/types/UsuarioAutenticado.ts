export interface UsuarioAutenticado {
    usuarioId: string;
    email: string;
    nome?: string | null;
    papel: 'DONO' | 'FUNCIONARIO';
}