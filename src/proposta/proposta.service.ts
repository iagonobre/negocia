import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropostaRepository } from './proposta.repository';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class PropostaService {
  constructor(
    private readonly propostaRepository: PropostaRepository,
    private readonly llmService: LlmService,
  ) {}

  // Inicia a negociação e gera a primeira mensagem
  async gerarProposta(devedorId: string, empresaId: string) {
    const propostaPendente = await this.propostaRepository.findPendentePorDevedor(devedorId);
    if (propostaPendente) {
      throw new BadRequestException('Este devedor já possui uma negociação em andamento.');
    }

    const resultado = await this.propostaRepository.findDevedorComFaixa(devedorId, empresaId);

    if (!resultado) {
      throw new NotFoundException('Devedor não encontrado.');
    }

    const { devedor, faixa } = resultado;

    if (!faixa) {
      throw new BadRequestException(
        `Nenhuma faixa de critério encontrada para o valor de dívida R$ ${devedor.valorDivida.toFixed(2)}.`,
      );
    }

    const limites = {
      valorOriginal: devedor.valorDivida,
      descontoMaximo: faixa.descontoMaximo,
      parcelasMaximas: faixa.parcelasMaximas,
      prazoMaximoDias: faixa.prazoMaximoDias,
    };

    const valorMinimo = (devedor.valorDivida * (1 - faixa.descontoMaximo / 100)).toFixed(2);

    const systemPrompt = `
Você é um negociador humano especialista em recuperação de crédito. Seu nome é Sofia.
Você está em uma conversa de WhatsApp com ${devedor.nome}.
Dívida original: R$ ${devedor.valorDivida.toFixed(2)}.
Tom de comunicação: ${faixa.tomComunicacao}.

ESTRATÉGIA DE NEGOCIAÇÃO (siga essa ordem, não pule etapas):
1. Primeira oferta: proponha o pagamento à vista pelo valor CHEIO (sem desconto). Seja cordial mas direto.
2. Se o cliente reclamar do valor: ofereça um desconto pequeno (metade do seu limite máximo).
3. Se o cliente insistir ou oferecer um valor baixo: use a ferramenta para validar e, se aprovado, aceite. Se recusado, contra-proponha o valor mínimo aceitável de R$ ${valorMinimo}.
4. Se o cliente aceitar qualquer proposta válida: confirme o acordo de forma calorosa e encerre a negociação.
5. Se o cliente pedir parcelamento: ofereça, mas sempre tente fechar à vista primeiro com um desconto ligeiramente maior.

COMPORTAMENTO:
- Seja humano, empático e use linguagem natural. Nunca pareça um robô.
- Mensagens curtas — máximo 3 linhas por resposta.
- Nunca reinicie a conversa nem se apresente novamente.
- Nunca mencione percentuais de desconto — fale apenas em valores em reais.
- Nunca invente valores — use sempre a ferramenta "validar_contraproposta" antes de aceitar qualquer proposta do cliente.
- Quando o cliente aceitar um acordo, celebre brevemente e pergunte se ele prefere Pix ou boleto.
- Máximo de parcelas: ${faixa.parcelasMaximas}x. Prazo máximo: ${faixa.prazoMaximoDias} dias.
`.trim();

    const mensagemInicialUser = faixa.mensagemInicial
      ? `Inicie a conversa usando exatamente esta mensagem de abertura: "${faixa.mensagemInicial}"`
      : `Inicie a conversa de forma natural e amigável. Mencione a dívida de R$ ${devedor.valorDivida.toFixed(2)} e proponha o pagamento à vista pelo valor cheio. Seja breve.`;

    const historicoInicial = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: mensagemInicialUser }
    ];

    const respostaAgente = await this.llmService.chamarLLM(historicoInicial);
    historicoInicial.push(respostaAgente);

    const proposta = await this.propostaRepository.create(
      devedorId, 
      empresaId, 
      limites, 
      historicoInicial
    );

    return {
      id: proposta.id,
      status: proposta.status,
      ultimaMensagemAgente: respostaAgente.content
    };
  }

  // --- Motor do Chat Iterativo (Onde a negociação acontece) ---
  async conversar(propostaId: string, empresaId: string, mensagemUsuario: string) {
    const proposta = await this.propostaRepository.findById(propostaId, empresaId);
    
    if (!proposta) throw new NotFoundException('Proposta não encontrada.');
    if (proposta.status !== 'PENDENTE') {
      throw new BadRequestException(`Esta negociação já foi finalizada com status ${proposta.status}.`);
    }

    const historico = proposta.historico as any[];
    const limites = proposta.limites as any;

    // 1. Adiciona a fala do cliente ao histórico
    historico.push({ role: 'user', content: mensagemUsuario });

    // 2. Define a "Ferramenta" que a IA pode usar para calcular
    const tools = [
      {
        type: 'function',
        function: {
          name: 'validar_contraproposta',
          description: 'Calcula se a proposta do cliente é permitida pelas regras financeiras. Use sempre que o cliente sugerir um valor ou parcelamento.',
          parameters: {
            type: 'object',
            properties: {
              parcelas: { type: 'number', description: 'Número de parcelas desejadas (1 para à vista)' },
              valorTotalOferecido: { type: 'number', description: 'Valor total que o cliente quer pagar.' }
            },
            required: ['parcelas', 'valorTotalOferecido']
          }
        }
      }
    ];

    // 3. Primeira chamada à IA: Ela analisa a mensagem e decide se usa a ferramenta
    let respostaAgente = await this.llmService.chamarLLM(historico, tools);

    if (!respostaAgente) {
      throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
    }

    // 4. Se a IA chamou a ferramenta matemática
    if (respostaAgente.tool_calls && respostaAgente.tool_calls.length > 0) {
      const toolCall = respostaAgente.tool_calls[0];

      if (toolCall.function.name === 'validar_contraproposta') {
        const args = JSON.parse(toolCall.function.arguments);

        const resultadoMatematico = this.validarContraproposta(limites, Number(args.parcelas), Number(args.valorTotalOferecido));

        historico.push(respostaAgente);
        historico.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(resultadoMatematico),
        });

        respostaAgente = await this.llmService.chamarLLM(historico);

        if (!respostaAgente) {
          throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
        }
      }
    }

    if (!historico.includes(respostaAgente)) {
      historico.push(respostaAgente);
    }

    // 5. Salva o histórico atualizado
    await this.propostaRepository.atualizarHistorico(propostaId, historico);

    return {
      id: propostaId,
      mensagemAgente: respostaAgente.content
    };
  }

  // --- Validação Matemática (Vigilante da IA) ---
  private validarContraproposta(limites: any, parcelas: number, valorTotalOferecido: number) {
    if (parcelas > limites.parcelasMaximas) {
      return { 
        aprovado: false, 
        motivo: `O limite é de ${limites.parcelasMaximas} parcelas. Informe isso ao cliente.`
      };
    }

    const valorMinimoAceitavel = limites.valorOriginal * (1 - (limites.descontoMaximo / 100));

    if (valorTotalOferecido < valorMinimoAceitavel) {
      return {
        aprovado: false,
        motivo: `Valor muito baixo. O mínimo que aceitamos é R$ ${valorMinimoAceitavel.toFixed(2)}. Não aceite menos que isso.`
      };
    }

    return {
      aprovado: true,
      motivo: `Aprovado! O acordo de ${parcelas}x de R$ ${(valorTotalOferecido/parcelas).toFixed(2)} pode ser fechado.`
    };
  }


  // Métodos CRUD
  async listarPropostas(empresaId: string) {
    return this.propostaRepository.findAllByEmpresa(empresaId);
  }

  async buscarProposta(id: string, empresaId: string) {
    const proposta = await this.propostaRepository.findById(id, empresaId);
    if (!proposta) throw new NotFoundException('Proposta não encontrada.');
    return proposta;
  }

  async atualizarStatus(id: string, empresaId: string, status: 'PENDENTE' | 'ACEITA' | 'RECUSADA', valorAcordado?: number, parcelasAcordadas?: number) {
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