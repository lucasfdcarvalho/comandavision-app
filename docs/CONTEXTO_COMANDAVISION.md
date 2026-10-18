# Prompt de contexto — ComandaVision

Quero que você me ajude a continuar o desenvolvimento do ComandaVision. Este
texto reúne o contexto do projeto em 12/10/2026. Use o código local como fonte
principal e confira o estado atual antes de implementar mudanças. Pode haver
diferenças entre o código local, as anotações e a API publicada.

## 1. Produto e objetivo

O ComandaVision é um aplicativo de gerenciamento de comandas de restaurante,
voltado ao dono e aos funcionários. O fluxo principal é abrir uma comanda por
mesa/identificação, adicionar produtos, editar quantidades e observações,
fechar a comanda, registrar pagamentos e consultar histórico e indicadores.

O aplicativo está em desenvolvimento e já tem funcionalidades reais integradas.
Quero evoluir esse projeto preservando as integrações, as regras de negócio e
a identidade visual. Não quero recriar o aplicativo do zero.

## 2. Projetos locais e leitura inicial

- Front-end: `C:\Users\Lucas\Desktop\comandavision-app`
- Back-end: `C:\Users\Lucas\Desktop\Comanda_Vision_API`

São projetos separados. Confira acesso e permissões antes de editar a API.
Leia `AGENTS.md`, outras instruções locais, `package.json`, `pom.xml` e o estado
do Git. Preserve alterações existentes e não sobrescreva trabalho meu.

O `AGENTS.md` do front-end exige consultar exatamente a documentação do Expo 57
antes de escrever código: https://docs.expo.dev/versions/v57.0.0/

Na API, leia `PROXIMOS_PASSOS.md` e
`docs/validacao-identificacao-comandas.md`. As notas podem estar desatualizadas;
por exemplo, o resumo antigo cita V1–V7, mas a migration V8 já existe no código.

## 3. Tecnologias

Front-end:

- React Native 0.86.3, React 19.2.3 e Expo ~57.0.18.
- TypeScript ~6.0.3 com modo estrito.
- React Navigation 7: Native Stack e Bottom Tabs. Não usa Expo Router.
- Supabase JS para autenticação e upload de imagens.
- Expo Secure Store, Image Picker, File System, Print e Sharing.
- Ícones `@expo/vector-icons`, SVG e Safe Area Context.
- Foco em Android e iOS. Existe comando de execução web, cuja compatibilidade
  com funcionalidades nativas deve ser verificada quando necessário.

Back-end:

- Java 25, Spring Boot 4.1.0, Maven/Maven Wrapper.
- Spring Web MVC, Validation, Data JPA/Hibernate.
- PostgreSQL no Supabase, schema `comandavision`.
- Flyway para migrations; `hibernate.ddl-auto=none`.
- Spring Security OAuth2 Resource Server para validar JWT do Supabase.
- OpenAPI/Swagger via Springdoc. Há Dockerfile e notas de deploy no Render.

Confira as versões instaladas e as APIs disponíveis antes de adicionar bibliotecas.

## 4. Estrutura do front-end

- `App.tsx`: SafeAreaProvider → DialogoProvider → AuthProvider → AppNavigator.
- `src/navigation`: AppNavigator, AuthStack, MainTabs, ComandasStack,
  GestaoStack e stackScreenOptions.
- `src/screens`: auth, comandas, historico, dashboard, indicadores, gestao e perfil.
- `src/components`: botões, cartões, estados de loading/erro/vazio, mensagens,
  seletores, imagens, diálogo e componentes de indicadores.
- `src/contexts`: autenticação e diálogos compartilhados.
- `src/services`: apiClient, apiService, authService, supabase,
  secureSessionAdapter, imagemProdutoService e comprovanteService.
- `src/types`: contratos de comanda, item, produto, categoria, pagamento,
  usuário e indicadores.
- `src/utils`: formatação, saldo, divisão da conta, períodos/indicadores,
  HTML do comprovante e controlador de diálogos.
- `src/theme/colors.ts`: cores compartilhadas.
- `tests/dialogoController.test.cjs`: testes do controlador dos diálogos.

