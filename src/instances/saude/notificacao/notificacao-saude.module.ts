import { Module } from '@nestjs/common';
import { NotificacaoSaudeController } from './notificacao-saude.controller';
import { NotificacaoSaudeService } from './notificacao-saude.service';
import { NotificacaoSaudeRepository } from './notificacao-saude.repository';
import { NotificationModule } from '../../../core/notification/notification.module';
import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [NotificationModule, PrismaModule],
  controllers: [NotificacaoSaudeController],
  providers: [NotificacaoSaudeService, NotificacaoSaudeRepository],
})
export class NotificacaoSaudeModule {}
