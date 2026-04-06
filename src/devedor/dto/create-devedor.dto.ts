import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsEnum, 
  IsInt, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsDateString, 
  IsUUID
} from 'class-validator';
import { TipoPessoa, StatusDevedor, OrigemDevedor } from 'src/generated/prisma/enums';

export class CreateDevedorDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  nome: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  telefone: string;

  @ApiProperty({ enum: TipoPessoa })
  @IsNotEmpty()
  @IsEnum(TipoPessoa)
  tipoPessoa: TipoPessoa;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  valorDivida: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricaoDivida?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  vencimento: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  numeroParcelas?: number;

  @ApiProperty({ enum: StatusDevedor })
  @IsNotEmpty()
  @IsEnum(StatusDevedor)
  status: StatusDevedor;

  @ApiProperty({ enum: OrigemDevedor })
  @IsNotEmpty()
  @IsEnum(OrigemDevedor)
  origem: OrigemDevedor;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  tentativas: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ultimoContato?: Date;

  @ApiProperty({ description: 'ID da Empresa que é dona deste devedor' })
  @IsNotEmpty()
  @IsUUID()
  empresaId: string;
}