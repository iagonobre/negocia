import { Module } from '@nestjs/common';
import { ServicoConfigController } from './servico-config.controller';
import { ServicoConfigService } from './servico-config.service';
import { ServicoConfigRepository } from './servico-config.repository';

@Module({
  controllers: [ServicoConfigController],
  providers: [ServicoConfigService, ServicoConfigRepository],
  exports: [ServicoConfigService, ServicoConfigRepository],
})
export class ServicoConfigModule {}
