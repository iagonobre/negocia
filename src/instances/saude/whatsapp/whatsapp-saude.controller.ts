import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultaService } from '../consulta/consulta.service';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';
import { WhatsAppWebhookService } from '../../../core/whatsapp/whatsapp-webhook.service';
import { WhatsAppWebhookController } from '../../../core/whatsapp/whatsapp-webhook.controller';

@ApiTags('Saúde — WhatsApp')
@Controller('whatsapp-saude')
export class WhatsAppSaudeController extends WhatsAppWebhookController() {
  constructor(
    readonly orchestrator: ConsultaService,
    readonly whatsappService: WhatsAppService,
    readonly webhookService: WhatsAppWebhookService,
  ) {
    super();
  }
}
