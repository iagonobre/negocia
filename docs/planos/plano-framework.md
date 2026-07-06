# Negocia Framework — Plano de Adaptação

---

## Arquitetura obrigatória do framework

> **Requisito do avaliador:** apresentar as classes do projeto mostrando sobretudo **classes do framework (pontos fixos) que chamam os pontos flexíveis (classes abstratas ou interfaces)** e **classes que implementam os pontos flexíveis (subclasses ou classes que instanciam o framework)**.

### Pontos fixos — classes do framework que chamam as interfaces

| Classe fixa (framework) | Arquivo | Interface que chama | Método chamado |
|------------------------|---------|---------------------|---------------|
| `WhatsAppWebhookService` | `src/core/whatsapp/whatsapp-webhook.service.ts` | `ConversationOrchestrator` | `findClienteByTelefone()`, `findOuCriarSessao()`, `responder()` |
| `NegotiationEngine` | `src/core/negotiation/negotiation.engine.ts` | `NegotiationContextProvider` | `buildContext()`, `getTools()`, `validateTool()` |
| `NotificationEngine` | `src/core/notification/notification.engine.ts` | `NotificationSchedulerProvider` | `getEmpresasAtivas()`, `getClientesPendentes()`, `buildMessage()` |

### Pontos flexíveis — interfaces e classes abstratas do core

| Interface / Abstrata | Arquivo | Ponto variável que cobre |
|---------------------|---------|--------------------------|
| `ConversationOrchestrator` (interface) | `src/core/whatsapp/conversation-orchestrator.interface.ts` | Informações de clientes e sessões de conversa |
| `NegotiationContextProvider` (interface) | `src/core/negotiation/negotiation-context.interface.ts` | Temática da negociação (`buildContext`) + decisão final do agente (`validateTool`) |
| `NotificationSchedulerProvider` (interface) | `src/core/notification/notification-scheduler.interface.ts` | Frequência e cronologia de notificações |
| `CrudService<T>` (abstract class) | `src/core/crud/crud.service.ts` | Contrato de CRUD para entidades de cada instância |

### Classes que implementam os pontos flexíveis — instâncias do framework

| Instância | Implementa `ConversationOrchestrator` | Implementa `NegotiationContextProvider` | Implementa `NotificationSchedulerProvider` | Estende `CrudService<T>` |
|-----------|--------------------------------------|-----------------------------------------|--------------------------------------------|--------------------------|
| **negocia** | `PropostaService` | `NegociaContextProvider` | `CobrancaService` | `DevedorService`, `FaixaCriterioService` |
| **saude** | `ConsultaService` | `SaudeContextProvider` | `NotificacaoSaudeService` | `PacienteService`, `ConfigRetornoService` |
| **oficina** | `AgendamentoService` | `OficinaContextProvider` | `NotificacaoOficinaService` | `ClienteOficinaService`, `ServicoConfigService` |

---

## Contexto

O NegocIA (Fase 01) foi construído como uma aplicação específica de cobrança de dívidas via WhatsApp com IA. O objetivo agora é restruturar o mesmo codebase como um **framework**, onde:

- **Pontos fixos** (implementados uma vez, reusados por todas as instâncias): auth, gestão de empresa, infraestrutura WhatsApp, motor de conversação com IA, agendamento de notificações
- **Pontos variáveis** (cada instância configura à sua maneira): dados do cliente, contexto e persona do agente de IA, lógica de decisão das tools, frequência e mensagem de notificação

A aplicação atual de cobrança de dívidas se torna a **instância demo** do framework, provando que os pontos variáveis funcionam de ponta a ponta.

---

## Estrutura-alvo

```
src/
├── core/                                   # Framework: módulos fixos, reusáveis
│   ├── config/                             # ← src/config/ (sem alterações)
│   ├── prisma/                             # ← src/prisma/ (sem alterações)
│   ├── auth/                               # ← src/auth/ (sem alterações)
│   ├── empresa/                            # ← src/empresa/ (sem alterações)
│   ├── llm/                                # ← src/llm/ (sem alterações)
│   ├── whatsapp/                           # ← src/whatsapp/whatsapp.service.ts + module
│   │   ├── whatsapp.service.ts             #   (controller vai para a instância)
│   │   └── whatsapp.module.ts
│   ├── negotiation/                        # NOVO — motor genérico de negociação
│   │   ├── negotiation-context.interface.ts
│   │   ├── negotiation.engine.ts
│   │   └── negotiation.module.ts
│   └── core.module.ts                      # NOVO — agrega todos os módulos core
│
├── instances/
│   └── negocia/                            # Instância demo: cobrança de dívidas
│       ├── devedor/                        # ← src/devedor/ (sem alterações)
│       ├── faixa-criterio/                 # ← src/faixa-criterio/ (sem alterações)
│       ├── proposta/                       # ← src/proposta/ (service refatorado)
│       ├── cobranca/                       # ← src/cobranca/ (sem alterações)
│       ├── whatsapp/                       # ← src/whatsapp/whatsapp.controller.ts
│       ├── exceptions/                     # ← src/exceptions/ (sem alterações)
│       ├── negocia-context.provider.ts     # NOVO — implementa NegotiationContextProvider
│       └── negocia.module.ts               # NOVO — agrega todos os módulos da instância
│
├── app.module.ts                           # MODIFICAR — importa CoreModule + NegociaModule
└── main.ts                                 # Sem alterações
```

---

## O motor de negociação (ponto central do framework)

Esta é a parte mais importante do plano. O `PropostaService` atual mistura lógica genérica (loop de conversa com a LLM) com lógica específica de cobrança (carregar devedor/faixa, gerar prompt com "Sofia", validar contraproposta com regras de desconto). O framework separa os dois.

### Interface do contrato de extensão

```typescript
// src/core/negotiation/negotiation-context.interface.ts

export interface NegotiationContext {
  systemPrompt: string;    // quem é o agente, qual o contexto da instância
  initialMessage: string;  // instrução de como iniciar a conversa
}

export interface NegotiationContextProvider {
  // Chamado UMA vez ao iniciar uma negociação — instância carrega seus dados e monta o contexto
  buildContext(client: any, criteria: any): NegotiationContext;

  // Lista de tools que o agente pode chamar durante a conversa
  getTools(): any[];

  // Lógica de validação quando o agente chama uma tool
  // limits vem do JSON salvo na proposta — a instância sabe o que contém
  validateTool(
    toolName: string,
    args: Record<string, any>,
    limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string };
}
```

### O NegotiationEngine (core)

```typescript
// src/core/negotiation/negotiation.engine.ts
// Injeta apenas LlmService — zero conhecimento de Devedor, Proposta ou FaixaCriterio

async iniciar(context: NegotiationContext): Promise<{
  historico: any[];
  mensagemAgente: string;
}>

async conversar(
  mensagemUsuario: string,
  historico: any[],
  tools: any[],
  validator: (toolName: string, args: Record<string, any>) => { aprovado: boolean; motivo: string },
): Promise<{
  historico: any[];
  mensagemAgente: string;
}>
```

**O que `iniciar()` faz (extraído do `PropostaService.gerarProposta` atual):**
1. Monta `historicoInicial = [{ role: 'system', content: systemPrompt }, { role: 'user', content: initialMessage }]`
2. Chama `LlmService.chamarLLM(historicoInicial)` — sem tools
3. Faz push da resposta no historico
4. Retorna `{ historico, mensagemAgente: resposta.content }`

**O que `conversar()` faz (extraído do `PropostaService.conversar` + `processarToolCall` atuais):**
1. Faz push de `{ role: 'user', content: mensagemUsuario }` no historico
2. Chama `LlmService.chamarLLM(historico, tools)`
3. Se retornar `tool_calls`:
   - Faz push da resposta do agente
   - Parseia os argumentos da tool
   - Chama `validator(toolName, args)` — a instância decide o resultado
   - Faz push da mensagem `{ role: 'tool', tool_call_id, name, content: JSON.stringify(resultado) }`
   - Chama `LlmService.chamarLLM(historico)` novamente
