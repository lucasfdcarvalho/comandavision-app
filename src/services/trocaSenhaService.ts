// Troca da própria senha (DONO e FUNCIONARIO).
//
// Este módulo não importa o Supabase: as dependências chegam por parâmetro, o que
// permite testar o fluxo inteiro sem rede e sem credenciais reais. A ligação com o
// Supabase fica em authService.ts.
//
// Fluxo:
// 1. Lê a conta logada confirmada pelo servidor (getUser), nunca um e-mail digitado.
// 2. Abre um cliente isolado (sem persistência, sem renovação automática, chave própria)
//    e entra nele com e-mail + senha atual: isso prova que a senha atual está correta
//    sem tocar na sessão salva no aparelho.
// 3. Confere se o login isolado é da mesma conta e se a sessão principal ainda é dela.
// 4. Troca a senha NO MESMO cliente isolado, enviando também current_password
//    (o servidor só valida esse campo se a opção estiver ligada no projeto; a prova
//    da senha atual que vale sempre é o login do passo 2).
// 5. Encerra só a sessão isolada (scope 'local'), sem bloquear nem alterar o resultado.
//
// Senhas nunca são registradas em log, guardadas ou incluídas em mensagens de erro.

export const TAMANHO_MINIMO_SENHA = 6;
// O Supabase Auth usa bcrypt e recusa senhas acima de 72 bytes.
export const TAMANHO_MAXIMO_SENHA_BYTES = 72;

export interface DadosTrocaSenha {
    senhaAtual: string;
    novaSenha: string;
    confirmacao: string;
}

export interface ErroAuth {
    name?: string;
    message?: string;
    status?: number;
    code?: string;
    reasons?: unknown;
}

export interface RespostaAuth<T> {
    data: T;
    error: ErroAuth | null;
}

export interface UsuarioVerificado {
    id: string;
    email?: string | null;
}

export interface SessaoAuthIsolada {
    entrar(email: string, senha: string): Promise<RespostaAuth<{ user: { id: string } | null; session: unknown }>>;
    atualizarSenha(novaSenha: string, senhaAtual: string): Promise<RespostaAuth<unknown>>;
    encerrarLocal(): Promise<unknown>;
}

export interface DependenciasTrocaSenha {
    // Conta da sessão principal confirmada pelo servidor.
    obterUsuarioVerificado(): Promise<RespostaAuth<{ user: UsuarioVerificado | null }>>;
    // ID da sessão principal salva no aparelho, ou null se não houver sessão. Lança em caso de falha.
    obterIdUsuarioDaSessaoAtual(): Promise<string | null>;
    criarSessaoIsolada(): SessaoAuthIsolada;
}

export type MotivoErroTrocaSenha =
    | 'validacao'
    | 'em_andamento'
    | 'sessao_expirada'
    | 'sessao_alterada'
    | 'falha_conexao'
    | 'senha_atual_incorreta'
    | 'acesso_desativado'
    | 'muitas_tentativas'
    | 'senha_fraca'
    | 'senha_igual'
    | 'reautenticacao'
    | 'recusada'
    | 'resultado_desconhecido';

export class ErroTrocaSenha extends Error {
    readonly motivo: MotivoErroTrocaSenha;
    // true só quando a requisição de troca pode ter chegado ao servidor sem resposta conclusiva.
    readonly resultadoDesconhecido: boolean;

    constructor(motivo: MotivoErroTrocaSenha, mensagem: string, resultadoDesconhecido = false) {
        super(mensagem);
        this.name = 'ErroTrocaSenha';
        this.motivo = motivo;
        this.resultadoDesconhecido = resultadoDesconhecido;
    }
}

const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre novamente para alterar a senha';
const MENSAGEM_SESSAO_ALTERADA = 'A conta conectada mudou durante a operação. A senha não foi alterada';
const MENSAGEM_MUITAS_TENTATIVAS = 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente';
const MENSAGEM_ACESSO_DESATIVADO = 'Seu acesso foi desativado. Fale com o responsável pelo estabelecimento';
const MENSAGEM_SENHA_ATUAL_INCORRETA = 'Senha atual incorreta';
const MENSAGEM_RESULTADO_DESCONHECIDO =
    'Não foi possível confirmar se a senha foi alterada. No próximo acesso, tente a nova senha; se não funcionar, use a atual';

