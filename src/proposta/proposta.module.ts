import { Module } from '@nestjs/common';
import { PropostaController } from './proposta.controller';
import { PropostaService } from './proposta.service';
import { PropostaRepository } from './proposta.repository';

@Module({
  controllers: [PropostaController],
  providers: [PropostaService, PropostaRepository],
})
export class PropostaModule {}