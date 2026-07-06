import { Module } from '@nestjs/common';
import { PropostaController } from './proposta.controller';
import { PropostaService } from './proposta.service';
import { PropostaRepository } from './proposta.repository';
import { ConversationModule } from '../../../core/conversation/conversation.module';
import { DevedorModule } from '../devedor/devedor.module';
import { NegociaContextProvider } from '../negocia-context.provider';

@Module({
  imports: [ConversationModule, DevedorModule],
  controllers: [PropostaController],
  providers: [PropostaService, PropostaRepository, NegociaContextProvider],
  exports: [PropostaService, PropostaRepository],
})
export class PropostaModule {}