function tamanhoUtf8(texto: string): number {
    let bytes = 0;
    for (let i = 0; i < texto.length; i++) {
        const codigo = texto.charCodeAt(i);
        if (codigo < 0x80) {
            bytes += 1;
        } else if (codigo < 0x800) {
            bytes += 2;
        } else if (codigo >= 0xd800 && codigo <= 0xdbff && i + 1 < texto.length) {
            // Par substituto (ex.: emoji) ocupa 4 bytes em UTF-8.
            bytes += 4;
            i++;
        } else {
            bytes += 3;
        }
    }
    return bytes;
}

export function validarTrocaSenha({ senhaAtual, novaSenha, confirmacao }: DadosTrocaSenha): string | null {
    if (!senhaAtual) {
        return 'Informe a senha atual';
    }

    if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
        return `A nova senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`;
    }

    if (tamanhoUtf8(novaSenha) > TAMANHO_MAXIMO_SENHA_BYTES) {
        return 'A nova senha é longa demais. Use até 72 caracteres sem acentos ou símbolos especiais';
    }

    if (novaSenha !== confirmacao) {
        return 'A confirmação não confere com a nova senha';
    }

    if (novaSenha === senhaAtual) {
        return 'A nova senha deve ser diferente da atual';
    }

    return null;
}

// Sem status HTTP, status 0 (rede) ou 5xx: não dá para afirmar o que o servidor fez.
function ehResultadoIncerto(erro: ErroAuth): boolean {
    if (erro.name === 'AuthRetryableFetchError') {
        return true;
    }
    return typeof erro.status !== 'number' || erro.status === 0 || erro.status >= 500;
}

function ehLimiteDeTentativas(erro: ErroAuth): boolean {
    return erro.code === 'over_request_rate_limit' || erro.status === 429;
}

function mensagemSenhaFraca(motivos: unknown): string {
    const lista = Array.isArray(motivos) ? motivos : [];
    if (lista.includes('pwned')) {
        return 'Essa senha aparece em vazamentos conhecidos. Escolha outra';
    }
    if (lista.includes('length')) {
        return 'A nova senha é curta demais para a política de segurança. Escolha uma mais longa';
    }
    if (lista.includes('characters')) {
        return 'A nova senha precisa combinar mais tipos de caracteres, como letras, números e símbolos';
    }
    return 'A nova senha é fraca. Escolha uma senha mais forte';
}

function erroDoLoginIsolado(erro: ErroAuth): ErroTrocaSenha {
    if (erro.code === 'invalid_credentials') {
        return new ErroTrocaSenha('senha_atual_incorreta', MENSAGEM_SENHA_ATUAL_INCORRETA);
    }
    if (erro.code === 'user_banned') {
        return new ErroTrocaSenha('acesso_desativado', MENSAGEM_ACESSO_DESATIVADO);
    }
    if (ehLimiteDeTentativas(erro)) {
        return new ErroTrocaSenha('muitas_tentativas', MENSAGEM_MUITAS_TENTATIVAS);
    }
    if (ehResultadoIncerto(erro)) {
        // A troca ainda não foi enviada: a senha certamente não mudou.
        return new ErroTrocaSenha('falha_conexao', 'Não foi possível confirmar a senha atual. Confira a conexão e tente novamente');
    }
    return new ErroTrocaSenha('recusada', 'Não foi possível confirmar a senha atual. A senha não foi alterada');
}

function erroDaAtualizacao(erro: ErroAuth): ErroTrocaSenha {
    if (ehResultadoIncerto(erro)) {
        return new ErroTrocaSenha('resultado_desconhecido', MENSAGEM_RESULTADO_DESCONHECIDO, true);
    }

    switch (erro.code) {
        case 'weak_password':
            return new ErroTrocaSenha('senha_fraca', mensagemSenhaFraca(erro.reasons));
        case 'same_password':
            return new ErroTrocaSenha('senha_igual', 'A nova senha deve ser diferente da atual');
        case 'current_password_mismatch':
        case 'invalid_credentials':
            return new ErroTrocaSenha('senha_atual_incorreta', MENSAGEM_SENHA_ATUAL_INCORRETA);
        case 'reauthentication_needed':
        case 'reauthentication_not_valid':
            return new ErroTrocaSenha(
                'reautenticacao',
                'Não foi possível confirmar sua identidade para trocar a senha. Saia da conta, entre novamente e tente de novo'
            );
        case 'user_banned':
            return new ErroTrocaSenha('acesso_desativado', MENSAGEM_ACESSO_DESATIVADO);
    }

    if (ehLimiteDeTentativas(erro)) {
        return new ErroTrocaSenha('muitas_tentativas', MENSAGEM_MUITAS_TENTATIVAS);
    }

    return new ErroTrocaSenha('recusada', 'Não foi possível alterar a senha. Sua senha continua a mesma');
}