4. Faz push da resposta final
5. Retorna `{ historico, mensagemAgente: respostaFinal.content }`

### O que o PropostaService (instância) faz

O `PropostaService` deixa de ter lógica de conversa e vira um **orquestrador de domínio**:

**`gerarProposta(devedorId, empresaId)`:**
```
1. PropostaRepository.findPendentePorDevedor(devedorId)  → lança NegociacaoEmAndamentoException
2. PropostaRepository.findDevedorComFaixa(devedorId, empresaId) → lança exceções se não encontrado
3. Monta limites = { valorOriginal, descontoMaximo, parcelasMaximas, prazoMaximoDias }
4. NegociaContextProvider.buildContext(devedor, faixa) → { systemPrompt, initialMessage }
5. NegotiationEngine.iniciar(context) → { historico, mensagemAgente }
6. PropostaRepository.create(devedorId, empresaId, limites, historico)
7. Retorna { id, status, ultimaMensagemAgente }
```

**`conversar(propostaId, empresaId, mensagemUsuario)`:**
```
1. PropostaRepository.findById(propostaId, empresaId)  → lança se não encontrado
2. Verifica proposta.status === 'PENDENTE'  → lança PropostaJaFinalizadaException
3. Extrai historico e limites da proposta
4. Monta validator = (toolName, args) =>
     NegociaContextProvider.validateTool(toolName, args, limites)
5. NegotiationEngine.conversar(mensagemUsuario, historico, provider.getTools(), validator)
     → { historico atualizado, mensagemAgente }
6. PropostaRepository.atualizarHistorico(propostaId, historico)
7. Retorna { id: propostaId, mensagemAgente }
```

**`atualizarStatus()` — fica na instância, sem mudanças:**
Sincroniza o status do `Devedor` quando a proposta é ACEITA/RECUSADA — lógica de domínio pura.

### O que o NegociaContextProvider (instância) faz

```typescript
// src/instances/negocia/negocia-context.provider.ts

@Injectable()
export class NegociaContextProvider implements NegotiationContextProvider {
  buildContext(devedor: any, faixa: any): NegotiationContext {
    const valorMinimo = (devedor.valorDivida * (1 - faixa.descontoMaximo / 100)).toFixed(2);
    return {
      systemPrompt: gerarSystemPrompt(devedor.nome, devedor.valorDivida, faixa.tomComunicacao, valorMinimo, faixa.parcelasMaximas, faixa.prazoMaximoDias),
      initialMessage: gerarMensagemInicial(faixa.mensagemInicial, devedor.valorDivida),
    };
  }

  getTools(): any[] {
    return [VALIDAR_CONTRAPROPOSTA_TOOL];
  }

  validateTool(_toolName: string, args: Record<string, any>, limits: Record<string, any>) {
    // lógica extraída de PropostaService.validarContraproposta() — sem alterações
    const parcelas = Number(args.parcelas);
    const valorTotalOferecido = Number(args.valorTotalOferecido);
    if (parcelas > limits.parcelasMaximas) { ... }
    const valorMinimo = limits.valorOriginal * (1 - limits.descontoMaximo / 100);
    if (valorTotalOferecido < valorMinimo) { ... }
    return { aprovado: true, motivo: `...` };
  }
}
```

### O que fica no PropostaRepository (instância — sem alterações)

Todas as queries do repositório atual ficam na instância pois são 100% específicas do modelo de cobrança:

| Método | Motivo de ficar na instância |
|--------|------------------------------|
| `findDevedorComFaixa()` | Acessa `Devedor` e `FaixaCriterio` |
| `create()` | Cria `Proposta` com campos de cobrança |
| `atualizarHistorico()` | Atualiza `Proposta.historico` |
| `findById()`, `findAllByEmpresa()` | Queries de `Proposta` |
| `findPendentePorDevedor()` | Acessa `Devedor` e status de `Proposta` |
| `findAceitasParceladas()` | Usado pela `Cobrança` — específico de parcelamento |
| `updateStatus()` | Atualiza `Proposta.status` |
| `atualizarStatusDevedor()` | Acessa `Devedor` |

### Split do WhatsApp

| Arquivo | Destino | Motivo |
|---------|---------|--------|
| `whatsapp.service.ts` | `src/core/whatsapp/` | Puro envio via Twilio — zero domínio |
| `whatsapp.module.ts` | `src/core/whatsapp/` | Exporta `WhatsAppService` para o core |
| `whatsapp.controller.ts` | `src/instances/negocia/whatsapp/` | Usa `DevedorRepository`, `PropostaService`, `PropostaRepository` — tudo da instância |

---

## Etapas

### ETAPA 1 — Reorganização estrutural do src/
**Status:** `[ ] Pendente`

Mover arquivos para os novos diretórios com `git mv`. Zero alterações de lógica.

**Moves (core):**
- `src/config/` → `src/core/config/`
- `src/prisma/` → `src/core/prisma/`
- `src/auth/` → `src/core/auth/`
- `src/empresa/` → `src/core/empresa/`
- `src/llm/` → `src/core/llm/`
- `src/whatsapp/whatsapp.service.ts` + `whatsapp.module.ts` → `src/core/whatsapp/`

**Moves (instância negocia):**
- `src/devedor/` → `src/instances/negocia/devedor/`
- `src/faixa-criterio/` → `src/instances/negocia/faixa-criterio/`
- `src/proposta/` → `src/instances/negocia/proposta/`
- `src/cobranca/` → `src/instances/negocia/cobranca/`
- `src/whatsapp/whatsapp.controller.ts` → `src/instances/negocia/whatsapp/whatsapp.controller.ts`
- `src/exceptions/` → `src/instances/negocia/exceptions/`

Após os moves: atualizar **todos os imports** afetados em todos os arquivos movidos.

**Verificação:** `npx tsc --noEmit` sem erros.

**Commit:**
```
refactor: reorganizar src/ em core/ e instances/negocia/ para estrutura de framework
```

---

### ETAPA 2 — Motor genérico de negociação (Framework Core)
**Status:** `[ ] Pendente`

Criar `src/core/negotiation/` com três arquivos:

1. **`negotiation-context.interface.ts`** — interfaces `NegotiationContext` e `NegotiationContextProvider` (ver seção acima)

2. **`negotiation.engine.ts`** — extrai apenas a lógica genérica do `PropostaService` atual:
   - `iniciar(context)` — monta historico, chama LLM, retorna `{ historico, mensagemAgente }`
   - `conversar(msg, historico, tools, validator)` — loop de conversa + processamento de tool calls

3. **`negotiation.module.ts`** — marca `NegotiationEngine` como `@Injectable()`, importa `LlmModule`, exporta `NegotiationEngine`

**Commit:**
```
feat(core): criar NegotiationEngine e interface NegotiationContextProvider
```

---

### ETAPA 3 — Instância demo: Negocia (cobrança de dívidas)
**Status:** `[ ] Pendente`

Criar três novos arquivos na instância:

**`src/instances/negocia/negocia-context.provider.ts`**
Implementa `NegotiationContextProvider`. Usa `proposta.prompts.ts` e `proposta.tools.ts` existentes (sem reescrever). Extrai `validarContraproposta()` do `PropostaService` atual.

**Refatorar `src/instances/negocia/proposta/proposta.service.ts`**
Remove a lógica do loop de conversa e do tool call. Passa a injetar `NegotiationEngine` e `NegociaContextProvider`. Os métodos `listarPropostas`, `buscarProposta` e `atualizarStatus` ficam sem alterações.

**`src/instances/negocia/negocia.module.ts`**
Agrega: `DevedorModule`, `FaixaCriterioModule`, `PropostaModule`, `CobrancaModule`, `WhatsAppModule` (controller). Fornece `NegociaContextProvider` como provider.

**Commit:**
```
feat(negocia): implementar NegociaContextProvider e simplificar PropostaService
```

---

