# Apresentação do Framework — Negocia

> Guia de estudo para a apresentação. Cobre: pontos fixos, pontos flexíveis, quem implementa quem, e como substituímos generics pelo padrão mixin do NestJS.

---

## 1. A ideia central: framework com pontos fixos e pontos flexíveis

O projeto foi construído como um **framework orientado a objetos** para sistemas de atendimento via WhatsApp com IA. A premissa é:

- **Pontos fixos** — classes do core que resolvem problemas genéricos (enviar mensagem, chamar IA, disparar notificações). Escritas **uma vez**, nunca alteradas pelas instâncias.
- **Pontos flexíveis** — interfaces e classes abstratas que o framework define, mas **não implementa**. Cada instância de negócio preenche esses pontos com sua lógica específica.

Quando o professor perguntar _"quem chama quem?"_, a resposta sempre segue o mesmo sentido:

```
[Classe Fixa do Core] ──chama──▶ [Interface/Abstrata do Core] ◀──implementa── [Classe da Instância]
```

---

## 2. Os três Engines — classes fixas que chamam interfaces

Estas são as três classes do core que **executam a lógica genérica chamando as interfaces**. Elas nunca sabem qual instância está sendo usada.

---

### 2.1 `WhatsAppWebhookService` → chama `ConversationOrchestrator`

**Arquivo:** `src/core/whatsapp/whatsapp-webhook.service.ts`

```typescript
async handle(telefone, mensagem, orchestrator: ConversationOrchestrator) {
  const cliente = await orchestrator.findClienteByTelefone(telefone); // ← chama interface
  const sessao  = await orchestrator.findOuCriarSessao(cliente.id, cliente.empresaId); // ← chama interface
  return orchestrator.responder(sessao.id, mensagem, cliente.empresaId); // ← chama interface
}
```

**O que o engine não sabe:** se o cliente é um devedor, paciente ou dono de veículo. Ele recebe qualquer objeto que satisfaça `ConversationOrchestrator` e delega.

**Interface chamada — `ConversationOrchestrator`** (`src/core/whatsapp/conversation-orchestrator.interface.ts`):
```typescript
interface ConversationOrchestrator {
  findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null>;
  findOuCriarSessao(clienteId: string, empresaId: string): Promise<{ id: string; mensagemInicial?: string }>;
  responder(sessaoId: string, mensagem: string, empresaId: string): Promise<string>;
}
```

**Quem implementa esta interface:**

| Instância | Classe que implementa | Arquivo |
|---|---|---|
| **negocia** | `PropostaService` | `src/instances/negocia/proposta/proposta.service.ts` |
| **saúde** | `ConsultaService` | `src/instances/saude/consulta/consulta.service.ts` |
| **oficina** | `AgendamentoService` | `src/instances/oficina/agendamento/agendamento.service.ts` |

---

### 2.2 `NegotiationEngine` → chama `NegotiationContextProvider`

**Arquivo:** `src/core/negotiation/negotiation.engine.ts`

```typescript
async iniciar(context: NegotiationContext) {
  // monta historico com context.systemPrompt e context.initialMessage
  // chama LlmService.chamarLLM(historico) → retorna primeira mensagem do agente
}

async conversar(mensagemUsuario, historico, tools, validator) {
  // adiciona mensagem do usuário ao historico
  // chama LlmService.chamarLLM(historico, tools)
  // se agente usou uma tool → chama validator(toolName, args) ← ponto flexível
  // retorna resposta final
}
```

O engine gerencia o **loop de conversa com a IA**, mas não decide:
- Qual é o prompt do sistema (quem é o agente, qual o tom)
- Quais ferramentas (tools) o agente pode usar
- Se o resultado de uma tool está dentro das regras de negócio

Esses três pontos são responsabilidade da instância, via `NegotiationContextProvider`.

