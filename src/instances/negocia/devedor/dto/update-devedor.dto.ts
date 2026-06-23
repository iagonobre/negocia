import { PartialType } from '@nestjs/swagger';
import { CreateDevedorDto } from './create-devedor.dto';

export class UpdateDevedorDto extends PartialType(CreateDevedorDto) {}