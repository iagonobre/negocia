import { PartialType } from '@nestjs/swagger';
import { CreateServicoConfigDto } from './create-servico-config.dto';

export class UpdateServicoConfigDto extends PartialType(CreateServicoConfigDto) {}
