import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClienteOficina } from '../../../generated/prisma/client';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { ClienteOficinaService } from './cliente-oficina.service';
import { CreateClienteOficinaDto } from './dto/create-cliente-oficina.dto';
import { UpdateClienteOficinaDto } from './dto/update-cliente-oficina.dto';

@ApiTags('Oficina — Cliente')
@Controller('cliente-oficina')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ClienteOficinaController extends CrudController<ClienteOficina>(CreateClienteOficinaDto, UpdateClienteOficinaDto) {
  constructor(readonly service: ClienteOficinaService) {
    super();
  }
}
