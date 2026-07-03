import { Module } from '@nestjs/common';
import { WhatsAppSaudeController } from './whatsapp-saude.controller';
import { WhatsAppModule } from '../../../core/whatsapp/whatsapp.module';
import { ConsultaModule } from '../consulta/consulta.module';

@Module({
  imports: [WhatsAppModule, ConsultaModule],
  controllers: [WhatsAppSaudeController],
})
export class WhatsAppSaudeModule {}
