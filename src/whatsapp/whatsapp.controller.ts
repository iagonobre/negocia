import { Body, Controller, Param, Post, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropostaService } from '../proposta/proposta.service';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { Empresa } from '../auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly propostaService: PropostaService,
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('iniciar/:devedorId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inicia uma negociação enviando a primeira mensagem ao devedor via WhatsApp' })
  async iniciarNegociacao(
    @Param('devedorId') devedorId: string,
    @Empresa() empresa: JwtPayload,
  ) {
    const proposta = await this.propostaService.gerarProposta(devedorId, empresa.sub);

    const devedor = await this.prisma.devedor.findFirst({
      where: { id: devedorId, empresaId: empresa.sub },
      select: { telefone: true },
    });

    await this.whatsappService.enviarMensagem(`+${devedor!.telefone}`, proposta.ultimaMensagemAgente);

    return { propostaId: proposta.id, status: proposta.status };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook do Twilio — recebe mensagens do WhatsApp' })
  async webhook(@Body() payload: Record<string, string>): Promise<void> {
    // Twilio envia form-urlencoded: From, Body, MessageSid
    const from: string = payload.From; // ex: "whatsapp:+5584999990001"
    const mensagem: string = payload.Body;

    if (!from || !mensagem) return;

    // Remove o prefixo "whatsapp:+" para buscar pelo telefone
    const telefone = from.replace('whatsapp:+', '');

    this.logger.log(`Mensagem recebida de ${telefone}: ${mensagem}`);

    const devedor = await this.prisma.devedor.findFirst({
      where: { telefone },
    });

    if (!devedor) {
      this.logger.warn(`Nenhum devedor encontrado para o telefone ${telefone}`);
      return;
    }

    let proposta = await this.prisma.proposta.findFirst({
      where: { devedorId: devedor.id, status: 'PENDENTE' },
    });

    if (!proposta) {
      const nova = await this.propostaService.gerarProposta(devedor.id, devedor.empresaId);
      await this.whatsappService.enviarMensagem(from, nova.ultimaMensagemAgente);
      return;
    }

    const resposta = await this.propostaService.conversar(proposta.id, devedor.empresaId, mensagem);
    await this.whatsappService.enviarMensagem(from, resposta.mensagemAgente);
  }
}
