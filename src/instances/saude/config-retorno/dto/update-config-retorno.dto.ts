import { PartialType } from '@nestjs/swagger';
import { CreateConfigRetornoDto } from './create-config-retorno.dto';

export class UpdateConfigRetornoDto extends PartialType(CreateConfigRetornoDto) {}
