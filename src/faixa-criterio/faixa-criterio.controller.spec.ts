import { Test, TestingModule } from '@nestjs/testing';
import { FaixaCriterioController } from './faixa-criterio.controller';
import { FaixaCriterioService } from './faixa-criterio.service';

describe('FaixaCriterioController', () => {
  let controller: FaixaCriterioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaixaCriterioController],
      providers: [FaixaCriterioService],
    }).compile();

    controller = module.get<FaixaCriterioController>(FaixaCriterioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