// Limpeza em segundo plano: uma falha aqui não pode transformar sucesso em erro
// nem atrasar a resposta para a pessoa.
function encerrarSemBloquear(sessao: SessaoAuthIsolada) {
    try {
        void Promise.resolve(sessao.encerrarLocal()).catch(() => undefined);
    } catch {
        // Ignorado de propósito: a sessão isolada só existe em memória.
    }
}

async function executarTroca(deps: DependenciasTrocaSenha, senhaAtual: string, novaSenha: string): Promise<void> {
    // 1. Conta logada confirmada pelo servidor.
    let respostaUsuario: RespostaAuth<{ user: UsuarioVerificado | null }>;
    try {
        respostaUsuario = await deps.obterUsuarioVerificado();
    } catch {
        throw new ErroTrocaSenha('falha_conexao', 'Não foi possível verificar sua sessão. Confira a conexão e tente novamente');
    }

    if (respostaUsuario.error) {
        if (ehResultadoIncerto(respostaUsuario.error)) {
            throw new ErroTrocaSenha('falha_conexao', 'Não foi possível verificar sua sessão. Confira a conexão e tente novamente');
        }
        throw new ErroTrocaSenha('sessao_expirada', MENSAGEM_SESSAO_EXPIRADA);
    }

    const usuario = respostaUsuario.data.user;
    if (!usuario?.id || !usuario.email) {
        throw new ErroTrocaSenha('sessao_expirada', MENSAGEM_SESSAO_EXPIRADA);
    }

    // 2. Prova da senha atual em cliente isolado.
    const sessao = deps.criarSessaoIsolada();
    let precisaEncerrar = false;

    try {
        let login: Awaited<ReturnType<SessaoAuthIsolada['entrar']>>;
        try {
            login = await sessao.entrar(usuario.email, senhaAtual);
        } catch {
            throw new ErroTrocaSenha('falha_conexao', 'Não foi possível confirmar a senha atual. Confira a conexão e tente novamente');
        }

        if (login.error) {
            throw erroDoLoginIsolado(login.error);
        }

        precisaEncerrar = true;

        if (!login.data.session || !login.data.user) {
            throw new ErroTrocaSenha('recusada', 'Não foi possível confirmar a senha atual. A senha não foi alterada');
        }

        // 3. Mesma conta no login isolado e na sessão principal, logo antes da troca.
        if (login.data.user.id !== usuario.id) {
            throw new ErroTrocaSenha('sessao_alterada', MENSAGEM_SESSAO_ALTERADA);
        }

        let idSessaoAtual: string | null;
        try {
            idSessaoAtual = await deps.obterIdUsuarioDaSessaoAtual();
        } catch {
            throw new ErroTrocaSenha('falha_conexao', 'Não foi possível confirmar sua sessão. A senha não foi alterada');
        }

        if (idSessaoAtual === null) {
            throw new ErroTrocaSenha('sessao_expirada', 'Sua sessão foi encerrada. Entre novamente para alterar a senha');
        }

        if (idSessaoAtual !== usuario.id) {
            throw new ErroTrocaSenha('sessao_alterada', MENSAGEM_SESSAO_ALTERADA);
        }

        // 4. Troca no mesmo cliente isolado. Uma única tentativa, sem repetição automática.
        let resposta: RespostaAuth<unknown>;
        try {
            resposta = await sessao.atualizarSenha(novaSenha, senhaAtual);
        } catch {
            throw new ErroTrocaSenha('resultado_desconhecido', MENSAGEM_RESULTADO_DESCONHECIDO, true);
        }

        if (resposta.error) {
            throw erroDaAtualizacao(resposta.error);
        }
    } finally {
        // 5. Encerra só a sessão isolada; a sessão principal não é tocada.
        if (precisaEncerrar) {
            encerrarSemBloquear(sessao);
        }
    }
}

export function criarTrocaDeSenha(deps: DependenciasTrocaSenha) {
    let emAndamento = false;

    return async function alterarSenhaPropria(dados: DadosTrocaSenha): Promise<void> {
        if (emAndamento) {
            throw new ErroTrocaSenha('em_andamento', 'Aguarde a alteração em andamento');
        }

        const erroValidacao = validarTrocaSenha(dados);
        if (erroValidacao) {
            throw new ErroTrocaSenha('validacao', erroValidacao);
        }

        emAndamento = true;
        try {
            await executarTroca(deps, dados.senhaAtual, dados.novaSenha);
        } finally {
            emAndamento = false;
        }
    };
}
