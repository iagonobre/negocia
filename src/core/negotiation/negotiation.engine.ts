import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { NegotiationContext } from './negotiation-context.interface';

@Injectable()
export class NegotiationEngine {
  constructor(private readonly llmService: LlmService) {}

  async iniciar(context: NegotiationContext): Promise<{
    historico: any[];
    mensagemAgente: string;
  }> {
    const historico = [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: context.initialMessage },
    ];

    const resposta = await this.llmService.chamarLLM(historico);
    historico.push(resposta);

    return { historico, mensagemAgente: resposta.content };
  }

  async conversar(
    mensagemUsuario: string,
    historico: any[],
    tools: any[],
    validator: (toolName: string, args: Record<string, any>) => { aprovado: boolean; motivo: string },
  ): Promise<{
    historico: any[];
    mensagemAgente: string;
  }> {
    historico.push({ role: 'user', content: mensagemUsuario });

    let resposta = await this.llmService.chamarLLM(historico, tools);

    if (!resposta) {
      throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
    }

    if (resposta.tool_calls && resposta.tool_calls.length > 0) {
      resposta = await this.processarToolCall(resposta, historico, validator);

      if (!resposta) {
        throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
      }
    }

    if (!historico.includes(resposta)) {
      historico.push(resposta);
    }

    return { historico, mensagemAgente: resposta.content };
  }

  private async processarToolCall(
    respostaAgente: any,
    historico: any[],
    validator: (toolName: string, args: Record<string, any>) => { aprovado: boolean; motivo: string },
  ): Promise<any> {
    const toolCall = respostaAgente.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    const resultado = validator(toolCall.function.name, args);

    historico.push(respostaAgente);
    historico.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify(resultado),
    });

    return this.llmService.chamarLLM(historico);
  }
}
