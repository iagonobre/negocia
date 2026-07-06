# Plano de Refatoração do Framework

Objetivo: eliminar acoplamento entre instâncias e core, subir código repetido e lógica similar para o framework.

---

## Diagnóstico completo

### Fase 1 — Instâncias chamando o Core diretamente

#### `NegotiationEngine` chamado diretamente — 3 instâncias

| Arquivo | Linhas problemáticas |
|---|---|
| `src/instances/negocia/proposta/proposta.service.ts` | import L4, injeção L17, `iniciar()` L69, `conversar()` L94 |
| `src/instances/saude/consulta/consulta.service.ts` | import L4, injeção L13, `iniciar()` L48, `conversar()` L67 |
| `src/instances/oficina/agendamento/agendamento.service.ts` | import L4, injeção L13, `iniciar()` L48, `conversar()` L67 |

#### `NotificationEngine` injetado apenas para repassar ao `super()` — 3 instâncias

| Arquivo | Situação |
|---|---|
| `src/instances/negocia/cobranca/cobranca.service.ts` | import L4, injeção L11, `super(notificationEngine)` L13 |
| `src/instances/saude/notificacao/notificacao-saude.service.ts` | import L4, injeção L11, `super(notificationEngine)` L13 |
| `src/instances/oficina/notificacao/notificacao-oficina.service.ts` | import L4, injeção L11, `super(notificationEngine)` L13 |

#### `WhatsAppService` chamado diretamente nos controllers de iniciar — 3 instâncias

| Arquivo | Situação |
|---|---|
| `src/instances/negocia/whatsapp/whatsapp.controller.ts` | `whatsappService.enviarMensagem()` L37 |
| `src/instances/saude/consulta/consulta.controller.ts` | `whatsappService.enviarMensagem()` L30 |
| `src/instances/oficina/agendamento/agendamento.controller.ts` | `whatsappService.enviarMensagem()` L30 |

#### `WhatsAppService` e `WhatsAppWebhookService` nos controllers webhook — VÁLIDO por design

Necessários pelo padrão do mixin. Não são problema.

---

### Fase 2 — Código idêntico deve subir para o core

#### `responder()` — idêntico nas três instâncias

```ts
async responder(sessaoId: string, mensagem: string, empresaId: string): Promise<string> {
  const { mensagemAgente } = await this.conversar(sessaoId, empresaId, mensagem);
  return mensagemAgente;
}
```

Vira método concreto na `ConversationService` abstrata.

#### `findOuCriarSessao()` — estrutura idêntica nas três

Lógica: "busca pendente, retorna se existir, cria se não existir". Vira método concreto na `ConversationService` com abstrações para as partes que variam.

#### `conversar()` — núcleo idêntico nas três

Sequência: busca sessão → monta validator → chama engine → atualiza histórico → retorna mensagem. Vira método concreto na `ConversationService`. O que varia (limites e repositório) fica em métodos abstratos.

---

### Fase 3 — Lógica similar deve subir para o core

#### `iniciarSessao()` — mesmo processo nas três

Sequência: `buildContext → engine.iniciar → repository.create`. Vira método concreto `criarSessao()` na `ConversationService`. O que varia (carregar entidade+config, persistir) fica em métodos abstratos.

#### `PrismaService` direto nos services de notificação

`notificacao-saude.service.ts` e `notificacao-oficina.service.ts` acessam o Prisma diretamente no service. Precisam de repositórios dedicados como o `CobrancaService` faz com `PropostaRepository`.

#### `NegotiationModule` em módulos de instância

Após criação do `ConversationModule`, os módulos das instâncias param de importar `NegotiationModule` diretamente.

---

## Implementação passo a passo

---

### Passo 1 — Criar `ConversationService` abstrata

**Arquivo a criar:** `src/core/conversation/conversation.service.ts`

Recebe `NegotiationEngine` e `WhatsAppService` no construtor. Implementa `ConversationOrchestrator` (HS1). Expõe métodos concretos que encapsulam o engine e métodos abstratos que as instâncias preenchem.

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { NegotiationEngine } from '../negotiation/negotiation.engine';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NegotiationContextProvider } from '../negotiation/negotiation-context.interface';
import { ConversationOrchestrator } from '../whatsapp/conversation-orchestrator.interface';

