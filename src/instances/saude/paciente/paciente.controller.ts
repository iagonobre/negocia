import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paciente } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';
import { PacienteService } from './paciente.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@ApiTags('Saúde — Paciente')
@Controller('paciente')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PacienteController extends CrudController<Paciente>(CreatePacienteDto, UpdatePacienteDto) {
  constructor(readonly service: PacienteService) {
    super();
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Histórico completo de consultas do paciente, com a regra de retorno vinculada' })
  async historico(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
    return this.service.historico(id, empresa.sub);
  }
}
