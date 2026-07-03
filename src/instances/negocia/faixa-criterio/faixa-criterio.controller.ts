import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FaixaCriterioService } from './faixa-criterio.service';
import { FaixaCriterio } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';

@ApiTags('Faixa de Critério')
@Controller('faixas-criterio')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class FaixaCriterioController extends CrudController<FaixaCriterio>() {
  constructor(readonly service: FaixaCriterioService) {
    super();
  }
}
