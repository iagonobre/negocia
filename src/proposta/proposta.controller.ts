import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PropostaService } from './proposta.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Empresa } from 'src/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// Importando os DTOs refatorados
import { ChatMessageDto } from './dto/chat-message.dto';
import { AtualizarStatusDto } from './dto/atualiza-status.dto';

@ApiTags('Proposta')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('proposta')
export class PropostaController {
  constructor(private readonly propostaService: PropostaService) {}

  @Post('gerar/:devedorId')
  @ApiOperation({ summary: 'Gera uma proposta de pagamento personalizada para um devedor' })
  async gerarProposta(
    @Param('devedorId') devedorId: string,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.propostaService.gerarProposta(devedorId, empresa.sub);
  }

  @Post(':id/chat')
  @ApiOperation({ summary: 'Envia a resposta do devedor para o agente de IA continuar a negociação' })
  @ApiBody({ type: ChatMessageDto })
  async conversarComAgente(
    @Param('id') id: string,
    @Body() body: ChatMessageDto,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.propostaService.conversar(id, empresa.sub, body.mensagem);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todas as propostas da empresa' })
  async listarPropostas(@Empresa() empresa: JwtPayload) {
    return this.propostaService.listarPropostas(empresa.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma proposta pelo ID' })
  async buscarProposta(
    @Param('id') id: string,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.propostaService.buscarProposta(id, empresa.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de uma proposta (ACEITA ou RECUSADA)' })
  @ApiBody({ type: AtualizarStatusDto })
  async atualizarStatus(
    @Param('id') id: string,
    @Body() body: AtualizarStatusDto,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.propostaService.atualizarStatus(id, empresa.sub, body.status);
  }
}