**Interface chamada — `NegotiationContextProvider`** (`src/core/negotiation/negotiation-context.interface.ts`):
```typescript
interface NegotiationContextProvider {
  buildContext(client: any, criteria: any): NegotiationContext; // systemPrompt + initialMessage
  getTools(): any[];                                            // ferramentas do agente
  validateTool(toolName, args, limits): { aprovado, motivo };  // regra de negócio da tool
}
```

**Quem implementa esta interface:**

| Instância | Classe que implementa | Persona do agente |
|---|---|---|
| **negocia** | `NegociaContextProvider` | Agente de cobrança, valida se desconto/parcelas estão nos limites |
| **saúde** | `SaudeContextProvider` | Ana, assistente da clínica, valida agendamento de retorno |
| **oficina** | `OficinaContextProvider` | Carlos, assistente da oficina, valida agendamento de revisão |

---

### 2.3 `NotificationEngine` → chama `NotificationSchedulerProvider`

**Arquivo:** `src/core/notification/notification.engine.ts`

```typescript
async enviarNotificacoes(provider: NotificationSchedulerProvider) {
  const empresas = await provider.getEmpresasAtivas();     // ← chama interface
  for (const empresaId of empresas) {
    const clientes = await provider.getClientesPendentes(empresaId); // ← chama interface
    for (const cliente of clientes) {
      const mensagem = provider.buildMessage(cliente);     // ← chama interface
      await this.whatsAppService.enviarMensagem(cliente.telefone, mensagem);
    }
  }
}
```

O engine não sabe o que é um "cliente pendente" nem como montar a mensagem. Cada instância define isso.

**Interface chamada — `NotificationSchedulerProvider`** (`src/core/notification/notification-scheduler.interface.ts`):
```typescript
interface NotificationSchedulerProvider {
  getEmpresasAtivas(): Promise<string[]>;
  getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  buildMessage(cliente: any): string;
}
```

**Quem implementa esta interface** (via classe abstrata `NotificationCronService`):

| Instância | Classe que implementa | Cron | Critério de "pendente" |
|---|---|---|---|
| **negocia** | `CobrancaService` | 1º dia do mês às 9h | Proposta ACEITA e parcelada |
| **saúde** | `NotificacaoSaudeService` | Seg/Qua/Sex às 8h | Paciente com status `RETORNO_PENDENTE` |
| **oficina** | `NotificacaoOficinaService` | Ter/Qui às 10h | Cliente com status `REVISAO_PENDENTE` |

---

## 3. As classes abstratas — herança com implementação parcial

Além das interfaces puras, o framework tem duas **classes abstratas** que já implementam a lógica comum e exigem que as subclasses completem apenas o que é variável.

---

### 3.1 `CrudService<T>` — abstrata genérica

**Arquivo:** `src/core/crud/crud.service.ts`

```typescript
export abstract class CrudService<T> {
  abstract findAll(empresaId: string): Promise<T[]>;
  abstract findById(id: string, empresaId: string): Promise<T | null>;
  abstract create(dto: any, empresaId: string): Promise<T>;
  abstract update(id: string, dto: any, empresaId: string): Promise<T>;
  abstract remove(id: string, empresaId: string): Promise<void>;
}
```

Não tem nenhuma implementação — é um **contrato tipado**. Garante que qualquer serviço de CRUD terá exatamente os mesmos cinco métodos com as mesmas assinaturas, permitindo que o `CrudController` (mixin) os chame sem saber qual entidade está manipulando.

**Quem estende `CrudService<T>`:**

| Instância | Classe | T (entidade) |
|---|---|---|
| **negocia** | `FaixaCriterioService` | `FaixaCriterio` |
| **saúde** | `PacienteService` | `Paciente` |
| **saúde** | `ConfigRetornoService` | `ConfigRetorno` |
| **oficina** | `ClienteOficinaService` | `ClienteOficina` |
| **oficina** | `ServicoConfigService` | `ServicoConfig` |

---

### 3.2 `NotificationCronService` — abstrata com implementação parcial

