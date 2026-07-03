import { Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropostaService } from '../proposta/proposta.service';
import { DevedorRepository } from '../devedor/devedor.repository';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';
import { WhatsAppWebhookService } from '../../../core/whatsapp/whatsapp-webhook.service';
import { WhatsAppWebhookController } from '../../../core/whatsapp/whatsapp-webhook.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController extends WhatsAppWebhookController() {
  constructor(
    readonly orchestrator: PropostaService,
    readonly whatsappService: WhatsAppService,
    readonly webhookService: WhatsAppWebhookService,
    private readonly devedorRepository: DevedorRepository,
  ) {
    super();
  }

  @Post('iniciar/:devedorId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inicia uma negociação enviando a primeira mensagem ao devedor via WhatsApp' })
  async iniciarNegociacao(
    @Param('devedorId') devedorId: string,
    @Empresa() empresa: JwtPayload,
  ) {
    const proposta = await this.orchestrator.gerarProposta(devedorId, empresa.sub);

    const devedor = await this.devedorRepository.findOne(devedorId, empresa.sub);
    if (!devedor) throw new NotFoundException('Devedor não encontrado.');

    await this.whatsappService.enviarMensagem(`+${devedor.telefone}`, proposta.ultimaMensagemAgente);

    return { propostaId: proposta.id, status: proposta.status };
  }
}
