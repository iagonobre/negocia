import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { NegotiationContext } from './negotiation-context.interface';

type ToolValidator = (
  toolName: string,
  args: Record<string, any>,
) => { aprovado: boolean; motivo: string; finalizar?: Record<string, any> };

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
    validator: ToolValidator,
  ): Promise<{
    historico: any[];
    mensagemAgente: string;
    finalizar?: Record<string, any>;
  }> {
    historico.push({ role: 'user', content: mensagemUsuario });

    let resposta = await this.llmService.chamarLLM(historico, tools);

    if (!resposta) {
      throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
    }

    let finalizar: Record<string, any> | undefined;

    if (resposta.tool_calls && resposta.tool_calls.length > 0) {
      const resultadoToolCall = await this.processarToolCall(resposta, historico, validator);
      resposta = resultadoToolCall.resposta;
      finalizar = resultadoToolCall.finalizar;

      if (!resposta) {
        throw new BadRequestException('O agente de IA não retornou uma resposta. Tente novamente.');
      }
    }

    if (!historico.includes(resposta)) {
      historico.push(resposta);
    }

    return { historico, mensagemAgente: resposta.content, finalizar };
  }

  private async processarToolCall(
    respostaAgente: any,
    historico: any[],
    validator: ToolValidator,
  ): Promise<{ resposta: any; finalizar?: Record<string, any> }> {
    const toolCall = respostaAgente.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    const { finalizar, ...resultado } = validator(toolCall.function.name, args);

    historico.push(respostaAgente);
    historico.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify(resultado),
    });

    const resposta = await this.llmService.chamarLLM(historico);
    return { resposta, finalizar };
  }
}
