import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class AtualizarStatusDto {
  @ApiProperty({ enum: ['PENDENTE', 'ACEITA', 'RECUSADA'], example: 'ACEITA' })
  @IsEnum(['PENDENTE', 'ACEITA', 'RECUSADA'], {
    message: 'O status deve ser PENDENTE, ACEITA ou RECUSADA',
  })
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA';

  @ApiPropertyOptional({ description: 'Valor total acordado (obrigatório se ACEITA)', example: 270 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorAcordado?: number;

  @ApiPropertyOptional({ description: 'Número de parcelas acordadas (1 = à vista)', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  parcelasAcordadas?: number;
}
