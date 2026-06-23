import { Module } from '@nestjs/common';
import { PropostaController } from './proposta.controller';
import { PropostaService } from './proposta.service';
import { PropostaRepository } from './proposta.repository';
import { NegotiationModule } from '../../../core/negotiation/negotiation.module';
import { NegociaContextProvider } from '../negocia-context.provider';

@Module({
  imports: [NegotiationModule],
  controllers: [PropostaController],
  providers: [PropostaService, PropostaRepository, NegociaContextProvider],
  exports: [PropostaService, PropostaRepository],
})
export class PropostaModule {}