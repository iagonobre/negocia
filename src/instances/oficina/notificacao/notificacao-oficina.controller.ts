import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificacaoOficinaService } from './notificacao-oficina.service';
import { NotificationCronController } from '../../../core/notification/notification-cron.controller';

@ApiTags('Oficina — Notificação')
@Controller('notificacao-oficina')
export class NotificacaoOficinaController extends NotificationCronController() {
  constructor(readonly service: NotificacaoOficinaService) {
    super();
  }
}
