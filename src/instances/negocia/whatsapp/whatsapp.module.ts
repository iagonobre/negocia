import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppModule } from '../../../core/whatsapp/whatsapp.module';
import { PropostaModule } from '../proposta/proposta.module';
import { DevedorModule } from '../devedor/devedor.module';

@Module({
  imports: [WhatsAppModule, PropostaModule, DevedorModule],
  controllers: [WhatsAppController],
})
export class WhatsAppNegociaModule {}