A API usa o pacote base `br.com.comandavision.api`, organizado por domínio:
comanda, pagamento, produto, categoria, usuario, autenticacao, dashboard,
security e exception. Controllers, DTOs, services, entities e repositories
estão nesses pacotes. Migrations ficam em `src/main/resources/db/migration`.

## 5. Navegação e funcionalidades existentes

Sem autenticação, o usuário vê o login. Após entrar:

- **Comandas:** lista e busca de comandas abertas, nova comanda, detalhes,
  seleção/adição/edição/remoção de itens, fechamento, cancelamento, pagamentos
  e comprovante.
- **Histórico:** consulta e busca de comandas encerradas.
- **Perfil:** dados do usuário e saída da conta.
- **Gestão**, visível para `DONO`: resumo do dia, comparação com ontem e atalhos
  para cardápio e equipe.
- **Indicadores**, visível para `DONO`: faturamento, vendas, ticket médio,
  itens vendidos, produtos mais vendidos, formas de pagamento e gráficos.

Os filtros dos indicadores são Hoje, 7 dias, 30 dias e Este mês, com comparação
ao período anterior. As datas usam `America/Sao_Paulo`, inclusive quando o
aparelho está configurado em outro fuso. Preserve esse comportamento.

As pilhas de Comandas e Gestão compartilham a configuração que mostra
`Voltar` no iPhone. Preserve o botão nativo, o gesto de voltar do iOS e o
comportamento de voltar no Android.

## 6. Autenticação, permissões e integração HTTP

- O login usa Supabase Auth com e-mail e senha.
- A sessão é persistida pelo SecureSessionAdapter, com Expo Secure Store.
- O Supabase renova tokens; o código controla a renovação conforme o AppState.
- A API recebe `Authorization: Bearer <access_token>`.
- `/api/auth/me` fornece os dados do usuário autenticado.
- Os papéis reais são `DONO` e `FUNCIONARIO`. Contas sem papel não devem ter
  acesso normal. O papel é guardado em `usuarios_papeis` e inserido no JWT por
  um hook do Supabase.
- Um 401 encerra a sessão local, avisa que expirou e retorna ao login.
  Requisições paralelas não devem gerar vários avisos iguais.
- Um 403 não deve encerrar a sessão: representa falta de permissão.
- Ocultar uma tela no aplicativo não substitui autorização no back-end.

O `apiClient.ts` centraliza fetch, token e tratamento dos erros. O contrato
de erro da API é `{ status, erro, mensagem, dataHora, campos }`; o aplicativo
prioriza `mensagem`. Preserve esse formato. O `apiService.ts` centraliza
os endpoints usados pelas telas.

Famílias de endpoints existentes:

- `/api/auth/me`
- `/api/comandas`, `/api/comandas/{id}` e operações `/fechar` e `/cancelar`
- `/api/comandas/{comandaId}/itens` e edição/remoção de itens
- `/api/comandas/{comandaId}/pagamentos`, `/resumo` e estorno de pagamentos
- `/api/produtos` e `/api/categorias`
- `/api/usuarios`, alteração de papel, desativação e reativação
- `/api/dashboard/resumo`, `/produtos-mais-vendidos`, `/formas-pagamento`
  e `/faturamento-diario`, com parâmetros de período

Confira métodos, DTOs e autorizações no código antes de mudar qualquer contrato.

## 7. Regras de negócio que precisam ser preservadas

### Comandas e itens

- Estados: `ABERTA`, `FECHADA`, `CANCELADA`.
- O campo da mesa/descrição é `identificacao`; `observacao` é outro campo.
- Itens armazenam produto, quantidade, preço unitário e observação.
- Adição, edição e remoção de itens exigem comanda aberta.
- Uma comanda sem itens não pode ser fechada.
- Fechar bloqueia edição dos itens e permite registrar pagamentos.

### Identificações duplicadas

Essa validação foi implementada recentemente no back-end:

- Duas comandas abertas não podem ter identificações iguais.
- Maiúsculas/minúsculas e espaços nas extremidades são ignorados.
- Uma identificação fica disponível após fechar ou cancelar a comanda anterior.
- O modelo atual não possui separação por estabelecimento/tenant.
- A consulta preventiva usa `lower(btrim(identificacao))`.
- A V8 cria o índice único parcial `uk_comandas_abertas_identificacao`, somente
  para status `ABERTA`, protegendo também contra tentativas simultâneas.
