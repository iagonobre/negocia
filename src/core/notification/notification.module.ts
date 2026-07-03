import { Module } from '@nestjs/common';
import { NotificationEngine } from './notification.engine';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  providers: [NotificationEngine],
  exports: [NotificationEngine],
})
export class NotificationModule {}
