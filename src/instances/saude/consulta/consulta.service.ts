import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsultaRepository } from './consulta.repository';
import { PacienteRepository } from '../paciente/paciente.repository';
import { NegotiationEngine } from '../../../core/negotiation/negotiation.engine';
import { SaudeContextProvider } from '../saude-context.provider';
import { ConversationOrchestrator } from '../../../core/whatsapp/conversation-orchestrator.interface';

@Injectable()
export class ConsultaService implements ConversationOrchestrator {
  constructor(
    private readonly consultaRepository: ConsultaRepository,
    private readonly pacienteRepository: PacienteRepository,
    private readonly negotiationEngine: NegotiationEngine,
    private readonly saudeContextProvider: SaudeContextProvider,
  ) {}

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null> {
    const paciente = await this.pacienteRepository.findByTelefone(telefone);
    if (!paciente) return null;
    return { id: paciente.id, empresaId: paciente.empresaId };
  }

  async findOuCriarSessao(
    pacienteId: string,
    empresaId: string,
  ): Promise<{ id: string; mensagemInicial?: string }> {
    const existente = await this.consultaRepository.findPendentePorPaciente(pacienteId);
    if (existente) return { id: existente.id };
    const nova = await this.iniciarConsulta(pacienteId, empresaId);
    return { id: nova.id, mensagemInicial: nova.ultimaMensagemAgente };
  }

  async responder(consultaId: string, mensagem: string, empresaId: string): Promise<string> {
    const { mensagemAgente } = await this.conversar(consultaId, empresaId, mensagem);
    return mensagemAgente;
  }

  // ── Domínio saúde ────────────────────────────────────────────────────────

  async iniciarConsulta(pacienteId: string, empresaId: string) {
    const resultado = await this.consultaRepository.findPacienteComConfig(pacienteId, empresaId);
    if (!resultado) throw new NotFoundException('Paciente não encontrado.');

    const { paciente, configRetorno } = resultado;
    const context = this.saudeContextProvider.buildContext(paciente, configRetorno);
    const { historico, mensagemAgente } = await this.negotiationEngine.iniciar(context);

    const consulta = await this.consultaRepository.create(pacienteId, empresaId, historico);

    await this.pacienteRepository.updateStatus(pacienteId, 'RETORNO_AGENDADO');

    return { id: consulta.id, status: consulta.status, ultimaMensagemAgente: mensagemAgente };
  }

  async conversar(consultaId: string, empresaId: string, mensagemUsuario: string) {
    const consulta = await this.consultaRepository.findById(consultaId, empresaId);
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    if (consulta.status !== 'PENDENTE') throw new NotFoundException('Consulta já finalizada.');

    const historico = consulta.historico as any[];

    const validator = (toolName: string, args: Record<string, any>) =>
      this.saudeContextProvider.validateTool(toolName, args, {});

    const { historico: historicoAtualizado, mensagemAgente } = await this.negotiationEngine.conversar(
      mensagemUsuario,
      historico,
      this.saudeContextProvider.getTools(),
      validator,
    );

    await this.consultaRepository.atualizarHistorico(consultaId, historicoAtualizado);

    return { id: consultaId, mensagemAgente };
  }

  async listar(empresaId: string) {
    return this.consultaRepository.findAllByEmpresa(empresaId);
  }

  async buscar(id: string, empresaId: string) {
    const consulta = await this.consultaRepository.findById(id, empresaId);
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    return consulta;
  }
}