**Arquivo:** `src/core/notification/notification-cron.service.ts`

```typescript
export abstract class NotificationCronService implements NotificationSchedulerProvider {
  protected readonly logger = new Logger(this.constructor.name); // ← já implementado no core

  constructor(protected readonly notificationEngine: NotificationEngine) {}

  // Os 3 métodos variáveis — cada instância implementa
  abstract getEmpresasAtivas(): Promise<string[]>;
  abstract getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  abstract buildMessage(cliente: any): string;

  // Já implementado no core — nenhuma instância precisa repetir
  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const enviados = await this.notificationEngine.enviarNotificacoesParaEmpresa(empresaId, this);
    return { enviados };
  }
}
```

**O que é fixo (herdado):** o método `dispararLembretesManual` e o `logger`.  
**O que é variável (abstrato):** os 3 métodos que definem quem são os clientes e como é a mensagem.

**Quem estende `NotificationCronService`:**

| Instância | Classe |
|---|---|
| **negocia** | `CobrancaService` |
| **saúde** | `NotificacaoSaudeService` |
| **oficina** | `NotificacaoOficinaService` |

---

## 4. Os Mixins de Controller — a resposta do framework ao problema dos generics

### O problema com generics em controllers NestJS

Em Java ou C# seria natural fazer:

```java
// Java — funciona porque anotações são processadas em runtime via reflection
public class CrudController<T> {
  @GetMapping
  public List<T> findAll() { ... }
}
```

Em TypeScript/NestJS **isso não funciona diretamente** porque:
1. TypeScript usa **type erasure** — os tipos genéricos existem apenas em tempo de compilação, desaparecem no JavaScript gerado.
2. Os decoradores do NestJS (`@Get()`, `@Post()`, `@Body()`, etc.) precisam registrar metadados na **classe concreta** em runtime.
3. Uma classe genérica anônima `CrudController<FaixaCriterio>` não tem identidade de classe em runtime — o NestJS não consegue registrar as rotas nela.

### A solução: Mixin Factory (função que retorna uma classe)

O padrão adotado é uma **função que cria e retorna uma classe** em tempo de execução, já com os decoradores aplicados. Cada chamada à função gera uma nova classe concreta distinta:

```typescript
// src/core/crud/crud.controller.ts
export function CrudController<T>() {       // ← função, não classe
  class MixinController {                   // ← classe criada dentro da função
    readonly service: CrudService<T>;

    @Get()
    findAll(@Empresa() empresa: JwtPayload) {
      return this.service.findAll(empresa.sub);
    }

    @Get(':id')
    async findById(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
      const result = await this.service.findById(id, empresa.sub);
      if (!result) throw new NotFoundException('Registro não encontrado.');
      return result;
    }

    @Post()
    create(@Body() dto: any, @Empresa() empresa: JwtPayload) {
      return this.service.create(dto, empresa.sub);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any, @Empresa() empresa: JwtPayload) {
      return this.service.update(id, dto, empresa.sub);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
      return this.service.remove(id, empresa.sub);
    }
  }

  return mixin(MixinController); // ← mixin() do NestJS: dá identidade estável à classe
}
```

**Como a instância usa:**
```typescript
// src/instances/saude/paciente/paciente.controller.ts — 6 linhas!
@ApiTags('Saúde — Paciente')
@Controller('paciente')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PacienteController extends CrudController<Paciente>() { // ← chama a função
  constructor(readonly service: PacienteService) { super(); }
}
```

### Por que `mixin()` e não apenas `return MixinController`?

A função `mixin()` do `@nestjs/common` faz uma coisa específica: **congela o protótipo da classe anônima**, garantindo que ela tenha uma identidade estável no sistema de injeção de dependências do NestJS. Sem isso, duas chamadas a `CrudController<T>()` retornariam classes que o NestJS trataria como a mesma — causando conflito de rotas. Com `mixin()`, cada chamada gera uma classe com identidade própria.