- O serviço usa `saveAndFlush` e reconhece a restrição pelos dados estruturados
  do driver PostgreSQL, inclusive quando o banco responde em português.
- O conflito retorna HTTP 409 e:
  `Já existe uma comanda aberta com essa descrição.`
- Na tela de nova comanda, o erro aparece no pop-up e os campos ficam
  preenchidos para o usuário corrigir a identificação.

A V8 detecta duplicidades existentes e interrompe sem alterar/excluir registros.
Em 08/10/2026, um diagnóstico encontrou `mesa 1`, IDs 1, 2 e 3, todos abertos.
Esse é um resultado HISTÓRICO: não assuma que essas duplicidades ainda existem.
Repita a consulta de diagnóstico, em modo de leitura, se isso for necessário.

Código implementado e commit enviado não comprovam que a API publicada foi
atualizada ou que a V8 foi aplicada. Confira o ambiente e o histórico do Flyway.

### Pagamentos e comprovante

- O back-end aceita registro de pagamento somente em comanda `FECHADA`.
- Formas: `DINHEIRO`, `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO`.
- Estados de pagamento: `PENDENTE`, `CONFIRMADO`, `CANCELADO`, `ESTORNADO`.
- Situação do resumo: `NAO_PAGO`, `PARCIAL`, `PAGO`.
- Há pagamentos parciais, múltiplas formas e estorno. Apenas pagamentos
  confirmados entram no total pago.
- Não há suporte a troco: pagamento acima do saldo restante é rejeitado.
- A divisão entre pessoas usa centavos inteiros e distribui o resto, mantendo
  a soma exata. O back-end calcula valores monetários com BigDecimal.
- A UI verifica consistência do resumo antes de exibir saldo ou quitação;
  dados indisponíveis não devem virar zero artificialmente.
- Comprovante disponível para comanda fechada e pagamento totalmente concluído.
- O comprovante é gerado como HTML/PDF, pode ser compartilhado/impresso e
  não possui valor fiscal.
- PIX e cartão são registros da forma de pagamento; não presuma integração
  com adquirente, gateway ou geração/cobrança de PIX.

### Produtos, categorias e equipe

- Produtos e categorias têm criação, edição e ativação/desativação.
- Produtos inativos e produtos de categoria inativa não podem ser adicionados.
- Há regras para criar/mover produtos em categorias inativas; consulte services.
- Produtos podem ter imagens. O app envia o arquivo diretamente ao Supabase
  Storage, bucket público de leitura `produtos`, com escrita autorizada por política.
- A API guarda a URL pública. No PUT de produto, enviar sempre a imagem atual
  em `imagemUrl`, ou `null` para remover; omissão pode apagar a referência.
- Arquivos trocados/removidos podem ficar órfãos no bucket; limpeza é uma
  possível evolução, não algo que deva ser executado automaticamente.
- Gestão de equipe: criar conta com senha provisória, listar, alterar papel,
  desativar e reativar. A API usa a Admin API do Supabase.
- Não alterar o próprio papel, não desativar a própria conta e manter pelo
  menos um DONO. A desativação preserva conta e histórico.
- Mudanças de papel/desativação podem depender da renovação/expiração do JWT;
  as notas indicam até uma hora. Confirme a configuração efetiva.

## 8. Identidade visual e diálogos

Interface em português brasileiro, tema claro, tipografia do sistema,
cartões claros com cantos arredondados, bordas discretas e ícones Feather.

Cores de `src/theme/colors.ts`:

- Fundo: `#FAF9F6`; superfície: `#FFFFFF`; borda: `#EFEFEF`.
- Laranja principal: `#EA8B00`.
- Texto principal: `#1F1F1F`; secundário: `#6B6B6B`.
- Erro/destrutivo: `#C62828`; sucesso: `#2E7D32`.
- Os gráficos possuem tons próprios para contraste; reutilize os tokens.

Use os componentes existentes: PrimaryButton, SecondaryButton, ComandaCard,
StatusBadge, LoadingState, EmptyState, ErrorState, MensagemErro, MensagemSucesso
e Dialogo. Preserve legibilidade, acessibilidade e adaptação a telas pequenas.