### ETAPA 4 — CoreModule e AppModule
**Status:** `[ ] Pendente`

**`src/core/core.module.ts`** — agrega e re-exporta:
```typescript
@Global()
@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, EmpresaModule, LlmModule, WhatsAppModule, NegotiationModule],
  exports: [ConfigModule, PrismaModule, AuthModule, EmpresaModule, LlmModule, WhatsAppModule, NegotiationModule],
})
export class CoreModule {}
```

**`src/app.module.ts`** — simplificado:
```typescript
@Module({
  imports: [CoreModule, NegociaModule],
})
export class AppModule {}
```

**Commit:**
```
feat(core): criar CoreModule e atualizar AppModule para carregar instâncias
```

---

### ETAPA 5 — Documentação do framework
**Status:** `[ ] Pendente`

Criar **`docs/framework.md`** com:
- Diagrama da arquitetura (core × instância)
- Tabela: pontos fixos → módulos core, pontos variáveis → o que cada instância implementa
- Guia passo a passo: como criar uma nova instância (ex: marcação de consultas)
  1. Criar `src/instances/minha-instancia/`
  2. Definir modelo de cliente no schema Prisma
  3. Criar o `MinhInstanciaContextProvider` implementando `NegotiationContextProvider`
  4. Criar módulo agregador e registrar no `AppModule`
- Aplicações exemplo: dívidas (demo), consultas médicas, oficina mecânica

**Commit:**
```
docs: adicionar framework.md com guia de arquitetura e criação de instâncias
```

---

### ETAPA 6 — Validação final
**Status:** `[ ] Pendente`

```bash
npx tsc --noEmit          # zero erros de tipo
pnpm run build            # build limpo
```

Testes manuais via Swagger (`http://localhost:3000/api`):
- `POST /empresa/cadastrar` → `POST /auth/login` → Authorize
- `POST /faixas-criterio` → `POST /devedor/cadastrar` → `POST /whatsapp/iniciar/:id`
- Confirmar que a primeira mensagem chega via WhatsApp
- Responder via webhook e verificar que a conversa continua corretamente
- `POST /cobranca/lembretes` → verificar envio de lembretes

> Etapa de verificação — sem commit dedicado.

---

## Arquivos — resumo de ações

| Arquivo | Ação |
|---------|------|
| `src/core/negotiation/negotiation-context.interface.ts` | CRIAR |
| `src/core/negotiation/negotiation.engine.ts` | CRIAR (extrai lógica do PropostaService) |
| `src/core/negotiation/negotiation.module.ts` | CRIAR |
| `src/core/core.module.ts` | CRIAR |
| `src/instances/negocia/negocia-context.provider.ts` | CRIAR (extrai validarContraproposta) |
| `src/instances/negocia/negocia.module.ts` | CRIAR |
| `src/instances/negocia/proposta/proposta.service.ts` | MODIFICAR (delega ao engine) |
| `src/app.module.ts` | MODIFICAR (CoreModule + NegociaModule) |
| Todos os arquivos movidos | ATUALIZAR imports |
| `docs/framework.md` | CRIAR |

**Sem alterações de lógica:** `auth/`, `empresa/`, `llm/`, `devedor/`, `faixa-criterio/`, `cobranca/`, `whatsapp.service.ts`, `proposta.repository.ts`, `proposta.prompts.ts`, `proposta.tools.ts`, todos os controllers (exceto proposta.service).

---

## Progresso

| Etapa | Status | Observações |
|-------|--------|-------------|
| 1 — Reorganização estrutural | `[x] Concluído` | commit `003c87b` |
| 2 — Motor genérico de negociação | `[x] Concluído` | commit `e6ccd95` |
| 3 — Instância demo (negocia) | `[x] Concluído` | commit `9688801` |
| 4 — CoreModule + AppModule | `[x] Concluído` | commit `ff4b79b` |
| 5 — Documentação | `[x] Concluído` | commit `17b7d69` |
| 6 — Validação | `[x] Concluído` | `tsc --noEmit` ✓ + `pnpm build` ✓ |
| 7 — Desacoplar painel do core | `[x] Concluído` | commit `8bdfeeb` |
| 8 — Organizar schema Prisma | `[x] Concluído` | commit `2e2b755` |

---

## FASE 2 — Evolução do framework para multi-instância real

### Contexto da fase 2

Após a Fase 1 (etapas 1–6), o framework tem a estrutura de pastas correta, mas o `EmpresaModule` (core) ainda carrega dois acoplamentos com a instância negocia:

1. **`EmpresaRepository.painel()`** — consulta diretamente `Devedor` e `Proposta` (modelos da instância) e calcula métricas de cobrança (`taxaRecuperacao`, `valorDivida`, `valorAcordado`). Está no core mas não pertence a ele.
2. **`prisma/schema.prisma`** — `Devedor`, `FaixaCriterio`, `Proposta` e seus enums estão no mesmo arquivo que `Empresa` e `Endereco`, sem distinção visual entre o que é core e o que é instância.

Enquanto esses pontos existirem, uma segunda instância (ex: saúde) herdará um endpoint `/empresa/painel` com dados de dívidas que não existem nela.

---

### ETAPA 7 — Mover painel para a instância negocia
**Status:** `[x] Concluído` — commit `8bdfeeb`

**Objetivo:** O core `EmpresaModule` fica responsável apenas por autenticação e CRUD de perfil. O painel de métricas da instância negocia vai para a própria instância.

#### Arquivos a modificar no core

**`src/core/empresa/empresa.repository.ts`**
- Remover o método `painel()` inteiro

**`src/core/empresa/empresa.service.ts`**
- Remover o método `painel(empresaId)`

**`src/core/empresa/empresa.controller.ts`**
- Remover o endpoint `@Get('painel')` e seu método
- Remover a descrição swagger "indicadores de inadimplência e recuperação financeira"

#### Arquivos a criar na instância negocia

**`src/instances/negocia/painel/painel.repository.ts`** — CRIAR
Move a lógica de `EmpresaRepository.painel()` sem alterações: queries a `devedor` e `proposta`, cálculo de `taxaRecuperacao`, `valorTotalEmAberto`, `valorTotalRecuperado`.

**`src/instances/negocia/painel/painel.service.ts`** — CRIAR
Delega ao repository.

**`src/instances/negocia/painel/painel.controller.ts`** — CRIAR
Mantém `GET /empresa/painel` para não quebrar clientes existentes:
```typescript
@ApiTags('Empresa')
@Controller('empresa')
@UseGuards(AuthGuard)
export class PainelController {
  @Get('painel')
  async painel(@Empresa() empresa: JwtPayload) {
    return this.painelService.painel(empresa.sub);
  }
}
```

**`src/instances/negocia/painel/painel.module.ts`** — CRIAR

**`src/instances/negocia/negocia.module.ts`** — MODIFICAR — adicionar `PainelModule`

**Commit:**
```
refactor(core): remover painel do EmpresaModule e mover para instância negocia
```

---

### ETAPA 8 — Organizar schema Prisma com seções por instância
**Status:** `[x] Concluído` — commit `2e2b755`

**Objetivo:** O `prisma/schema.prisma` é um arquivo único (limitação do Prisma), mas deve deixar claro visualmente quais modelos são do core e quais são de cada instância. Sem migrations geradas — apenas organização de comentários e ordem.

**`prisma/schema.prisma`** — REORGANIZAR:
```
// ============================================================
// CORE — modelos compartilhados por todas as instâncias
// ============================================================
model Empresa { ... }
model Endereco { ... }

// ============================================================
// INSTANCE: NEGOCIA — cobrança de dívidas via WhatsApp
// ============================================================
enum StatusDevedor / OrigemDevedor / TipoPessoa / StatusProposta
model Devedor / FaixaCriterio / Proposta

// ============================================================
// INSTANCE: <NOME> — nova instância futura
// ============================================================
// Adicionar aqui os modelos da próxima instância
```

**`docs/framework.md`** — ATUALIZAR com seção "Adicionando modelos de uma nova instância ao schema".

