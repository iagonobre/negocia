import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropostaRepository } from './proposta.repository';
import { LlmService } from '../../../core/llm/llm.service';
import { gerarSystemPrompt, gerarMensagemInicial } from './proposta.prompts';
import { VALIDAR_CONTRAPROPOSTA_TOOL } from './proposta.tools';
import { NegociacaoEmAndamentoException } from '../exceptions/negociacao-em-andamento.exception';
import { FaixaCriterioNaoEncontradaException } from '../exceptions/faixa-criterio-nao-encontrada.exception';
import { PropostaJaFinalizadaException } from '../exceptions/proposta-ja-finalizada.exception';

@Injectable()
export class PropostaService {
  constructor(
    private readonly propostaRepository: PropostaRepository,
    private readonly llmService: LlmService,
  ) {}

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

    const valorMinimo = (devedor.valorDivida * (1 - faixa.descontoMaximo / 100)).toFixed(2);
    const systemPrompt = gerarSystemPrompt(
      devedor.nome,
      devedor.valorDivida,
      faixa.tomComunicacao,
      valorMinimo,
      faixa.parcelasMaximas,
      faixa.prazoMaximoDias,
    );
    const mensagemInicial = gerarMensagemInicial(faixa.mensagemInicial, devedor.valorDivida);

    const historicoInicial = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: mensagemInicial },
    ];

    const respostaAgente = await this.llmService.chamarLLM(historicoInicial);
    historicoInicial.push(respostaAgente);

    const proposta = await this.propostaRepository.create(devedorId, empresaId, limites, historicoInicial);

    return {
      id: proposta.id,
      status: proposta.status,
      ultimaMensagemAgente: respostaAgente.content,
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

    historico.push({ role: 'user', content: mensagemUsuario });

    let respostaAgente = await this.llmService.chamarLLM(historico, [VALIDAR_CONTRAPROPOSTA_TOOL]);

    if (!respostaAgente) {
      throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
    }

    if (respostaAgente.tool_calls && respostaAgente.tool_calls.length > 0) {
      respostaAgente = await this.processarToolCall(respostaAgente, historico, limites);

      if (!respostaAgente) {
        throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
      }
    }

    if (!historico.includes(respostaAgente)) {
      historico.push(respostaAgente);
    }

    await this.propostaRepository.atualizarHistorico(propostaId, historico);

    return { id: propostaId, mensagemAgente: respostaAgente.content };
  }

  private async processarToolCall(respostaAgente: any, historico: any[], limites: any): Promise<any> {
    const toolCall = respostaAgente.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    const resultado = this.validarContraproposta(limites, Number(args.parcelas), Number(args.valorTotalOferecido));

    historico.push(respostaAgente);
    historico.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify(resultado),
    });

    return this.llmService.chamarLLM(historico);
  }

  private validarContraproposta(limites: any, parcelas: number, valorTotalOferecido: number) {
    if (parcelas > limites.parcelasMaximas) {
      return {
        aprovado: false,
        motivo: `O limite é de ${limites.parcelasMaximas} parcelas. Informe isso ao cliente.`,
      };
    }

    const valorMinimoAceitavel = limites.valorOriginal * (1 - limites.descontoMaximo / 100);

    if (valorTotalOferecido < valorMinimoAceitavel) {
      return {
        aprovado: false,
        motivo: `Valor muito baixo. O mínimo que aceitamos é R$ ${valorMinimoAceitavel.toFixed(2)}. Não aceite menos que isso.`,
      };
    }

    return {
      aprovado: true,
      motivo: `Aprovado! O acordo de ${parcelas}x de R$ ${(valorTotalOferecido / parcelas).toFixed(2)} pode ser fechado.`,
    };
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
