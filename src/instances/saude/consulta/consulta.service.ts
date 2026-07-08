import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsultaRepository } from './consulta.repository';
import { PacienteRepository } from '../paciente/paciente.repository';
import { SaudeContextProvider } from '../saude-context.provider';
import { ConversationService } from '../../../core/conversation/conversation.service';

@Injectable()
export class ConsultaService extends ConversationService {
  constructor(
    private readonly consultaRepository: ConsultaRepository,
    private readonly pacienteRepository: PacienteRepository,
    private readonly saudeContextProvider: SaudeContextProvider,
  ) {
    super();
  }

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null> {
    const paciente = await this.pacienteRepository.findByTelefone(telefone);
    if (!paciente) return null;
    return { id: paciente.id, empresaId: paciente.empresaId };
  }

  // ── ConversationService — abstratos ──────────────────────────────────────

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

  getLimitesDaSessao(_sessao: any): Record<string, any> {
    return {};
  }

  getContextProvider() {
    return this.saudeContextProvider;
  }

  async atualizarHistorico(consultaId: string, historico: any[]) {
    await this.consultaRepository.atualizarHistorico(consultaId, historico);
  }

  async finalizarSessao(consultaId: string, _empresaId: string, dados: Record<string, any>): Promise<void> {
    await this.consultaRepository.atualizarStatus(consultaId, 'CONFIRMADA', new Date(dados.dataHora));
  }

  // ── Domínio saúde ────────────────────────────────────────────────────────

  async listar(empresaId: string) {
    return this.consultaRepository.findAllByEmpresa(empresaId);
  }

  async buscar(id: string, empresaId: string) {
    const consulta = await this.consultaRepository.findById(id, empresaId);
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    return consulta;
  }
}