**Commit:**
```
docs: organizar schema Prisma com seções core/instância e atualizar framework.md
```

---

### Resultado esperado após Fase 2

| Módulo | Situação após Fase 2 |
|--------|---------------------|
| `EmpresaModule` (core) | Puro: cadastro, perfil, update, delete — zero acesso a modelos de instância |
| `AuthModule` (core) | Inalterado — já genérico |
| `NegotiationEngine` (core) | Inalterado — já genérico |
| `WhatsAppModule` (core) | Inalterado — já genérico |
| `PainelModule` (negocia) | Novo — painel com métricas de Devedor/Proposta |
| `prisma/schema.prisma` | Visualmente separado: core vs instâncias |

---

## FASE 3 — Pontos variáveis ampliados (generalização do framework)

### Contexto da fase 3

O avaliador exige que **todos** os pontos variáveis sejam obrigatoriamente cobertos por interfaces ou classes abstratas do core que as instâncias implementam. A estrutura deve ser:

> **Classes fixas do framework** chamam os **pontos variáveis** (interfaces/abstratas) → **Instâncias** implementam essas interfaces

Mapeamento completo dos 4 pontos variáveis do documento original:

| # | Ponto variável | Interface no core | Chamada por (fixo) |
|---|---|---|---|
| 1 | Info de clientes e sessões de conversa | `ConversationOrchestrator` | `WhatsAppWebhookService` |
| 2 | Temática e contexto da negociação | `NegotiationContextProvider.buildContext()` | `NegotiationEngine` |
| 3 | Decisão final do agente de IA | `NegotiationContextProvider.validateTool()` | `NegotiationEngine` |
| 4 | Frequência e cronologia de notificações | `NotificationSchedulerProvider` | `NotificationEngine` |

O ponto variável 1 (info de clientes) estava ausente — cada instância reimplementava livremente o controller de WhatsApp sem contrato algum. A solução é `ConversationOrchestrator`, que o `WhatsAppWebhookService` (core) chama; cada instância implementa no seu serviço principal.

O `CrudController<T>` mixin **não é ponto variável** — é um utilitário do framework (ponto fixo) que reduz boilerplate ao construir módulos CRUD das instâncias.

---


### ETAPA 9 — ConversationOrchestrator interface + WhatsAppWebhookService no core
**Status:** `[ ] Pendente`

**Objetivo:** Criar o ponto variável 1 — informações de clientes e sessões de conversa. O `WhatsAppWebhookService` (fixo, no core) passa a chamar a interface; cada instância implementa no seu serviço principal de negociação.

**Criar `src/core/whatsapp/conversation-orchestrator.interface.ts`:**
```typescript
export interface ConversationOrchestrator {
  // Telefone resolve o cliente E identifica a empresa — webhook não tem empresaId no contexto
  findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null>;

  // Recupera sessão ativa ou cria uma nova — instância define o que é "sessão"
  findOuCriarSessao(clienteId: string, empresaId: string): Promise<{ id: string }>;

  // Avança a conversa — instância orquestra NegotiationEngine + seu contexto
  responder(sessaoId: string, mensagem: string, empresaId: string): Promise<string>;
}
```

**Criar `src/core/whatsapp/whatsapp-webhook.service.ts`** — classe fixa que chama a interface:
```typescript
@Injectable()
export class WhatsAppWebhookService {
  async handle(
    telefone: string,
    mensagem: string,
    orchestrator: ConversationOrchestrator,
  ): Promise<string> {
    const cliente = await orchestrator.findClienteByTelefone(telefone);
    if (!cliente) return 'Número não encontrado na base.';
    const sessao = await orchestrator.findOuCriarSessao(cliente.id, cliente.empresaId);
    return orchestrator.responder(sessao.id, mensagem, cliente.empresaId);
  }
}
```

**Controllers de WhatsApp em cada instância** ficam finos — apenas recebem o webhook e delegam:
```typescript
// src/instances/negocia/whatsapp/whatsapp.controller.ts
@Controller('whatsapp')
export class WhatsAppNegociaController {
  constructor(
    private readonly webhookService: WhatsAppWebhookService,
    private readonly propostaService: PropostaService, // implements ConversationOrchestrator
  ) {}

  @Post('webhook')
  async webhook(@Body() body: TwilioDto, @Empresa() empresa: JwtPayload) {
    return this.webhookService.handle(body.From, body.Body, empresa.sub, this.propostaService);
  }
}
```

**`src/core/whatsapp/whatsapp.module.ts`** — exportar também `WhatsAppWebhookService`.

**Commit:**
```
feat(core): criar ConversationOrchestrator interface e WhatsAppWebhookService
```

---

### ETAPA 10 — NotificationEngine + NotificationSchedulerProvider no core
**Status:** `[ ] Pendente`

**Objetivo:** Criar o ponto variável 4 — frequência e cronologia de notificações. O `NotificationEngine` (fixo) chama a interface; cada instância decide quando, quem e o que notificar.

**Criar `src/core/notification/notification-scheduler.interface.ts`:**
```typescript
export interface NotificationSchedulerProvider {
  getEmpresasAtivas(): Promise<string[]>;
  getClientesPendentes(empresaId: string): Promise<{ nome: string; telefone: string; [key: string]: any }[]>;
  buildMessage(cliente: any): string;
}
```

**Criar `src/core/notification/notification.engine.ts`:**
```typescript
@Injectable()
export class NotificationEngine {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  async enviarNotificacoes(provider: NotificationSchedulerProvider): Promise<void> {
    const empresas = await provider.getEmpresasAtivas();
    for (const empresaId of empresas) {
      const clientes = await provider.getClientesPendentes(empresaId);
      for (const cliente of clientes) {
        await this.whatsAppService.enviarMensagem(cliente.telefone, provider.buildMessage(cliente));
      }
    }
  }
}
```

**Criar `src/core/notification/notification.module.ts`** — importa `WhatsAppModule`, exporta `NotificationEngine`.

**`src/core/core.module.ts`** — adicionar `NotificationModule` nos imports e exports.

> **Nota:** `NotificationEngine` também expõe `enviarNotificacoesParaEmpresa(empresaId, provider)` para suportar triggers manuais por empresa (ex: `POST /cobranca/lembretes`).

| O que a instância define | O que o engine core executa |
|---|---|
| `@Cron(...)` — quando disparar | — |
| `getEmpresasAtivas()` — quais empresas | Iteração sobre empresas |
| `getClientesPendentes(empresaId)` — quem notificar | Iteração sobre clientes |
| `buildMessage(cliente)` — o que dizer | `WhatsAppService.enviarMensagem()` |

**Commit:**
```
feat(core): criar NotificationEngine e interface NotificationSchedulerProvider
```

---

### ETAPA 11 — CrudController mixin + CrudService abstract (utilitário do framework)
**Status:** `[ ] Pendente`

**Objetivo:** Utilitário do core (ponto fixo) que elimina boilerplate de CRUD nos controllers das instâncias. Não é ponto variável — é infraestrutura compartilhada, como `AuthGuard`.

**Criar `src/core/crud/crud.service.ts`:**
```typescript
export abstract class CrudService<T> {
  abstract findAll(empresaId: string): Promise<T[]>;
  abstract findById(id: string, empresaId: string): Promise<T>;
  abstract create(dto: any, empresaId: string): Promise<T>;
  abstract update(id: string, dto: any, empresaId: string): Promise<T>;
  abstract remove(id: string, empresaId: string): Promise<void>;
}
```

**Criar `src/core/crud/crud.controller.ts`:**
```typescript
import { mixin } from '@nestjs/common';

export function CrudController<T>() {
  class MixinController {
    readonly service: CrudService<T>;

    @Get()
    findAll(@Empresa() empresa: JwtPayload) { return this.service.findAll(empresa.sub); }
    @Get(':id')
    findById(@Param('id') id: string, @Empresa() empresa: JwtPayload) { return this.service.findById(id, empresa.sub); }
    @Post()
    create(@Body() dto: any, @Empresa() empresa: JwtPayload) { return this.service.create(dto, empresa.sub); }
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any, @Empresa() empresa: JwtPayload) { return this.service.update(id, dto, empresa.sub); }
    @Delete(':id')
    remove(@Param('id') id: string, @Empresa() empresa: JwtPayload) { return this.service.remove(id, empresa.sub); }
  }
  return mixin(MixinController);
}
```

