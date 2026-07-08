import { Injectable } from '@nestjs/common';
import {
  NegotiationContext,
  NegotiationContextProvider,
} from '../../core/negotiation/negotiation-context.interface';
import { CONFIRMAR_HORARIO_TOOL } from './consulta/consulta.tools';

@Injectable()
export class SaudeContextProvider implements NegotiationContextProvider {
  buildContext(paciente: any, config: any): NegotiationContext {
    const tom = config?.tomComunicacao ?? 'cordial';
    const mensagemInicial =
      config?.mensagemInicial ??
      `Olá ${paciente.nome}, tudo bem? Aqui é a clínica. Sua consulta de retorno está pendente. Quando seria um bom horário para você?`;

    return {
      systemPrompt: `Você é Ana, assistente virtual da clínica. Entre em contato com ${paciente.nome} para agendar a consulta de retorno. Seja ${tom}, objetivo e facilite o agendamento. Quando o paciente confirmar um horário, use a ferramenta confirmar_horario para registrar o agendamento.`,
      initialMessage: mensagemInicial,
    };
  }

  getTools(): any[] {
    return [CONFIRMAR_HORARIO_TOOL];
  }

  validateTool(
    _toolName: string,
    args: Record<string, any>,
    _limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string; finalizar?: Record<string, any> } {
    return {
      aprovado: true,
      motivo: `Consulta agendada para ${args.dataHora}.`,
      finalizar: { dataHora: args.dataHora },
    };
  }
}
