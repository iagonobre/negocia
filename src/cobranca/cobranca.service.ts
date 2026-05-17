import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PropostaRepository } from '../proposta/proposta.repository';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class CobrancaService {
  private readonly logger = new Logger(CobrancaService.name);

  constructor(
    private readonly propostaRepository: PropostaRepository,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Cron('0 9 1 * *')
  async enviarLembretesParcelados() {
    this.logger.log('Iniciando envio de lembretes mensais...');
    const propostas = await this.propostaRepository.findAceitasParceladas();
    const enviados = await this.processarEnvioLembretes(propostas);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const propostas = await this.propostaRepository.findAceitasParceladas(empresaId);
    const enviados = await this.processarEnvioLembretes(propostas);
    return { enviados };
  }

  private async processarEnvioLembretes(propostas: any[]): Promise<number> {
    let enviados = 0;

    for (const proposta of propostas) {
      const { devedor, valorAcordado, parcelasAcordadas } = proposta;

      if (!devedor.telefone || !valorAcordado || !parcelasAcordadas) continue;

      const valorParcela = (valorAcordado / parcelasAcordadas).toFixed(2);
      const mensagem = `Olá, ${devedor.nome}! 👋 Passando para lembrar sobre sua parcela do acordo no valor de R$ ${valorParcela}. Em caso de dúvidas, estamos à disposição!`;

      await this.whatsappService.enviarMensagem(devedor.telefone, mensagem);
      enviados++;
    }

    return enviados;
  }
}
