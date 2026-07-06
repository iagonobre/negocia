---
config:
  layout: elk
---
classDiagram
  direction TB

  namespace HotSpots {
    class ConversationOrchestrator {
      <<interface>>
      +findClienteByTelefone()
      +findOuCriarSessao()
      +responder()
    }

    class NegotiationContextProvider {
      <<interface>>
      +buildContext()
      +getTools()
      +validateTool()
    }

    class NotificationSchedulerProvider {
      <<interface>>
      +getEmpresasAtivas()
      +getClientesPendentes()
      +buildMessage()
    }
  }

  namespace Core {
    class LlmService {
      +chamarLLM()
    }

    class WhatsAppService {
      +enviarMensagem()
    }

    class NegotiationEngine {
      +iniciar()
      +conversar()
    }

    class NotificationEngine {
      +enviarNotificacoes()
      +enviarNotificacoesParaEmpresa()
    }
  }

  namespace Framework {
    class ConversationService {
      <<abstract>>
      +findClienteByTelefone()*
      +findSessaoPendente()*
      +carregarEntidadeComConfig()*
      +persistirSessao()*
      +getSessao()*
      +getLimitesDaSessao()*
      +getContextProvider()*
      +atualizarHistorico()*
      +findOuCriarSessao()
      +responder()
      +criarSessao()
      +iniciarEEnviar()
      +conversar()
    }

    class NotificationCronService {
      <<abstract>>
      +getEmpresasAtivas()*
      +getClientesPendentes()*
      +buildMessage()*
      +executarCron()
      +dispararLembretesManual()
    }

    class CrudService {
      <<abstract>>
      +findAll()*
      +findById()*
      +create()*
      +update()*
      +remove()*
      +importarCsv()
      +historico()
    }

    class CrudController {
      <<abstract>>
      +findAll()
      +findById()
      +create()
      +update()
      +remove()
    }
  }

  namespace Negocia {
    class NegociaContextProvider {
      +buildContext()
      +getTools()
      +validateTool()
      -validarContraproposta()
    }

    class PropostaService {
      +gerarProposta()
      +listarPropostas()
      +buscarProposta()
      +atualizarStatus()
    }

    class CobrancaService {
      +enviarLembretesParcelados()
      +getEmpresasAtivas()
      +getClientesPendentes()
      +buildMessage()
    }

    class DevedorService {
      #parseCsvRow()
      #upsertMany()
      #findComHistorico()
    }

    class FaixaCriterioService {
      -validarFaixa()
    }

    class DevedorController {
      +historico()
      +importar()
    }

    class FaixaCriterioController {
    }
  }

  namespace Saude {
    class SaudeContextProvider {
      +buildContext()
      +getTools()
      +validateTool()
    }

    class ConsultaService {
      +listar()
      +buscar()
    }

    class PacienteService {
    }

    class PacienteController {
    }

    class ConfigRetornoService {
    }

    class ConfigRetornoController {
    }

    class NotificacaoSaudeService {
      +getEmpresasAtivas()
      +getClientesPendentes()
      +buildMessage()
    }
  }

  namespace Oficina {
    class OficinaContextProvider {
      +buildContext()
      +getTools()
      +validateTool()
    }

    class AgendamentoService {
      +listar()
      +buscar()
    }

    class ClienteOficinaService {
    }

    class ClienteOficinaController {
    }

    class ServicoConfigService {
    }

    class ServicoConfigController {
    }

    class NotificacaoOficinaService {
      +getEmpresasAtivas()
      +getClientesPendentes()
      +buildMessage()
    }
  }

  %% ── Realização — tracejada + triângulo vazio ──────────────────────────────
  ConversationService ..|> ConversationOrchestrator : implements
  NotificationCronService ..|> NotificationSchedulerProvider : implements
  NegociaContextProvider ..|> NegotiationContextProvider : implements
  SaudeContextProvider ..|> NegotiationContextProvider : implements
  OficinaContextProvider ..|> NegotiationContextProvider : implements

  %% ── Associação via @Inject — sólida + seta ───────────────────────────────
  NegotiationEngine --> LlmService : usa
  NotificationEngine --> WhatsAppService : usa
  ConversationService --> NegotiationEngine : @Inject
  ConversationService --> WhatsAppService : @Inject
  NotificationCronService --> NotificationEngine : @Inject

  %% ── Dependência via parâmetro — tracejada + seta ─────────────────────────
  ConversationService ..> NegotiationContextProvider : getContextProvider()
  NotificationEngine ..> NotificationSchedulerProvider : parâmetro

  %% ── Herança Negocia — sólida + triângulo vazio ───────────────────────────
  PropostaService --|> ConversationService
  CobrancaService --|> NotificationCronService
  DevedorService --|> CrudService
  FaixaCriterioService --|> CrudService
  DevedorController --|> CrudController
  FaixaCriterioController --|> CrudController

  %% ── Herança Saude — sólida + triângulo vazio ─────────────────────────────
  ConsultaService --|> ConversationService
  PacienteService --|> CrudService
  PacienteController --|> CrudController
  ConfigRetornoService --|> CrudService
  ConfigRetornoController --|> CrudController
  NotificacaoSaudeService --|> NotificationCronService

  %% ── Herança Oficina — sólida + triângulo vazio ───────────────────────────
  AgendamentoService --|> ConversationService
  ClienteOficinaService --|> CrudService
  ClienteOficinaController --|> CrudController
  ServicoConfigService --|> CrudService
  ServicoConfigController --|> CrudController
  NotificacaoOficinaService --|> NotificationCronService
