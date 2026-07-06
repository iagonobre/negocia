# Evolução do Framework — Após Reunião com o Professor

Este documento resume todas as mudanças realizadas no código desde a última reunião de orientação. O foco foi evoluir a estrutura de framework iniciada na fase anterior, eliminando duplicação entre instâncias e consolidando os pontos fixos no core.

---

## 1. Novo módulo: `ConversationService` (core)

**Arquivo:** `src/core/conversation/conversation.service.ts`

Criamos uma classe abstrata que centraliza todo o fluxo de conversação via WhatsApp + IA. Antes, cada instância (Negocia, Saude, Oficina) repetia a mesma lógica de: buscar sessão pendente, criar nova sessão, chamar o LLM, persistir histórico, e responder.

Agora esse fluxo vive uma única vez no framework. As instâncias apenas declaram os métodos abstratos específicos do seu domínio:

- `findClienteByTelefone()` — como localizar o cliente pelo número de telefone
- `findSessaoPendente()` — como verificar se já existe uma sessão ativa
- `carregarEntidadeComConfig()` — como carregar a entidade principal com sua configuração
- `persistirSessao()` — como salvar uma nova sessão no banco
- `getSessao()` — como recuperar uma sessão existente
- `getLimitesDaSessao()` — quais limites valem para a sessão (ex: desconto máximo)
- `getContextProvider()` — qual provider de contexto usar para montar o prompt da IA
- `atualizarHistorico()` — como persistir o histórico atualizado após cada troca

Os métodos concretos `findOuCriarSessao()`, `responder()`, `criarSessao()`, `iniciarEEnviar()` e `conversar()` são implementados uma vez no core e herdados por todas as instâncias.

---

## 2. `CrudService<T>` — template methods de importação e histórico

**Arquivo:** `src/core/crud/crud.service.ts`

Adicionamos dois template methods ao framework que antes estavam duplicados na instância Negocia:

**`importarCsv()`** — lê e parseia um arquivo CSV, chama `parseCsvRow()` e `upsertMany()` que cada instância implementa conforme seu modelo de dados. A lógica de streaming e tratamento de erros é única no framework.

**`historico()`** — busca um registro com seu histórico completo via `findComHistorico()`, que a instância implementa. O controle de "não encontrado" fica no framework.

Com isso, qualquer nova instância que precisar de importação CSV ou consulta de histórico herda essas funcionalidades sem reescrever uma linha de infraestrutura.

---

## 3. `NotificationCronService` — property injection e `executarCron()`

**Arquivo:** `src/core/notification/notification-cron.service.ts`

Dois problemas foram corrigidos:

O `NotificationEngine` era passado como parâmetro de construtor, forçando cada subclasse a recebê-lo e repassar via `super(notificationEngine)`. Isso criava acoplamento visível nas instâncias. Substituímos por `@Inject(NotificationEngine)` diretamente na classe abstrata — o NestJS injeta automaticamente, e as subclasses não precisam mencionar o engine em momento algum.

Adicionamos o método concreto `executarCron()`, que antes era duplicado em cada serviço de notificação. As instâncias agora delegam para `await this.executarCron()` dentro do seu `@Cron`.

---

## 4. `PropostaService` — de `implements` para `extends ConversationService`

**Arquivo:** `src/instances/negocia/proposta/proposta.service.ts`

Antes, `PropostaService` implementava a interface `ConversationOrchestrator` diretamente, com todo o fluxo de criação de sessão e conversação escrito dentro do próprio serviço. A lógica era idêntica à de `ConsultaService` e `AgendamentoService`.

Agora `PropostaService extends ConversationService` e implementa apenas o que é exclusivo do domínio de cobrança: como encontrar a proposta pendente, como carregar devedor + faixa de critério, como persistir a proposta com os limites corretos. O fluxo de orquestração vem do framework.

---

## 5. `ConsultaService` e `AgendamentoService` — mesma migração

**Arquivos:** `src/instances/saude/consulta/consulta.service.ts`, `src/instances/oficina/agendamento/agendamento.service.ts`

Ambos seguiram o mesmo padrão de `PropostaService`. Cada serviço elimininou ~40 linhas de lógica de orquestração que era cópia do outro, e passou a implementar apenas os abstratos do seu domínio (paciente + configRetorno para Saude, cliente + servicoConfig para Oficina).

