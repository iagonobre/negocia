import { Module } from '@nestjs/common';
import { ConsultaController } from './consulta.controller';
import { ConsultaService } from './consulta.service';
import { ConsultaRepository } from './consulta.repository';
import { NegotiationModule } from '../../../core/negotiation/negotiation.module';
import { WhatsAppModule } from '../../../core/whatsapp/whatsapp.module';
import { PacienteModule } from '../paciente/paciente.module';
import { SaudeContextProvider } from '../saude-context.provider';

@Module({
  imports: [NegotiationModule, WhatsAppModule, PacienteModule],
  controllers: [ConsultaController],
  providers: [ConsultaService, ConsultaRepository, SaudeContextProvider],
  exports: [ConsultaService],
})
export class ConsultaModule {}
