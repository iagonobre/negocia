import { Injectable, NotFoundException } from '@nestjs/common';
import { AgendamentoRepository } from './agendamento.repository';
import { ClienteOficinaRepository } from '../cliente-oficina/cliente-oficina.repository';
import { NegotiationEngine } from '../../../core/negotiation/negotiation.engine';
import { OficinaContextProvider } from '../oficina-context.provider';
import { ConversationOrchestrator } from '../../../core/whatsapp/conversation-orchestrator.interface';

@Injectable()
export class AgendamentoService implements ConversationOrchestrator {
  constructor(
    private readonly agendamentoRepository: AgendamentoRepository,
    private readonly clienteRepository: ClienteOficinaRepository,
    private readonly negotiationEngine: NegotiationEngine,
    private readonly oficinaContextProvider: OficinaContextProvider,
  ) {}

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null> {
    const cliente = await this.clienteRepository.findByTelefone(telefone);
    if (!cliente) return null;
    return { id: cliente.id, empresaId: cliente.empresaId };
  }

  async findOuCriarSessao(
    clienteId: string,
    empresaId: string,
  ): Promise<{ id: string; mensagemInicial?: string }> {
    const existente = await this.agendamentoRepository.findPendentePorCliente(clienteId);
    if (existente) return { id: existente.id };
    const novo = await this.iniciarAgendamento(clienteId, empresaId);
    return { id: novo.id, mensagemInicial: novo.ultimaMensagemAgente };
  }

  async responder(agendamentoId: string, mensagem: string, empresaId: string): Promise<string> {
    const { mensagemAgente } = await this.conversar(agendamentoId, empresaId, mensagem);
    return mensagemAgente;
  }

  // ── Domínio oficina ──────────────────────────────────────────────────────

  async iniciarAgendamento(clienteId: string, empresaId: string) {
    const resultado = await this.agendamentoRepository.findClienteComConfig(clienteId, empresaId);
    if (!resultado) throw new NotFoundException('Cliente não encontrado.');

    const { cliente, servicoConfig } = resultado;
    const context = this.oficinaContextProvider.buildContext(cliente, servicoConfig);
    const { historico, mensagemAgente } = await this.negotiationEngine.iniciar(context);

    const agendamento = await this.agendamentoRepository.create(clienteId, empresaId, historico);

    await this.clienteRepository.updateStatus(clienteId, 'AGENDADO');

    return { id: agendamento.id, status: agendamento.status, ultimaMensagemAgente: mensagemAgente };
  }

  async conversar(agendamentoId: string, empresaId: string, mensagemUsuario: string) {
    const agendamento = await this.agendamentoRepository.findById(agendamentoId, empresaId);
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (agendamento.status !== 'PENDENTE') throw new NotFoundException('Agendamento já finalizado.');

    const historico = agendamento.historico as any[];

    const validator = (toolName: string, args: Record<string, any>) =>
      this.oficinaContextProvider.validateTool(toolName, args, {});

    const { historico: historicoAtualizado, mensagemAgente } = await this.negotiationEngine.conversar(
      mensagemUsuario,
      historico,
      this.oficinaContextProvider.getTools(),
      validator,
    );

    await this.agendamentoRepository.atualizarHistorico(agendamentoId, historicoAtualizado);

    return { id: agendamentoId, mensagemAgente };
  }

  async listar(empresaId: string) {
    return this.agendamentoRepository.findAllByEmpresa(empresaId);
  }

  async buscar(id: string, empresaId: string) {
    const agendamento = await this.agendamentoRepository.findById(id, empresaId);
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    return agendamento;
  }
}
