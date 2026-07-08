import { Injectable } from '@nestjs/common';
import {
  NegotiationContext,
  NegotiationContextProvider,
} from '../../core/negotiation/negotiation-context.interface';
import { CONFIRMAR_AGENDAMENTO_TOOL } from './agendamento/agendamento.tools';

@Injectable()
export class OficinaContextProvider implements NegotiationContextProvider {
  buildContext(cliente: any, config: any): NegotiationContext {
    const tom = config?.tomComunicacao ?? 'cordial';
    const mensagemInicial =
      config?.mensagemInicial ??
      `Olá ${cliente.nome}! Aqui é a oficina. Seu veículo ${cliente.modeloVeiculo} (${cliente.placa}) está com revisão pendente. Quando seria um bom momento para agendar?`;

    return {
      systemPrompt: `
Você é Carlos, assistente da oficina mecânica. Está em uma conversa de WhatsApp com ${cliente.nome} para agendar a revisão do veículo ${cliente.modeloVeiculo} placa ${cliente.placa}.
Tom de comunicação: ${tom}.

COMPORTAMENTO:
- Seja ${tom} e objetivo.
- Você precisa de DIA, HORÁRIO e TIPO DE SERVIÇO exatos antes de confirmar. Se o cliente informar só o dia (ex: "pode ser sexta"), pergunte o horário e o tipo de serviço antes de prosseguir. Nunca invente essas informações.
- Assim que tiver dia, horário e tipo de serviço confirmados, use a ferramenta confirmar_agendamento passando a data completa no formato ISO 8601. Não é preciso pedir confirmação extra depois disso — a ferramenta já registra o agendamento.
- Mensagens curtas — máximo 3 linhas por resposta.
- Nunca reinicie a conversa nem se apresente novamente.
`.trim(),
      // Isso vira uma mensagem "user" pro modelo — precisa ser uma instrução
      // de abertura, não o texto cru. Sem isso, o modelo trata o texto como
      // se o próprio cliente tivesse dito aquilo e responde a ele, em vez
      // de enviá-lo como a primeira mensagem de verdade.
      initialMessage: `Inicie a conversa usando exatamente esta mensagem de abertura: "${mensagemInicial}"`,
    };
  }

  getTools(): any[] {
    return [CONFIRMAR_AGENDAMENTO_TOOL];
  }

  validateTool(
    _toolName: string,
    args: Record<string, any>,
    _limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string; finalizar?: Record<string, any> } {
    return {
      aprovado: true,
      motivo: `Agendamento confirmado para ${args.dataHora} — ${args.tipoServico}.`,
      finalizar: { dataHora: args.dataHora, tipoServico: args.tipoServico },
    };
  }
}