Instâncias com entidades simples herdam o mixin; instâncias com endpoints adicionais estendem e acrescentam:
```typescript
@Controller('devedor') @UseGuards(AuthGuard)
export class DevedorController extends CrudController<Devedor>() {
  constructor(readonly service: DevedorService) { super(); }

  @Post('importar')
  importar(@Body() dto: ImportarDevedorDto, @Empresa() empresa: JwtPayload) { ... }
}
```

**Commit:**
```
feat(core): criar CrudController mixin e CrudService abstract
```

---

### ETAPA 12 — Refatorar instância negocia com todos os pontos variáveis
**Status:** `[x] Concluído`

**Objetivo:** Aplicar os 3 novos elementos à instância existente, tornando-a referência de implementação correta antes de replicar para novas instâncias.

**`PropostaService`** — implementar `ConversationOrchestrator` (ponto variável 1):
```typescript
export class PropostaService implements ConversationOrchestrator {
  async findClienteByTelefone(telefone: string, empresaId: string) {
    return this.devedorRepository.findByTelefone(telefone, empresaId);
  }
  async findOuCriarSessao(devedorId: string, empresaId: string) {
    const existente = await this.propostaRepository.findPendentePorDevedor(devedorId, empresaId);
    if (existente) return existente;
    return this.gerarProposta(devedorId, empresaId);
  }
  async responder(propostaId: string, mensagem: string, empresaId: string) {
    const { mensagemAgente } = await this.conversar(propostaId, empresaId, mensagem);
    return mensagemAgente;
  }
  // ... métodos existentes inalterados
}
```

**`WhatsAppNegociaController`** — usar `WhatsAppWebhookService` (core):
- Remover lógica de busca de devedor/proposta do controller
- Delegar para `webhookService.handle(telefone, mensagem, empresaId, this.propostaService)`

**`CobrancaService`** — implementar `NotificationSchedulerProvider` (ponto variável 4):
- `implements NotificationSchedulerProvider`
- `@Cron` chama `this.notificationEngine.enviarNotificacoes(this)`
- Implementar `getEmpresasAtivas()`, `getClientesPendentes()`, `buildMessage()`

**`DevedorController`** → `extends CrudController<Devedor>()` + mantém `POST /importar`
**`FaixaCriterioController`** → `extends CrudController<FaixaCriterio>()` (CRUD puro)
**`DevedorService`** → `extends CrudService<Devedor>`
**`FaixaCriterioService`** → `extends CrudService<FaixaCriterio>`

**Verificação:** `npx tsc --noEmit` + endpoints do Swagger inalterados funcionalmente.

**Commit:**
```
refactor(negocia): implementar ConversationOrchestrator, NotificationSchedulerProvider e CrudController mixin
```

---

## FASE 3.5 — Maximização de Reaproveitamento: Abstrações Faltantes no Core

### Contexto

Após a Etapa 12, os 4 pontos variáveis têm interfaces no core, mas ao mapear o que SERÁ replicado nas instâncias saúde e oficina, identificamos 3 blocos de código fixo que ainda estão nas instâncias — idênticos em todas elas. Antes de implementar novas instâncias, esses blocos vão para o core para que cada nova instância escreva cada vez menos código.

### Mapa de repetição detectado

| Código | Negocia (atual) | Saúde (futuro) | Oficina (futuro) | Destino |
|--------|-----------------|----------------|------------------|---------|
| `@Post('webhook')` handler | `WhatsAppController` | `WhatsAppSaudeController` | `WhatsAppOficinaController` | Core → `WhatsAppWebhookController()` mixin |
| `dispararLembretesManual(empresaId)` | `CobrancaService` | `NotificacaoSaudeService` | `NotificacaoOficinaService` | Core → `NotificationCronService` abstract |
| `@Post('lembretes/manual')` endpoint | `CobrancaController` | `NotificacaoSaudeController` | `NotificacaoOficinaController` | Core → `NotificationCronController()` mixin |

### O que NÃO pode ser abstraído (domínio específico — fica nas instâncias)

| Código | Por quê fica na instância |
|--------|--------------------------|
| `getEmpresasAtivas()`, `getClientesPendentes()`, `buildMessage()` | Dados e mensagens diferentes por domínio |
| `buildContext()`, `getTools()`, `validateTool()` | Prompt e regras de negócio por domínio |
| `findClienteByTelefone()`, `findOuCriarSessao()`, `responder()` | Entidade de cliente diferente por instância |
| CRUD repositories | Modelo Prisma diferente por instância |
| `@Post('iniciar/:clienteId')` | Domínio específico — vai no controller da entidade |

### Arquitetura final do core após esta fase

```
Core (pontos fixos — chamam interfaces)
├── Engines (3)
│   ├── NegotiationEngine       → chama NegotiationContextProvider
│   ├── NotificationEngine      → chama NotificationSchedulerProvider
│   └── WhatsAppWebhookService  → chama ConversationOrchestrator
│
├── Abstract classes (2)
│   ├── CrudService<T>                → instâncias estendem (5 métodos)
│   └── NotificationCronService       → instâncias estendem (dispararLembretesManual fixo)
│
├── Mixins de controller (3)
│   ├── CrudController<T>()           → instâncias estendem (4 linhas)
│   ├── WhatsAppWebhookController()   → instâncias estendem (4 linhas + iniciar específico)
│   └── NotificationCronController()  → instâncias estendem (4 linhas)
│
└── Interfaces de variabilidade (3)
    ├── ConversationOrchestrator      → instâncias implementam
    ├── NegotiationContextProvider    → instâncias implementam
    └── NotificationSchedulerProvider → instâncias implementam (estendendo NotificationCronService)
```

---

### ETAPA 12A — Mixin `WhatsAppWebhookController()` no core
**Status:** `[x] Concluído`

**`src/core/whatsapp/whatsapp-webhook.controller.ts`** — CRIAR:

```typescript
export function WhatsAppWebhookController() {
  class MixinController {
    readonly orchestrator: ConversationOrchestrator;
    readonly whatsappService: WhatsAppService;
    readonly webhookService: WhatsAppWebhookService;
    private readonly logger = new Logger('WhatsAppWebhookController');

    @Post('webhook')
    @ApiOperation({ summary: 'Webhook do Twilio — recebe mensagens do WhatsApp' })
    async webhook(@Body() payload: Record<string, string>): Promise<void> {
      const from = payload.From;
      const mensagem = payload.Body;
      if (!from || !mensagem) return;
      const telefone = from.replace('whatsapp:+', '');
      this.logger.log(`Mensagem recebida de ${telefone}: ${mensagem}`);
      const resposta = await this.webhookService.handle(telefone, mensagem, this.orchestrator);
      if (resposta) await this.whatsappService.enviarMensagem(from, resposta);
    }
  }
  return mixin(MixinController);
}
```

**Negocia — `WhatsAppController`** após refatoração (exemplo de uso):
```typescript
@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController extends WhatsAppWebhookController() {
  constructor(
    readonly orchestrator: PropostaService,
    readonly whatsappService: WhatsAppService,
    readonly webhookService: WhatsAppWebhookService,
    private readonly devedorRepository: DevedorRepository,
  ) { super(); }

  @Post('iniciar/:devedorId')           // único método específico da instância
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async iniciarNegociacao(...) { ... }
}
```

**Novas instâncias (saúde, oficina) — cada controller WhatsApp será:**
```typescript
@Controller('whatsapp-saude')
export class WhatsAppSaudeController extends WhatsAppWebhookController() {
  constructor(
    readonly orchestrator: ConsultaService,
    readonly whatsappService: WhatsAppService,
    readonly webhookService: WhatsAppWebhookService,
  ) { super(); }
  // sem método adicional — iniciar está no ConsultaController
}
```

