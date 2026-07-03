# Pontos Flexíveis do Framework

São **5 pontos flexíveis** no total: 3 interfaces e 2 classes abstratas.

---

## Interfaces (contrato puro — instância implementa do zero)

### 1. `ConversationOrchestrator`
> "Quem é o cliente e como funciona a sessão de conversa?"

| Instância | Classe que implementa |
|---|---|
| negocia | `PropostaService` |
| saúde | `ConsultaService` |
| oficina | `AgendamentoService` |

---

### 2. `NegotiationContextProvider`
> "Qual é o prompt do agente de IA, quais tools ele tem e se o resultado de uma tool é válido?"

| Instância | Classe que implementa |
|---|---|
| negocia | `NegociaContextProvider` |
| saúde | `SaudeContextProvider` |
| oficina | `OficinaContextProvider` |

---

### 3. `NotificationSchedulerProvider`
> "Quais empresas têm notificações, quais clientes recebem e qual é o texto da mensagem?"

| Instância | Classe que implementa |
|---|---|
| negocia | `CobrancaService` |
| saúde | `NotificacaoSaudeService` |
| oficina | `NotificacaoOficinaService` |

---

## Classes Abstratas (contrato com implementação parcial — instância estende)

### 4. `CrudService<T>`
> Define os 5 métodos (findAll, findById, create, update, remove) — todos abstratos, instância implementa todos.

| Instância | Classe que estende | Entidade |
|---|---|---|
| negocia | `FaixaCriterioService` | `FaixaCriterio` |
| saúde | `PacienteService` | `Paciente` |
| saúde | `ConfigRetornoService` | `ConfigRetorno` |
| oficina | `ClienteOficinaService` | `ClienteOficina` |
| oficina | `ServicoConfigService` | `ServicoConfig` |

---

### 5. `NotificationCronService`
> Já implementa `dispararLembretesManual` (fixo no core). Os 3 métodos variáveis são abstratos — instância implementa.

| Instância | Classe que estende |
|---|---|
| negocia | `CobrancaService` |
| saúde | `NotificacaoSaudeService` |
| oficina | `NotificacaoOficinaService` |

---

## Detalhe importante

`CobrancaService`, `NotificacaoSaudeService` e `NotificacaoOficinaService` aparecem nos pontos **3 e 5** ao mesmo tempo.

Isso acontece porque `NotificationCronService` (abstrata) já implementa `NotificationSchedulerProvider` (interface). Quando a classe da instância estende `NotificationCronService`, ela automaticamente satisfaz os dois pontos flexíveis por herança.

```
NotificationSchedulerProvider  ← interface (ponto flexível 3)
        ↑ implementa
NotificationCronService         ← abstract class (ponto flexível 5)
        ↑ estende
CobrancaService / NotificacaoSaudeService / NotificacaoOficinaService
```
