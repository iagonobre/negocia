import { Module } from '@nestjs/common';
import { NegotiationModule } from '../negotiation/negotiation.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [NegotiationModule, WhatsAppModule],
  exports: [NegotiationModule, WhatsAppModule],
})
export class ConversationModule {}
