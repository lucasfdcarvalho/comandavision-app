const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Tudo aqui é simulado: nenhum teste acessa rede, Supabase ou contas reais.
const SENHA_ATUAL = 'senha-atual-ficticia';
const NOVA_SENHA = 'nova-senha-ficticia';
const USUARIO = { id: 'usuario-ficticio-1', email: 'pessoa@exemplo.test' };

const ler = (arquivo) => readFileSync(resolve(__dirname, '..', arquivo), 'utf8');

function criarConsoleEspiao() {
    const registros = [];
    const registrar = (...args) => registros.push(args.map(String).join(' '));
    return { registros, console: { log: registrar, info: registrar, warn: registrar, error: registrar, debug: registrar } };
}

function carregar(arquivo, resolverImport, contextoExtra = {}) {
    const codigo = ts.transpileModule(ler(arquivo), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(codigo, {
        module,
        exports: module.exports,
        require: resolverImport ?? ((nome) => { throw new Error(`Import inesperado: ${nome}`); }),
        ...contextoExtra,
    });
    return module.exports;
}

function carregarServico() {
    const espiao = criarConsoleEspiao();
    const servico = carregar('src/services/trocaSenhaService.ts', undefined, { console: espiao.console });
    return { servico, espiao };
}

function dados(sobrescrever = {}) {
    return { senhaAtual: SENHA_ATUAL, novaSenha: NOVA_SENHA, confirmacao: NOVA_SENHA, ...sobrescrever };
}

const loginOk = () => ({ data: { user: { id: USUARIO.id }, session: { access_token: 'token-ficticio' } }, error: null });

function cenario(opcoes = {}) {
    const chamadas = [];
    const sessoes = [];
    const deps = {
        async obterUsuarioVerificado() {
            chamadas.push('getUser');
            return opcoes.getUser ? opcoes.getUser() : { data: { user: { ...USUARIO } }, error: null };
        },
        async obterIdUsuarioDaSessaoAtual() {
            chamadas.push('getSession');
            return opcoes.idSessaoAtual ? opcoes.idSessaoAtual() : USUARIO.id;
        },
        criarSessaoIsolada() {
            chamadas.push('criarSessaoIsolada');
            const sessao = {
                entradas: [],
                atualizacoes: [],
                encerramentos: 0,
                async entrar(email, senha) {
                    chamadas.push('entrar');
                    sessao.entradas.push({ email, senha });
                    return opcoes.entrar ? opcoes.entrar() : loginOk();
                },
                async atualizarSenha(novaSenha, senhaAtual) {
                    chamadas.push('atualizarSenha');
                    sessao.atualizacoes.push({ novaSenha, senhaAtual });
                    return opcoes.atualizarSenha ? opcoes.atualizarSenha() : { data: { user: { id: USUARIO.id } }, error: null };
                },
                encerrarLocal() {
                    chamadas.push('encerrarLocal');
                    sessao.encerramentos += 1;
                    return opcoes.encerrarLocal ? opcoes.encerrarLocal() : Promise.resolve({ error: null });
                },
            };
            sessoes.push(sessao);
            return sessao;
        },
    };
    return { deps, chamadas, sessoes };
}

async function falhaCom(promessa, verificar) {
    await assert.rejects(promessa, (erro) => {
        assert.equal(erro.name, 'ErroTrocaSenha');
        assert.ok(!erro.message.includes(SENHA_ATUAL), 'mensagem não pode conter a senha atual');
        assert.ok(!erro.message.includes(NOVA_SENHA), 'mensagem não pode conter a nova senha');
        verificar(erro);
        return true;
    });
}

test('validação exige senha atual, mínimo de 6, confirmação igual e senha diferente da atual', () => {
    const { servico } = carregarServico();
    const validar = servico.validarTrocaSenha;
    assert.equal(servico.TAMANHO_MINIMO_SENHA, 6);
    assert.equal(validar(dados({ senhaAtual: '' })), 'Informe a senha atual');
    assert.equal(validar(dados({ novaSenha: '12345', confirmacao: '12345' })), 'A nova senha deve ter pelo menos 6 caracteres');
    assert.equal(validar(dados({ confirmacao: 'outra-senha' })), 'A confirmação não confere com a nova senha');
    assert.equal(validar(dados({ novaSenha: SENHA_ATUAL, confirmacao: SENHA_ATUAL })), 'A nova senha deve ser diferente da atual');
    assert.match(validar(dados({ novaSenha: 'a'.repeat(73), confirmacao: 'a'.repeat(73) })), /longa demais/);
    assert.match(validar(dados({ novaSenha: 'ç'.repeat(40), confirmacao: 'ç'.repeat(40) })), /longa demais/);
    assert.equal(validar(dados({ novaSenha: 'a'.repeat(72), confirmacao: 'a'.repeat(72) })), null);
    assert.equal(validar(dados({ novaSenha: '123456', confirmacao: '123456' })), null);
});

test('validação inválida não toca em nenhuma sessão', async () => {
    const { servico } = carregarServico();
    const { deps, chamadas } = cenario();
    const alterar = servico.criarTrocaDeSenha(deps);
    await falhaCom(alterar(dados({ confirmacao: 'diferente' })), (erro) => assert.equal(erro.motivo, 'validacao'));
    assert.deepEqual(chamadas, []);
});

test('sucesso: confere a senha com o e-mail verificado e troca no mesmo cliente isolado', async () => {
    const { servico, espiao } = carregarServico();
    const { deps, chamadas, sessoes } = cenario();
    await servico.criarTrocaDeSenha(deps)(dados());

    assert.deepEqual(chamadas, ['getUser', 'criarSessaoIsolada', 'entrar', 'getSession', 'atualizarSenha', 'encerrarLocal']);
    assert.equal(sessoes.length, 1);
    assert.deepEqual(sessoes[0].entradas, [{ email: USUARIO.email, senha: SENHA_ATUAL }]);
    assert.deepEqual(sessoes[0].atualizacoes, [{ novaSenha: NOVA_SENHA, senhaAtual: SENHA_ATUAL }]);
    assert.equal(sessoes[0].encerramentos, 1);
    assert.deepEqual(espiao.registros, []);
});

test('sessão principal ausente ou expirada impede a troca antes do login isolado', async () => {
    const { servico } = carregarServico();
    for (const getUser of [
        () => ({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' } }),
        () => ({ data: { user: null }, error: null }),
        () => ({ data: { user: { id: USUARIO.id, email: null } }, error: null }),
    ]) {
        const { deps, chamadas } = cenario({ getUser });
        await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => {
            assert.equal(erro.motivo, 'sessao_expirada');
            assert.match(erro.message, /Entre novamente/);
        });
        assert.deepEqual(chamadas, ['getUser']);
    }
});

test('falha de rede ao verificar a sessão não é tratada como sessão expirada', async () => {
    const { servico } = carregarServico();
    const { deps, chamadas } = cenario({
        getUser: () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' } }),
    });
    await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => assert.equal(erro.motivo, 'falha_conexao'));
    assert.deepEqual(chamadas, ['getUser']);
});

test('senha atual incorreta não envia a troca e não precisa encerrar sessão inexistente', async () => {
    const { servico } = carregarServico();
    const { deps, sessoes } = cenario({
        entrar: () => ({ data: { user: null, session: null }, error: { name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' } }),
    });
    await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => {
        assert.equal(erro.motivo, 'senha_atual_incorreta');
        assert.equal(erro.message, 'Senha atual incorreta');
        assert.equal(erro.resultadoDesconhecido, false);
    });
    assert.equal(sessoes[0].atualizacoes.length, 0);
    assert.equal(sessoes[0].encerramentos, 0);
});

test('limite de tentativas e conta desativada no login isolado têm mensagens próprias', async () => {
    const { servico } = carregarServico();
    const casos = [
        [{ status: 429, code: 'over_request_rate_limit' }, 'muitas_tentativas'],
        [{ status: 400, code: 'user_banned' }, 'acesso_desativado'],
        [{ name: 'AuthRetryableFetchError', status: 0 }, 'falha_conexao'],
    ];
    for (const [erroAuth, motivo] of casos) {
        const { deps, sessoes } = cenario({ entrar: () => ({ data: { user: null, session: null }, error: erroAuth }) });
        await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => assert.equal(erro.motivo, motivo));
        assert.equal(sessoes[0].atualizacoes.length, 0);
    }
});

test('login isolado de outra conta aborta antes da troca e encerra só a sessão isolada', async () => {
    const { servico } = carregarServico();
    const { deps, chamadas, sessoes } = cenario({
        entrar: () => ({ data: { user: { id: 'outra-conta' }, session: { access_token: 'token-ficticio' } }, error: null }),
    });
    await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => assert.equal(erro.motivo, 'sessao_alterada'));
    assert.equal(sessoes[0].atualizacoes.length, 0);
    assert.equal(sessoes[0].encerramentos, 1);
    assert.ok(!chamadas.includes('getSession'));
});

test('sessão principal trocada ou encerrada durante a conferência impede a troca', async () => {
    const { servico } = carregarServico();
    const casos = [
        [() => 'outra-conta', 'sessao_alterada'],
        [() => null, 'sessao_expirada'],
        [() => { throw new Error('falha ao ler sessão'); }, 'falha_conexao'],
    ];
    for (const [idSessaoAtual, motivo] of casos) {
        const { deps, sessoes } = cenario({ idSessaoAtual });
        await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => {
            assert.equal(erro.motivo, motivo);
            assert.equal(erro.resultadoDesconhecido, false);
        });
        assert.equal(sessoes[0].atualizacoes.length, 0);
        assert.equal(sessoes[0].encerramentos, 1);
    }
});

