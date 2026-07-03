import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificationEngine } from '../../../core/notification/notification.engine';
import { NotificationCronService } from '../../../core/notification/notification-cron.service';

@Injectable()
export class NotificacaoSaudeService extends NotificationCronService {
  constructor(
    private readonly prisma: PrismaService,
    notificationEngine: NotificationEngine,
  ) {
    super(notificationEngine);
  }

  @Cron('0 8 * * 1,3,5')
  async enviarLembretes() {
    this.logger.log('Iniciando envio de lembretes de retorno...');
    const enviados = await this.notificationEngine.enviarNotificacoes(this);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  // ── NotificationSchedulerProvider ───────────────────────────────────────

  async getEmpresasAtivas(): Promise<string[]> {
    const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
    return empresas.map((e) => e.id);
  }

  async getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]> {
    const pacientes = await this.prisma.paciente.findMany({
      where: { empresaId, status: 'RETORNO_PENDENTE' },
    });
    return pacientes.filter((p) => p.telefone);
  }

  buildMessage(paciente: any): string {
    return `Olá ${paciente.nome}, tudo bem? 👋 Sua consulta de retorno está pendente. Responda para agendarmos!`;
  }
}
