import { Injectable, NotFoundException } from '@nestjs/common';
import { AgendamentoRepository } from './agendamento.repository';
import { ClienteOficinaRepository } from '../cliente-oficina/cliente-oficina.repository';
import { OficinaContextProvider } from '../oficina-context.provider';
import { ConversationService } from '../../../core/conversation/conversation.service';

@Injectable()
export class AgendamentoService extends ConversationService {
  constructor(
    private readonly agendamentoRepository: AgendamentoRepository,
    private readonly clienteRepository: ClienteOficinaRepository,
    private readonly oficinaContextProvider: OficinaContextProvider,
  ) {
    super();
  }

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null> {
    const cliente = await this.clienteRepository.findByTelefone(telefone);
    if (!cliente) return null;
    return { id: cliente.id, empresaId: cliente.empresaId };
  }

  // ── ConversationService — abstratos ──────────────────────────────────────

  async findSessaoPendente(clienteId: string) {
    return this.agendamentoRepository.findPendentePorCliente(clienteId);
  }

  async carregarEntidadeComConfig(clienteId: string, empresaId: string) {
    const resultado = await this.agendamentoRepository.findClienteComConfig(clienteId, empresaId);
    if (!resultado) throw new NotFoundException('Cliente não encontrado.');
    return {
      entidade: resultado.cliente,
      config: resultado.servicoConfig,
      telefone: resultado.cliente.telefone,
      extras: {},
    };
  }

  async persistirSessao(clienteId: string, empresaId: string, historico: any[]) {
    const agendamento = await this.agendamentoRepository.create(clienteId, empresaId, historico);
    await this.clienteRepository.updateStatus(clienteId, 'AGENDADO');
    return agendamento;
  }

  async getSessao(agendamentoId: string, empresaId: string) {
    return this.agendamentoRepository.findById(agendamentoId, empresaId);
  }

  getLimitesDaSessao(_sessao: any): Record<string, any> {
    return {};
  }

  getContextProvider() {
    return this.oficinaContextProvider;
  }

  async atualizarHistorico(agendamentoId: string, historico: any[]) {
    await this.agendamentoRepository.atualizarHistorico(agendamentoId, historico);
  }

  // ── Domínio oficina ──────────────────────────────────────────────────────

  async listar(empresaId: string) {
    return this.agendamentoRepository.findAllByEmpresa(empresaId);
  }

  async buscar(id: string, empresaId: string) {
    const agendamento = await this.agendamentoRepository.findById(id, empresaId);
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    return agendamento;
  }
}
