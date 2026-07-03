import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServicoConfigDto {
  @ApiProperty() @IsString() descricao: string;
  @ApiProperty() @IsInt() @Min(1) prazoRevisaoDias: number;
  @ApiProperty() @IsString() tomComunicacao: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mensagemInicial?: string;
}