### Os três mixins do framework

| Mixin | Arquivo | O que entrega |
|---|---|---|
| `CrudController<T>()` | `src/core/crud/crud.controller.ts` | GET, POST, PATCH/:id, DELETE/:id, GET/:id com auth multi-tenant |
| `WhatsAppWebhookController()` | `src/core/whatsapp/whatsapp-webhook.controller.ts` | `POST /webhook` — recebe mensagem do Twilio e delega ao orquestrador |
| `NotificationCronController()` | `src/core/notification/notification-cron.controller.ts` | `POST /lembretes/manual` com autenticação JWT |

### Restrição importante do TypeScript com mixins (TS4094)

Propriedades de uma **classe anônima exportada** não podem ser `private` nem `protected`. Isso porque TypeScript não consegue garantir a estrutura da classe anonima ao exportá-la. A solução adotada foi usar `readonly` (público) no lugar de `private readonly`:

```typescript
// ❌ Erro TS4094 — não pode ser private em classe anônima exportada
private readonly logger = new Logger(this.constructor.name);

// ✅ Solução adotada
readonly logger = new Logger(this.constructor.name);
```

---

## 5. Mapa completo: quem implementa quem

### Interfaces e o que cada instância implementa

```
ConversationOrchestrator (interface — core)
│
├── PropostaService      (negocia) — devedor, faixa de critério, proposta de acordo
├── ConsultaService      (saúde)   — paciente, configuração de retorno, consulta
└── AgendamentoService   (oficina) — cliente, serviço config, agendamento de revisão


NegotiationContextProvider (interface — core)
│
├── NegociaContextProvider  (negocia) — prompt de cobrança, tool: validar_contraproposta
├── SaudeContextProvider    (saúde)   — prompt de agendamento clínico, tool: confirmar_horario
└── OficinaContextProvider  (oficina) — prompt de revisão veicular, tool: confirmar_agendamento


NotificationSchedulerProvider (interface — core)
│                           ↑ implementada via NotificationCronService (abstract)
├── CobrancaService          (negocia) — propostas aceitas parceladas, cron 1º/mês 9h
├── NotificacaoSaudeService  (saúde)   — pacientes com RETORNO_PENDENTE, cron seg/qua/sex 8h
└── NotificacaoOficinaService(oficina) — clientes com REVISAO_PENDENTE, cron ter/qui 10h


CrudService<T> (abstract class — core)
│
├── FaixaCriterioService  (negocia) extends CrudService<FaixaCriterio>
├── PacienteService       (saúde)   extends CrudService<Paciente>
├── ConfigRetornoService  (saúde)   extends CrudService<ConfigRetorno>
├── ClienteOficinaService (oficina) extends CrudService<ClienteOficina>
└── ServicoConfigService  (oficina) extends CrudService<ServicoConfig>
```

### Controllers e de onde herdam

```
CrudController<T>() (mixin — core)
│
├── FaixaCriterioController  (negocia) extends CrudController<FaixaCriterio>()
├── PacienteController       (saúde)   extends CrudController<Paciente>()
├── ConfigRetornoController  (saúde)   extends CrudController<ConfigRetorno>()
├── ClienteOficinaController (oficina) extends CrudController<ClienteOficina>()
└── ServicoConfigController  (oficina) extends CrudController<ServicoConfig>()


WhatsAppWebhookController() (mixin — core)
│
├── WhatsAppController      (negocia) — herda webhook + adiciona POST /iniciar/:devedorId
├── WhatsAppSaudeController  (saúde)   — apenas herda o webhook (sem endpoints extras)
└── WhatsAppOficinaController(oficina) — apenas herda o webhook (sem endpoints extras)


NotificationCronController() (mixin — core)
│
├── CobrancaController           (negocia) — apenas herda POST /lembretes/manual
├── NotificacaoSaudeController   (saúde)   — apenas herda POST /lembretes/manual
└── NotificacaoOficinaController (oficina) — apenas herda POST /lembretes/manual
```