**Commit:**
```
feat(core): criar mixin WhatsAppWebhookController para eliminar código de webhook repetido
```

---

### ETAPA 12B — Abstract class `NotificationCronService` no core
**Status:** `[x] Concluído`

**`src/core/notification/notification-cron.service.ts`** — CRIAR:

```typescript
import { Logger } from '@nestjs/common';
import { NotificationEngine } from './notification.engine';
import { NotificationSchedulerProvider } from './notification-scheduler.interface';

export abstract class NotificationCronService implements NotificationSchedulerProvider {
  protected abstract readonly notificationEngine: NotificationEngine;
  protected readonly logger = new Logger(this.constructor.name);

  abstract getEmpresasAtivas(): Promise<string[]>;
  abstract getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  abstract buildMessage(cliente: any): string;

  // dispararLembretesManual é idêntico em todas as instâncias — fica no core
  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const enviados = await this.notificationEngine.enviarNotificacoesParaEmpresa(empresaId, this);
    return { enviados };
  }
}
```

**Negocia — `CobrancaService`** após refatoração:
```typescript
@Injectable()
export class CobrancaService extends NotificationCronService {
  protected readonly notificationEngine: NotificationEngine;

  constructor(
    private readonly propostaRepository: PropostaRepository,
    notificationEngine: NotificationEngine,
  ) {
    super();
    this.notificationEngine = notificationEngine;
  }

  @Cron('0 9 1 * *')
  async enviarLembretesParcelados() {
    this.logger.log('Iniciando envio de lembretes mensais...');
    const enviados = await this.notificationEngine.enviarNotificacoes(this);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  // apenas os 3 métodos variáveis — dispararLembretesManual vem do core
  async getEmpresasAtivas() { ... }
  async getClientesPendentes(empresaId) { ... }
  buildMessage(proposta) { ... }
}
```

**Commit:**
```
feat(core): criar NotificationCronService abstract com dispararLembretesManual compartilhado
```

---

### ETAPA 12C — Mixin `NotificationCronController()` no core
**Status:** `[x] Concluído`

**`src/core/notification/notification-cron.controller.ts`** — CRIAR:

```typescript
export function NotificationCronController() {
  class MixinController {
    readonly service: NotificationCronService;

    @Post('lembretes/manual')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Dispara lembretes manualmente para a empresa logada' })
    dispararManual(@Empresa() empresa: JwtPayload) {
      return this.service.dispararLembretesManual(empresa.sub);
    }
  }
  return mixin(MixinController);
}
```

**Negocia — `CobrancaController`** após refatoração:
```typescript
@ApiTags('Cobrança')
@Controller('cobranca')
export class CobrancaController extends NotificationCronController() {
  constructor(readonly service: CobrancaService) { super(); }
}
```

**Novas instâncias:**
```typescript
@ApiTags('Saúde — Notificação')
@Controller('notificacao-saude')
export class NotificacaoSaudeController extends NotificationCronController() {
  constructor(readonly service: NotificacaoSaudeService) { super(); }
}
```

**Commit:**
```
feat(core): criar mixin NotificationCronController para endpoint de lembretes manuais
```

---

### ETAPA 12D — Refatorar instância negocia com os novos mixins
**Status:** `[x] Concluído`

Aplicar Etapas 12A–12C à instância existente:

1. **`WhatsAppController`** → `extends WhatsAppWebhookController()` (remove método `webhook`)
2. **`CobrancaService`** → `extends NotificationCronService` (remove `dispararLembretesManual`)
3. **`CobrancaController`** → `extends NotificationCronController()` (remove método `dispararLembretes`)

**Verificação:** `npx tsc --noEmit` + endpoints inalterados no Swagger.

**Commit:**
```
refactor(negocia): usar mixins WhatsAppWebhookController e NotificationCronController do core
```

---

### Resultado após FASE 3.5

**Código que cada nova instância precisa escrever:**

| Componente | Linhas aprox. | O que implementa |
|------------|:---:|---|
| ContextProvider | ~20 | `buildContext`, `getTools`, `validateTool` |
| ConversationService (orquestrador) | ~40 | 3 métodos + `iniciar`, `conversar` |
| NotificationService | ~20 | 3 métodos variáveis + `@Cron` |
| WhatsApp controller | ~6 | `extends WhatsAppWebhookController()` |
| Notification controller | ~4 | `extends NotificationCronController()` |
| CRUD controllers (por entidade) | ~4 cada | `extends CrudController<T>()` |
| CRUD services (por entidade) | ~20 cada | `extends CrudService<T>` + validações |
| Repositories | ~30 cada | Queries Prisma específicas |

---

## FASE 4 — Instância: Saúde (marcação de consultas)

### Contexto da fase 4

| Elemento | Instância saúde |
|----------|----------------|
| Entidade de cliente | `Paciente` — convenio, status de retorno, última consulta |
| Critério | `ConfigRetorno` — dias para retorno, tom de comunicação |
| `ConversationOrchestrator` | `ConsultaService` — localiza paciente, cria/retoma consulta |
| `NegotiationContextProvider` | `SaudeContextProvider` — prompt de agendamento de retorno |
| Tool do agente | `confirmar_horario` — agente propõe slot, paciente confirma |
| `NotificationSchedulerProvider` | `NotificacaoSaudeService` — pacientes com retorno vencido |
| Cron | `0 8 * * 1,3,5` — seg/qua/sex às 8h |

---

### ETAPA 13 — Schema Prisma da instância saúde
**Status:** `[ ] Pendente`

**`prisma/schema.prisma`** — adicionar seção INSTANCE: SAÚDE:

```prisma
// ============================================================
// INSTANCE: SAÚDE — marcação de consultas e monitoramento de retorno
// ============================================================

enum StatusPaciente { ATIVO  RETORNO_PENDENTE  RETORNO_AGENDADO  ABANDONOU }

model ConfigRetorno {
  id              String     @id @default(uuid())
  descricao       String
  diasParaRetorno Int
  tomComunicacao  String
  mensagemInicial String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  empresaId       String
  empresa         Empresa    @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  pacientes       Paciente[]
}

model Paciente {
  id              String         @id @default(uuid())
  nome            String
  telefone        String
  email           String?
  cpf             String?
  convenio        String?
  status          StatusPaciente @default(ATIVO)
  ultimaConsulta  DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  configRetornoId String?
  configRetorno   ConfigRetorno? @relation(fields: [configRetornoId], references: [id])
  empresaId       String
  empresa         Empresa        @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  consultas       Consulta[]
}

enum StatusConsulta { PENDENTE  CONFIRMADA  REALIZADA  CANCELADA }

model Consulta {
  id           String         @id @default(uuid())
  historico    Json           @default("[]")
  limites      Json           @default("[]")
  dataAgendada DateTime?
  status       StatusConsulta @default(PENDENTE)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  pacienteId   String
  paciente     Paciente       @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  empresaId    String
  empresa      Empresa        @relation(fields: [empresaId], references: [id], onDelete: Cascade)
}
```

**Commit:**
```
feat(saude): adicionar modelos Paciente, ConfigRetorno e Consulta ao schema Prisma
```

---

### ETAPA 14 — Módulos CRUD da instância saúde
**Status:** `[ ] Pendente`

**`src/instances/saude/paciente/`**
- `paciente.controller.ts` → `extends CrudController<Paciente>()`
- `paciente.service.ts` → `extends CrudService<Paciente>`
- `paciente.repository.ts`

**`src/instances/saude/config-retorno/`**
- `config-retorno.controller.ts` → `extends CrudController<ConfigRetorno>()`
- `config-retorno.service.ts` → `extends CrudService<ConfigRetorno>`
- `config-retorno.repository.ts`

