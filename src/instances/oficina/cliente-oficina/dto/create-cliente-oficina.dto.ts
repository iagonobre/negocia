import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClienteOficinaDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty() @IsString() telefone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiProperty() @IsString() modeloVeiculo: string;
  @ApiProperty() @IsString() placa: string;
}