@Injectable()
export abstract class ConversationService implements ConversationOrchestrator {
  constructor(
    protected readonly negotiationEngine: NegotiationEngine,
    protected readonly whatsappService: WhatsAppService,
  ) {}

  // ── Abstratos — instância implementa ─────────────────────────────────────

  abstract findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null>;
  abstract findSessaoPendente(clienteId: string): Promise<{ id: string } | null>;

  // retorna entidade (ex: devedor/paciente/cliente), config (ex: faixa/configRetorno),
  // telefone para envio, e extras opcionais (ex: limites de negociação)
  abstract carregarEntidadeComConfig(
    clienteId: string,
    empresaId: string,
  ): Promise<{ entidade: any; config: any; telefone: string; extras?: any }>;

  // persiste a sessão no repositório da instância (proposta, consulta, agendamento)
  abstract persistirSessao(
    clienteId: string,
    empresaId: string,
    historico: any[],
    extras?: any,
  ): Promise<{ id: string; status?: string }>;

  // busca a sessão para conversar
  abstract getSessao(
    sessaoId: string,
    empresaId: string,
  ): Promise<{ historico: any[]; status: string; [key: string]: any } | null>;

  // retorna os limites da sessão (negocia: proposta.limites; saúde/oficina: {})
  abstract getLimitesDaSessao(sessao: any): Record<string, any>;

  abstract getContextProvider(): NegotiationContextProvider;
  abstract atualizarHistorico(sessaoId: string, historico: any[]): Promise<void>;

  // ── Concretos — framework implementa ─────────────────────────────────────

  // ConversationOrchestrator — chamado pelo webhook
  async findOuCriarSessao(
    clienteId: string,
    empresaId: string,
  ): Promise<{ id: string; mensagemInicial?: string }> {
    const existente = await this.findSessaoPendente(clienteId);
    if (existente) return { id: existente.id };
    const nova = await this.criarSessao(clienteId, empresaId);
    return { id: nova.id, mensagemInicial: nova.ultimaMensagemAgente };
  }

  // ConversationOrchestrator — chamado pelo webhook
  async responder(sessaoId: string, mensagem: string, empresaId: string): Promise<string> {
    const { mensagemAgente } = await this.conversar(sessaoId, empresaId, mensagem);
    return mensagemAgente;
  }

  // cria sessão sem enviar WhatsApp (usado pelo webhook via findOuCriarSessao)
  async criarSessao(
    clienteId: string,
    empresaId: string,
  ): Promise<{ id: string; status: string; ultimaMensagemAgente: string; telefone: string }> {
    const { entidade, config, telefone, extras } = await this.carregarEntidadeComConfig(clienteId, empresaId);
    const context = this.getContextProvider().buildContext(entidade, config);
    const { historico, mensagemAgente } = await this.negotiationEngine.iniciar(context);
    const sessao = await this.persistirSessao(clienteId, empresaId, historico, extras);
    return { id: sessao.id, status: sessao.status ?? 'PENDENTE', ultimaMensagemAgente: mensagemAgente, telefone };
  }

  // cria sessão E envia WhatsApp (usado pelo endpoint REST de iniciar)
  async iniciarEEnviar(clienteId: string, empresaId: string): Promise<{ id: string; status: string }> {
    const { id, status, ultimaMensagemAgente, telefone } = await this.criarSessao(clienteId, empresaId);
    await this.whatsappService.enviarMensagem(`+${telefone}`, ultimaMensagemAgente);
    return { id, status };
  }

