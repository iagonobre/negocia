import { Module } from '@nestjs/common';
import { FaixaCriterioService } from './faixa-criterio.service';
import { FaixaCriterioController } from './faixa-criterio.controller';
import { FaixaCriterioRepository } from './faixa-criterio.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [FaixaCriterioController],
  providers: [FaixaCriterioService, FaixaCriterioRepository, PrismaService],
})
export class FaixaCriterioModule {}
