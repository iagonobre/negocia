import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificacaoOficinaRepository } from './notificacao-oficina.repository';
import { NotificationCronService } from '../../../core/notification/notification-cron.service';

@Injectable()
export class NotificacaoOficinaService extends NotificationCronService {
  constructor(private readonly repository: NotificacaoOficinaRepository) {
    super();
  }

  @Cron('0 10 * * 2,4')
  async enviarLembretes() {
    await this.executarCron();
  }

  // ── NotificationSchedulerProvider ───────────────────────────────────────

  async getEmpresasAtivas(): Promise<string[]> {
    return this.repository.findEmpresasAtivas();
  }

  async getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]> {
    const clientes = await this.repository.findClientesPendentes(empresaId);
    return clientes.filter((c) => c.telefone);
  }

  buildMessage(cliente: any): string {
    return `Olá ${cliente.nome}! 🔧 Seu veículo ${cliente.modeloVeiculo} (${cliente.placa}) está com revisão pendente. Responda para agendar!`;
  }
}
