import { Module } from '@nestjs/common';
import { AgendamentoController } from './agendamento.controller';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoRepository } from './agendamento.repository';
import { ConversationModule } from '../../../core/conversation/conversation.module';
import { ClienteOficinaModule } from '../cliente-oficina/cliente-oficina.module';
import { OficinaContextProvider } from '../oficina-context.provider';

@Module({
  imports: [ConversationModule, ClienteOficinaModule],
  controllers: [AgendamentoController],
  providers: [AgendamentoService, AgendamentoRepository, OficinaContextProvider],
  exports: [AgendamentoService],
})
export class AgendamentoModule {}
