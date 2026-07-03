import { Module } from '@nestjs/common';
import { ConfigRetornoController } from './config-retorno.controller';
import { ConfigRetornoService } from './config-retorno.service';
import { ConfigRetornoRepository } from './config-retorno.repository';

@Module({
  controllers: [ConfigRetornoController],
  providers: [ConfigRetornoService, ConfigRetornoRepository],
  exports: [ConfigRetornoService, ConfigRetornoRepository],
})
export class ConfigRetornoModule {}
