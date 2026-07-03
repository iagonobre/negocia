import { Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgendamentoService } from './agendamento.service';
import { ClienteOficinaRepository } from '../cliente-oficina/cliente-oficina.repository';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('Oficina — Agendamento')
@Controller('agendamento')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AgendamentoController {
  constructor(
    private readonly agendamentoService: AgendamentoService,
    private readonly clienteRepository: ClienteOficinaRepository,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Post('iniciar/:clienteId')
  @ApiOperation({ summary: 'Inicia um agendamento de revisão enviando a primeira mensagem via WhatsApp' })
  async iniciarAgendamento(
    @Param('clienteId') clienteId: string,
    @Empresa() empresa: JwtPayload,
  ) {
    const agendamento = await this.agendamentoService.iniciarAgendamento(clienteId, empresa.sub);
    const cliente = await this.clienteRepository.findById(clienteId, empresa.sub);
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    await this.whatsappService.enviarMensagem(`+${cliente.telefone}`, agendamento.ultimaMensagemAgente);
    return { agendamentoId: agendamento.id, status: agendamento.status };
  }

  @Get()
  @ApiOperation({ summary: 'Listar agendamentos da empresa' })
  listar(@Empresa() empresa: JwtPayload) {
    return this.agendamentoService.listar(empresa.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  buscar(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
    return this.agendamentoService.buscar(id, empresa.sub);
  }
}
