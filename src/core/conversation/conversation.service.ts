import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NegotiationEngine } from '../negotiation/negotiation.engine';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NegotiationContextProvider } from '../negotiation/negotiation-context.interface';
import { ConversationOrchestrator } from '../whatsapp/conversation-orchestrator.interface';

@Injectable()
export abstract class ConversationService implements ConversationOrchestrator {
  @Inject(NegotiationEngine)
  protected readonly negotiationEngine: NegotiationEngine;

  @Inject(WhatsAppService)
  protected readonly whatsappService: WhatsAppService;

  // ── Abstratos — instância implementa ─────────────────────────────────────

  abstract findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null>;
  abstract findSessaoPendente(clienteId: string): Promise<{ id: string } | null>;
  abstract carregarEntidadeComConfig(
    clienteId: string,
    empresaId: string,
  ): Promise<{ entidade: any; config: any; telefone: string; extras?: any }>;
  abstract persistirSessao(
    clienteId: string,
    empresaId: string,
    historico: any[],
    extras?: any,
  ): Promise<{ id: string; status?: string }>;
  abstract getSessao(
    sessaoId: string,
    empresaId: string,
  ): Promise<{ historico: any; status: string; [key: string]: any } | null>;
  abstract getLimitesDaSessao(sessao: any): Record<string, any>;
  abstract getContextProvider(): NegotiationContextProvider;
  abstract atualizarHistorico(sessaoId: string, historico: any[]): Promise<void>;
  // Chamado quando o provider sinaliza (via `finalizar` no retorno de
  // validateTool) que a negociação/agendamento foi concluído pela IA.
  // Cada instância decide o que "concluído" significa no seu domínio e
  // persiste isso usando seu próprio repositório.
  abstract finalizarSessao(sessaoId: string, empresaId: string, dados: Record<string, any>): Promise<void>;

  // ── Concretos — framework implementa ─────────────────────────────────────

  async findOuCriarSessao(
    clienteId: string,
    empresaId: string,
  ): Promise<{ id: string; mensagemInicial?: string }> {
    const existente = await this.findSessaoPendente(clienteId);
    if (existente) return { id: existente.id };
    const nova = await this.criarSessao(clienteId, empresaId);
    return { id: nova.id, mensagemInicial: nova.ultimaMensagemAgente };
  }

  async responder(sessaoId: string, mensagem: string, empresaId: string): Promise<string> {
    const { mensagemAgente } = await this.conversar(sessaoId, empresaId, mensagem);
    return mensagemAgente;
  }

  async criarSessao(
    clienteId: string,
    empresaId: string,
  ): Promise<{ id: string; status: string; ultimaMensagemAgente: string; telefone: string }> {
    const { entidade, config, telefone, extras } = await this.carregarEntidadeComConfig(clienteId, empresaId);
    const context = this.getContextProvider().buildContext(entidade, config);
    const { historico, mensagemAgente } = await this.negotiationEngine.iniciar(context);
    const sessao = await this.persistirSessao(clienteId, empresaId, historico, extras);
    return { id: sessao.id, status: sessao.status ?? 'PENDENTE', ultimaMensagemAgente: mensagemAgente, telefone };
  }

  async iniciarEEnviar(clienteId: string, empresaId: string): Promise<{ id: string; status: string }> {
    const { id, status, ultimaMensagemAgente, telefone } = await this.criarSessao(clienteId, empresaId);
    await this.whatsappService.enviarMensagem(`+${telefone}`, ultimaMensagemAgente);
    return { id, status };
  }

  async conversar(
    sessaoId: string,
    empresaId: string,
    mensagemUsuario: string,
  ): Promise<{ id: string; mensagemAgente: string }> {
    const sessao = await this.getSessao(sessaoId, empresaId);
    if (!sessao) throw new NotFoundException('Sessão não encontrada.');
    if (sessao.status !== 'PENDENTE') throw new NotFoundException('Sessão já finalizada.');

    const provider = this.getContextProvider();
    const limites = this.getLimitesDaSessao(sessao);
    const validator = (toolName: string, args: Record<string, any>) =>
      provider.validateTool(toolName, args, limites);

    const { historico: historicoAtualizado, mensagemAgente, finalizar } = await this.negotiationEngine.conversar(
      mensagemUsuario,
      sessao.historico as any[],
      provider.getTools(),
      validator,
    );

    await this.atualizarHistorico(sessaoId, historicoAtualizado);

    if (finalizar) {
      await this.finalizarSessao(sessaoId, empresaId, finalizar);
    }

    return { id: sessaoId, mensagemAgente };
  }
}
