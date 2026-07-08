import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FaixaCriterioService } from './faixa-criterio.service';
import { FaixaCriterio } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { CreateFaixaCriterioDto } from './dto/create-faixa-criterio.dto';
import { UpdateFaixaCriterioDto } from './dto/update-faixa-criterio.dto';

@ApiTags('Faixa de Critério')
@Controller('faixas-criterio')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class FaixaCriterioController extends CrudController<FaixaCriterio>(CreateFaixaCriterioDto, UpdateFaixaCriterioDto) {
  constructor(readonly service: FaixaCriterioService) {
    super();
  }
}