---

## 6. Perguntas que o professor pode fazer — e as respostas

**"Mostre uma classe fixa que chama um ponto flexível."**

> `WhatsAppWebhookService.handle()` — recebe `orchestrator: ConversationOrchestrator` como parâmetro e chama `orchestrator.findClienteByTelefone()`, `orchestrator.findOuCriarSessao()` e `orchestrator.responder()`. A classe não sabe se o orquestrador é `PropostaService`, `ConsultaService` ou `AgendamentoService`.

**"Onde estão os pontos flexíveis?"**

> São as interfaces e classes abstratas no `src/core/`:
> - `ConversationOrchestrator` (interface)
> - `NegotiationContextProvider` (interface)
> - `NotificationSchedulerProvider` (interface)
> - `CrudService<T>` (abstract class)
> - `NotificationCronService` (abstract class que já implementa `dispararLembretesManual`)

**"Quem implementa `ConversationOrchestrator`?"**

> Três classes, uma por instância: `PropostaService` (negocia), `ConsultaService` (saúde) e `AgendamentoService` (oficina). Todas declaram `implements ConversationOrchestrator` e implementam os três métodos: `findClienteByTelefone`, `findOuCriarSessao` e `responder`.

**"Vocês usaram generics? Como?"**

> Sim, mas com uma adaptação necessária para NestJS. Em vez de uma classe genérica estática (`class CrudController<T>`), usamos uma **função genérica que retorna uma classe** — o padrão Mixin Factory. `CrudController<T>()` é uma função chamada com o tipo concreto (`CrudController<Paciente>()`), que cria e retorna uma classe com os decoradores de rota já registrados. Isso resolve o problema do type erasure do TypeScript: os tipos genéricos somem em runtime, então os decoradores precisam estar em uma classe concreta. O `mixin()` do NestJS garante que cada classe gerada tenha identidade única no sistema de injeção de dependências.

**"O que acontece quando chega uma mensagem no webhook?"**

> 1. Twilio envia `POST /whatsapp/webhook` (ou `/whatsapp-saude/webhook`, `/whatsapp-oficina/webhook`).
> 2. O controller herda `WhatsAppWebhookController()` — o handler `webhook()` já está lá.
> 3. O handler chama `WhatsAppWebhookService.handle(telefone, mensagem, this.orchestrator)`.
> 4. `WhatsAppWebhookService` chama `orchestrator.findClienteByTelefone(telefone)` — ponto flexível.
> 5. Se encontrou o cliente, chama `orchestrator.findOuCriarSessao(clienteId, empresaId)` — ponto flexível.
> 6. Se é uma sessão nova, retorna a `mensagemInicial` sem chamar a IA (já foi gerada no `iniciar`).
> 7. Se é sessão existente, chama `orchestrator.responder(sessaoId, mensagem, empresaId)` — que delega ao `NegotiationEngine` chamando a IA.
> 8. A resposta da IA é enviada via `WhatsAppService.enviarMensagem()`.

**"Por que `NotificationCronService` é abstrata e não uma interface?"**

> Porque ela já tem uma implementação concreta que todas as instâncias compartilham: o método `dispararLembretesManual` é idêntico em todas as instâncias e por isso foi movido para o core como implementação fixa. Se fosse interface, cada instância teria que repetir esse código. A classe abstrata resolve: os 3 métodos variáveis (`getEmpresasAtivas`, `getClientesPendentes`, `buildMessage`) são `abstract` e as subclasses implementam; o método fixo já vem pronto.

---

## 7. Estrutura de pastas resumida