test('recusas definitivas do servidor informam que a senha não mudou', async () => {
    const { servico } = carregarServico();
    const casos = [
        [{ status: 422, code: 'weak_password', reasons: ['pwned'] }, 'senha_fraca', /vazamentos/],
        [{ status: 422, code: 'weak_password', reasons: ['length'] }, 'senha_fraca', /curta demais/],
        [{ status: 422, code: 'weak_password', reasons: [] }, 'senha_fraca', /fraca/],
        [{ status: 422, code: 'same_password' }, 'senha_igual', /diferente da atual/],
        [{ status: 400, code: 'current_password_mismatch' }, 'senha_atual_incorreta', /Senha atual incorreta/],
        [{ status: 401, code: 'reauthentication_needed' }, 'reautenticacao', /entre novamente/],
        [{ status: 400, code: 'reauthentication_not_valid' }, 'reautenticacao', /entre novamente/],
        [{ status: 429, code: 'over_request_rate_limit' }, 'muitas_tentativas', /Aguarde/],
        [{ status: 403, code: 'session_not_found' }, 'recusada', /continua a mesma/],
    ];
    for (const [erroAuth, motivo, mensagem] of casos) {
        const { deps, sessoes } = cenario({ atualizarSenha: () => ({ data: { user: null }, error: { name: 'AuthApiError', ...erroAuth } }) });
        await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => {
            assert.equal(erro.motivo, motivo);
            assert.match(erro.message, mensagem);
            assert.equal(erro.resultadoDesconhecido, false);
        });
        assert.equal(sessoes[0].atualizacoes.length, 1);
        assert.equal(sessoes[0].encerramentos, 1);
    }
});

