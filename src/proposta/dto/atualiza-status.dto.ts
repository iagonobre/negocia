import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class AtualizarStatusDto {
  @ApiProperty({ enum: ['PENDENTE', 'ACEITA', 'RECUSADA'], example: 'ACEITA' })
  @IsEnum(['PENDENTE', 'ACEITA', 'RECUSADA'], {
    message: 'O status deve ser PENDENTE, ACEITA ou RECUSADA',
  })
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA';
}