import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropostaRepository } from './proposta.repository';
import { DevedorRepository } from '../devedor/devedor.repository';
import { NegotiationEngine } from '../../../core/negotiation/negotiation.engine';
import { NegociaContextProvider } from '../negocia-context.provider';
import { ConversationOrchestrator } from '../../../core/whatsapp/conversation-orchestrator.interface';
import { NegociacaoEmAndamentoException } from '../exceptions/negociacao-em-andamento.exception';
import { FaixaCriterioNaoEncontradaException } from '../exceptions/faixa-criterio-nao-encontrada.exception';
import { PropostaJaFinalizadaException } from '../exceptions/proposta-ja-finalizada.exception';

@Injectable()
export class PropostaService implements ConversationOrchestrator {
  constructor(
    private readonly propostaRepository: PropostaRepository,
    private readonly devedorRepository: DevedorRepository,
    private readonly negotiationEngine: NegotiationEngine,
    private readonly negociaContextProvider: NegociaContextProvider,
  ) {}

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null> {
    const devedor = await this.devedorRepository.findByTelefone(telefone);
    if (!devedor) return null;
    return { id: devedor.id, empresaId: devedor.empresaId };
  }

  async findOuCriarSessao(
    devedorId: string,
    empresaId: string,
  ): Promise<{ id: string; mensagemInicial?: string }> {
    const existente = await this.propostaRepository.findPendentePorDevedor(devedorId);
    if (existente) return { id: existente.id };
    const nova = await this.gerarProposta(devedorId, empresaId);
    return { id: nova.id, mensagemInicial: nova.ultimaMensagemAgente };
  }

  async responder(propostaId: string, mensagem: string, empresaId: string): Promise<string> {
    const { mensagemAgente } = await this.conversar(propostaId, empresaId, mensagem);
    return mensagemAgente;
  }

  // ── Domínio negocia ──────────────────────────────────────────────────────

  async gerarProposta(devedorId: string, empresaId: string) {
    const propostaPendente = await this.propostaRepository.findPendentePorDevedor(devedorId);
    if (propostaPendente) {
      throw new NegociacaoEmAndamentoException();
    }

    const resultado = await this.propostaRepository.findDevedorComFaixa(devedorId, empresaId);
    if (!resultado) {
      throw new NotFoundException('Devedor não encontrado.');
    }

    const { devedor, faixa } = resultado;
    if (!faixa) {
      throw new FaixaCriterioNaoEncontradaException(devedor.valorDivida);
    }

    const limites = {
      valorOriginal: devedor.valorDivida,
      descontoMaximo: faixa.descontoMaximo,
      parcelasMaximas: faixa.parcelasMaximas,
      prazoMaximoDias: faixa.prazoMaximoDias,
    };

    const context = this.negociaContextProvider.buildContext(devedor, faixa);
    const { historico, mensagemAgente } = await this.negotiationEngine.iniciar(context);

    const proposta = await this.propostaRepository.create(devedorId, empresaId, limites, historico);

    return {
      id: proposta.id,
      status: proposta.status,
      ultimaMensagemAgente: mensagemAgente,
    };
  }

  async conversar(propostaId: string, empresaId: string, mensagemUsuario: string) {
    const proposta = await this.propostaRepository.findById(propostaId, empresaId);

    if (!proposta) throw new NotFoundException('Proposta não encontrada.');
    if (proposta.status !== 'PENDENTE') {
      throw new PropostaJaFinalizadaException(proposta.status);
    }

    const historico = proposta.historico as any[];
    const limites = proposta.limites as any;

    const validator = (toolName: string, args: Record<string, any>) =>
      this.negociaContextProvider.validateTool(toolName, args, limites);

    const { historico: historicoAtualizado, mensagemAgente } = await this.negotiationEngine.conversar(
      mensagemUsuario,
      historico,
      this.negociaContextProvider.getTools(),
      validator,
    );

    await this.propostaRepository.atualizarHistorico(propostaId, historicoAtualizado);

    return { id: propostaId, mensagemAgente };
  }

  async listarPropostas(empresaId: string) {
    return this.propostaRepository.findAllByEmpresa(empresaId);
  }

  async buscarProposta(id: string, empresaId: string) {
    const proposta = await this.propostaRepository.findById(id, empresaId);
    if (!proposta) throw new NotFoundException('Proposta não encontrada.');
    return proposta;
  }

  async atualizarStatus(
    id: string,
    empresaId: string,
    status: 'PENDENTE' | 'ACEITA' | 'RECUSADA',
    valorAcordado?: number,
    parcelasAcordadas?: number,
  ) {
    if (status === 'ACEITA' && !valorAcordado) {
      throw new BadRequestException('valorAcordado é obrigatório ao marcar uma proposta como ACEITA.');
    }

    const proposta = await this.buscarProposta(id, empresaId);

    await this.propostaRepository.updateStatus(id, status, valorAcordado, parcelasAcordadas);

    if (status === 'ACEITA') {
      await this.propostaRepository.atualizarStatusDevedor(proposta.devedorId, 'ACORDADO');
    } else if (status === 'RECUSADA') {
      await this.propostaRepository.atualizarStatusDevedor(proposta.devedorId, 'RECUSADO');
    }

    return this.propostaRepository.findById(id, empresaId);
  }
}
