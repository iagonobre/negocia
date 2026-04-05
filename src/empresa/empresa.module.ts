import { Module } from '@nestjs/common';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from './empresa.service';
import { EmpresaRepository } from './empresa.repository';

@Module({
  controllers: [EmpresaController],
  providers: [EmpresaService, EmpresaRepository],
  exports: [EmpresaService],
})
export class EmpresaModule {}
