import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsultaService } from './consulta.service';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';
import { PacienteRepository } from '../paciente/paciente.repository';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('Saúde — Consulta')
@Controller('consulta')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ConsultaController {
  constructor(
    private readonly consultaService: ConsultaService,
    private readonly pacienteRepository: PacienteRepository,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Post('iniciar/:pacienteId')
  @ApiOperation({ summary: 'Inicia uma consulta de retorno enviando a primeira mensagem via WhatsApp' })
  async iniciarConsulta(
    @Param('pacienteId') pacienteId: string,
    @Empresa() empresa: JwtPayload,
  ) {
    const consulta = await this.consultaService.iniciarConsulta(pacienteId, empresa.sub);
    const paciente = await this.pacienteRepository.findById(pacienteId, empresa.sub);
    if (paciente?.telefone) {
      await this.whatsappService.enviarMensagem(`+${paciente.telefone}`, consulta.ultimaMensagemAgente);
    }
    return { consultaId: consulta.id, status: consulta.status };
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
