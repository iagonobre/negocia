import { Test, TestingModule } from '@nestjs/testing';
import { FaixaCriterioService } from './faixa-criterio.service';

describe('FaixaCriterioService', () => {
  let service: FaixaCriterioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FaixaCriterioService],
    }).compile();

    service = module.get<FaixaCriterioService>(FaixaCriterioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
