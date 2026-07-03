import { Module } from '@nestjs/common';
import { NotificacaoSaudeController } from './notificacao-saude.controller';
import { NotificacaoSaudeService } from './notificacao-saude.service';
import { NotificationModule } from '../../../core/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [NotificacaoSaudeController],
  providers: [NotificacaoSaudeService],
})
export class NotificacaoSaudeModule {}
