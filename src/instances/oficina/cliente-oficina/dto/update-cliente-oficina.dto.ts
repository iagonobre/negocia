import { PartialType } from '@nestjs/swagger';
import { CreateClienteOficinaDto } from './create-cliente-oficina.dto';

export class UpdateClienteOficinaDto extends PartialType(CreateClienteOficinaDto) {}
