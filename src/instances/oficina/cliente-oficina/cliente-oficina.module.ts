import { Module } from '@nestjs/common';
import { ClienteOficinaController } from './cliente-oficina.controller';
import { ClienteOficinaService } from './cliente-oficina.service';
import { ClienteOficinaRepository } from './cliente-oficina.repository';

@Module({
  controllers: [ClienteOficinaController],
  providers: [ClienteOficinaService, ClienteOficinaRepository],
  exports: [ClienteOficinaService, ClienteOficinaRepository],
})
export class ClienteOficinaModule {}
