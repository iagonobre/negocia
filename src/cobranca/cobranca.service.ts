import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class CobrancaService {
  private readonly logger = new Logger(CobrancaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // Executa todo dia 1 às 9h
  @Cron('0 9 1 * *')
  async enviarLembretesParcelados() {
    this.logger.log('Iniciando envio de lembretes mensais...');

    const propostas = await this.prisma.proposta.findMany({
      where: {
        status: 'ACEITA',
        parcelasAcordadas: { gt: 1 },
      },
      include: { devedor: true },
    });

    let enviados = 0;

    for (const proposta of propostas) {
      const { devedor, valorAcordado, parcelasAcordadas } = proposta;

      if (!devedor.telefone || !valorAcordado || !parcelasAcordadas) continue;

      const valorParcela = (valorAcordado / parcelasAcordadas).toFixed(2);
      const mensagem = `Olá, ${devedor.nome}! 👋 Passando para lembrar sobre sua parcela do acordo no valor de R$ ${valorParcela}. Caso já tenha realizado o pagamento, desconsidere esta mensagem. Em caso de dúvidas, estamos à disposição!`;

      await this.whatsappService.enviarMensagem(devedor.telefone, mensagem);
      enviados++;
    }

    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const propostas = await this.prisma.proposta.findMany({
      where: {
        status: 'ACEITA',
        empresaId,
        parcelasAcordadas: { gt: 1 },
      },
      include: { devedor: true },
    });

    let enviados = 0;

    for (const proposta of propostas) {
      const { devedor, valorAcordado, parcelasAcordadas } = proposta;

      if (!devedor.telefone || !valorAcordado || !parcelasAcordadas) continue;

      const valorParcela = (valorAcordado / parcelasAcordadas).toFixed(2);
      const mensagem = `Olá, ${devedor.nome}! 👋 Passando para lembrar sobre sua parcela do acordo no valor de R$ ${valorParcela}. Em caso de dúvidas, estamos à disposição!`;

      await this.whatsappService.enviarMensagem(devedor.telefone, mensagem);
      enviados++;
    }

    return { enviados };
  }
}
