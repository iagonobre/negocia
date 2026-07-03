import { Module } from '@nestjs/common';
import { CobrancaController } from './cobranca.controller';
import { CobrancaService } from './cobranca.service';
import { NotificationModule } from '../../../core/notification/notification.module';
import { PropostaModule } from '../proposta/proposta.module';

@Module({
  imports: [NotificationModule, PropostaModule],
  controllers: [CobrancaController],
  providers: [CobrancaService],
})
export class CobrancaModule {}
