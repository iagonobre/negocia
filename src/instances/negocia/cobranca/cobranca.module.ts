import { Module } from '@nestjs/common';
import { CobrancaController } from './cobranca.controller';
import { CobrancaService } from './cobranca.service';
import { PropostaModule } from '../proposta/proposta.module';

import { NotificationModule } from '../../../core/notification/notification.module';

@Module({
  imports: [NotificationModule, PropostaModule],
  controllers: [CobrancaController],
  providers: [CobrancaService],
})
export class CobrancaModule {}
