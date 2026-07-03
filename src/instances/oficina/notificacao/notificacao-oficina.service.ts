import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificationEngine } from '../../../core/notification/notification.engine';
import { NotificationCronService } from '../../../core/notification/notification-cron.service';

@Injectable()
export class NotificacaoOficinaService extends NotificationCronService {
  constructor(
    private readonly prisma: PrismaService,
    notificationEngine: NotificationEngine,
  ) {
    super(notificationEngine);
  }

  @Cron('0 10 * * 2,4')
  async enviarLembretes() {
    this.logger.log('Iniciando envio de lembretes de revisão...');
    const enviados = await this.notificationEngine.enviarNotificacoes(this);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  // ── NotificationSchedulerProvider ───────────────────────────────────────

  async getEmpresasAtivas(): Promise<string[]> {
    const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
    return empresas.map((e) => e.id);
  }

  async getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]> {
    const clientes = await this.prisma.clienteOficina.findMany({
      where: { empresaId, status: 'REVISAO_PENDENTE' },
    });
    return clientes.filter((c) => c.telefone);
  }

  buildMessage(cliente: any): string {
    return `Olá ${cliente.nome}! 🔧 Seu veículo ${cliente.modeloVeiculo} (${cliente.placa}) está com revisão pendente. Responda para agendar!`;
  }
}
