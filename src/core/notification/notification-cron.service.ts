import { Inject, Logger } from '@nestjs/common';
import { NotificationEngine } from './notification.engine';
import { NotificationSchedulerProvider } from './notification-scheduler.interface';

export abstract class NotificationCronService implements NotificationSchedulerProvider {
  @Inject(NotificationEngine)
  protected readonly notificationEngine: NotificationEngine;

  protected readonly logger = new Logger(this.constructor.name);

  abstract getEmpresasAtivas(): Promise<string[]>;
  abstract getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  abstract buildMessage(cliente: any): string;

  async executarCron(): Promise<void> {
    this.logger.log('Iniciando envio de lembretes...');
    const enviados = await this.notificationEngine.enviarNotificacoes(this);
    this.logger.log(`Lembretes enviados: ${enviados}`);
  }

  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const enviados = await this.notificationEngine.enviarNotificacoesParaEmpresa(empresaId, this);
    return { enviados };
  }
}
