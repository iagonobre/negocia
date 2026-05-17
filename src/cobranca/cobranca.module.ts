import { Module } from '@nestjs/common';
import { CobrancaController } from './cobranca.controller';
import { CobrancaService } from './cobranca.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PropostaModule } from '../proposta/proposta.module';

@Module({
  imports: [WhatsAppModule, PropostaModule],
  controllers: [CobrancaController],
  providers: [CobrancaService],
})
export class CobrancaModule {}
