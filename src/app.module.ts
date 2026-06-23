import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { NegociaModule } from './instances/negocia/negocia.module';

@Module({
  imports: [CoreModule, NegociaModule],
})
export class AppModule {}
