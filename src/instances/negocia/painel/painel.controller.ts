import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PainelService } from './painel.service';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('Empresa')
@Controller('empresa')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PainelController {
  constructor(private readonly painelService: PainelService) {}

  @Get('painel')
  @ApiOperation({ summary: 'Painel com indicadores de inadimplência e recuperação financeira' })
  async painel(@Empresa() empresa: JwtPayload) {
    return this.painelService.painel(empresa.sub);
  }
}