```
src/
├── core/                          ← FRAMEWORK (pontos fixos + pontos flexíveis)
│   ├── auth/                      ← fixo: JWT, AuthGuard, @Empresa() decorator
│   ├── empresa/                   ← fixo: cadastro e perfil de empresa
│   ├── prisma/                    ← fixo: PrismaService @Global
│   ├── llm/                       ← fixo: LlmService (chama API Claude)
│   ├── negotiation/
│   │   ├── negotiation.engine.ts              ← FIXO — chama NegotiationContextProvider
│   │   └── negotiation-context.interface.ts   ← PONTO FLEXÍVEL (interface)
│   ├── notification/
│   │   ├── notification.engine.ts             ← FIXO — chama NotificationSchedulerProvider
│   │   ├── notification-scheduler.interface.ts← PONTO FLEXÍVEL (interface)
│   │   ├── notification-cron.service.ts       ← PONTO FLEXÍVEL (abstract class)
│   │   └── notification-cron.controller.ts    ← FIXO (mixin de controller)
│   ├── whatsapp/
│   │   ├── whatsapp.service.ts                ← FIXO — envia mensagem via Twilio
│   │   ├── whatsapp-webhook.service.ts        ← FIXO — chama ConversationOrchestrator
│   │   ├── whatsapp-webhook.controller.ts     ← FIXO (mixin de controller)
│   │   └── conversation-orchestrator.interface.ts ← PONTO FLEXÍVEL (interface)
│   └── crud/
│       ├── crud.service.ts        ← PONTO FLEXÍVEL (abstract class)
│       └── crud.controller.ts     ← FIXO (mixin de controller)
│
└── instances/
    ├── negocia/                   ← instância: cobrança de dívidas via WhatsApp
    │   ├── proposta/proposta.service.ts         ← implements ConversationOrchestrator
    │   ├── negocia-context.provider.ts          ← implements NegotiationContextProvider
    │   ├── cobranca/cobranca.service.ts         ← extends NotificationCronService
    │   ├── cobranca/cobranca.controller.ts      ← extends NotificationCronController()
    │   ├── faixa-criterio/faixa-criterio.service.ts  ← extends CrudService<FaixaCriterio>
    │   ├── faixa-criterio/faixa-criterio.controller.ts ← extends CrudController<FaixaCriterio>()
    │   └── whatsapp/whatsapp.controller.ts      ← extends WhatsAppWebhookController()
    │
    ├── saude/                     ← instância: agendamento de retorno clínico
    │   ├── consulta/consulta.service.ts         ← implements ConversationOrchestrator
    │   ├── saude-context.provider.ts            ← implements NegotiationContextProvider
    │   ├── notificacao/notificacao-saude.service.ts  ← extends NotificationCronService
    │   ├── notificacao/notificacao-saude.controller.ts ← extends NotificationCronController()
    │   ├── paciente/paciente.service.ts         ← extends CrudService<Paciente>
    │   ├── paciente/paciente.controller.ts      ← extends CrudController<Paciente>()
    │   ├── config-retorno/config-retorno.service.ts ← extends CrudService<ConfigRetorno>
    │   ├── config-retorno/config-retorno.controller.ts ← extends CrudController<ConfigRetorno>()
    │   └── whatsapp/whatsapp-saude.controller.ts ← extends WhatsAppWebhookController()
    │
    └── oficina/                   ← instância: agendamento de revisão veicular
        ├── agendamento/agendamento.service.ts   ← implements ConversationOrchestrator
        ├── oficina-context.provider.ts          ← implements NegotiationContextProvider
        ├── notificacao/notificacao-oficina.service.ts ← extends NotificationCronService
        ├── notificacao/notificacao-oficina.controller.ts ← extends NotificationCronController()
        ├── cliente-oficina/cliente-oficina.service.ts ← extends CrudService<ClienteOficina>
        ├── cliente-oficina/cliente-oficina.controller.ts ← extends CrudController<ClienteOficina>()
        ├── servico-config/servico-config.service.ts ← extends CrudService<ServicoConfig>
        ├── servico-config/servico-config.controller.ts ← extends CrudController<ServicoConfig>()
        └── whatsapp/whatsapp-oficina.controller.ts ← extends WhatsAppWebhookController()
```