---

## 6. `CobrancaService`, `NotificacaoSaudeService`, `NotificacaoOficinaService` — construtores limpos

**Arquivos:** `src/instances/negocia/cobranca/cobranca.service.ts`, `src/instances/saude/notificacao/notificacao-saude.service.ts`, `src/instances/oficina/notificacao/notificacao-oficina.service.ts`

Os três serviços de notificação precisavam receber `NotificationEngine` no construtor para repassar ao `super()`. Com a mudança para property injection no `NotificationCronService`, isso foi eliminado. Cada serviço passa a ter apenas as suas próprias dependências de domínio.

O método `@Cron` de cada serviço, que antes orquestrava manualmente (chamando `this.notificationEngine.enviarNotificacoes(this)` e logando), agora simplesmente chama `await this.executarCron()`.

---

## 7. Repositories de notificação extraídos

**Arquivos:** `src/instances/saude/notificacao/notificacao-saude.repository.ts`, `src/instances/oficina/notificacao/notificacao-oficina.repository.ts`

`NotificacaoSaudeService` e `NotificacaoOficinaService` acessavam o Prisma diretamente. As queries foram movidas para repositories próprios, separando responsabilidade de acesso a dados da lógica de domínio. Os services passam a depender do repository, não do Prisma.

---

## 8. `DevedorService` — migração para `CrudService<Devedor>`

**Arquivo:** `src/instances/negocia/devedor/devedor.service.ts`

O `DevedorService` tinha métodos com nomes próprios (`cadastrar`, `listar`, `buscar`, `atualizar`, `deletar`) que não seguiam o contrato do framework. Migrou-se para `extends CrudService<Devedor>` com a assinatura padronizada (`findAll`, `findById`, `create`, `update`, `remove`).

A lógica de importação CSV (`parseCsvRow`, `upsertMany`, `findComHistorico`) foi mantida no `DevedorService` mas agora é chamada pelos template methods do `CrudService`, não mais duplicada nele.

---

## 9. `FaixaCriterioService` — eliminação de métodos duplicados

**Arquivo:** `src/instances/negocia/faixa-criterio/faixa-criterio.service.ts`

O serviço tinha dois conjuntos de métodos para a mesma operação: um seguindo o contrato do framework (`findAll`, `findById`, `update`, `remove`) e outro com nomes próprios (`listarPorEmpresa`, `buscar`, `atualizar`, `deletar`). Os métodos do contrato simplesmente delegavam para os de nome próprio.

Todos os métodos com nome próprio foram eliminados. O contrato do framework é agora a única interface.

---

## 10. `DevedorController` — migração para `CrudController<Devedor>()`

**Arquivo:** `src/instances/negocia/devedor/devedor.controller.ts`

O controller tinha 5 endpoints CRUD escritos manualmente (listar, buscar, cadastrar, atualizar, deletar). Com o mixin `CrudController<Devedor>()`, esses endpoints são herdados automaticamente. O controller mantém apenas os dois endpoints específicos do devedor: `historico()` e `importar()`.

---

## 11. `NegociaContextProvider` — correção de bug em `validateTool`

**Arquivo:** `src/instances/negocia/negocia-context.provider.ts`

O método `validateTool` recebia o parâmetro `toolName` mas o ignorava, aplicando sempre a mesma validação independente da ferramenta chamada. Corrigido com despacho por nome: cada ferramenta é roteada para seu método validador privado. A lógica de `validarContraproposta` foi extraída como método privado separado.

---

## 12. Diagramas de classes do framework

**Arquivos:** `docs/diagramas/`

Criados diagramas do framework em quatro formatos:

- `classes-framework.drawio` — draw.io com 6 zonas coloridas (HotSpots, Core, Framework, Negocia, Saude, Oficina), 27 classes e 30 arestas com setas UML corretas
- `classes-framework.md` — Mermaid com namespaces e direção top-down
- `classes-framework.puml` — PlantUML com packages coloridos
- `classes-framework.eraser` — Eraser formato ER

Os diagramas mostram: interfaces dos hot spots, classes abstratas do framework, e como cada instância herda e implementa os pontos flexíveis.