  // núcleo da conversa — usado por responder() e pelos controllers de chat
  async conversar(
    sessaoId: string,
    empresaId: string,
    mensagemUsuario: string,
  ): Promise<{ id: string; mensagemAgente: string }> {
    const sessao = await this.getSessao(sessaoId, empresaId);
    if (!sessao) throw new NotFoundException('Sessão não encontrada.');
    if (sessao.status !== 'PENDENTE') throw new NotFoundException('Sessão já finalizada.');

    const provider = this.getContextProvider();
    const limites = this.getLimitesDaSessao(sessao);
    const validator = (toolName: string, args: Record<string, any>) =>
      provider.validateTool(toolName, args, limites);

    const { historico: historicoAtualizado, mensagemAgente } = await this.negotiationEngine.conversar(
      mensagemUsuario,
      sessao.historico as any[],
      provider.getTools(),
      validator,
    );

    await this.atualizarHistorico(sessaoId, historicoAtualizado);
    return { id: sessaoId, mensagemAgente };
  }
}
```

---

### Passo 2 — Criar `ConversationModule`

**Arquivo a criar:** `src/core/conversation/conversation.module.ts`

Re-exporta `NegotiationModule` e `WhatsAppModule` para que qualquer módulo de instância que importe `ConversationModule` tenha acesso a `NegotiationEngine` e `WhatsAppService` no seu contexto DI — necessário para o `super()` nos serviços concretos.

```ts
import { Module } from '@nestjs/common';
import { NegotiationModule } from '../negotiation/negotiation.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [NegotiationModule, WhatsAppModule],
  exports: [NegotiationModule, WhatsAppModule],
})
export class ConversationModule {}
```

---

### Passo 3 — Refatorar `PropostaService`

**Arquivo:** `src/instances/negocia/proposta/proposta.service.ts`

- Remove `import NegotiationEngine`
- Passa a estender `ConversationService`
- Recebe `NegotiationEngine` e `WhatsAppService` no construtor APENAS para repassar ao `super()`
- Implementa todos os métodos abstratos
- `gerarProposta` faz a validação de negócio (sem proposta em andamento) e chama `iniciarEEnviar`
- `conversar` agora delega totalmente para a implementação do pai (não sobrescreve)

```ts
@Injectable()
export class PropostaService extends ConversationService {
  constructor(
    private readonly propostaRepository: PropostaRepository,
    private readonly devedorRepository: DevedorRepository,
    private readonly negociaContextProvider: NegociaContextProvider,
    negotiationEngine: NegotiationEngine,
    whatsappService: WhatsAppService,
  ) {
    super(negotiationEngine, whatsappService);
  }

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string) {
    const devedor = await this.devedorRepository.findByTelefone(telefone);
    if (!devedor) return null;
    return { id: devedor.id, empresaId: devedor.empresaId };
  }

  // ── ConversationService — abstratos ──────────────────────────────────────

  async findSessaoPendente(devedorId: string) {
    return this.propostaRepository.findPendentePorDevedor(devedorId);
  }

  async carregarEntidadeComConfig(devedorId: string, empresaId: string) {
    const resultado = await this.propostaRepository.findDevedorComFaixa(devedorId, empresaId);
    if (!resultado) throw new NotFoundException('Devedor não encontrado.');
    const { devedor, faixa } = resultado;
    if (!faixa) throw new FaixaCriterioNaoEncontradaException(devedor.valorDivida);
    return {
      entidade: devedor,
      config: faixa,
      telefone: devedor.telefone,
      extras: {
        valorOriginal: devedor.valorDivida,
        descontoMaximo: faixa.descontoMaximo,
        parcelasMaximas: faixa.parcelasMaximas,
        prazoMaximoDias: faixa.prazoMaximoDias,
      },
    };
  }

  async persistirSessao(devedorId: string, empresaId: string, historico: any[], limites: any) {
    return this.propostaRepository.create(devedorId, empresaId, limites, historico);
  }

  async getSessao(propostaId: string, empresaId: string) {
    return this.propostaRepository.findById(propostaId, empresaId);
  }

  getLimitesDaSessao(proposta: any) {
    return proposta.limites as Record<string, any>;
  }

  getContextProvider() {
    return this.negociaContextProvider;
  }

  async atualizarHistorico(propostaId: string, historico: any[]) {
    await this.propostaRepository.atualizarHistorico(propostaId, historico);
  }

  // ── Domínio negocia ──────────────────────────────────────────────────────

  // valida regra de negócio e inicia (chama iniciarEEnviar do pai)
  async gerarProposta(devedorId: string, empresaId: string) {
    const pendente = await this.findSessaoPendente(devedorId);
    if (pendente) throw new NegociacaoEmAndamentoException();
    return this.iniciarEEnviar(devedorId, empresaId);
  }

  async listarPropostas(empresaId: string) { ... }
  async buscarProposta(id: string, empresaId: string) { ... }
  async atualizarStatus(...) { ... }
}
```

---

### Passo 4 — Refatorar `ConsultaService`

**Arquivo:** `src/instances/saude/consulta/consulta.service.ts`

Mesmo padrão do `PropostaService`. Diferenças:
- `carregarEntidadeComConfig` busca paciente + configRetorno, retorna `extras: {}` (sem limites)
- `getLimitesDaSessao` retorna `{}`
- `persistirSessao` cria consulta e atualiza status do paciente para `RETORNO_AGENDADO`

```ts
@Injectable()
export class ConsultaService extends ConversationService {
  constructor(
    private readonly consultaRepository: ConsultaRepository,
    private readonly pacienteRepository: PacienteRepository,
    private readonly saudeContextProvider: SaudeContextProvider,
    negotiationEngine: NegotiationEngine,
    whatsappService: WhatsAppService,
  ) {
    super(negotiationEngine, whatsappService);
  }

