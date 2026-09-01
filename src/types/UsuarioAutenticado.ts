export interface UsuarioAutenticado {
    usuarioId: string;
    email: string;
    papel: 'DONO' | 'FUNCIONARIO';
}