Os alertas controlados pelo aplicativo foram substituídos por um diálogo
compartilhado: `Dialogo.tsx`, `DialogoContext.tsx` e `dialogoController.ts`.
Use `useDialogo()`, com `alertar` e `mostrarSucesso`.

- Pop-ups de sucesso têm ícone, título, mensagem e X, sem botões “Ver…”.
- Fechar o sucesso pelo X, pelo fundo ou pelo voltar do Android executa
  o redirecionamento configurado uma única vez.
- Comanda criada retorna à lista; item adicionado aos detalhes; produto/categoria
  ao cardápio; usuário à equipe.
- Confirmações mantêm botões com nomes concretos, como Fechar comanda,
  Cancelar comanda e Estornar pagamento. Ações destrutivas são destacadas.
- Fechar/cancelar uma confirmação antes de confirmar não executa a operação.
- Durante uma operação confirmada, o diálogo indica carregamento e bloqueia
  novos toques. Não confundir esse fechamento com cancelamento de requisição.
- O controlador enfileira mensagens, evita repetição e remove callbacks
  pendentes quando a tela desmonta.
- Há foco/semântica para leitores de tela, rolagem e tratamento de voltar no Android.
- Permissões do sistema, seletor de fotos, impressão e compartilhamento
  continuam com suas interfaces nativas.

## 9. Variáveis e ambientes

Front-end:
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Back-end:
`SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_PROJECT_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `PORT`.

Não copie valores de credenciais para respostas, commits ou arquivos públicos.
A service role é exclusiva do back-end. Sem essa chave, a gestão de usuários
pode responder 503, conforme o tratamento existente.

## 10. Verificações, pendências e modo de trabalhar

Comandos do front-end: `npm start`, `npm run android`, `npm run ios`,
`npm run web`, `npm run typecheck` e `npm test`. No Windows, testar iOS pode
exigir abrir o projeto no aparelho por um fluxo compatível, em vez de simulador.

Há dez testes do controlador de diálogos. Anteriormente passaram TypeScript,
esses testes e exportação dos bundles JS para Android, iOS e web. Isso não
equivale a validar aparência e gestos em aparelhos reais.

Na validação da API de 08/10/2026 passaram 83 testes selecionados, incluindo
PostgreSQL real, Flyway, duplicidade, reutilização, normalização, concorrência
forçada com respostas 201/409 e preservação de registros na falha da migration.
O teste de contexto completo `ComandavisionApiApplicationTests` foi excluído
para não inicializar migrations contra o Supabase.

`ComandaAberturaPostgresTest` exige PostgreSQL local descartável chamado
`comandavision_test` e variáveis `COMANDAVISION_TEST_DB_*`. Ele recria o schema
nesse banco. Leia o guia da API antes de executar; não aponte testes destrutivos
ao banco em uso. Os resultados acima são históricos: rode verificações
apropriadas às novas mudanças e informe o que realmente executou.

Antes de continuar, confirme aplicação da V8, versão da API publicada e o que
já foi testado no Android/iPhone. Há notas de teste de sessão expirada e dos
diálogos pendente em aparelho; não transforme essas pendências em fatos atuais
sem verificar comigo ou com evidências.

Minhas preferências:

- Código, interface, explicações e mensagens de commit em português.
- Commits no formato `feat:`, `fix:`, `test:`, `docs:` ou `chore:`.
- Prefira componentes/dependências existentes e alterações focadas na tarefa.
- Preserve regras financeiras, autenticação, permissões e contratos da API.
- Mudanças no schema vão em NOVAS migrations; não edite migrations aplicadas.
- Registre decisões relevantes nas notas do projeto.
- Diferencie o que está implementado, testado, publicado e ainda pendente.
- Ao terminar uma implementação, informe arquivos alterados, testes executados,
  limitações e passos necessários de atualização da API/banco/aplicativo.

Comece analisando os dois projetos e apresente seu entendimento da arquitetura,
dos fluxos e dos pontos de atenção, citando os arquivos que sustentam suas
conclusões. Depois, use esse contexto para executar as tarefas que eu solicitar.
Não faça uma reformulação geral nem altere regras de negócio sem uma tarefa
definida. Se houver divergência entre este texto e o código, explique a diferença.
