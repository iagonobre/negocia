import { Body, Controller, NotFoundException, Param, Post, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropostaService } from '../proposta/proposta.service';
import { PropostaRepository } from '../proposta/proposta.repository';
import { DevedorRepository } from '../devedor/devedor.repository';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly propostaService: PropostaService,
    private readonly propostaRepository: PropostaRepository,
    private readonly devedorRepository: DevedorRepository,
    private readonly whatsappService: WhatsAppService,
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

    const devedor = await this.devedorRepository.findOne(devedorId, empresa.sub);

    if (!devedor) {
      throw new NotFoundException('Devedor não encontrado.');
    }

    await this.whatsappService.enviarMensagem(`+${devedor.telefone}`, proposta.ultimaMensagemAgente);

    return { propostaId: proposta.id, status: proposta.status };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook do Twilio — recebe mensagens do WhatsApp' })
  async webhook(@Body() payload: Record<string, string>): Promise<void> {
    const from: string = payload.From;
    const mensagem: string = payload.Body;

    if (!from || !mensagem) return;

    const telefone = from.replace('whatsapp:+', '');

    this.logger.log(`Mensagem recebida de ${telefone}: ${mensagem}`);

    const devedor = await this.devedorRepository.findByTelefone(telefone);

    if (!devedor) {
      this.logger.warn(`Nenhum devedor encontrado para o telefone ${telefone}`);
      return;
    }

    const proposta = await this.propostaRepository.findPendentePorDevedor(devedor.id);

    if (!proposta) {
      const nova = await this.propostaService.gerarProposta(devedor.id, devedor.empresaId);
      await this.whatsappService.enviarMensagem(from, nova.ultimaMensagemAgente);
      return;
    }

    const resposta = await this.propostaService.conversar(proposta.id, devedor.empresaId, mensagem);
    await this.whatsappService.enviarMensagem(from, resposta.mensagemAgente);
  }
}
