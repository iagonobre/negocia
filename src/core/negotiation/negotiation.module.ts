import { Module } from '@nestjs/common';
import { NegotiationEngine } from './negotiation.engine';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [NegotiationEngine],
  exports: [NegotiationEngine],
})
export class NegotiationModule {}
