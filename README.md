# Supri Comandas — aplicativo

Aplicativo móvel do projeto acadêmico ComandaVision para operação e acompanhamento de comandas. O app consome a [API ComandaVision](https://github.com/lucasfdcarvalho/comandavision-api), usa o Supabase para autenticação e oferece experiências diferentes para os papéis `DONO` e `FUNCIONARIO`.

> **Projeto acadêmico:** o ambiente pode conter dados simulados para demonstração. Indicadores e relatórios não devem ser apresentados como vendas reais verificadas.

## Funcionalidades

### Operação diária

- autenticação com sessão armazenada de forma segura no aparelho;
- abertura, consulta, fechamento e cancelamento de comandas;
- inclusão e remoção de itens;
- histórico de comandas;
- registro de pagamentos manuais;
- geração de cobrança Pix por meio da API e do Mercado Pago;
- consulta de comprovantes e correção auditada de registros manuais.

O Pix integrado não é corrigido como um registro manual no app. Uma devolução precisa ser realizada e confirmada no provedor de pagamento antes da atualização correspondente no sistema.

### Acesso por perfil

| Recurso | `DONO` | `FUNCIONARIO` |
| --- | :---: | :---: |
| Comandas, itens e histórico | Sim | Sim |
| Pagamentos e Pix | Sim | Sim |
| Indicadores gerenciais | Sim | Não |
| Relatórios por período e PDF | Sim | Não |
| Cardápio e categorias | Sim | Não |
| Gestão da equipe | Sim | Não |

As restrições visuais não substituem a autorização da API. Rotas gerenciais também são protegidas no servidor.

### Relatórios

O proprietário pode filtrar o histórico por período, consultar os critérios dos indicadores e gerar um PDF compartilhável. A tela trata períodos sem comandas e diferencia histórico indisponível de uma lista realmente vazia. Os totais exibidos são os retornados pela API; percentuais de formas de pagamento distribuem o arredondamento para fechar em `100,0%`.

## Tecnologias

- Expo SDK 57;
- React Native 0.86 e React 19;
- TypeScript;
- React Navigation;
- Supabase JS;
- Expo Print, File System e Sharing para PDF e compartilhamento.

As versões exatas estão em [`package.json`](./package.json).

## Pré-requisitos

- Node.js LTS compatível com o Expo SDK 57;
- npm;
- Expo Go, emulador Android, simulador iOS ou navegador;
- uma instância da API ComandaVision;
- um projeto Supabase configurado para autenticação.

## Configuração

1. Clone o repositório e instale as dependências:

   ```bash
   git clone https://github.com/lucasfdcarvalho/comandavision-app.git
   cd comandavision-app
   npm install
   ```

2. Crie um arquivo `.env` local:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
   EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
   ```

   No emulador Android, `10.0.2.2` aponta para a máquina hospedeira. Em um aparelho físico, use o IP da máquina na rede local ou uma API publicada acessível pelo aparelho.

3. Inicie o projeto:

   ```bash
   npm start
   ```

### Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | URL base da API ComandaVision |
| `EXPO_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável usada pelo cliente Supabase |

Variáveis com prefixo `EXPO_PUBLIC_` são incluídas no bundle e podem ser vistas pelo usuário. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, credenciais do banco ou tokens do Mercado Pago no aplicativo.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm start` | inicia o Metro/Expo |
| `npm run android` | abre o projeto no Android |
| `npm run ios` | abre o projeto no iOS |
| `npm run web` | abre a versão web |
| `npm test` | executa os testes automatizados |
| `npm run typecheck` | valida os tipos TypeScript |

Há scripts disponíveis para Android, iOS e web, mas o comportamento nativo — especialmente impressão e compartilhamento — deve ser validado em cada plataforma usada.

## Estrutura principal

```text
src/
├── components/   # componentes reutilizáveis e componentes do dashboard
├── contexts/     # autenticação e estado compartilhado
├── hooks/        # hooks da aplicação
├── navigation/   # abas, stacks e proteção de telas
├── screens/      # telas por domínio
├── services/     # API, autenticação, relatórios e integrações
├── theme/        # cores e estilos base
├── types/        # tipos TypeScript
└── utils/        # datas, valores, PDF, idempotência e regras auxiliares
```

## Segurança e pagamentos

- tokens de sessão ficam no `expo-secure-store` quando disponível;
- toda autorização definitiva ocorre na API;
- cada intenção nova de pagamento recebe uma chave de idempotência;
- o app não acessa o Mercado Pago diretamente;
- correções manuais exigem motivo e não significam devolução de dinheiro;
- cobranças Pix integradas são reconciliadas pelo servidor.

Não execute testes de pagamento usando credenciais ou contas reais.

## Distribuição

O repositório ainda não possui `eas.json` nem configuração de atualização EAS. O fluxo atual usa Expo CLI/Expo Go. Antes de distribuir um binário em loja, configure identificadores, assinatura, perfis de build, política de atualização e testes específicos de cada plataforma.

