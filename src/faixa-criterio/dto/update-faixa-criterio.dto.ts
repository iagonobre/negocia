import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateFaixaCriterioDto {

  @ApiPropertyOptional({ description: 'Descrição da faixa', example: 'Dívidas pequenas' })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Valor mínimo da faixa', example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valorMinimo?: number;

  @ApiPropertyOptional({ description: 'Valor máximo da faixa', example: 500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valorMaximo?: number;

  @ApiPropertyOptional({ description: 'Prazo máximo em dias', example: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  prazoMaximoDias?: number;

  @ApiPropertyOptional({ description: 'Número máximo de parcelas', example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  parcelasMaximas?: number;

  @ApiPropertyOptional({ description: 'Desconto máximo em %', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  descontoMaximo?: number;

  @ApiPropertyOptional({ description: 'Mensagem inicial da negociação', example: 'Olá, tudo bem?' })
  @IsString()
  @IsOptional()
  mensagemInicial?: string;

  @ApiPropertyOptional({ description: 'Tom de comunicação da negociação', example: 'formal' })
  @IsString()
  @IsOptional()
  tomComunicacao?: string;
}