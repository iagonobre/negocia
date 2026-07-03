import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClienteOficina } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { ClienteOficinaService } from './cliente-oficina.service';

@ApiTags('Oficina — Cliente')
@Controller('cliente-oficina')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ClienteOficinaController extends CrudController<ClienteOficina>() {
  constructor(readonly service: ClienteOficinaService) {
    super();
  }
}
