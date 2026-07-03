# Pontos Flexíveis do Framework

São **5 pontos flexíveis** no total: 3 interfaces e 2 classes abstratas.

Todos se encaixam na definição do professor: *"Pontos de extensão — Na forma de classes abstratas ou interfaces"*.

---

## Tabela geral

| # | Ponto Flexível | Tipo | O que o framework não sabe | Classe fixa que o chama | negocia | saúde | oficina |
|---|---|---|---|---|---|---|---|
| 1 | `ConversationOrchestrator` | Interface | Quem é o cliente, como localizar pelo telefone e como criar/retomar uma sessão | `WhatsAppWebhookService` | `PropostaService` | `ConsultaService` | `AgendamentoService` |
| 2 | `NegotiationContextProvider` | Interface | Prompt do agente de IA, ferramentas disponíveis e se o resultado de uma ação é válido | `NegotiationEngine` | `NegociaContextProvider` | `SaudeContextProvider` | `OficinaContextProvider` |
| 3 | `NotificationSchedulerProvider` | Interface | Quais empresas têm pendências, quais clientes notificar e qual é o texto da mensagem | `NotificationEngine` | `CobrancaService` | `NotificacaoSaudeService` | `NotificacaoOficinaService` |
| 4 | `CrudService<T>` | Classe abstrata | Qual entidade é gerenciada e como cada operação CRUD se comporta (validações específicas) | `CrudController<T>()` (mixin) | `FaixaCriterioService` | `PacienteService` / `ConfigRetornoService` | `ClienteOficinaService` / `ServicoConfigService` |
| 5 | `NotificationCronService` | Classe abstrata | Quais clientes estão pendentes, qual mensagem enviar e em qual frequência (cron) | `NotificationEngine` | `CobrancaService` | `NotificacaoSaudeService` | `NotificacaoOficinaService` |

---

## Detalhe por ponto

### 1. `ConversationOrchestrator` — interface
`src/core/whatsapp/conversation-orchestrator.interface.ts`

Define como o webhook sabe **quem mandou a mensagem** e **o que fazer com ela**.

```
WhatsAppWebhookService (fixo)
  → chama findClienteByTelefone()
  → chama findOuCriarSessao()
  → chama responder()
```

| Instância | Implementação | Entidade do cliente |
|---|---|---|
| negocia | `PropostaService` | `Devedor` |
| saúde | `ConsultaService` | `Paciente` |
| oficina | `AgendamentoService` | `ClienteOficina` |

---

### 2. `NegotiationContextProvider` — interface
`src/core/negotiation/negotiation-context.interface.ts`

Define **quem é o agente de IA** desta instância: nome, persona, ferramentas e critérios de aprovação.

```
NegotiationEngine (fixo)
  → chama buildContext() para montar o prompt
  → chama validateTool() quando o agente tenta executar uma ação
```

| Instância | Implementação | Agente | Ferramenta principal |
|---|---|---|---|
| negocia | `NegociaContextProvider` | "Marcos" (cobrança) | `validar_contraproposta` |
| saúde | `SaudeContextProvider` | "Ana" (retorno clínico) | `confirmar_retorno` |
| oficina | `OficinaContextProvider` | "Carlos" (revisão veicular) | `confirmar_agendamento` |

---

### 3. `NotificationSchedulerProvider` — interface
`src/core/notification/notification-scheduler.interface.ts`

Define **quem recebe notificação** e **o que diz a mensagem**. O motor de envio (`NotificationEngine`) é fixo.

```
NotificationEngine (fixo)
  → chama getEmpresasAtivas()
  → chama getClientesPendentes(empresaId)
  → chama buildMessage(cliente)
```

| Instância | Implementação | Gatilho | Critério de "pendente" |
|---|---|---|---|
| negocia | `CobrancaService` | `@Cron` (seg/qua/sex 9h) | devedor com proposta em aberto |
| saúde | `NotificacaoSaudeService` | `@Cron` (seg/qua 8h) | paciente com retorno pendente |
| oficina | `NotificacaoOficinaService` | `@Cron` (ter/qui 10h) | cliente com revisão pendente |

---

### 4. `CrudService<T>` — classe abstrata
`src/core/crud/crud.service.ts`

Define os 5 métodos de CRUD como **abstratos** — a instância implementa todos com sua entidade específica.

```
CrudController<T>() [mixin fixo]
  → delega para CrudService<T> (abstrato)
    → implementado pela instância com sua entidade
```

Métodos abstratos: `findAll`, `findById`, `create`, `update`, `remove`.

| Instância | Implementação | Entidade |
|---|---|---|
| negocia | `FaixaCriterioService` | `FaixaCriterio` |
| saúde | `PacienteService` | `Paciente` |
| saúde | `ConfigRetornoService` | `ConfigRetorno` |
| oficina | `ClienteOficinaService` | `ClienteOficina` |
| oficina | `ServicoConfigService` | `ServicoConfig` |

---

### 5. `NotificationCronService` — classe abstrata
`src/core/notification/notification-cron.service.ts`

Já implementa `dispararLembretesManual()` (fixo). Os 3 métodos de domínio são **abstratos** — a instância implementa.

```
NotificationCronService (abstrata)
  └─ implementa NotificationSchedulerProvider (interface — ponto 3)
       ↑ estendida por
  CobrancaService / NotificacaoSaudeService / NotificacaoOficinaService
```

Métodos abstratos: `getEmpresasAtivas`, `getClientesPendentes`, `buildMessage`.

| Instância | Implementação | Cron configurado |
|---|---|---|
| negocia | `CobrancaService` | `0 9 * * 1,3,5` (seg/qua/sex 9h) |
| saúde | `NotificacaoSaudeService` | `0 8 * * 1,3` (seg/qua 8h) |
| oficina | `NotificacaoOficinaService` | `0 10 * * 2,4` (ter/qui 10h) |

---

## Relação entre os pontos 3 e 5

`CobrancaService`, `NotificacaoSaudeService` e `NotificacaoOficinaService` aparecem nos pontos **3 e 5** ao mesmo tempo.

Isso acontece porque `NotificationCronService` (abstrata) já estende `NotificationSchedulerProvider` (interface). Quem herda a abstrata automaticamente satisfaz a interface.

```
NotificationSchedulerProvider  ← ponto flexível 3 (interface)
        ↑ implementa
NotificationCronService         ← ponto flexível 5 (classe abstrata)
        ↑ estende
CobrancaService / NotificacaoSaudeService / NotificacaoOficinaService
```
