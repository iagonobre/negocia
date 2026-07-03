import { Logger } from '@nestjs/common';
import { NotificationEngine } from './notification.engine';
import { NotificationSchedulerProvider } from './notification-scheduler.interface';

export abstract class NotificationCronService implements NotificationSchedulerProvider {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly notificationEngine: NotificationEngine) {}

  abstract getEmpresasAtivas(): Promise<string[]>;
  abstract getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  abstract buildMessage(cliente: any): string;

  async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
    const enviados = await this.notificationEngine.enviarNotificacoesParaEmpresa(empresaId, this);
    return { enviados };
  }
}
