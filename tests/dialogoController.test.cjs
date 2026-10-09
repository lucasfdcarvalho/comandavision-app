const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DialogoController } = require('../src/utils/dialogoController.ts');

function confirmacao(controller, confirmar, cancelar = () => {}) {
    controller.abrir('comanda', 'Cancelar comanda', 'Esta ação não pode ser desfeita.', [
        { text: 'Voltar', style: 'cancel', onPress: cancelar },
        { text: 'Cancelar comanda', style: 'destructive', onPress: confirmar },
    ]);
    return controller.getSnapshot().id;
}

test('cancelar ou fechar (voltar Android, fundo, X) não executa callbacks', async () => {
    const controller = new DialogoController();
    let chamadas = 0;
    const id = confirmacao(controller, () => chamadas++, () => chamadas++);
    await controller.selecionar(id, 0);
    assert.equal(chamadas, 0);
    assert.equal(controller.getSnapshot(), null);
    const outroId = confirmacao(controller, () => chamadas++);
    controller.fechar(outroId);
    await controller.selecionar(outroId, 1);
    assert.equal(chamadas, 0);
    assert.equal(controller.getSnapshot(), null);
});

test('toques repetidos confirmam uma única vez e mantêm a trava durante a API', async () => {
    const controller = new DialogoController();
    let chamadas = 0;
    let concluir;
    const pendente = new Promise((resolve) => { concluir = resolve; });
    const id = confirmacao(controller, async () => { chamadas++; await pendente; });
    const primeira = controller.selecionar(id, 1);
    const segunda = controller.selecionar(id, 1);
    controller.fechar(id);
    await controller.selecionar(id, 0);
    assert.equal(controller.getSnapshot().botaoEmAndamento, 1);
    assert.equal(chamadas, 1);
    concluir();
    await Promise.all([primeira, segunda]);
    assert.equal(controller.getSnapshot(), null);
});

test('sucesso aberto pelo callback aparece depois da confirmação', async () => {
    const controller = new DialogoController();
    let navegacoes = 0;
    const id = confirmacao(controller, async () => {
        controller.abrir('comanda', 'Comanda atualizada', 'Alterações salvas.', undefined, 'sucesso', () => { navegacoes++; });
    });
    await controller.selecionar(id, 1);
    assert.equal(controller.getSnapshot().titulo, 'Comanda atualizada');
    assert.equal(controller.getSnapshot().tipo, 'sucesso');
    assert.equal(controller.getSnapshot().botaoEmAndamento, null);
    assert.deepEqual(controller.getSnapshot().botoes, []);
    assert.equal(navegacoes, 0);
    controller.fechar(controller.getSnapshot().id);
    assert.equal(navegacoes, 1);
});

test('erro assíncrono vira mensagem e não repete a operação', async () => {
    const controller = new DialogoController();
    let chamadas = 0;
    const id = confirmacao(controller, async () => { chamadas++; throw new Error('Sem conexão com a API.'); });
    await controller.selecionar(id, 1);
    assert.equal(controller.getSnapshot().tipo, 'erro');
    assert.equal(controller.getSnapshot().mensagem, 'Sem conexão com a API.');
    await controller.selecionar(id, 0);
    assert.equal(chamadas, 1);
    assert.equal(controller.getSnapshot(), null);
});

test('mensagens simultâneas são enfileiradas; a mesma confirmação não acumula', () => {
    const controller = new DialogoController();
    const id = confirmacao(controller, () => {});
    confirmacao(controller, () => {});
    controller.abrir('sessao', 'Sessão expirada', 'Entre novamente.', undefined, 'aviso');
    controller.fechar(id);
    assert.equal(controller.getSnapshot().origem, 'sessao');
    controller.fechar(controller.getSnapshot().id);
    assert.equal(controller.getSnapshot(), null);
});

test('desmontar uma tela remove suas confirmações e preserva o aviso de sessão', async () => {
    const controller = new DialogoController();
    let chamadas = 0;
    const id = confirmacao(controller, () => chamadas++);
    controller.abrir('sessao', 'Sessão expirada', 'Entre novamente.');
    controller.removerOrigem('comanda');
    await controller.selecionar(id, 1);
    assert.equal(chamadas, 0);
    assert.equal(controller.getSnapshot().origem, 'sessao');
});

test('operação iniciada em tela desmontada não fecha a próxima mensagem', async () => {
    const controller = new DialogoController();
    let concluir;
    const pendente = new Promise((resolve) => { concluir = resolve; });
    const id = confirmacao(controller, () => pendente);
    const primeira = controller.selecionar(id, 1);
    controller.removerOrigem('comanda');
    controller.abrir('sessao', 'Sessão expirada', 'Entre novamente.');
    concluir();
    await primeira;
    assert.equal(controller.getSnapshot().origem, 'sessao');
});

test('sucesso não tem botões e só navega ao fechar, uma única vez', async () => {
    const controller = new DialogoController();
    let navegacoes = 0;
    controller.abrir('cadastro', 'Produto criado', 'Produto salvo.', [], 'sucesso', () => { navegacoes++; });
    const id = controller.getSnapshot().id;
    assert.deepEqual(controller.getSnapshot().botoes, []);
    await controller.selecionar(id, 0);
    assert.equal(navegacoes, 0);
    controller.fechar(id);
    controller.fechar(id);
    assert.equal(navegacoes, 1);
    assert.equal(controller.getSnapshot(), null);
});

test('fechar um sucesso não fecha o próximo diálogo da fila', () => {
    const controller = new DialogoController();
    let navegacoes = 0;
    controller.abrir('cadastro', 'Produto criado', 'Produto salvo.', undefined, 'sucesso', () => { navegacoes++; });
    const id = controller.getSnapshot().id;
    controller.abrir('sessao', 'Sessão expirada', 'Entre novamente.');
    controller.fechar(id);
    controller.fechar(id);
    assert.equal(navegacoes, 1);
    assert.equal(controller.getSnapshot().origem, 'sessao');
});

test('desmontagem não dispara o redirecionamento de uma mensagem de sucesso', () => {
    const controller = new DialogoController();
    let navegacoes = 0;
    controller.abrir('cadastro', 'Produto criado', 'Produto salvo.', undefined, 'sucesso', () => { navegacoes++; });
    const id = controller.getSnapshot().id;
    controller.removerOrigem('cadastro');
    controller.fechar(id);
    assert.equal(navegacoes, 0);
    assert.equal(controller.getSnapshot(), null);
});
