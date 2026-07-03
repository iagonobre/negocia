import { Module } from '@nestjs/common';
import { PacienteModule } from './paciente/paciente.module';
import { ConfigRetornoModule } from './config-retorno/config-retorno.module';
import { ConsultaModule } from './consulta/consulta.module';
import { NotificacaoSaudeModule } from './notificacao/notificacao-saude.module';
import { WhatsAppSaudeModule } from './whatsapp/whatsapp-saude.module';

@Module({
  imports: [
    PacienteModule,
    ConfigRetornoModule,
    ConsultaModule,
    NotificacaoSaudeModule,
    WhatsAppSaudeModule,
  ],
})
export class SaudeModule {}