  async findClienteByTelefone(telefone: string) {
    const paciente = await this.pacienteRepository.findByTelefone(telefone);
    if (!paciente) return null;
    return { id: paciente.id, empresaId: paciente.empresaId };
  }

  async findSessaoPendente(pacienteId: string) {
    return this.consultaRepository.findPendentePorPaciente(pacienteId);
  }

  async carregarEntidadeComConfig(pacienteId: string, empresaId: string) {
    const resultado = await this.consultaRepository.findPacienteComConfig(pacienteId, empresaId);
    if (!resultado) throw new NotFoundException('Paciente não encontrado.');
    return {
      entidade: resultado.paciente,
      config: resultado.configRetorno,
      telefone: resultado.paciente.telefone,
      extras: {},
    };
  }

  async persistirSessao(pacienteId: string, empresaId: string, historico: any[]) {
    const consulta = await this.consultaRepository.create(pacienteId, empresaId, historico);
    await this.pacienteRepository.updateStatus(pacienteId, 'RETORNO_AGENDADO');
    return consulta;
  }

  async getSessao(consultaId: string, empresaId: string) {
    return this.consultaRepository.findById(consultaId, empresaId);
  }

  getLimitesDaSessao(_sessao: any) { return {}; }
  getContextProvider() { return this.saudeContextProvider; }

  async atualizarHistorico(consultaId: string, historico: any[]) {
    await this.consultaRepository.atualizarHistorico(consultaId, historico);
  }

  async listar(empresaId: string) { ... }
  async buscar(id: string, empresaId: string) { ... }
}
```

---

### Passo 5 — Refatorar `AgendamentoService`

**Arquivo:** `src/instances/oficina/agendamento/agendamento.service.ts`

Mesmo padrão. Diferenças:
- `carregarEntidadeComConfig` busca clienteOficina + servicoConfig
- `persistirSessao` cria agendamento e atualiza status do cliente para `AGENDADO`

```ts
@Injectable()
export class AgendamentoService extends ConversationService {
  constructor(
    private readonly agendamentoRepository: AgendamentoRepository,
    private readonly clienteRepository: ClienteOficinaRepository,
    private readonly oficinaContextProvider: OficinaContextProvider,
    negotiationEngine: NegotiationEngine,
    whatsappService: WhatsAppService,
  ) {
    super(negotiationEngine, whatsappService);
  }

  // mesma estrutura — apenas entidade é ClienteOficina e sessão é Agendamento
  // getLimitesDaSessao retorna {}
  // persistirSessao atualiza status para 'AGENDADO'
}
```

---

### Passo 6 — Atualizar controllers de iniciar

#### `WhatsAppController` — negocia
**Arquivo:** `src/instances/negocia/whatsapp/whatsapp.controller.ts`

Remove `devedorRepository` do construtor (o envio do WhatsApp agora acontece dentro de `gerarProposta → iniciarEEnviar`). `whatsappService` e `webhookService` permanecem pois são exigidos pelo mixin.

```ts
export class WhatsAppController extends WhatsAppWebhookController() {
  constructor(
    readonly orchestrator: PropostaService,
    readonly whatsappService: WhatsAppService,       // exigido pelo mixin
    readonly webhookService: WhatsAppWebhookService, // exigido pelo mixin
    // devedorRepository: REMOVIDO
  ) {
    super();
  }

