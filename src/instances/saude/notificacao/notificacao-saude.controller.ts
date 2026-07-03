import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificacaoSaudeService } from './notificacao-saude.service';
import { NotificationCronController } from '../../../core/notification/notification-cron.controller';

@ApiTags('Saúde — Notificação')
@Controller('notificacao-saude')
export class NotificacaoSaudeController extends NotificationCronController() {
  constructor(readonly service: NotificacaoSaudeService) {
    super();
  }
}
