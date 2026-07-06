import { Module } from '@nestjs/common';
import { NotificacaoOficinaController } from './notificacao-oficina.controller';
import { NotificacaoOficinaService } from './notificacao-oficina.service';
import { NotificacaoOficinaRepository } from './notificacao-oficina.repository';
import { NotificationModule } from '../../../core/notification/notification.module';
import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [NotificationModule, PrismaModule],
  controllers: [NotificacaoOficinaController],
  providers: [NotificacaoOficinaService, NotificacaoOficinaRepository],
})
export class NotificacaoOficinaModule {}
