import { Module } from '@nestjs/common';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';
import { PainelRepository } from './painel.repository';

@Module({
  controllers: [PainelController],
  providers: [PainelService, PainelRepository],
})
export class PainelModule {}
