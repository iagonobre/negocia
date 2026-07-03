import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PropostaRepository } from '../proposta/proposta.repository';
import { NotificationEngine } from '../../../core/notification/notification.engine';
import { NotificationCronService } from '../../../core/notification/notification-cron.service';

@Injectable()
export class CobrancaService extends NotificationCronService {
  constructor(
    private readonly propostaRepository: PropostaRepository,
    notificationEngine: NotificationEngine,
  ) {
    super(notificationEngine);
  }

  @Cron('0 9 1 * *')
  async enviarLembretesParcelados() {
    this.logger.log('Iniciando envio de lembretes mensais...');
    const enviados = await this.notificationEngine.enviarNotificacoes(this);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  // ── NotificationSchedulerProvider ───────────────────────────────────────

  async getEmpresasAtivas(): Promise<string[]> {
    const propostas = await this.propostaRepository.findAceitasParceladas();
    return [...new Set(propostas.map((p: any) => p.empresaId))];
  }

  async getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]> {
    const propostas = await this.propostaRepository.findAceitasParceladas(empresaId);
    return propostas
      .filter((p: any) => p.devedor?.telefone && p.valorAcordado && p.parcelasAcordadas)
      .map((p: any) => ({
        telefone: p.devedor.telefone,
        nome: p.devedor.nome,
        valorAcordado: p.valorAcordado,
        parcelasAcordadas: p.parcelasAcordadas,
      }));
  }

  buildMessage(proposta: any): string {
    const valorParcela = (proposta.valorAcordado / proposta.parcelasAcordadas).toFixed(2);
    return `Olá, ${proposta.nome}! 👋 Passando para lembrar sobre sua parcela do acordo no valor de R$ ${valorParcela}. Em caso de dúvidas, estamos à disposição!`;
  }
}
