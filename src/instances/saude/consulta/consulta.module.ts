import { Module } from '@nestjs/common';
import { ConsultaController } from './consulta.controller';
import { ConsultaService } from './consulta.service';
import { ConsultaRepository } from './consulta.repository';
import { ConversationModule } from '../../../core/conversation/conversation.module';
import { PacienteModule } from '../paciente/paciente.module';
import { SaudeContextProvider } from '../saude-context.provider';

@Module({
  imports: [ConversationModule, PacienteModule],
  controllers: [ConsultaController],
  providers: [ConsultaService, ConsultaRepository, SaudeContextProvider],
  exports: [ConsultaService],
})
export class ConsultaModule {}
