import { Module } from '@nestjs/common';
import { FaixaCriterioService } from './faixa-criterio.service';
import { FaixaCriterioController } from './faixa-criterio.controller';
import { FaixaCriterioRepository } from './faixa-criterio.repository';

@Module({
  controllers: [FaixaCriterioController],
  providers: [FaixaCriterioService, FaixaCriterioRepository],
})
export class FaixaCriterioModule {}
