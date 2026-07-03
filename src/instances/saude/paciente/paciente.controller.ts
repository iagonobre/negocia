import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Paciente } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { PacienteService } from './paciente.service';

@ApiTags('Saúde — Paciente')
@Controller('paciente')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PacienteController extends CrudController<Paciente>() {
  constructor(readonly service: PacienteService) {
    super();
  }
}
