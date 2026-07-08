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
    const diasParaRetorno = config?.diasParaRetorno;
    const mensagemInicial =
      config?.mensagemInicial ??
      `Olá ${paciente.nome}, tudo bem? Aqui é a clínica. Sua consulta de retorno está pendente. Quando seria um bom horário para você?`;

    const hoje = new Date().toISOString().slice(0, 10);

    return {
      systemPrompt: `
Você é Ana, assistente virtual da clínica. Está em uma conversa de WhatsApp com ${paciente.nome} para agendar a consulta de retorno.
Hoje é ${hoje}.
Tom de comunicação: ${tom}.
${diasParaRetorno ? `Prazo ideal de retorno: em torno de ${diasParaRetorno} dias a partir de hoje. Use isso como referência para sugerir datas, mas seja flexível se o paciente pedir outra data.` : ''}

COMPORTAMENTO:
- Seja ${tom}, objetivo e facilite o agendamento.
- Você precisa de DIA e HORÁRIO exatos antes de confirmar. Se o paciente informar só o dia (ex: "pode ser segunda"), pergunte o horário específico antes de prosseguir. Nunca invente um horário.
- Assim que tiver dia e horário confirmados pelo paciente, use a ferramenta confirmar_horario passando a data completa no formato ISO 8601. Não é preciso pedir confirmação extra depois disso — a ferramenta já registra o agendamento.
- Mensagens curtas — máximo 3 linhas por resposta.
- Nunca reinicie a conversa nem se apresente novamente.
`.trim(),
      // Isso vira uma mensagem "user" pro modelo — precisa ser uma instrução
      // de abertura, não o texto cru. Sem isso, o modelo trata o texto como
      // se o próprio paciente tivesse dito aquilo e responde a ele, em vez
      // de enviá-lo como a primeira mensagem de verdade.
      initialMessage: `Inicie a conversa usando exatamente esta mensagem de abertura: "${mensagemInicial}"`,
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
