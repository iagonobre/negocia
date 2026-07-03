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
      systemPrompt: `Você é Carlos, assistente da oficina mecânica. Entre em contato com ${cliente.nome} para agendar a revisão do veículo ${cliente.modeloVeiculo} placa ${cliente.placa}. Seja ${tom} e objetivo. Quando o cliente confirmar data e tipo de serviço, use a ferramenta confirmar_agendamento para registrar.`,
      initialMessage: mensagemInicial,
    };
  }

  getTools(): any[] {
    return [CONFIRMAR_AGENDAMENTO_TOOL];
  }

  validateTool(
    _toolName: string,
    args: Record<string, any>,
    _limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string } {
    return {
      aprovado: true,
      motivo: `Agendamento confirmado para ${args.dataHora} — ${args.tipoServico}.`,
    };
  }
}
