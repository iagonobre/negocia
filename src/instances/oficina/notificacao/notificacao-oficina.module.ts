import { Module } from '@nestjs/common';
import { NotificacaoOficinaController } from './notificacao-oficina.controller';
import { NotificacaoOficinaService } from './notificacao-oficina.service';
import { NotificationModule } from '../../../core/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [NotificacaoOficinaController],
  providers: [NotificacaoOficinaService],
})
export class NotificacaoOficinaModule {}
