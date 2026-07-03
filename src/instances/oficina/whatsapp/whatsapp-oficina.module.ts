import { Module } from '@nestjs/common';
import { WhatsAppOficinaController } from './whatsapp-oficina.controller';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { WhatsAppModule } from '../../../core/whatsapp/whatsapp.module';

@Module({
  imports: [AgendamentoModule, WhatsAppModule],
  controllers: [WhatsAppOficinaController],
})
export class WhatsAppOficinaModule {}
