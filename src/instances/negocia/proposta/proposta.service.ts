import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PropostaRepository } from './proposta.repository';
import { DevedorRepository } from '../devedor/devedor.repository';
import { NegociaContextProvider } from '../negocia-context.provider';
import { ConversationService } from '../../../core/conversation/conversation.service';
import { NegociacaoEmAndamentoException } from '../exceptions/negociacao-em-andamento.exception';
import { FaixaCriterioNaoEncontradaException } from '../exceptions/faixa-criterio-nao-encontrada.exception';
import { PropostaJaFinalizadaException } from '../exceptions/proposta-ja-finalizada.exception';

@Injectable()
export class PropostaService extends ConversationService {
  constructor(
    private readonly propostaRepository: PropostaRepository,
    private readonly devedorRepository: DevedorRepository,
    private readonly negociaContextProvider: NegociaContextProvider,
  ) {
    super();
  }

  // ── ConversationOrchestrator ─────────────────────────────────────────────

  async findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null> {
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
    const proposta = await this.propostaRepository.create(devedorId, empresaId, limites, historico);
    await this.propostaRepository.atualizarStatusDevedor(devedorId, 'EM_NEGOCIACAO');
    return proposta;
  }

  async getSessao(propostaId: string, empresaId: string) {
    const proposta = await this.propostaRepository.findById(propostaId, empresaId);
    if (proposta && proposta.status !== 'PENDENTE') {
      throw new PropostaJaFinalizadaException(proposta.status);
    }
    return proposta;
  }

  getLimitesDaSessao(proposta: any): Record<string, any> {
    return proposta.limites as Record<string, any>;
  }

  getContextProvider() {
    return this.negociaContextProvider;
  }

  async atualizarHistorico(propostaId: string, historico: any[]) {
    await this.propostaRepository.atualizarHistorico(propostaId, historico);
  }

  async finalizarSessao(propostaId: string, empresaId: string, dados: Record<string, any>): Promise<void> {
    await this.atualizarStatus(propostaId, empresaId, 'ACEITA', dados.valorAcordado, dados.parcelasAcordadas);
  }

  // ── Domínio negocia ──────────────────────────────────────────────────────

  async gerarProposta(devedorId: string, empresaId: string) {
    const pendente = await this.findSessaoPendente(devedorId);
    if (pendente) throw new NegociacaoEmAndamentoException();
    return this.iniciarEEnviar(devedorId, empresaId);
  }

  async reiniciarNegociacao(devedorId: string, empresaId: string) {
    const devedor = await this.devedorRepository.findOne(devedorId, empresaId);
    if (!devedor) throw new NotFoundException('Devedor não encontrado.');

    const pendente = await this.findSessaoPendente(devedorId);
    if (pendente) await this.propostaRepository.deletar(pendente.id);

    return this.iniciarEEnviar(devedorId, empresaId);
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
