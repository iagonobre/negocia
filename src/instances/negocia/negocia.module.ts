import { Module } from '@nestjs/common';
import { DevedorModule } from './devedor/devedor.module';
import { FaixaCriterioModule } from './faixa-criterio/faixa-criterio.module';
import { PropostaModule } from './proposta/proposta.module';
import { CobrancaModule } from './cobranca/cobranca.module';
import { WhatsAppNegociaModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    DevedorModule,
    FaixaCriterioModule,
    PropostaModule,
    CobrancaModule,
    WhatsAppNegociaModule,
  ],
})
export class NegociaModule {}
