import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ description: 'Mensagem do devedor no WhatsApp', example: 'Consigo pagar 250 reais à vista.' })
  @IsString()
  @IsNotEmpty()
  mensagem: string;
}