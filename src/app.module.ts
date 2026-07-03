import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { NegociaModule } from './instances/negocia/negocia.module';
import { SaudeModule } from './instances/saude/saude.module';
import { OficinaModule } from './instances/oficina/oficina.module';

@Module({
  imports: [CoreModule, NegociaModule, SaudeModule, OficinaModule],
})
export class AppModule {}
