import { Body, Logger, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { mixin } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import type { ConversationOrchestrator } from './conversation-orchestrator.interface';

export function WhatsAppWebhookController() {
  class MixinController {
    readonly orchestrator: ConversationOrchestrator;
    readonly whatsappService: WhatsAppService;
    readonly webhookService: WhatsAppWebhookService;
    readonly logger = new Logger(this.constructor.name);

    @Post('webhook')
    @ApiOperation({ summary: 'Webhook do Twilio — recebe mensagens do WhatsApp' })
    async webhook(@Body() payload: Record<string, string>): Promise<void> {
      const from = payload.From;
      const mensagem = payload.Body;
      if (!from || !mensagem) return;
      const telefone = from.replace('whatsapp:+', '');
      this.logger.log(`Mensagem recebida de ${telefone}: ${mensagem}`);
      const resposta = await this.webhookService.handle(telefone, mensagem, this.orchestrator);
      if (resposta) await this.whatsappService.enviarMensagem(from, resposta);
    }
  }

  return mixin(MixinController);
}
