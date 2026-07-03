import { Module } from '@nestjs/common';
import { AgendamentoController } from './agendamento.controller';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoRepository } from './agendamento.repository';
import { ClienteOficinaModule } from '../cliente-oficina/cliente-oficina.module';
import { WhatsAppModule } from '../../../core/whatsapp/whatsapp.module';
import { NegotiationModule } from '../../../core/negotiation/negotiation.module';
import { OficinaContextProvider } from '../oficina-context.provider';

@Module({
  imports: [NegotiationModule, WhatsAppModule, ClienteOficinaModule],
  controllers: [AgendamentoController],
  providers: [AgendamentoService, AgendamentoRepository, OficinaContextProvider],
  exports: [AgendamentoService],
})
export class AgendamentoModule {}
