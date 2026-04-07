import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateFaixaCriterioDto {
  @ApiProperty({ description: 'Descrição da faixa', example: 'Dívidas pequenas' })
  @IsString()
  descricao!: string;

  @ApiProperty({ description: 'Valor mínimo da faixa', example: 0 })
  @IsNumber()
  @Min(0)
  valorMinimo!: number;

  @ApiProperty({ description: 'Valor máximo da faixa', example: 500 })
  @IsNumber()
  @Min(0)
  valorMaximo!: number;

  @ApiProperty({ description: 'Prazo máximo em dias', example: 30 })
  @IsInt()
  @Min(1)
  prazoMaximoDias!: number;

  @ApiProperty({ description: 'Número máximo de parcelas', example: 3 })
  @IsInt()
  @Min(1)
  parcelasMaximas!: number;

  @ApiProperty({ description: 'Desconto máximo em %', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  descontoMaximo!: number;

  @ApiPropertyOptional({ description: 'Mensagem inicial da negociação', example: 'Olá, tudo bem?' })
  @IsString()
  @IsOptional()
  mensagemInicial?: string;

  @ApiProperty({ description: 'Tom de comunicação da negociação', example: 'formal' })
  @IsString()
  tomComunicacao!: string;
}