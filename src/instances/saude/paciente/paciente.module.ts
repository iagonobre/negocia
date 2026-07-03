import { Module } from '@nestjs/common';
import { PacienteController } from './paciente.controller';
import { PacienteService } from './paciente.service';
import { PacienteRepository } from './paciente.repository';

@Module({
  controllers: [PacienteController],
  providers: [PacienteService, PacienteRepository],
  exports: [PacienteService, PacienteRepository],
})
export class PacienteModule {}
