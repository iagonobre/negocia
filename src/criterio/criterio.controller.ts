import { Controller } from '@nestjs/common';
import { CriterioService } from './criterio.service';

@Controller('criterio')
export class CriterioController {
  constructor(private readonly criterioService: CriterioService) {}
}
