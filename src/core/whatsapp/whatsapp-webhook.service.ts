import { Injectable } from '@nestjs/common';
import { ConversationOrchestrator } from './conversation-orchestrator.interface';

@Injectable()
export class WhatsAppWebhookService {
  async handle(
    telefone: string,
    mensagem: string,
    orchestrator: ConversationOrchestrator,
  ): Promise<string | void> {
    const cliente = await orchestrator.findClienteByTelefone(telefone);
    if (!cliente) return;
    const sessao = await orchestrator.findOuCriarSessao(cliente.id, cliente.empresaId);
    if (sessao.mensagemInicial) return sessao.mensagemInicial;
    return orchestrator.responder(sessao.id, mensagem, cliente.empresaId);
  }
}