test('falha de transporte na troca vira resultado desconhecido, sem repetição automática', async () => {
    const { servico } = carregarServico();
    const respostas = [
        () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' } }),
        () => ({ data: { user: null }, error: { name: 'AuthApiError', status: 500, code: 'unexpected_failure' } }),
        () => ({ data: { user: null }, error: { name: 'AuthUnknownError', message: 'resposta inválida' } }),
        () => { throw new TypeError('Network request failed'); },
    ];
    for (const atualizarSenha of respostas) {
        const { deps, sessoes } = cenario({ atualizarSenha });
        await falhaCom(servico.criarTrocaDeSenha(deps)(dados()), (erro) => {
            assert.equal(erro.motivo, 'resultado_desconhecido');
            assert.equal(erro.resultadoDesconhecido, true);
            assert.doesNotMatch(erro.message, /não foi alterada|continua a mesma/);
        });
        assert.equal(sessoes[0].atualizacoes.length, 1);
        assert.equal(sessoes[0].encerramentos, 1);
    }
});

test('falha ao encerrar a sessão isolada após o sucesso não vira erro', async () => {
    const { servico } = carregarServico();
    for (const encerrarLocal of [
        () => Promise.reject(new Error('falha de rede no logout')),
        () => { throw new Error('falha síncrona no logout'); },
        () => new Promise(() => {}),
    ]) {
        const { deps, sessoes } = cenario({ encerrarLocal });
        await servico.criarTrocaDeSenha(deps)(dados());
        assert.equal(sessoes[0].atualizacoes.length, 1);
        assert.equal(sessoes[0].encerramentos, 1);
    }
});

