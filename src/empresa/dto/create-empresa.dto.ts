import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateEmpresaDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  nome: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  senha: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cnpj: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  telefone: string;
}