**`src/instances/saude/consulta/`** — módulo de negociação da instância:
- `consulta.repository.ts` — queries de `Consulta` e `Paciente`
- `consulta.service.ts` — implementa `ConversationOrchestrator` + orquestra `NegotiationEngine` + `SaudeContextProvider`
- `consulta.controller.ts` — endpoints adicionais: `POST /consulta/iniciar/:pacienteId`, `GET /consulta`, `GET /consulta/:id`

**Commit:**
```
feat(saude): criar módulos CRUD de Paciente, ConfigRetorno e Consulta
```

---

### ETAPA 15 — Pontos variáveis da instância saúde
**Status:** `[ ] Pendente`

**`ConsultaService`** — implementar `ConversationOrchestrator` (ponto variável 1):
```typescript
export class ConsultaService implements ConversationOrchestrator {
  async findClienteByTelefone(telefone: string, empresaId: string) {
    return this.pacienteRepository.findByTelefone(telefone, empresaId);
  }
  async findOuCriarSessao(pacienteId: string, empresaId: string) {
    const existente = await this.consultaRepository.findPendentePorPaciente(pacienteId, empresaId);
    if (existente) return existente;
    return this.iniciarConsulta(pacienteId, empresaId);
  }
  async responder(consultaId: string, mensagem: string, empresaId: string) {
    const { mensagemAgente } = await this.conversar(consultaId, empresaId, mensagem);
    return mensagemAgente;
  }
}
```

**`SaudeContextProvider`** — implementar `NegotiationContextProvider` (pontos variáveis 2+3):
```typescript
@Injectable()
export class SaudeContextProvider implements NegotiationContextProvider {
  buildContext(paciente: Paciente, config: ConfigRetorno): NegotiationContext {
    return {
      systemPrompt: `Você é Ana, assistente da clínica. Entre em contato com ${paciente.nome} para agendar retorno. Tom: ${config.tomComunicacao}.`,
      initialMessage: config.mensagemInicial ?? `Olá ${paciente.nome}, sua consulta de retorno está pendente. Vamos agendar?`,
    };
  }
  getTools() { return [CONFIRMAR_HORARIO_TOOL]; }
  validateTool(_toolName: string, args: any, _limits: any) {
    return { aprovado: true, motivo: `Consulta agendada para ${args.dataHora}.` };
  }
}
```

**`NotificacaoSaudeService`** — implementar `NotificationSchedulerProvider` (ponto variável 4):
```typescript
@Injectable()
export class NotificacaoSaudeService implements NotificationSchedulerProvider {
  @Cron('0 8 * * 1,3,5')
  async enviarLembretes() { await this.notificationEngine.enviarNotificacoes(this); }

  async getEmpresasAtivas() { return this.prismaService.empresa.findMany().then(e => e.map(x => x.id)); }
  async getClientesPendentes(empresaId: string) {
    return this.prismaService.paciente.findMany({ where: { empresaId, status: 'RETORNO_PENDENTE' } });
  }
  buildMessage(paciente: any) {
    return `Olá ${paciente.nome}, sua consulta de retorno está pendente. Responda para agendar!`;
  }
}
```

**`WhatsAppSaudeController`** — delega ao `WhatsAppWebhookService` passando `consultaService` como orchestrator.

**Commit:**
```
feat(saude): implementar ConversationOrchestrator, NegotiationContextProvider e NotificationSchedulerProvider
```

---

### ETAPA 16 — Integrar saúde no AppModule e validar
**Status:** `[ ] Pendente`

**`src/instances/saude/saude.module.ts`** — CRIAR:
```typescript
@Module({
  imports: [PacienteModule, ConfigRetornoModule, ConsultaModule, NotificacaoSaudeModule, WhatsAppSaudeModule],
})
export class SaudeModule {}
```

**`src/app.module.ts`** — adicionar `SaudeModule`.

**Verificação:** `npx tsc --noEmit` + `/paciente`, `/config-retorno`, `/consulta` no Swagger sem conflito.

**Commit:**
```
feat(saude): registrar SaudeModule no AppModule e validar instância
```

---

## FASE 5 — Instância: Oficina (agendamento de serviços)

### Contexto da fase 5

| Elemento | Instância oficina |
|----------|------------------|
| Entidade de cliente | `ClienteOficina` — modelo e placa do veículo, histórico de revisões |
| Critério | `ServicoConfig` — prazo de revisão em dias, tipo de serviço |
| `ConversationOrchestrator` | `AgendamentoService` — localiza cliente, cria/retoma agendamento |
| `NegotiationContextProvider` | `OficinaContextProvider` — prompt de agendamento de revisão |
| Tool do agente | `confirmar_agendamento` — agente propõe data, cliente confirma |
| `NotificationSchedulerProvider` | `NotificacaoOficinaService` — clientes com revisão vencida |
| Cron | `0 10 * * 2,4` — ter/qui às 10h |

---

### ETAPA 17 — Schema Prisma da instância oficina
**Status:** `[ ] Pendente`

**`prisma/schema.prisma`** — adicionar seção INSTANCE: OFICINA:

```prisma
// ============================================================
// INSTANCE: OFICINA — agendamento de serviços para oficinas mecânicas
// ============================================================

enum StatusClienteOficina { ATIVO  REVISAO_PENDENTE  AGENDADO  INATIVO }

model ServicoConfig {
  id               String   @id @default(uuid())
  descricao        String
  prazoRevisaoDias Int
  tomComunicacao   String
  mensagemInicial  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  empresaId        String
  empresa          Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)
}

model ClienteOficina {
  id            String               @id @default(uuid())
  nome          String
  telefone      String
  email         String?
  modeloVeiculo String
  placa         String
  status        StatusClienteOficina @default(ATIVO)
  ultimaRevisao DateTime?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  empresaId     String
  empresa       Empresa              @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  agendamentos  Agendamento[]
}

enum StatusAgendamento { PENDENTE  CONFIRMADO  REALIZADO  CANCELADO }

model Agendamento {
  id              String            @id @default(uuid())
  historico       Json              @default("[]")
  limites         Json              @default("[]")
  dataAgendada    DateTime?
  tipoServico     String?
  status          StatusAgendamento @default(PENDENTE)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  clienteId       String
  cliente         ClienteOficina    @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  empresaId       String
  empresa         Empresa           @relation(fields: [empresaId], references: [id], onDelete: Cascade)
}
```

**Commit:**
```
feat(oficina): adicionar modelos ClienteOficina, ServicoConfig e Agendamento ao schema Prisma
```

---

### ETAPA 18 — Módulos CRUD da instância oficina
**Status:** `[ ] Pendente`

**`src/instances/oficina/cliente-oficina/`**
- `cliente-oficina.controller.ts` → `extends CrudController<ClienteOficina>()`
- `cliente-oficina.service.ts` → `extends CrudService<ClienteOficina>`
- `cliente-oficina.repository.ts`

**`src/instances/oficina/servico-config/`**
- `servico-config.controller.ts` → `extends CrudController<ServicoConfig>()`
- `servico-config.service.ts` → `extends CrudService<ServicoConfig>`
- `servico-config.repository.ts`

**`src/instances/oficina/agendamento/`** — módulo de negociação:
- `agendamento.repository.ts`
- `agendamento.service.ts` — implementa `ConversationOrchestrator` + orquestra `NegotiationEngine` + `OficinaContextProvider`
- `agendamento.controller.ts`

**Commit:**
```
feat(oficina): criar módulos CRUD de ClienteOficina, ServicoConfig e Agendamento
```

---

### ETAPA 19 — Pontos variáveis da instância oficina
**Status:** `[ ] Pendente`

**`AgendamentoService`** — implementar `ConversationOrchestrator` (ponto variável 1):
```typescript
export class AgendamentoService implements ConversationOrchestrator {
  async findClienteByTelefone(telefone: string, empresaId: string) {
    return this.clienteOficinaRepository.findByTelefone(telefone, empresaId);
  }
  async findOuCriarSessao(clienteId: string, empresaId: string) {
    const existente = await this.agendamentoRepository.findPendentePorCliente(clienteId, empresaId);
    if (existente) return existente;
    return this.iniciarAgendamento(clienteId, empresaId);
  }
  async responder(agendamentoId: string, mensagem: string, empresaId: string) {
    const { mensagemAgente } = await this.conversar(agendamentoId, empresaId, mensagem);
    return mensagemAgente;
  }
}
```

