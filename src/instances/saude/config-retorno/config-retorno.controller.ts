import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigRetorno } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { ConfigRetornoService } from './config-retorno.service';
import { CreateConfigRetornoDto } from './dto/create-config-retorno.dto';
import { UpdateConfigRetornoDto } from './dto/update-config-retorno.dto';

@ApiTags('Saúde — Config Retorno')
@Controller('config-retorno')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ConfigRetornoController extends CrudController<ConfigRetorno>(CreateConfigRetornoDto, UpdateConfigRetornoDto) {
  constructor(readonly service: ConfigRetornoService) {
    super();
  }
}