test('toques repetidos não disparam duas trocas ao mesmo tempo', async () => {
    const { servico } = carregarServico();
    let liberarLogin;
    const { deps, sessoes } = cenario({ entrar: () => new Promise((resolver) => { liberarLogin = () => resolver(loginOk()); }) });
    const alterar = servico.criarTrocaDeSenha(deps);

    const primeira = alterar(dados());
    await falhaCom(alterar(dados()), (erro) => assert.equal(erro.motivo, 'em_andamento'));
    await new Promise((r) => setImmediate(r));
    liberarLogin();
    await primeira;

    assert.equal(sessoes.length, 1);
    assert.equal(sessoes[0].atualizacoes.length, 1);

    // Depois de concluída, uma nova tentativa é aceita.
    const segunda = alterar(dados());
    await new Promise((r) => setImmediate(r));
    liberarLogin();
    await segunda;
    assert.equal(sessoes.length, 2);
});

test('authService usa o cliente principal só para leitura e troca no cliente isolado', async () => {
    const espiao = criarConsoleEspiao();
    const proibido = (nome) => () => { throw new Error(`cliente principal não pode chamar ${nome}`); };
    const principal = {
        auth: {
            getUser: async () => ({ data: { user: { id: USUARIO.id, email: USUARIO.email } }, error: null }),
            getSession: async () => ({ data: { session: { user: { id: USUARIO.id } } }, error: null }),
            signInWithPassword: proibido('signInWithPassword'),
            updateUser: proibido('updateUser'),
            signOut: proibido('signOut'),
            setSession: proibido('setSession'),
        },
    };
    const isolados = [];
    const criarClienteSupabaseIsolado = () => {
        const chamadas = [];
        const cliente = {
            chamadas,
            auth: {
                signInWithPassword: async (credenciais) => { chamadas.push(['signInWithPassword', credenciais]); return loginOk(); },
                updateUser: async (atributos) => { chamadas.push(['updateUser', atributos]); return { data: { user: { id: USUARIO.id } }, error: null }; },
                signOut: async (opcoes) => { chamadas.push(['signOut', opcoes]); return { error: null }; },
            },
        };
        isolados.push(cliente);
        return cliente;
    };

    const servico = carregar('src/services/trocaSenhaService.ts', undefined, { console: espiao.console });
    const { authService } = carregar('src/services/authService.ts', (nome) => {
        if (nome === './supabase') return { supabase: principal, criarClienteSupabaseIsolado };
        if (nome === './trocaSenhaService') return servico;
        throw new Error(`Import inesperado: ${nome}`);
    }, { console: espiao.console });

    await authService.alterarSenhaPropria(dados());

    assert.equal(isolados.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(isolados[0].chamadas)), [
        ['signInWithPassword', { email: USUARIO.email, password: SENHA_ATUAL }],
        ['updateUser', { password: NOVA_SENHA, current_password: SENHA_ATUAL }],
        ['signOut', { scope: 'local' }],
    ]);
    assert.deepEqual(espiao.registros, []);
});

test('cliente isolado não persiste sessão, não renova token e usa chave única; o principal segue igual', () => {
    const configuracoes = [];
    const adaptadorSeguro = { nome: 'SecureSessionAdapter' };
    const modulo = carregar('src/services/supabase.ts', (nome) => {
        if (nome === 'react-native') return { AppState: { addEventListener: () => ({ remove() {} }) } };
        if (nome === 'react-native-url-polyfill/auto') return {};
        if (nome === './secureSessionAdapter') return { SecureSessionAdapter: adaptadorSeguro };
        if (nome === '@supabase/supabase-js') {
            return {
                createClient: (url, chave, opcoes) => {
                    configuracoes.push({ url, chave, opcoes });
                    return { auth: { startAutoRefresh() {}, stopAutoRefresh() {} } };
                },
            };
        }
        throw new Error(`Import inesperado: ${nome}`);
    }, {
        process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://projeto-ficticio.exemplo.test', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'chave-ficticia' } },
    });

    const principal = configuracoes[0].opcoes.auth;
    assert.equal(principal.storage, adaptadorSeguro);
    assert.equal(principal.persistSession, true);
    assert.equal(principal.autoRefreshToken, true);

    modulo.criarClienteSupabaseIsolado();
    modulo.criarClienteSupabaseIsolado();
    const [a, b] = configuracoes.slice(1).map((c) => c.opcoes.auth);
    // Cada cliente isolado tem memória própria: nada vaza entre tentativas.
    a.storage.setItem('so-no-a', 'valor');
    assert.equal(b.storage.getItem('so-no-a'), null);
    for (const auth of [a, b]) {
        assert.equal(auth.persistSession, false);
        assert.equal(auth.autoRefreshToken, false);
        assert.equal(auth.detectSessionInUrl, false);
        assert.notEqual(auth.storage, adaptadorSeguro);
        assert.match(auth.storageKey, /^sb-isolado-/);
        assert.equal(auth.storage.getItem('qualquer'), null);
        auth.storage.setItem('qualquer', 'valor');
        assert.equal(auth.storage.getItem('qualquer'), 'valor');
    }
    assert.notEqual(a.storageKey, b.storageKey);
    assert.notEqual(a.storage, b.storage);
});

