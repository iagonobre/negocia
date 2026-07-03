import { Module } from '@nestjs/common';
import { ClienteOficinaModule } from './cliente-oficina/cliente-oficina.module';
import { ServicoConfigModule } from './servico-config/servico-config.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { NotificacaoOficinaModule } from './notificacao/notificacao-oficina.module';
import { WhatsAppOficinaModule } from './whatsapp/whatsapp-oficina.module';

@Module({
  imports: [
    ClienteOficinaModule,
    ServicoConfigModule,
    AgendamentoModule,
    NotificacaoOficinaModule,
    WhatsAppOficinaModule,
  ],
})
export class OficinaModule {}
