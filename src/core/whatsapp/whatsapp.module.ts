import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';

@Module({
  providers: [WhatsAppService, WhatsAppWebhookService],
  exports: [WhatsAppService, WhatsAppWebhookService],
})
export class WhatsAppModule {}
