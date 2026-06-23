# Negocia Framework — Plano de Adaptação

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

---

### ETAPA 2 — Motor genérico de negociação (Framework Core)
**Status:** `[ ] Pendente`

Criar `src/core/negotiation/` com três arquivos:

1. **`negotiation-context.interface.ts`** — interfaces `NegotiationContext` e `NegotiationContextProvider` (ver seção acima)

2. **`negotiation.engine.ts`** — extrai apenas a lógica genérica do `PropostaService` atual:
   - `iniciar(context)` — monta historico, chama LLM, retorna `{ historico, mensagemAgente }`
   - `conversar(msg, historico, tools, validator)` — loop de conversa + processamento de tool calls

3. **`negotiation.module.ts`** — marca `NegotiationEngine` como `@Injectable()`, importa `LlmModule`, exporta `NegotiationEngine`

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
| 1 — Reorganização estrutural | `[ ] Pendente` | |
| 2 — Motor genérico de negociação | `[ ] Pendente` | |
| 3 — Instância demo (negocia) | `[ ] Pendente` | |
| 4 — CoreModule + AppModule | `[ ] Pendente` | |
| 5 — Documentação | `[ ] Pendente` | |
| 6 — Validação | `[ ] Pendente` | |