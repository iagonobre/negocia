import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicoConfig } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { ServicoConfigService } from './servico-config.service';

@ApiTags('Oficina — Serviço Config')
@Controller('servico-config')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ServicoConfigController extends CrudController<ServicoConfig>() {
  constructor(readonly service: ServicoConfigService) {
    super();
  }
}