---

## O que essas mudanças significam na prática

Todas as alterações listadas acima convergem para dois objetivos centrais de qualidade de software: **eliminar repetição** e **reduzir acoplamento**. Vale entender o que cada um significa neste contexto.

### Eliminar repetição

Antes das mudanças, `PropostaService`, `ConsultaService` e `AgendamentoService` tinham o mesmo código de conversação copiado três vezes. Se precisássemos corrigir um bug ou melhorar o fluxo de resposta do agente de IA, teríamos que lembrar de alterar os três arquivos — e era questão de tempo até um ficar diferente dos outros por esquecimento.

O mesmo valia para os serviços de notificação: os três tinham o mesmo bloco de `@Cron` que chamava o engine, logava o início, logava o resultado. E para importação de CSV, que estava escrita só no `DevedorService` mas seria necessária em qualquer instância que precisasse importar dados.

Ao mover esse código para classes abstratas no framework, a lógica passa a existir em um único lugar. Qualquer instância futura — uma quarta, uma quinta — herda tudo isso sem escrever uma linha. E qualquer correção feita no framework beneficia todas as instâncias ao mesmo tempo.

Isso é o princípio **DRY** (*Don't Repeat Yourself*) aplicado em nível arquitetural: não apenas evitar duplicar funções utilitárias, mas evitar duplicar fluxos inteiros de negócio.

### Reduzir acoplamento

Acoplamento é quando uma classe sabe mais do que precisa sobre outra. O exemplo mais claro era o `NotificationEngine` sendo passado pelo construtor de cada subclasse de `NotificationCronService`. Isso forçava `CobrancaService`, `NotificacaoSaudeService` e `NotificacaoOficinaService` a conhecer e mencionar o engine — que é um detalhe interno do framework, não do domínio da instância.

Com `@Inject` diretamente na classe abstrata, as subclasses deixam de ver o engine. Elas sabem apenas do seu próprio repository. Quem orquestra a chamada ao engine é o framework, internamente.

O mesmo raciocínio se aplica ao `PropostaService`: antes ele chamava `this.negotiationEngine.iniciar(context)` e `this.negotiationEngine.conversar(...)` diretamente. Agora ele não sabe que existe um engine — sabe apenas como carregar o devedor e a faixa de critério. Quem decide chamar o engine e quando é o `ConversationService`.

Menos acoplamento significa que cada classe tem uma razão para existir e uma razão para mudar. Se o engine de IA mudar de API, só o `ConversationService` precisa ser ajustado. As instâncias não são afetadas.

### Por que isso importa para um framework

Um framework que exige que cada nova instância replique lógica de orquestração não é um framework — é uma coleção de exemplos para copiar. A diferença está exatamente nessas mudanças: o framework agora **impõe** o fluxo correto e **convida** a instância apenas a preencher o que é específico do seu domínio.

Adicionar uma quarta instância hoje significa: criar a classe, declarar os abstratos, e o fluxo de conversação, notificação e CRUD já funciona. Isso é o que torna o framework justificável como escolha arquitetural.

---

## Resumo das mudanças estruturais

| Antes | Depois |
|-------|--------|
| `PropostaService implements ConversationOrchestrator` com 80+ linhas de orquestração | `extends ConversationService` com 8 métodos abstratos do domínio |
| `ConsultaService` e `AgendamentoService` com mesma lógica duplicada | Idem — herdam o fluxo do framework |
| `importarCsv()` e `historico()` escritos no `DevedorService` | Template methods no `CrudService<T>` herdados por qualquer instância |
| `NotificationEngine` no construtor de todas as subclasses | `@Inject` direto no `NotificationCronService`; subclasses não o veem |
| `executarCron()` duplicado em `CobrancaService`, `NotificacaoSaudeService`, `NotificacaoOficinaService` | Método concreto único no `NotificationCronService` |
| `DevedorController` com 5 endpoints CRUD manuais | `extends CrudController<Devedor>()` — herda os 5, mantém só 2 específicos |
| `validateTool` ignorava `toolName` | Despacho por nome da ferramenta com validador privado por tool |
| Queries Prisma direto nos services de notificação (Saude, Oficina) | Repositories dedicados para cada service de notificação |