  @Post('iniciar/:devedorId')
  async iniciarNegociacao(@Param('devedorId') devedorId: string, @Empresa() empresa: JwtPayload) {
    const proposta = await this.orchestrator.gerarProposta(devedorId, empresa.sub);
    return { propostaId: proposta.id, status: proposta.status };
  }
}
```

#### `ConsultaController` — saúde
**Arquivo:** `src/instances/saude/consulta/consulta.controller.ts`

Remove `whatsappService` e `pacienteRepository`. O controller chama `iniciarEEnviar` que já faz tudo.

```ts
export class ConsultaController {
  constructor(
    private readonly consultaService: ConsultaService,
    // pacienteRepository: REMOVIDO
    // whatsappService: REMOVIDO
  ) {}

  @Post('iniciar/:pacienteId')
  async iniciarConsulta(@Param('pacienteId') pacienteId: string, @Empresa() empresa: JwtPayload) {
    const result = await this.consultaService.iniciarEEnviar(pacienteId, empresa.sub);
    return { consultaId: result.id, status: result.status };
  }
}
```

#### `AgendamentoController` — oficina
**Arquivo:** `src/instances/oficina/agendamento/agendamento.controller.ts`

Mesmo padrão do `ConsultaController`.

```ts
export class AgendamentoController {
  constructor(
    private readonly agendamentoService: AgendamentoService,
    // clienteRepository: REMOVIDO
    // whatsappService: REMOVIDO
  ) {}

  @Post('iniciar/:clienteId')
  async iniciarAgendamento(@Param('clienteId') clienteId: string, @Empresa() empresa: JwtPayload) {
    const result = await this.agendamentoService.iniciarEEnviar(clienteId, empresa.sub);
    return { agendamentoId: result.id, status: result.status };
  }
}
```

---

### Passo 7 — `NotificationCronService` com `@Inject()`

**Arquivo:** `src/core/notification/notification-cron.service.ts`

Usar property injection com `@Inject(NotificationEngine)` para que instâncias não precisem mais injetar o `NotificationEngine` no construtor.

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationEngine } from './notification.engine';
import { NotificationSchedulerProvider } from './notification-scheduler.interface';

@Injectable()
export abstract class NotificationCronService implements NotificationSchedulerProvider {
  @Inject(NotificationEngine)
  protected readonly notificationEngine: NotificationEngine;

  protected readonly logger = new Logger(this.constructor.name);

  abstract getEmpresasAtivas(): Promise<string[]>;
  abstract getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  abstract buildMessage(cliente: any): string;

  async executarCron(): Promise<void> {
    this.logger.log('Iniciando envio de lembretes...');
    const enviados = await this.notificationEngine.enviarNotificacoes(this);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const enviados = await this.notificationEngine.enviarNotificacoesParaEmpresa(empresaId, this);
    return { enviados };
  }
}
```

#### Instâncias de notificação — remover `NotificationEngine` do construtor

**`CobrancaService`:** remove `NotificationEngine` do import e do construtor, remove `super(notificationEngine)` → vira `super()`

```ts
constructor(
  private readonly propostaRepository: PropostaRepository,
  // NotificationEngine: REMOVIDO
) {
  super(); // sem parâmetros
}
```

Mesmo para `NotificacaoSaudeService` e `NotificacaoOficinaService`.

---

### Passo 8 — Criar repositórios para saúde e oficina (notificação)

#### `NotificacaoSaudeRepository`
**Arquivo a criar:** `src/instances/saude/notificacao/notificacao-saude.repository.ts`

Move as queries que estão diretamente no service:

```ts
@Injectable()
export class NotificacaoSaudeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEmpresasAtivas(): Promise<string[]> {
    const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
    return empresas.map((e) => e.id);
  }

  async findPacientesPendentes(empresaId: string) {
    return this.prisma.paciente.findMany({
      where: { empresaId, status: 'RETORNO_PENDENTE' },
    });
  }
}
```

#### `NotificacaoOficinaRepository`
**Arquivo a criar:** `src/instances/oficina/notificacao/notificacao-oficina.repository.ts`

