import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { PropostaModule } from '../proposta/proposta.module';
import { DevedorModule } from '../devedor/devedor.module';

@Module({
  imports: [PropostaModule, DevedorModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
