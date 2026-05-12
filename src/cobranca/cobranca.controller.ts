import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CobrancaService } from './cobranca.service';
import { AuthGuard } from '../auth/auth.guard';
import { Empresa } from '../auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Cobrança')
@Controller('cobranca')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CobrancaController {
  constructor(private readonly cobrancaService: CobrancaService) {}

  @Post('lembretes')
  @ApiOperation({ summary: 'Dispara lembretes de parcelas manualmente para todos os acordos ativos da empresa' })
  async dispararLembretes(@Empresa() empresa: JwtPayload) {
    return this.cobrancaService.dispararLembretesManual(empresa.sub);
  }
}
