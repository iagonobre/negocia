import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsultaService } from './consulta.service';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('Saúde — Consulta')
@Controller('consulta')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ConsultaController {
  constructor(private readonly consultaService: ConsultaService) {}

  @Post('iniciar/:pacienteId')
  @ApiOperation({ summary: 'Inicia uma consulta de retorno enviando a primeira mensagem via WhatsApp' })
  async iniciarConsulta(
    @Param('pacienteId') pacienteId: string,
    @Empresa() empresa: JwtPayload,
  ) {
    const result = await this.consultaService.iniciarEEnviar(pacienteId, empresa.sub);
    return { consultaId: result.id, status: result.status };
  }

  @Get()
  @ApiOperation({ summary: 'Listar consultas da empresa' })
  async listar(@Empresa() empresa: JwtPayload) {
    return this.consultaService.listar(empresa.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar consulta por ID' })
  async buscar(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
    return this.consultaService.buscar(id, empresa.sub);
  }
}
