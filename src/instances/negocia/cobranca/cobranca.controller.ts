import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CobrancaService } from './cobranca.service';

import { NotificationCronController } from '../../../core/notification/notification-cron.controller';

@ApiTags('Cobrança')
@Controller('cobranca')
export class CobrancaController extends NotificationCronController() {
  constructor(readonly service: CobrancaService) {
    super();
  }
}
