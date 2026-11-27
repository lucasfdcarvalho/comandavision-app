const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregarServico(requisitar) {
    const fonte = readFileSync(resolve(__dirname, '../src/services/apiService.ts'), 'utf8');
    const codigo = ts.transpileModule(fonte, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const exports = {};
    vm.runInNewContext(codigo, {
        exports,
        AbortController,
        setTimeout,
        clearTimeout,
        require(nome) {
            assert.equal(nome, './apiClient');
            return {
                apiClient: { requisitar },
                ehErroApiStatus: (erro, status) => erro?.status === status,
            };
        },
    });
    return exports.apiService;
}

function erroApi(status, mensagem) {
    return Object.assign(new Error(mensagem), { status });
}


test('catalogo usa pagina/busca/status no servidor', async () => {
 const chamadas=[]; const pagina={content:[],totalElements:0,totalPages:0,number:2,last:true};
 const api=carregarServico(async path=>{chamadas.push(path);return pagina});
 assert.equal(await api.listarProdutosPaginados(2,20,'café & pão',false),pagina);
 assert.equal(chamadas[0],'/api/produtos/paginados?page=2&size=20&busca=caf%C3%A9%20%26%20p%C3%A3o&ativo=false');
});
test('API antiga filtra antes de paginar sem perder inativos na contagem',async()=>{
 const produtos=[{id:1,nome:'Cafe',ativo:true,categoria:{id:7}},{id:2,nome:'Cafe 2',ativo:false,categoria:{id:7}},{id:3,nome:'Cafe 3',ativo:true,categoria:{id:8}}];
 const api=carregarServico(async path=>{if(path==='/api/produtos')return produtos;throw erroApi(404,'Ausente')});
 const p=await api.listarProdutosPaginados(1,1,'cafe',true);
 assert.equal(p.content[0].id,3); assert.equal(p.totalElements,2); assert.equal(p.last,true);
 const c=await api.contarProdutosPorCategoria();assert.equal(c[7],2); assert.equal(c[8],1);
});
test('erros de autorizacao/rede/servidor nao viram fallback',async()=>{
 for(const status of [401,403,500]){let chamadas=0;const api=carregarServico(async()=>{chamadas++;throw erroApi(status,'falha')});
 await assert.rejects(()=>api.listarProdutosPaginados(),e=>e.status===status);assert.equal(chamadas,1);
 await assert.rejects(()=>api.contarProdutosPorCategoria(),e=>e.status===status);assert.equal(chamadas,2);}
});
test('exclusao categoria envia DELETE sem dados pessoais',async()=>{
 const api=carregarServico(async(path,options)=>{assert.equal(path,'/api/categorias/23');assert.equal(options.method,'DELETE');return undefined});
 await api.excluirCategoria(23);
});
test('filtros ativos padrao e exclusao categoria protegida na UI',()=>{
 const ler=p=>readFileSync(resolve(__dirname,'../src/screens/gestao',p),'utf8');
 assert.match(ler('CatalogoScreen.tsx'),/useState<FiltroProduto>\('ativos'\)/);
 assert.match(ler('CatalogoScreen.tsx'),/useState<FiltroCategoria>\('ativas'\)/);
 assert.match(ler('EquipeScreen.tsx'),/useState<'ativos' \| 'inativos' \| 'todos'>\('ativos'\)/);
 assert.match(ler('EditarCategoriaScreen.tsx'),/usuario\?\.papel !== 'DONO'/);
 assert.match(ler('EditarCategoriaScreen.tsx'),/exclusaoPendente.current/);
 assert.match(ler('EditarProdutoScreen.tsx'),/exclusaoDisponivel/);
});

test('botao exclusao produto disponivel ao DONO e API decide elegibilidade',()=>{
 const {podeExcluirProduto}=require('../src/utils/exclusaoProduto.ts');
 for(const papel of [undefined,'FUNCIONARIO','ADMIN','DONO']) for(const permitido of [undefined,false,true]) assert.equal(podeExcluirProduto(papel,permitido),papel==='DONO');
});
test('excluir produto usa DELETE e propaga conflito sem ocultar',async()=>{
 const api=carregarServico(async(path,options)=>{assert.equal(path,'/api/produtos/19');assert.equal(options.method,'DELETE');throw erroApi(409,'Produto possui histórico; inative');});
 await assert.rejects(()=>api.excluirProduto(19),e=>e.status===409 && e.message.includes('inative'));
 const tela=readFileSync(resolve(__dirname,'../src/screens/gestao/EditarProdutoScreen.tsx'),'utf8');
 assert.match(tela,/exclusaoPendente.current = true/);assert.ok(!tela.includes('setExclusaoRecusada'));assert.ok(tela.includes("navigation.popTo('Catalogo', { aba: 'produtos'"));
});

test('refinamento usa dez produtos e botoes padronizados sem alerta apos excluir',()=>{
 const ler=n=>readFileSync(resolve(__dirname,'../src/screens/gestao/'+n+'Screen.tsx'),'utf8');
 assert.match(ler('Catalogo'),/listarProdutosPaginados\(pagina, 10,/);
 assert.match(ler('Catalogo'),/styles.botaoPaginaInativo/);
 for(const [t,e] of [['EditarProduto','produto'],['EditarCategoria','categoria']]){
 const s=ler(t); assert.ok(s.includes('PrimaryButton titulo="Excluir '+e+'"'));
 assert.ok(s.includes('Não dá para desfazer essa ação')); assert.ok(s.includes("{ text: 'Cancelar', style: 'cancel' }"));
 assert.match(s,/botaoExcluir: \{ backgroundColor: colors.erro \}/);
 }
 assert.ok(!ler('EditarProduto').includes('O produto sem histórico foi removido'));
});

test('conflitos explicam limites sem atribuir uso certo ao legado e retornos preservam aba',()=>{
 const {mensagemConflitoExclusao,mensagemErroExclusao}=require('../src/utils/mensagemExclusao.ts');
 assert.equal(mensagemConflitoExclusao('produto'),'Não é possível excluir este produto. Você pode inativá-lo');
 assert.match(mensagemConflitoExclusao('categoria'),/^Esta categoria tem produtos vinculados e /); assert.doesNotMatch(mensagemConflitoExclusao('categoria'),/inclusive inativos/);
 assert.equal(mensagemErroExclusao(new Error('Falhou. ')),'Falhou');
 const cat=readFileSync(resolve(__dirname,'../src/screens/gestao/EditarCategoriaScreen.tsx'),'utf8');
 assert.ok(cat.includes("aba: 'categorias'")); assert.ok(!cat.includes('A categoria sem produtos foi removida'));
 assert.match(cat,/conflito \? 'aviso' : 'erro'/);
 const lista=readFileSync(resolve(__dirname,'../src/screens/gestao/CatalogoScreen.tsx'),'utf8');
 assert.ok(lista.includes("{produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'} · Página")); assert.ok(!lista.includes('nesta página')); assert.ok(lista.includes('route.params?.retorno'));
});

test('aviso bloqueado tem contraste e variante opt-in sem mudar dialogos comuns',()=>{
 const ler=p=>readFileSync(resolve(__dirname,'../src/'+p),'utf8');
 assert.match(ler('components/Dialogo.tsx'),/dialogo.visual === 'exclusaoBloqueada'/);
 assert.match(ler('components/Dialogo.tsx'),/cartaoBloqueado: \{ backgroundColor: colors.superficie/);
 assert.match(ler('components/Dialogo.tsx'),/textoBloqueado: \{ color: colors.textoPrimario, fontWeight: '700'/);
 assert.match(ler('utils/mensagemExclusao.ts'),/Você pode inativá-la/);
 for(const tipo of ['Produto','Categoria']) assert.match(ler('screens/gestao/Editar'+tipo+'Screen.tsx'),/conflito \? 'exclusaoBloqueada' : undefined/);
});

test('subtexto do aviso bloqueado usa peso normal e titulo permanece forte',()=>{
 const s=readFileSync(resolve(__dirname,'../src/components/Dialogo.tsx'),'utf8');
 assert.match(s,/mensagemBloqueada: \{ color: colors.textoPrimario, fontWeight: '400'/);
 assert.ok(s.includes('styles.mensagem, exclusaoBloqueada && styles.mensagemBloqueada'));
 assert.ok(s.includes('styles.titulo, exclusaoBloqueada && styles.textoBloqueado'));
});

test('equipe usa mesmos chips visuais do catalogo preservando ativos por padrao',()=>{
 const ler=n=>readFileSync(resolve(__dirname,'../src/screens/gestao/'+n+'Screen.tsx'),'utf8');
 const e=ler('Equipe'),c=ler('Catalogo');
 for(const n of ['filtros','chip','chipSelecionado','textoChip','textoChipSelecionado']){
 const regex=new RegExp('    '+n+': \\{[\\s\\S]*?\\n    \\},');
 assert.equal(e.match(regex)?.[0],c.match(regex)?.[0]);
 }
 assert.ok(e.includes("useState<'ativos' | 'inativos' | 'todos'>('ativos')"));
 assert.ok(e.includes('styles.textoChipSelecionado'));
});

test('equipe vazia replica aviso do historico em qualquer filtro sem confundir erro ou loading',()=>{
 const e=readFileSync(resolve(__dirname,'../src/screens/gestao/EquipeScreen.tsx'),'utf8');
 const h=readFileSync(resolve(__dirname,'../src/screens/historico/HistoricoScreen.tsx'),'utf8');
 for(const n of ['avisoVazio','listaVazia']){
 const regex=new RegExp('    '+n+': \\{[\\s\\S]*?\\n    \\},');
 assert.equal(e.match(regex)?.[0],h.match(regex)?.[0]); assert.ok(e.match(regex));
 }
 assert.ok(e.includes('usuariosFiltrados.length === 0 ? ('));
 assert.ok(e.includes("{usuarios.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado'}"));
 assert.ok(!e.includes('EmptyState'));
 assert.ok(e.includes('if (carregando)')); assert.ok(e.includes('if (mensagemErro)'));
 assert.ok(e.includes('onChangeText={setBusca}'));
});
