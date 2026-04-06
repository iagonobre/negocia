import { Module } from '@nestjs/common';
import { CriterioService } from './criterio.service';
import { CriterioController } from './criterio.controller';

@Module({
  controllers: [CriterioController],
  providers: [CriterioService],
})
export class CriterioModule {}