**`OficinaContextProvider`** — implementar `NegotiationContextProvider` (pontos variáveis 2+3):
```typescript
@Injectable()
export class OficinaContextProvider implements NegotiationContextProvider {
  buildContext(cliente: ClienteOficina, config: ServicoConfig): NegotiationContext {
    return {
      systemPrompt: `Você é Carlos, assistente da oficina. ${cliente.nome} tem um ${cliente.modeloVeiculo} (placa ${cliente.placa}) com revisão pendente. Tom: ${config.tomComunicacao}.`,
      initialMessage: config.mensagemInicial ?? `Olá ${cliente.nome}, seu ${cliente.modeloVeiculo} está no prazo de revisão. Vamos agendar?`,
    };
  }
  getTools() { return [CONFIRMAR_AGENDAMENTO_TOOL]; }
  validateTool(_toolName: string, args: any, _limits: any) {
    return { aprovado: true, motivo: `Agendamento confirmado para ${args.dataHora}.` };
  }
}
```

**`NotificacaoOficinaService`** — implementar `NotificationSchedulerProvider` (ponto variável 4):
- `@Cron('0 10 * * 2,4')` — ter/qui às 10h
- `getClientesPendentes()` — busca `ClienteOficina` com `REVISAO_PENDENTE`
- `buildMessage()` — mensagem sobre revisão do veículo

**`WhatsAppOficinaController`** — delega ao `WhatsAppWebhookService` passando `agendamentoService` como orchestrator.

**Commit:**
```
feat(oficina): implementar ConversationOrchestrator, NegotiationContextProvider e NotificationSchedulerProvider
```

---

### ETAPA 20 — Integrar oficina no AppModule e validar
**Status:** `[ ] Pendente`

**`src/instances/oficina/oficina.module.ts`** — CRIAR
**`src/app.module.ts`** — adicionar `OficinaModule`

**Verificação:** `npx tsc --noEmit` + `/cliente-oficina`, `/servico-config`, `/agendamento` no Swagger.

**Commit:**
```
feat(oficina): registrar OficinaModule no AppModule e validar instância
```

---

## FASE 6 — Validação multi-instância e documentação final

### ETAPA 21 — Validação final e mapa de pontos variáveis
**Status:** `[ ] Pendente`

```bash
npx tsc --noEmit    # zero erros com as 3 instâncias rodando juntas
pnpm run build      # build limpo
```

**Swagger (`/api`) — endpoints das 3 instâncias sem conflito de rotas:**
- `core`: `/empresa`, `/auth`
- `negocia`: `/devedor`, `/faixa-criterio`, `/proposta`, `/empresa/painel`
- `saude`: `/paciente`, `/config-retorno`, `/consulta`
- `oficina`: `/cliente-oficina`, `/servico-config`, `/agendamento`

---

### Mapa completo — classes fixas × interfaces × implementações por instância

**Ponto variável 1 — Informações de clientes e sessões de conversa**

| | |
|---|---|
| Interface | `ConversationOrchestrator` (`src/core/whatsapp/conversation-orchestrator.interface.ts`) |
| Chamada por (fixo) | `WhatsAppWebhookService` (`src/core/whatsapp/whatsapp-webhook.service.ts`) |

| Instância | Implementação | `findClienteByTelefone` consulta | `findOuCriarSessao` cria/retoma |
|-----------|--------------|----------------------------------|----------------------------------|
| negocia | `PropostaService` | `Devedor` | `Proposta` |
| saude | `ConsultaService` | `Paciente` | `Consulta` |
| oficina | `AgendamentoService` | `ClienteOficina` | `Agendamento` |

---

**Pontos variáveis 2+3 — Temática e decisão final do agente de IA**

| | |
|---|---|
| Interface | `NegotiationContextProvider` (`src/core/negotiation/negotiation-context.interface.ts`) |
| Chamada por (fixo) | `NegotiationEngine` (`src/core/negotiation/negotiation.engine.ts`) |

| Instância | Implementação | `buildContext` gera | Tool de decisão (`validateTool`) |
|-----------|--------------|---------------------|----------------------------------|
| negocia | `NegociaContextProvider` | Prompt negociador de dívidas "Sofia" | `validar_contraproposta` |
| saude | `SaudeContextProvider` | Prompt assistente clínica "Ana" | `confirmar_horario` |
| oficina | `OficinaContextProvider` | Prompt assistente oficina "Carlos" | `confirmar_agendamento` |

---

**Ponto variável 4 — Frequência e cronologia de notificações**

| | |
|---|---|
| Interface | `NotificationSchedulerProvider` (`src/core/notification/notification-scheduler.interface.ts`) |
| Chamada por (fixo) | `NotificationEngine` (`src/core/notification/notification.engine.ts`) |

| Instância | Implementação | Cron | `getClientesPendentes` consulta |
|-----------|--------------|------|----------------------------------|
| negocia | `CobrancaService` | `0 9 * * 1-5` (seg-sex 9h) | `Proposta` com parcelas em aberto |
| saude | `NotificacaoSaudeService` | `0 8 * * 1,3,5` (seg/qua/sex 8h) | `Paciente` com `RETORNO_PENDENTE` |
| oficina | `NotificacaoOficinaService` | `0 10 * * 2,4` (ter/qui 10h) | `ClienteOficina` com `REVISAO_PENDENTE` |

**Commit:**
```
docs: atualizar framework.md com mapa completo de pontos variáveis multi-instância
```

---

## Progresso geral

| Fase | Etapa | Status | Observações |
|------|-------|--------|-------------|
| Fase 1 | 1 — Reorganização estrutural | `[x] Concluído` | commit `003c87b` |
| Fase 1 | 2 — Motor genérico de negociação | `[x] Concluído` | commit `e6ccd95` |
| Fase 1 | 3 — Instância demo negocia | `[x] Concluído` | commit `9688801` |
| Fase 1 | 4 — CoreModule + AppModule | `[x] Concluído` | commit `ff4b79b` |
| Fase 1 | 5 — Documentação | `[x] Concluído` | commit `17b7d69` |
| Fase 1 | 6 — Validação | `[x] Concluído` | `tsc` ✓ + `pnpm build` ✓ |
| Fase 2 | 7 — Desacoplar painel do core | `[x] Concluído` | commit `8bdfeeb` |
| Fase 2 | 8 — Organizar schema Prisma | `[x] Concluído` | commit `2e2b755` |
| Fase 3 | 9 — ConversationOrchestrator + WhatsAppWebhookService | `[x] Concluído` | |
| Fase 3 | 10 — NotificationEngine + NotificationSchedulerProvider | `[x] Concluído` | |
| Fase 3 | 11 — CrudController mixin (utilitário) | `[x] Concluído` | |
| Fase 3 | 12 — Refatorar negocia com todos os pontos variáveis | `[x] Concluído` | |
| Fase 4 | 13 — Schema Prisma: saúde | `[x] Concluído` | |
| Fase 4 | 14 — Módulos CRUD: saúde | `[x] Concluído` | |
| Fase 4 | 15 — Pontos variáveis: saúde | `[x] Concluído` | |
| Fase 4 | 16 — Integrar saúde no AppModule | `[x] Concluído` | |
| Fase 5 | 17 — Schema Prisma: oficina | `[ ] Pendente` | |
| Fase 5 | 18 — Módulos CRUD: oficina | `[ ] Pendente` | |
| Fase 5 | 19 — Pontos variáveis: oficina | `[ ] Pendente` | |
| Fase 5 | 20 — Integrar oficina no AppModule | `[ ] Pendente` | |
| Fase 6 | 21 — Validação multi-instância + mapa final | `[ ] Pendente` | |
