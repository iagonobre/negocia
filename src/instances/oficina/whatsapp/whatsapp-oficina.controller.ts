import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgendamentoService } from '../agendamento/agendamento.service';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';
import { WhatsAppWebhookService } from '../../../core/whatsapp/whatsapp-webhook.service';
import { WhatsAppWebhookController } from '../../../core/whatsapp/whatsapp-webhook.controller';

@ApiTags('Oficina — WhatsApp')
@Controller('whatsapp-oficina')
export class WhatsAppOficinaController extends WhatsAppWebhookController() {
  constructor(
    readonly orchestrator: AgendamentoService,
    readonly whatsappService: WhatsAppService,
    readonly webhookService: WhatsAppWebhookService,
  ) {
    super();
  }
}