function carregarNavegador(arquivo, papel) {
    return carregar(arquivo, (nome) => {
        if (nome === 'react/jsx-runtime') return require(nome);
        if (nome === 'react-native') return { Platform: { OS: 'android' }, StyleSheet: { create: (s) => s } };
        if (nome === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 48 }) };
        if (nome === '@react-navigation/native-stack') {
            return { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }) };
        }
        if (nome === '@react-navigation/bottom-tabs') {
            return { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Screen' }) };
        }
        if (nome.endsWith('/useAuth')) return { useAuth: () => ({ usuario: { papel } }) };
        if (nome.endsWith('/tabBarLayout')) return { calcularLayoutBarraInferior: () => ({}) };
        return new Proxy({}, { get: (_, chave) => chave });
    });
}

test('Perfil > Alterar senha fica disponível para DONO e FUNCIONARIO', () => {
    for (const papel of ['DONO', 'FUNCIONARIO']) {
        const abas = carregarNavegador('src/navigation/MainTabs.tsx', papel).MainTabs();
        const perfil = abas.props.children.find((tela) => tela?.props?.name === 'Perfil');
        assert.equal(perfil.props.component, 'PerfilStack');
        assert.equal(perfil.props.options.headerShown, false);
    }

    const pilha = carregarNavegador('src/navigation/PerfilStack.tsx', 'FUNCIONARIO').PerfilStack();
    assert.equal(pilha.props.initialRouteName, 'Perfil');
    const telas = pilha.props.children.map((tela) => [tela.props.name, tela.props.component, tela.props.options.title]);
    assert.deepEqual(JSON.parse(JSON.stringify(telas)), [
        ['Perfil', 'PerfilScreen', 'Perfil'],
        ['AlterarSenha', 'AlterarSenhaScreen', 'Alterar senha'],
    ]);

    assert.match(ler('src/screens/perfil/PerfilScreen.tsx'), /navigation\.navigate\('AlterarSenha'\)/);
});

test('textos e código não prometem troca obrigatória nem registram senhas', () => {
    const novoUsuario = ler('src/screens/gestao/NovoUsuarioScreen.tsx');
    assert.match(novoUsuario, /Perfil > Alterar senha/);
    assert.doesNotMatch(novoUsuario, /primeiro acesso|pela primeira vez|obrigat/i);

    for (const arquivo of [
        'src/services/trocaSenhaService.ts',
        'src/services/authService.ts',
        'src/screens/perfil/AlterarSenhaScreen.tsx',
    ]) {
        assert.doesNotMatch(ler(arquivo), /console\./, `${arquivo} não deve registrar logs`);
    }

    const authService = ler('src/services/authService.ts');
    assert.doesNotMatch(authService, /supabase\.auth\.updateUser/);
    assert.doesNotMatch(authService, /scope: '(global|others)'/);
});

test('callbacks de tela abandonada nao navegam nem mostram dialogos tardios', () => {
    const tela = ler('src/screens/perfil/AlterarSenhaScreen.tsx');
    assert.match(tela, /if \(!montada\.current \|\| !navigation\.isFocused\(\)\) return;/);
    assert.match(tela, /if \(montada\.current && navigation\.isFocused\(\)\) navigation\.goBack\(\)/);
});