```ts
@Injectable()
export class NotificacaoOficinaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEmpresasAtivas(): Promise<string[]> {
    const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
    return empresas.map((e) => e.id);
  }

  async findClientesPendentes(empresaId: string) {
    return this.prisma.clienteOficina.findMany({
      where: { empresaId, status: 'REVISAO_PENDENTE' },
    });
  }
}
```

Após criar os repositórios, atualizar `NotificacaoSaudeService` e `NotificacaoOficinaService` para remover `PrismaService` e injetar seus repositórios.

---

### Passo 9 — Atualizar módulos das instâncias

#### `PropostaModule`
Troca `NegotiationModule` por `ConversationModule`. Remove `DevedorModule` se `DevedorRepository` já for acessado diretamente (verificar).

```ts
@Module({
  imports: [ConversationModule, DevedorModule],
  providers: [PropostaService, PropostaRepository, NegociaContextProvider],
  exports: [PropostaService, PropostaRepository],
})
export class PropostaModule {}
```

#### `ConsultaModule`
Troca `NegotiationModule` + `WhatsAppModule` por `ConversationModule`. Remove `PacienteModule` se não for mais necessário no módulo (verificar — `PacienteRepository` é usado pelo service).

```ts
@Module({
  imports: [ConversationModule, PacienteModule],
  providers: [ConsultaService, ConsultaRepository, SaudeContextProvider],
  exports: [ConsultaService],
})
export class ConsultaModule {}
```

#### `AgendamentoModule`
Mesmo padrão.

```ts
@Module({
  imports: [ConversationModule, ClienteOficinaModule],
  providers: [AgendamentoService, AgendamentoRepository, OficinaContextProvider],
  exports: [AgendamentoService],
})
export class AgendamentoModule {}
```

#### `NotificacaoSaudeModule` e `NotificacaoOficinaModule`
Adicionar os novos repositórios como providers.

---

### Passo 10 — Verificação final

```bash
npx tsc --noEmit
```

Zero erros esperados.

---

## Resumo do estado final

| Arquivo | Estado |
|---|---|
| `src/core/conversation/conversation.service.ts` | CRIAR — abstrata com toda lógica de conversa |
| `src/core/conversation/conversation.module.ts` | CRIAR — re-exporta NegotiationModule + WhatsAppModule |
| `src/core/notification/notification-cron.service.ts` | MODIFICAR — @Inject() no engine, remove construtor |
| `src/instances/negocia/proposta/proposta.service.ts` | MODIFICAR — extends ConversationService |
| `src/instances/saude/consulta/consulta.service.ts` | MODIFICAR — extends ConversationService |
| `src/instances/oficina/agendamento/agendamento.service.ts` | MODIFICAR — extends ConversationService |
| `src/instances/negocia/whatsapp/whatsapp.controller.ts` | MODIFICAR — remove devedorRepository |
| `src/instances/saude/consulta/consulta.controller.ts` | MODIFICAR — remove whatsappService e pacienteRepository |
| `src/instances/oficina/agendamento/agendamento.controller.ts` | MODIFICAR — remove whatsappService e clienteRepository |
| `src/instances/negocia/cobranca/cobranca.service.ts` | MODIFICAR — remove NotificationEngine do construtor |
| `src/instances/saude/notificacao/notificacao-saude.service.ts` | MODIFICAR — remove NotificationEngine e PrismaService |
| `src/instances/oficina/notificacao/notificacao-oficina.service.ts` | MODIFICAR — remove NotificationEngine e PrismaService |
| `src/instances/saude/notificacao/notificacao-saude.repository.ts` | CRIAR |
| `src/instances/oficina/notificacao/notificacao-oficina.repository.ts` | CRIAR |
| `src/instances/negocia/proposta/proposta.module.ts` | MODIFICAR — ConversationModule |
| `src/instances/saude/consulta/consulta.module.ts` | MODIFICAR — ConversationModule |
| `src/instances/oficina/agendamento/agendamento.module.ts` | MODIFICAR — ConversationModule |
| `src/instances/saude/notificacao/notificacao-saude.module.ts` | MODIFICAR — adiciona repositório |
| `src/instances/oficina/notificacao/notificacao-oficina.module.ts` | MODIFICAR — adiciona repositório |
